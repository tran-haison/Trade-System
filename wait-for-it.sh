#!/bin/bash
# wait-for-it.sh

set -e

host="$1"
port="${host#*:}"
host="${host%:*}"

until nc -z "$host" "$port"; do
  >&2 echo "Waiting for MongoDB at $host:$port to be ready..."
  sleep 1
done

>&2 echo "MongoDB is up - executing command"
shift
exec "$@" 
