import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EduSystemModule = buildModule("EduSystem", (m) => {
  const token = m.contract("EduToken");

  const identity = m.contract("EduIdentity");

  const consent = m.contract("EduConsent", [identity, token]);

  m.call(token, "setConsentContract", [consent]);

  return { token, identity, consent };
});

export default EduSystemModule;

