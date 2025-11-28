#!/bin/sh
set -e

echo "Waiting for contracts to be deployed..."

MAX_RETRIES=60
counter=0

while [ $counter -lt $MAX_RETRIES ]; do
    if [ -f "../shared/contracts/addresses.ts" ]; then
        if grep -q "0x" ../shared/contracts/addresses.ts 2>/dev/null; then
            echo "Contract ABIs and addresses are ready!"
            break
        fi
    fi

    if [ $((counter % 5)) -eq 0 ]; then
        echo "Still waiting for contracts... ($counter/$MAX_RETRIES)"
    fi

    counter=$((counter + 1))
    sleep 1
done

if [ $counter -eq $MAX_RETRIES ]; then
    echo "Timeout: Contracts were not deployed within expected time"
    exit 1
fi

echo "Starting Vite dev server..."
exec npm run dev -- --host 0.0.0.0

