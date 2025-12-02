import { network } from "hardhat";
import { parseEther } from "viem";
async function main() {
  console.log("Funding wallets with ETH for gas fees...\n");

  const connection = await network.connect();
  const { viem } = connection;

  const [deployer] = await viem.getWalletClients();

  const walletsToFund = [
    "0xcf0e813d81ebcf56b1ac17a0296d9ab4e5d18cec",
  ];

  const amountInEth = "100";
  const amountInWei = parseEther(amountInEth);

  console.log(`Funding ${walletsToFund.length} wallet(s) with ${amountInEth} ETH each...`);
  console.log(`Deployer address: ${deployer.account.address}\n`);

  for (const wallet of walletsToFund) {
    try {
      const hash = await deployer.sendTransaction({
        to: wallet as `0x${string}`,
        value: amountInWei,
      });
      console.log(`Funded ${wallet} with ${amountInEth} ETH (tx: ${hash})`);
    } catch (error) {
      console.error(`Failed to fund ${wallet}:`, error);
    }
  }

  console.log("\nWallet funding complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
