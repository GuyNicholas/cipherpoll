'use client';

import { useState, useEffect, useCallback } from 'react';
import { createFhevmInstance, FhevmInstance, FhevmStatus } from '../fhevm/fhevm';
import { useWallet } from './useWallet';
import { isLocalNetwork } from '../fhevm/constants';

export function useFhevm() {
  const { connected, provider, chainId } = useWallet();
  const [fhevmInstance, setFhevmInstance] = useState<FhevmInstance | null>(null);
  const [status, setStatus] = useState<FhevmStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Initialize FHEVM instance when wallet is connected
  useEffect(() => {
    if (!connected || !provider || !chainId) {
      setFhevmInstance(null);
      setStatus('idle');
      setError(null);
      return;
    }

    let cancelled = false;

    const initInstance = async () => {
      try {
        setError(null);
        
        // For local network (Mock mode), we need Hardhat node running
        if (isLocalNetwork(chainId)) {
          console.log('[useFhevm] Detected local network (chainId:', chainId, '). Using Mock mode.');
          setStatus('creating');
        } else {
          console.log('[useFhevm] Detected non-local network (chainId:', chainId, '). Using Relayer SDK.');
          setStatus('sdk-loading');
        }

        const instance = await createFhevmInstance(provider, (newStatus) => {
          if (!cancelled) {
            setStatus(newStatus);
          }
        });

        if (!cancelled) {
          setFhevmInstance(instance);
          setStatus('ready');
          console.log('[useFhevm] FHEVM instance ready');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[useFhevm] Failed to initialize FHEVM:', err);
          
          // Provide user-friendly error messages
          let errorMessage = err.message || 'Failed to initialize FHEVM';
          
          if (err.code === 'MOCK_METADATA_NOT_FOUND') {
            errorMessage = err.message; // Use the detailed message from fhevm.ts
          } else if (isLocalNetwork(chainId)) {
            errorMessage = 'Failed to initialize Mock FHEVM. ' + errorMessage;
          } else if (err.code === 'SDK_NOT_LOADED' || err.code === 'SDK_INIT_FAILED') {
            errorMessage = 'Failed to load Relayer SDK. This may be due to network issues or CORS policy. ' + errorMessage;
          } else {
            errorMessage = 'FHEVM initialization failed: ' + errorMessage;
          }
          
          setError(errorMessage);
          setStatus('error');
        }
      }
    };

    initInstance();

    return () => {
      cancelled = true;
    };
  }, [connected, provider, chainId]);

  // Retry initialization
  const retry = useCallback(() => {
    if (connected && provider) {
      setError(null);
      setStatus('idle');
      // Trigger re-initialization via useEffect
      setFhevmInstance(null);
    }
  }, [connected, provider]);

  return {
    instance: fhevmInstance,
    status,
    error,
    isReady: status === 'ready' && fhevmInstance !== null,
    isLoading: status !== 'idle' && status !== 'ready' && status !== 'error',
    retry,
  };
}

