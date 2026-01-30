# Go Agent Development Guidelines

> Reference: Derived from `skillsmp.com` recommended skills (`backend-golang`, `golang-pro`, `golang-testing`).

## 1. Project Philosophy
This project uses **Google ADK (Agent Development Kit)** with a **Go** implementation deployed on **Cloud Run**.
We follow modern Go principles (Go 1.24+), Clean Architecture, and strict failure isolation.

## 2. Coding Standards (`golang-pro`)
*   **Idiomatic Go**: Follow "Effective Go". Keep interfaces small.
*   **Error Handling**:
    *   Use `fmt.Errorf("...: %w", err)` to wrap errors.
    *   Handle errors immediately; avoid nesting (guard clauses).
    *   Never ignore errors (`_`).
*   **Concurrency**:
    *   Use `context.Context` for cancellation and timeouts.
    *   Avoid shared state; communicate via Channels if necessary, but prefer Request-Response for independent Agents.
*   **Logging**: Use `log/slog` for structured logging.

## 3. Architecture & Structure (`backend-golang`)
We follow the Standard Go Project Layout:

```
services/adk-agent/
├── cmd/
│   └── server/         # Main entry point (main.go)
├── internal/
│   ├── agent/          # Agent logic (Root, Route, Status)
│   ├── config/         # Configuration loading
│   ├── infrastructure/ # External services (Upstash, Supabase, ODPT)
│   └── transport/      # HTTP functionality
└── pkg/                # Public shared code (models)
```

## 4. Testing Guidelines (`golang-testing`)
*   **Table-Driven Tests**: ALL unit tests must use the table-driven pattern (`tests := []struct{...}`).
*   **Use `t.Run()`**: Use subtests for each test case.
*   **Mock Functionality**: Use interfaces for all external dependencies to allow mocking.
*   **Benchmarks**: Critical paths (routing algorithms) must have benchmarks.

## 5. Agent-Specific Rules
*   **Statelessness**: Each request must complete independently. Use Redis (`internal/infrastructure/cache`) for any state persistence.
*   **Isolation**: A panic in one sub-agent must be recovered and MUST NOT crash the main server.
*   **OpenRouter Integration**:
    *   Use OpenAI Go SDK (`github.com/sashabaranov/go-openai`) compatible mode.
    *   Base URL: `https://openrouter.ai/api/v1`
