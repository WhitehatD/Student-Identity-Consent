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

echo "Compiling contracts..."
npx hardhat compile --force

echo "Deploying contracts..."
npx hardhat ignition deploy ./ignition/modules/EduSystem.ts --network localhost

echo "Contracts deployed successfully!"

echo "Generating shared contract ABIs and addresses..."
npx hardhat run scripts/generate-shared-contracts.ts --network localhost

echo "Funding wallets with ETH for gas fees..."
npx hardhat run scripts/fund-wallets.ts --network localhost

echo "Creating deployment complete marker..."
touch /tmp/deployment-complete

echo "Hardhat is ready!"

# Keep the script running to maintain the Hardhat node
wait $HARDHAT_PID

