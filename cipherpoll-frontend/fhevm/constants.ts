// Network configurations for FHEVM

export const NETWORKS = {
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://localhost:8545',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  },
} as const;

export type NetworkName = keyof typeof NETWORKS;

export function getNetworkConfig(chainId: number) {
  const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
  return network || NETWORKS.localhost;
}

export function isLocalNetwork(chainId: number): boolean {
  return chainId === NETWORKS.localhost.chainId;
}

export function isSupportedNetwork(chainId: number): boolean {
  return Object.values(NETWORKS).some(n => n.chainId === chainId);
}

