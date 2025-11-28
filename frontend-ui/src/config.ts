// Auto-generated config from environment variables
// This file is built at Docker build time with values from docker-compose

export const config = {
  rpcUrl: import.meta.env.VITE_RPC_URL || 'http://localhost:8545',
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  chainId: 31337,
  chainName: 'Hardhat Local',
} as const;

