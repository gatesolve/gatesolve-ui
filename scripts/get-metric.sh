#!/bin/bash
set -eu

[ "$#" -ne 2 ] && {
    echo >&2 "Usage: $(basename "$0") metric filename"
    exit 1
}

METRIC="$1"
FILE="$2"

<"$FILE" jq --raw-output --from-file <(cat <<HERE
.runs |
map(.timings) |
map(map(select(.id == "$METRIC"))) |
map(.[0]) |
map(.timing) |
map(tostring) |
join(" ")
HERE
)
