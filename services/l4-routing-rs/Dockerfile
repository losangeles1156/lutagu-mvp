FROM rust:1-slim-bookworm as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

COPY --from=builder /app/target/release/l4-routing-rs /app/l4-routing-rs

# Create directory for data
RUN mkdir -p /app/data

# Expects routing_graph.json to be in the build context (needs to be copied before build)
COPY routing_graph.json /app/data/routing_graph.json

ENV PORT=8080
ENV ROUTING_GRAPH_PATH=/app/data/routing_graph.json
EXPOSE 8080

CMD ["./l4-routing-rs"]
