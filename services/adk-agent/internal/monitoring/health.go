package monitoring

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"runtime"
	"sync"
	"time"
)

// HealthChecker provides comprehensive health checking
type HealthChecker struct {
	mu            sync.RWMutex
	checks        map[string]HealthCheck
	startTime     time.Time
	lastCheckTime time.Time
}

// HealthCheck defines a health check function
type HealthCheck struct {
	Name     string
	Check    func(ctx context.Context) error
	Critical bool // If true, failure means service is unhealthy
}

// HealthStatus represents the health state
type HealthStatus struct {
	Status      string                    `json:"status"` // "healthy", "degraded", "unhealthy"
	Uptime      string                    `json:"uptime"`
	Timestamp   time.Time                 `json:"timestamp"`
	Checks      map[string]CheckResult    `json:"checks"`
	System      SystemInfo                `json:"system"`
}

// CheckResult represents a single check result
type CheckResult struct {
	Status   string        `json:"status"`
	Message  string        `json:"message,omitempty"`
	Latency  time.Duration `json:"latency_ms"`
}

// SystemInfo contains runtime information
type SystemInfo struct {
	Goroutines   int    `json:"goroutines"`
	MemoryMB     uint64 `json:"memory_mb"`
	NumCPU       int    `json:"num_cpu"`
	GoVersion    string `json:"go_version"`
}

// NewHealthChecker creates a new health checker
func NewHealthChecker() *HealthChecker {
	return &HealthChecker{
		checks:    make(map[string]HealthCheck),
		startTime: time.Now(),
	}
}

// Register adds a health check
func (h *HealthChecker) Register(check HealthCheck) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.checks[check.Name] = check
	slog.Info("Health check registered", "name", check.Name, "critical", check.Critical)
}

// Check runs all health checks
func (h *HealthChecker) Check(ctx context.Context) *HealthStatus {
	h.mu.RLock()
	defer h.mu.RUnlock()

	status := &HealthStatus{
		Status:    "healthy",
		Uptime:    time.Since(h.startTime).Round(time.Second).String(),
		Timestamp: time.Now(),
		Checks:    make(map[string]CheckResult),
		System:    h.getSystemInfo(),
	}

	hasCriticalFailure := false
	hasDegradation := false

	for name, check := range h.checks {
		start := time.Now()
		err := check.Check(ctx)
		latency := time.Since(start)

		result := CheckResult{
			Latency: latency,
		}

		if err != nil {
			result.Status = "fail"
			result.Message = err.Error()
			
			if check.Critical {
				hasCriticalFailure = true
			} else {
				hasDegradation = true
			}
		} else {
			result.Status = "pass"
		}

		status.Checks[name] = result
	}

	if hasCriticalFailure {
		status.Status = "unhealthy"
	} else if hasDegradation {
		status.Status = "degraded"
	}

	h.lastCheckTime = time.Now()
	return status
}

func (h *HealthChecker) getSystemInfo() SystemInfo {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return SystemInfo{
		Goroutines: runtime.NumGoroutine(),
		MemoryMB:   m.Alloc / 1024 / 1024,
		NumCPU:     runtime.NumCPU(),
		GoVersion:  runtime.Version(),
	}
}

// ===== HTTP Handlers =====

// HandleHealth returns basic health (for load balancer)
func (h *HealthChecker) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"uptime": time.Since(h.startTime).Round(time.Second).String(),
	}); err != nil {
		slog.Error("Health response encode failed", "error", err)
	}
}

// HandleHealthReady returns detailed readiness (dependencies check)
func (h *HealthChecker) HandleHealthReady(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status := h.Check(ctx)

	w.Header().Set("Content-Type", "application/json")
	
	switch status.Status {
	case "healthy":
		w.WriteHeader(http.StatusOK)
	case "degraded":
		w.WriteHeader(http.StatusOK) // Still accept traffic
	case "unhealthy":
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	if err := json.NewEncoder(w).Encode(status); err != nil {
		slog.Error("Health ready response encode failed", "error", err)
	}
}

// HandleHealthLive returns liveness (goroutine health)
func (h *HealthChecker) HandleHealthLive(w http.ResponseWriter, r *http.Request) {
	info := h.getSystemInfo()
	
	w.Header().Set("Content-Type", "application/json")
	
	// Check for goroutine leak (arbitrary threshold)
	if info.Goroutines > 10000 {
		w.WriteHeader(http.StatusServiceUnavailable)
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     "unhealthy",
			"reason":     "goroutine leak detected",
			"goroutines": info.Goroutines,
		}); err != nil {
			slog.Error("Health live response encode failed", "error", err)
		}
		return
	}
	
	// Check for memory pressure (arbitrary threshold: 1GB)
	if info.MemoryMB > 1024 {
		w.WriteHeader(http.StatusServiceUnavailable)
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "unhealthy",
			"reason":    "memory pressure",
			"memory_mb": info.MemoryMB,
		}); err != nil {
			slog.Error("Health live response encode failed", "error", err)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "healthy",
		"system": info,
	}); err != nil {
		slog.Error("Health live response encode failed", "error", err)
	}
}

// ===== Common Health Checks =====

// NewRedisCheck creates a Redis health check
func NewRedisCheck(pingFunc func(ctx context.Context) error) HealthCheck {
	return HealthCheck{
		Name: "redis",
		Check: func(ctx context.Context) error {
			ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
			defer cancel()
			return pingFunc(ctx)
		},
		Critical: false, // Redis is optional
	}
}

// NewSupabaseCheck creates a Supabase health check
func NewSupabaseCheck(pingFunc func(ctx context.Context) error) HealthCheck {
	return HealthCheck{
		Name: "supabase",
		Check: func(ctx context.Context) error {
			ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
			defer cancel()
			return pingFunc(ctx)
		},
		Critical: false, // Supabase is optional for L1/L2
	}
}

// NewODPTCheck creates an ODPT API health check
func NewODPTCheck(checkFunc func() ([]interface{}, error)) HealthCheck {
	return HealthCheck{
		Name: "odpt",
		Check: func(ctx context.Context) error {
			_, err := checkFunc()
			if err != nil {
				return fmt.Errorf("ODPT API unavailable: %w", err)
			}
			return nil
		},
		Critical: false,
	}
}

// NewOpenRouterCheck creates an OpenRouter health check
func NewOpenRouterCheck(checkFunc func(ctx context.Context) error) HealthCheck {
	return HealthCheck{
		Name: "openrouter",
		Check: func(ctx context.Context) error {
			ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()
			return checkFunc(ctx)
		},
		Critical: true, // LLM is critical for fallback
	}
}
