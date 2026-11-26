#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/warm-cache.js "$@" 2>&1 | tee -a scripts/warm-cache.log
