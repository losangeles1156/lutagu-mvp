# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Run Stage
FROM gcr.io/distroless/static-debian12

WORKDIR /

COPY --from=builder /server /server

# Cloud Run defaults to 8080
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD ["/server", "-healthcheck"]

USER nonroot:nonroot

ENTRYPOINT ["/server"]

