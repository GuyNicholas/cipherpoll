#!/usr/bin/env node

import http from 'http';

const HARDHAT_PORT = 8545;
const TIMEOUT = 2000;

function checkHardhatNode() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: HARDHAT_PORT,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT,
      },
      (res) => {
        resolve(true);
      }
    );

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    // Send eth_chainId request
    req.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1,
    }));

    req.end();
  });
}

async function main() {
  console.log('🔍 Checking for Hardhat node...');
  
  const isRunning = await checkHardhatNode();
  
  if (isRunning) {
    console.log('✅ Hardhat node detected on port 8545');
    process.exit(0);
  } else {
    console.error('❌ Hardhat node not found!');
    console.error('\n💡 Start Hardhat node first:');
    console.error('   cd fhevm-hardhat-template');
    console.error('   npx hardhat node\n');
    process.exit(1);
  }
}

main();

