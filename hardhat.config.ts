import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
// import "hardhat-gas-reporter"; // Using forge test --gas-report instead

const config = defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  // gasReporter: {
  //   enabled: !!process.env.REPORT_GAS,
  //   currency: "USD",
  //   outputFile: "gas-report.txt",
  //   noColors: true,
  //   coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  // },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
});

export default config;
