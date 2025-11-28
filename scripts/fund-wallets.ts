import { network } from "hardhat";
import { parseEther } from "viem";
async function main() {
  console.log("Funding wallets with ETH for gas fees...\n");

  const connection = await network.connect();
  const { viem } = connection;

  const [deployer] = await viem.getWalletClients();

  //put whatever wallets you want here
  const walletsToFund = [
    "0x2a156a493ac65936d47454d544acd09a9b5fcdd6",
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

