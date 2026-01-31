FROM rust:1-slim-bookworm as builder
WORKDIR /app
COPY . .
WORKDIR /app/services/l4-routing-rs
RUN cargo build --release

# Run Stage
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

COPY --from=builder /app/services/l4-routing-rs/target/release/l4-routing-rs /app/l4-routing-rs

# Copy data files from public/data (assuming build context is project root)
COPY public/data/routing_graph.json /app/data/routing_graph.json
COPY public/data/station_dictionary.json /app/data/station_dictionary.json

ENV PORT=8080
ENV ROUTING_GRAPH_PATH=/app/data/routing_graph.json
ENV STATION_DICT_PATH=/app/data/station_dictionary.json
EXPOSE 8080

CMD ["./l4-routing-rs"]
