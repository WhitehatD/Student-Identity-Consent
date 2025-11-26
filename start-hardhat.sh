#!/bin/sh
set -e

echo "Starting Hardhat node..."
npx hardhat node 2>&1 | tee /tmp/hardhat.log &
HARDHAT_PID=$!

echo "Waiting for Hardhat node to be ready..."
timeout=30
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if grep -q "Started HTTP and WebSocket JSON-RPC server" /tmp/hardhat.log 2>/dev/null; then
        echo "Hardhat node is ready!"
        break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
done

if [ $elapsed -eq $timeout ]; then
    echo "ERROR: Hardhat node failed to start within ${timeout} seconds"
    exit 1
fi

echo "Deploying contracts..."
npx hardhat ignition deploy ./ignition/modules/EduSystem.ts --network localhost

echo "Contracts deployed successfully!"
echo "Creating deployment complete marker..."
touch /tmp/deployment-complete

echo "Hardhat is ready!"

# Keep the script running to maintain the Hardhat node
wait $HARDHAT_PID

