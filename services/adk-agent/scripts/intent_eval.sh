#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export GOCACHE="${GOCACHE:-/tmp/go-build-adk}"

cd "${ROOT_DIR}"
go run ./cmd/intent_eval -cases tests/intent_router_cases.json
