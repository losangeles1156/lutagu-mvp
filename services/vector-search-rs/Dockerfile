FROM rust:latest as builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*


WORKDIR /usr/src/app

# Copy dependency files
COPY services/vector-search-rs/Cargo.toml services/vector-search-rs/Cargo.toml
COPY services/vector-search-rs/proto services/vector-search-rs/proto

# Create dummy src to cache dependencies
RUN mkdir -p services/vector-search-rs/src
RUN echo "fn main() {}" > services/vector-search-rs/src/main.rs

# Build dependencies (release mode)
WORKDIR /usr/src/app/services/vector-search-rs
RUN cargo build --release --bin vector-search-rs
WORKDIR /usr/src/app


# Copy source code
COPY services/vector-search-rs/src services/vector-search-rs/src
COPY services/vector-search-rs/build.rs services/vector-search-rs/build.rs

# Touch main.rs to force rebuild
RUN touch services/vector-search-rs/src/main.rs

# Build binary
# Build binary
WORKDIR /usr/src/app/services/vector-search-rs
RUN cargo build --release --bin vector-search-rs
WORKDIR /usr/src/app

# Runtime image
FROM debian:bookworm-slim

# Install OpenSSL (required for reqwest)
RUN apt-get update && apt-get install -y libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/src/app/services/vector-search-rs/target/release/vector-search-rs /app/vector-search-rs

EXPOSE 50051

CMD ["./vector-search-rs"]
