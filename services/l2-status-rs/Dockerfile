FROM rust:1-slim-bookworm as builder
WORKDIR /app
COPY . .
# Install build dependencies for OpenSSL
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
# Build release binary
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
# Install runtime dependencies (OpenSSL usually needed for reqwest/sqlx)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/l2-status-rs /app/l2-status-rs

ENV PORT=8080
EXPOSE 8080

CMD ["./l2-status-rs"]
