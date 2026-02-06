#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/tests/benchmarks"
OUT_FILE="${OUT_DIR}/baseline.txt"
export GOCACHE="${GOCACHE:-/tmp/go-build-adk}"

mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"
go test ./internal/orchestrator -run '^$' -bench 'Benchmark(AnalyzeIntent|ExpandGraphNodeIDs)' -benchmem -count=3 | tee "${OUT_FILE}"

echo "Benchmark baseline saved to ${OUT_FILE}"
