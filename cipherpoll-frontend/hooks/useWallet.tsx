'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';

// Wallet state interface
interface WalletState {
  connected: boolean;
  account: string | null;
  chainId: number | null;
  provider: Eip1193Provider | null;
  signer: JsonRpcSigner | null;
}

// EIP-6963 Provider Info
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: Eip1193Provider;
}

// Wallet persistence keys
const STORAGE_KEYS = {
  CONNECTED: 'wallet.connected',
  LAST_PROVIDER_UUID: 'wallet.lastProviderUUID',
  LAST_ACCOUNTS: 'wallet.lastAccounts',
  LAST_CHAIN_ID: 'wallet.lastChainId',
};

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    account: null,
    chainId: null,
    provider: null,
    signer: null,
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Map<string, EIP6963ProviderDetail>>(new Map());

  // Discover EIP-6963 providers
  useEffect(() => {
    const handleAnnouncement = (event: CustomEvent<EIP6963ProviderDetail>) => {
      const detail = event.detail;
      setProviders((prev) => new Map(prev).set(detail.info.uuid, detail));
    };

    window.addEventListener('eip6963:announceProvider', handleAnnouncement as EventListener);

    // Request providers to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement as EventListener);
    };
  }, []);

  // Update wallet state
  const updateWalletState = useCallback(async (provider: Eip1193Provider, uuid?: string) => {
    try {
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      const chainIdHex = await provider.request({ method: 'eth_chainId' }) as string;
      const chainId = parseInt(chainIdHex, 16);

      // Get signer
      const browserProvider = new BrowserProvider(provider);
      const signer = accounts.length > 0 ? await browserProvider.getSigner() : null;

      const newState = {
        connected: accounts.length > 0,
        account: accounts[0] || null,
        chainId,
        provider,
        signer,
      };

      setWalletState(newState);

      // Persist state
      if (accounts.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CONNECTED, 'true');
        localStorage.setItem(STORAGE_KEYS.LAST_ACCOUNTS, JSON.stringify(accounts));
        localStorage.setItem(STORAGE_KEYS.LAST_CHAIN_ID, chainId.toString());
        if (uuid) {
          localStorage.setItem(STORAGE_KEYS.LAST_PROVIDER_UUID, uuid);
        }
      }

      return newState;
    } catch (err) {
      console.error('Failed to update wallet state:', err);
      throw err;
    }
  }, []);

  // Setup provider event listeners
  const setupEventListeners = useCallback((provider: Eip1193Provider, uuid?: string) => {
    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('accountsChanged:', accounts);
      if (accounts.length === 0) {
        // Disconnected
        disconnect();
      } else {
        await updateWalletState(provider, uuid);
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      console.log('chainChanged:', chainIdHex);
      const chainId = parseInt(chainIdHex, 16);
      localStorage.setItem(STORAGE_KEYS.LAST_CHAIN_ID, chainId.toString());
      
      // Reload to reinitialize FHEVM instance with new chain
      window.location.reload();
    };

    const handleDisconnect = () => {
      console.log('disconnect');
      disconnect();
    };

    // Cast to any to access event emitter methods
    const providerAny = provider as any;
    providerAny.on?.('accountsChanged', handleAccountsChanged);
    providerAny.on?.('chainChanged', handleChainChanged);
    providerAny.on?.('disconnect', handleDisconnect);

    return () => {
      providerAny.removeListener?.('accountsChanged', handleAccountsChanged);
      providerAny.removeListener?.('chainChanged', handleChainChanged);
      providerAny.removeListener?.('disconnect', handleDisconnect);
    };
  }, [updateWalletState]);

  // Connect wallet
  const connect = useCallback(async (uuid?: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      let provider: Eip1193Provider;
      let selectedUuid: string | undefined;

      if (uuid) {
        // Connect to specific provider
        const providerDetail = providers.get(uuid);
        if (!providerDetail) {
          throw new Error('Provider not found');
        }
        provider = providerDetail.provider;
        selectedUuid = uuid;
      } else {
        // Use first available provider (or window.ethereum)
        const firstProvider = Array.from(providers.values())[0];
        if (firstProvider) {
          provider = firstProvider.provider;
          selectedUuid = firstProvider.info.uuid;
        } else if (window.ethereum) {
          provider = window.ethereum as Eip1193Provider;
        } else {
          throw new Error('No wallet provider found. Please install MetaMask or another Web3 wallet.');
        }
      }

      // Request accounts (triggers wallet popup)
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      
      if (accounts.length === 0) {
        throw new Error('No accounts available');
      }

      // Update state and setup listeners
      await updateWalletState(provider, selectedUuid);
      setupEventListeners(provider, selectedUuid);

    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [providers, updateWalletState, setupEventListeners]);

  // Silent reconnect (for page refresh)
  const silentReconnect = useCallback(async () => {
    const wasConnected = localStorage.getItem(STORAGE_KEYS.CONNECTED) === 'true';
    if (!wasConnected) return;

    const lastUuid = localStorage.getItem(STORAGE_KEYS.LAST_PROVIDER_UUID);
    
    try {
      let provider: Eip1193Provider;
      let selectedUuid: string | undefined;

      if (lastUuid) {
        const providerDetail = providers.get(lastUuid);
        if (providerDetail) {
          provider = providerDetail.provider;
          selectedUuid = lastUuid;
        } else if (window.ethereum) {
          provider = window.ethereum as Eip1193Provider;
        } else {
          return;
        }
      } else if (window.ethereum) {
        provider = window.ethereum as Eip1193Provider;
      } else {
        return;
      }

      // Silent check (no popup) using eth_accounts
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      
      if (accounts.length > 0) {
        await updateWalletState(provider, selectedUuid);
        setupEventListeners(provider, selectedUuid);
      } else {
        // No accounts available, clear persisted state
        disconnect();
      }
    } catch (err) {
      console.error('Silent reconnect failed:', err);
      disconnect();
    }
  }, [providers, updateWalletState, setupEventListeners]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWalletState({
      connected: false,
      account: null,
      chainId: null,
      provider: null,
      signer: null,
    });

    // Clear persisted state
    localStorage.removeItem(STORAGE_KEYS.CONNECTED);
    localStorage.removeItem(STORAGE_KEYS.LAST_PROVIDER_UUID);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.LAST_CHAIN_ID);

    // Clear decryption signatures
    const lastAccounts = localStorage.getItem(STORAGE_KEYS.LAST_ACCOUNTS);
    if (lastAccounts) {
      try {
        const accounts = JSON.parse(lastAccounts) as string[];
        accounts.forEach((account) => {
          localStorage.removeItem(`fhevm.decryptionSignature.${account.toLowerCase()}`);
        });
      } catch {}
    }

    setError(null);
  }, []);

  // Auto-reconnect on mount
  useEffect(() => {
    // Wait a bit for providers to be discovered
    const timer = setTimeout(() => {
      silentReconnect();
    }, 500);

    return () => clearTimeout(timer);
  }, [silentReconnect]);

  // Get ethers.js BrowserProvider
  const getBrowserProvider = useCallback(() => {
    if (!walletState.provider) {
      throw new Error('Wallet not connected');
    }
    return new BrowserProvider(walletState.provider);
  }, [walletState.provider]);

  return {
    ...walletState,
    isConnecting,
    error,
    availableProviders: Array.from(providers.values()),
    connect,
    disconnect,
    getBrowserProvider,
  };
}

