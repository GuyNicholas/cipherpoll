'use client';

import { useFhevm } from '../hooks/useFhevm';
import { useWallet } from '../hooks/useWallet';

export function FhevmErrorBanner() {
  const { error, retry, isLoading } = useFhevm();
  const { connected, chainId } = useWallet();

  if (!connected || !error) {
    return null;
  }

  const isLocalNetwork = chainId === 31337;

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl w-full px-4">
      <div className="glass-card border-2 border-red-500/50 p-6 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="text-3xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-400 mb-2">
              FHEVM Initialization Failed
            </h3>
            <p className="text-gray-300 mb-4 whitespace-pre-line">
              {error}
            </p>
            
            {isLocalNetwork && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-yellow-300 mb-2">🔧 Required Setup for Local Development:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                  <li>Start Hardhat node in terminal 1:
                    <code className="block mt-1 ml-6 bg-black/30 px-2 py-1 rounded text-xs">
                      cd fhevm-hardhat-template<br/>
                      npx hardhat node
                    </code>
                  </li>
                  <li>Deploy contracts in terminal 2:
                    <code className="block mt-1 ml-6 bg-black/30 px-2 py-1 rounded text-xs">
                      cd fhevm-hardhat-template<br/>
                      npx hardhat deploy --network localhost
                    </code>
                  </li>
                  <li>Ensure FHEVM plugin is configured in hardhat.config.ts</li>
                </ol>
              </div>
            )}
            
            <button
              onClick={retry}
              disabled={isLoading}
              className="glass-button px-6 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Retrying...' : '🔄 Retry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



