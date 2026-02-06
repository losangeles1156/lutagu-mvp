.PHONY: build run test clean docker lint bench intent-eval

# Build variables
BINARY_NAME=adk-agent
MAIN_PATH=./cmd/server
GO_BIN=/usr/local/go/bin/go
GCLOUD_BIN=/Users/zhuangzixian/google-cloud-sdk/bin/gcloud

# Docker variables
DOCKER_IMAGE=adk-agent
DOCKER_TAG=latest

# Build the binary
build:
	@echo "Building $(BINARY_NAME)..."
	$(GO_BIN) build -o bin/$(BINARY_NAME) $(MAIN_PATH)

# Run the server locally
run: build
	@echo "Running $(BINARY_NAME)..."
	./bin/$(BINARY_NAME)

# Run with hot reload (requires air)
dev:
	@echo "Starting development server..."
	air

# Run tests
test:
	@echo "Running tests..."
	$(GO_BIN) test -v ./internal/...

# Run tests with race detection
test-race:
	@echo "Running tests with race detection..."
	$(GO_BIN) test -race -v ./internal/...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(GO_BIN) test -coverprofile=coverage.out ./internal/...
	$(GO_BIN) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Run benchmark baseline suite
bench:
	@echo "Running benchmark baseline..."
	bash scripts/benchmark_baseline.sh

intent-eval:
	@echo "Running intent router accuracy eval..."
	bash scripts/intent_eval.sh

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html

# Build Docker image
docker:
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

# Run Docker container
docker-run: docker
	@echo "Running Docker container..."
	docker run -p 8080:8080 --env-file .env $(DOCKER_IMAGE):$(DOCKER_TAG)

# Lint code
lint:
	@echo "Linting..."
	golangci-lint run

# Format code
fmt:
	@echo "Formatting..."
	$(GO_BIN) fmt ./...

# Verify dependencies
verify:
	@echo "Verifying dependencies..."
	$(GO_BIN) mod verify
	$(GO_BIN) mod tidy

# Update dependencies
update:
	@echo "Updating dependencies..."
	$(GO_BIN) get -u ./...
	$(GO_BIN) mod tidy

# Generate mocks (requires mockgen)
mocks:
	@echo "Generating mocks..."
	$(GO_BIN) generate ./...

# Health check
health:
	@curl -s http://localhost:8080/health | jq

# Readiness check
ready:
	@curl -s http://localhost:8080/health/ready | jq

# Full CI pipeline
ci: verify lint test-race build
	@echo "CI pipeline completed successfully"

# Deploy to Cloud Run
deploy:
	@echo "Deploying to Cloud Run..."
	$(GCLOUD_BIN) run deploy adk-agent \
		--source . \
		--region asia-northeast1 \
		--allow-unauthenticated \
		--memory 512Mi \
		--cpu 1 \
		--min-instances 0 \
		--max-instances 3 \
		--set-env-vars="$(shell cat .env | grep -v '^#' | xargs)"

help:
	@echo "Available targets:"
	@echo "  build        - Build the binary"
	@echo "  run          - Build and run locally"
	@echo "  dev          - Run with hot reload (requires air)"
	@echo "  test         - Run tests"
	@echo "  test-race    - Run tests with race detection"
	@echo "  test-coverage- Run tests with coverage"
	@echo "  bench        - Run benchmark baseline suite"
	@echo "  intent-eval  - Run intent router accuracy eval"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker       - Build Docker image"
	@echo "  docker-run   - Build and run Docker container"
	@echo "  lint         - Run linter"
	@echo "  fmt          - Format code"
	@echo "  verify       - Verify dependencies"
	@echo "  update       - Update dependencies"
	@echo "  ci           - Full CI pipeline"
	@echo "  deploy       - Deploy to Cloud Run"
	@echo "  health       - Check health endpoint"
	@echo "  ready        - Check readiness endpoint"
