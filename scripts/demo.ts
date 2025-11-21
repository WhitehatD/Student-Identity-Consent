import { network } from "hardhat";
import EduSystemModule from "../ignition/modules/EduSystem.js";

/**
 * Demo script showing the EduSystem platform in action
 * Run with: npx hardhat run scripts/demo.ts
 */

async function main() {
  console.log("🚀 Starting EduSystem Demo...\n");

  // Connect to network and get viem + ignition
  const connection = await network.connect();
  const { viem, ignition } = connection;

  // Get wallet clients for different roles
  const [studentWallet, requesterAWallet, requesterBWallet] = await viem.getWalletClients();

  console.log("👥 Accounts:");
  console.log("  Student:", studentWallet.account.address);
  console.log("  Requester A:", requesterAWallet.account.address);
  console.log("  Requester B:", requesterBWallet.account.address);
  console.log();

  // Deploy system via Ignition
  console.log("📦 Deploying contracts via Hardhat Ignition...");
  const deployed = await ignition.deploy(EduSystemModule);
  const token = deployed.token as any;
  const identity = deployed.identity as any;
  const consent = deployed.consent as any;

  console.log("✅ Contracts deployed:");
  console.log("  EduToken:", token.address);
  console.log("  EduIdentity:", identity.address);
  console.log("  EduConsent:", consent.address);
  console.log();

  // Register student
  console.log("📝 Registering student...");
  const emailHash = `0x${"aa".repeat(32)}` as `0x${string}`;
  await identity.write.registerStudent(
    ["alice_cs", "Alice Smith", "Maastricht University", 2023, emailHash, "ipfs://Qm...student1"],
    { account: studentWallet.account }
  );

  const studentProfile = await identity.read.getStudentProfile([studentWallet.account.address]);
  console.log(`✅ Student registered: ${studentProfile.displayName} (@${studentProfile.handle})`);
  console.log();

  // Register requesters
  console.log("🏢 Registering requester applications...");
  await identity.write.registerRequester(
    ["CoolJobs", "Job portal for students", "https://cooljobs.example.com"],
    { account: requesterAWallet.account }
  );

  await identity.write.registerRequester(
    ["CoursePortal", "Course management system", "https://courses.example.com"],
    { account: requesterBWallet.account }
  );

  console.log("✅ Requester A registered: CoolJobs");
  console.log("✅ Requester B registered: CoursePortal");
  console.log();

  // Student grants consent to Requester A for BasicProfile (7 days)
  console.log("🔐 Student granting consent to CoolJobs for BasicProfile (7 days)...");
  await consent.write.setConsent(
    [requesterAWallet.account.address, 0, 7], // DataType.BasicProfile = 0
    { account: studentWallet.account }
  );

  // Check token balance
  const tokenBalance = await token.read.balanceOf([studentWallet.account.address]);
  console.log(`✅ Consent granted! Student earned ${tokenBalance} EDU tokens`);
  console.log();

  // Requester A successfully accesses data
  console.log("✅ CoolJobs accessing student's BasicProfile...");
  const cid = await consent.read.accessDataAndLog(
    [studentWallet.account.address, 0],
    { account: requesterAWallet.account }
  );
  console.log(`   Retrieved profile CID: ${cid}`);
  console.log();

  // Requester B tries to access without consent
  console.log("❌ CoursePortal attempting to access without consent...");
  try {
    await consent.read.accessDataAndLog(
      [studentWallet.account.address, 0],
      { account: requesterBWallet.account }
    );
    console.log("   ERROR: Should have failed!");
  } catch (error: any) {
    console.log("   Access denied (as expected): No valid consent");
  }
  console.log();

  // Check consent status
  const hasConsent = await consent.read.hasValidConsent([
    studentWallet.account.address,
    requesterAWallet.account.address,
    0
  ]);
  console.log(`🔍 Consent status (CoolJobs → Student BasicProfile): ${hasConsent ? "✅ Valid" : "❌ Invalid"}`);
  console.log();

  // Student revokes consent
  console.log("🚫 Student revoking consent from CoolJobs...");
  await consent.write.revokeConsent(
    [requesterAWallet.account.address, 0],
    { account: studentWallet.account }
  );
  console.log("✅ Consent revoked");
  console.log();

  // Requester A can no longer access
  console.log("❌ CoolJobs attempting to access after revocation...");
  try {
    await consent.read.accessDataAndLog(
      [studentWallet.account.address, 0],
      { account: requesterAWallet.account }
    );
    console.log("   ERROR: Should have failed!");
  } catch (error: any) {
    console.log("   Access denied (as expected): Consent was revoked");
  }
  console.log();

  // Final token balance
  const finalBalance = await token.read.balanceOf([studentWallet.account.address]);
  console.log("📊 Final Results:");
  console.log(`   Student's EDU token balance: ${finalBalance}`);
  console.log(`   Total consents granted: 1`);
  console.log(`   Active consents: 0 (revoked)`);
  console.log();

  console.log("✨ Demo completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });


