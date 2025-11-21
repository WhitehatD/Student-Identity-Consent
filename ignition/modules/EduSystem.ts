import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Ignition module for deploying the complete EduSystem
 * Deploys: EduToken, EduIdentity, EduConsent and wires them together
 */
const EduSystemModule = buildModule("EduSystem", (m) => {
  // Deploy EduToken
  const token = m.contract("EduToken");

  // Deploy EduIdentity
  const identity = m.contract("EduIdentity");

  // Deploy EduConsent with constructor args
  const consent = m.contract("EduConsent", [identity, token]);

  // Wire token to consent contract
  m.call(token, "setConsentContract", [consent]);

  return { token, identity, consent };
});

export default EduSystemModule;

