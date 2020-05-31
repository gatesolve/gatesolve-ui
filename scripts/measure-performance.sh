#!/bin/bash
set -eu

[ "$#" -lt 1 -o "$(($# % 2))" != "0" ] && {
    echo >&2 "Usage: $(basename "$0") name1 URL1 [name2 URL2]..."
    exit 1
}

if ! which jq >/dev/null; then
    echo >&2 "Error: jq not found in PATH. You should install it first."
    exit 1
fi

REFERENCE_URL="https://app.gatesolve.com/"

DIR="performance-results/$(date --utc '+%Y%m%dT%H%M%SZ')"
mkdir -p "performance-results"
mkdir "$DIR"
cd "$DIR"

BASEDIR="../../$(dirname "$0")"

run_measurement() {
    name="$1"
    url="$2"
    yarn run pwmetrics --runs 30 "$url" --json --output-path "$DIR/$name".json
    echo "Time to Interactive values for ${name}: $("$BASEDIR"/get-metric.sh "interactive" "$name".json)"
}

while [ "$#" -gt 0 ]; do
    name="$1"
    url="$2"
    shift 2
    run_measurement "$name" "$url"
done
run_measurement "reference" "$REFERENCE_URL"

echo
echo 'You can test statistical significance here (paste reference values into "Data Group 2"): https://web.archive.org/web/20191127061400/http://www.sumsar.net/best_online/'
