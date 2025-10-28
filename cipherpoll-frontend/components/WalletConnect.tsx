'use client';

import { useWallet } from '../hooks/useWallet';
import { useFhevm } from '../hooks/useFhevm';

export function WalletConnect() {
  const { 
    connected, 
    account, 
    chainId, 
    isConnecting, 
    error: walletError,
    connect, 
    disconnect 
  } = useWallet();

  const { status: fhevmStatus, error: fhevmError, isReady } = useFhevm();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 31337: return 'Local';
      case 11155111: return 'Sepolia';
      default: return `Chain ${chainId}`;
    }
  };

  if (connected && account) {
    return (
      <div className="flex items-center gap-3">
        {/* FHEVM Status - only show if not ready */}
        {!isReady && (
          <div className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            FHEVM: {fhevmStatus}
          </div>
        )}

        {/* Chain Badge */}
        <div className="hidden sm:flex text-xs px-3 py-1.5 rounded-lg font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
          {chainId && getChainName(chainId)}
        </div>

        {/* Account Badge */}
        <div className="text-sm px-4 py-2 rounded-lg font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
          {formatAddress(account)}
        </div>

        {/* Disconnect Button */}
        <button
          onClick={disconnect}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:text-red-400 hover:bg-red-400/10 border border-gray-600 hover:border-red-400/50 transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => connect()}
        disabled={isConnecting}
        className="glass-button px-6 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {walletError && (
        <div className="text-xs text-red-400 max-w-xs text-right bg-red-500/10 px-3 py-1 rounded border border-red-500/30">
          {walletError}
        </div>
      )}
    </div>
  );
}

