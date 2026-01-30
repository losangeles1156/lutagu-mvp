FROM rust:1-slim-bookworm as builder
WORKDIR /app
COPY . .
RUN cargo build --release

# Run Stage
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

COPY --from=builder /app/target/release/l4-routing-rs /app/l4-routing-rs

# Create directory for data (Distroless lacks mkdir, so we must rely on COPY creating dirs or mounting volumes)
# However, for Distroless, we copy directly.

# Note: In CI/CD, the routing_graph.json should be downloaded or generated before build
# We assume it is present in the build context under public/data/ or root.
# Adjusting to copy from standard location.
COPY routing_graph.json /app/data/routing_graph.json

ENV PORT=8080
ENV ROUTING_GRAPH_PATH=/app/data/routing_graph.json
EXPOSE 8080

CMD ["./l4-routing-rs"]
