#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACTS_DIR = path.join(__dirname, '../../fhevm-hardhat-template/deployments');
const ABI_OUTPUT_DIR = path.join(__dirname, '../abi');

// Supported networks
const NETWORKS = ['localhost', 'sepolia'];

function generateABI() {
  console.log('🔧 Generating ABI files...\n');

  // Ensure output directory exists
  if (!fs.existsSync(ABI_OUTPUT_DIR)) {
    fs.mkdirSync(ABI_OUTPUT_DIR, { recursive: true });
  }

  // Find SurveyCore contract
  const contracts = ['SurveyCore'];
  
  contracts.forEach(contractName => {
    console.log(`📄 Processing ${contractName}...`);

    const addresses = {};
    let abi = null;

    // Collect addresses from all networks
    NETWORKS.forEach(network => {
      const deploymentPath = path.join(CONTRACTS_DIR, network, `${contractName}.json`);
      
      if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        addresses[network] = deployment.address;
        
        if (!abi) {
          abi = deployment.abi;
        }
        
        console.log(`  ✓ Found on ${network}: ${deployment.address}`);
      }
    });

    if (!abi) {
      console.warn(`  ⚠️  No deployment found for ${contractName}`);
      return;
    }

    // Generate ABI file
    const abiContent = `// Auto-generated file - DO NOT EDIT
// Generated from deployments/${contractName}.json

export const ${contractName}ABI = ${JSON.stringify(abi, null, 2)} as const;

export type ${contractName}ABI = typeof ${contractName}ABI;
`;

    fs.writeFileSync(
      path.join(ABI_OUTPUT_DIR, `${contractName}ABI.ts`),
      abiContent
    );

    // Generate addresses file
    const addressesContent = `// Auto-generated file - DO NOT EDIT
// Contract addresses for ${contractName}

export const ${contractName}Addresses: Record<number, string> = {
${Object.entries(addresses)
  .map(([network, address]) => {
    const chainId = network === 'localhost' ? 31337 : 11155111; // Sepolia
    return `  ${chainId}: "${address}", // ${network}`;
  })
  .join('\n')}
} as const;

export function get${contractName}Address(chainId: number): string | undefined {
  return ${contractName}Addresses[chainId];
}
`;

    fs.writeFileSync(
      path.join(ABI_OUTPUT_DIR, `${contractName}Addresses.ts`),
      addressesContent
    );

    console.log(`  ✓ Generated ABI and addresses\n`);
  });

  console.log('✅ ABI generation complete!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateABI();
  } catch (error) {
    console.error('❌ Error generating ABI:', error.message);
    process.exit(1);
  }
}

export { generateABI };

