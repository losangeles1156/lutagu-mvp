package orchestrator

import (
	"sync"
	"time"
)

// Metrics tracks performance and usage statistics
type Metrics struct {
	mu            sync.RWMutex
	layerAttempts map[string]int64
	layerSuccess  map[string]int64
	layerLatency  map[string][]time.Duration
	errors        map[string]int64
	counters      map[string]int64
	startTime     time.Time
}

// NewMetrics creates a new metrics collector
func NewMetrics() *Metrics {
	return &Metrics{
		layerAttempts: make(map[string]int64),
		layerSuccess:  make(map[string]int64),
		layerLatency:  make(map[string][]time.Duration),
		errors:        make(map[string]int64),
		counters:      make(map[string]int64),
		startTime:     time.Now(),
	}
}

// RecordLayerAttempt records an attempt at a layer
func (m *Metrics) RecordLayerAttempt(layer string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.layerAttempts[layer]++
}

// RecordLayerSuccess records a successful response from a layer
func (m *Metrics) RecordLayerSuccess(layer string, latency time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.layerSuccess[layer]++
	m.layerLatency[layer] = append(m.layerLatency[layer], latency)

	// Keep only last 1000 latencies
	if len(m.layerLatency[layer]) > 1000 {
		m.layerLatency[layer] = m.layerLatency[layer][500:]
	}
}

// RecordError records an error
func (m *Metrics) RecordError(category string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.errors[category]++
}

func (m *Metrics) IncCounter(name string, delta int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.counters[name] += delta
}

// Stats returns current metrics as a map
type MetricsStats struct {
	Uptime        time.Duration      `json:"uptime"`
	LayerAttempts map[string]int64   `json:"layer_attempts"`
	LayerSuccess  map[string]int64   `json:"layer_success"`
	LayerHitRate  map[string]float64 `json:"layer_hit_rate"`
	AvgLatency    map[string]float64 `json:"avg_latency_ms"`
	P95Latency    map[string]float64 `json:"p95_latency_ms"`
	Errors        map[string]int64   `json:"errors"`
	Counters      map[string]int64   `json:"counters"`
}

// GetStats returns current statistics
func (m *Metrics) GetStats() MetricsStats {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := MetricsStats{
		Uptime:        time.Since(m.startTime),
		LayerAttempts: make(map[string]int64),
		LayerSuccess:  make(map[string]int64),
		LayerHitRate:  make(map[string]float64),
		AvgLatency:    make(map[string]float64),
		P95Latency:    make(map[string]float64),
		Errors:        make(map[string]int64),
		Counters:      make(map[string]int64),
	}

	for k, v := range m.layerAttempts {
		stats.LayerAttempts[k] = v
		if v > 0 {
			stats.LayerHitRate[k] = float64(m.layerSuccess[k]) / float64(v)
		}
	}

	for k, v := range m.layerSuccess {
		stats.LayerSuccess[k] = v
	}

	for k, latencies := range m.layerLatency {
		if len(latencies) > 0 {
			var sum time.Duration
			for _, l := range latencies {
				sum += l
			}
			stats.AvgLatency[k] = float64(sum.Milliseconds()) / float64(len(latencies))

			// P95
			if len(latencies) >= 20 {
				sorted := make([]time.Duration, len(latencies))
				copy(sorted, latencies)
				sortDurations(sorted)
				p95Idx := int(float64(len(sorted)) * 0.95)
				stats.P95Latency[k] = float64(sorted[p95Idx].Milliseconds())
			}
		}
	}

	for k, v := range m.errors {
		stats.Errors[k] = v
	}
	for k, v := range m.counters {
		stats.Counters[k] = v
	}

	return stats
}

// Reset clears all metrics
func (m *Metrics) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.layerAttempts = make(map[string]int64)
	m.layerSuccess = make(map[string]int64)
	m.layerLatency = make(map[string][]time.Duration)
	m.errors = make(map[string]int64)
	m.counters = make(map[string]int64)
	m.startTime = time.Now()
}

func sortDurations(durations []time.Duration) {
	for i := 0; i < len(durations)-1; i++ {
		for j := i + 1; j < len(durations); j++ {
			if durations[i] > durations[j] {
				durations[i], durations[j] = durations[j], durations[i]
			}
		}
	}
}
