import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const sharedDir = path.join(__dirname, '../shared/contracts');

const contracts = [
  { name: 'EduToken', file: 'EduToken.sol/EduToken.json' },
  { name: 'EduIdentity', file: 'EduIdentity.sol/EduIdentity.json' },
  { name: 'EduConsent', file: 'EduConsent.sol/EduConsent.json' },
];

const backendContractsDir = path.join(__dirname, '../backend/contracts');
const deployedAddressesPath = path.join(__dirname, '../ignition/deployments/chain-31337/deployed_addresses.json');

if (!fs.existsSync(backendContractsDir)) {
  fs.mkdirSync(backendContractsDir, { recursive: true });
}

for (const contract of contracts) {
  const artifactPath = path.join(artifactsDir, contract.file);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contractNameLower = contract.name.charAt(0).toLowerCase() + contract.name.slice(1);

  const tsOutputFile = path.join(sharedDir, `${contractNameLower}.ts`);
  const tsContent = `export const ${contractNameLower}Abi = ${JSON.stringify(artifact.abi, null, 2)} as const;
`;
  fs.writeFileSync(tsOutputFile, tsContent);
  console.log(`Generated ${contract.name} ABI (TypeScript)`);

  const jsOutputFile = path.join(backendContractsDir, `${contractNameLower}.js`);
  const jsContent = `export const ${contractNameLower}Abi = ${JSON.stringify(artifact.abi, null, 2)};
`;
  fs.writeFileSync(jsOutputFile, jsContent);
  console.log(`Generated ${contract.name} ABI (JavaScript)`);
}

if (fs.existsSync(deployedAddressesPath)) {
  const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));

  const addresses = {
    eduIdentity: deployedAddresses['EduSystem#EduIdentity'],
    eduToken: deployedAddresses['EduSystem#EduToken'],
    eduConsent: deployedAddresses['EduSystem#EduConsent'],
  };

  const tsAddressesFile = path.join(sharedDir, 'addresses.ts');
  const tsAddressesContent = `export const addresses = ${JSON.stringify(addresses, null, 4)};
`;
  fs.writeFileSync(tsAddressesFile, tsAddressesContent);
  console.log('Generated addresses.ts');

  const jsAddressesFile = path.join(backendContractsDir, 'addresses.js');
  const jsAddressesContent = `export const addresses = ${JSON.stringify(addresses, null, 4)};
`;
  fs.writeFileSync(jsAddressesFile, jsAddressesContent);
  console.log('Generated addresses.js');
} else {
  console.warn(`Warning: ${deployedAddressesPath} not found. Skipping addresses generation.`);
}

console.log('\nDone! Shared contract ABIs and addresses updated for frontend and backend.');
