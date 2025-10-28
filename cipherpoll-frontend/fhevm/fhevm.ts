// FHEVM Instance Management with proper Relayer SDK integration
import { JsonRpcProvider, Eip1193Provider, isAddress } from 'ethers';
import { isLocalNetwork } from './constants';
import { RelayerSDKLoader, isFhevmWindowType } from './RelayerSDKLoader';
import { publicKeyStorageGet, publicKeyStorageSet } from './PublicKeyStorage';

// Using any for FhevmInstance to support both Mock and Relayer SDK
export type FhevmInstance = any;

export type FhevmStatus = 
  | 'idle'
  | 'sdk-loading'
  | 'sdk-loaded'
  | 'sdk-initializing'
  | 'sdk-initialized'
  | 'creating'
  | 'ready'
  | 'error';

export class FhevmError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message);
    this.code = code;
    this.name = 'FhevmError';
  }
}

// Check if SDK is initialized
function isFhevmInitialized(): boolean {
  if (typeof window === 'undefined' || !isFhevmWindowType(window, console.log)) {
    return false;
  }
  return (window as any).relayerSDK.__initialized__ === true;
}

// Get chainId from provider
async function getChainId(provider: Eip1193Provider | string): Promise<number> {
  if (typeof provider === 'string') {
    const rpc = new JsonRpcProvider(provider);
    const network = await rpc.getNetwork();
    return Number(network.chainId);
  }
  const chainIdHex = await provider.request({ method: 'eth_chainId' });
  return parseInt(chainIdHex as string, 16);
}

// Try to fetch FHEVM metadata from local Hardhat node
async function tryFetchFhevmMetadata(rpcUrl: string): Promise<any | undefined> {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    // Check if it's a Hardhat node
    const clientVersion = await rpc.send('web3_clientVersion', []);
    if (!clientVersion || typeof clientVersion !== 'string' || !clientVersion.toLowerCase().includes('hardhat')) {
      return undefined;
    }

    // Try to get FHEVM metadata
    const metadata = await rpc.send('fhevm_relayer_metadata', []);
    if (metadata && 
        typeof metadata === 'object' &&
        'ACLAddress' in metadata &&
        'InputVerifierAddress' in metadata &&
        'KMSVerifierAddress' in metadata) {
      console.log('[tryFetchFhevmMetadata] Metadata retrieved successfully:', metadata);
      return metadata;
    }
    console.warn('[tryFetchFhevmMetadata] Metadata validation failed or is empty');
    return undefined;
  } catch (e) {
    console.warn('[tryFetchFhevmMetadata] Failed to fetch metadata:', e instanceof Error ? e.message : e);
    return undefined;
  } finally {
    rpc.destroy();
  }
}

// Check if Relayer SDK is loaded
function isRelayerSDKLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.isLoaded();
}

// Load Relayer SDK
async function loadRelayerSDK(): Promise<void> {
  console.log('[loadRelayerSDK] Loading Relayer SDK from CDN');
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
}

// Initialize Relayer SDK
async function initRelayerSDK(): Promise<void> {
  console.log('[initRelayerSDK] Initializing Relayer SDK');
  if (!isRelayerSDKLoaded()) {
    throw new FhevmError('SDK_NOT_LOADED', 'Relayer SDK is not loaded');
  }

  const sdk = (window as any).relayerSDK;
  if (sdk.__initialized__) {
    console.log('[initRelayerSDK] SDK already initialized');
    return;
  }

  const result = await sdk.initSDK();
  sdk.__initialized__ = result;
  if (!result) {
    throw new FhevmError('SDK_INIT_FAILED', 'Failed to initialize Relayer SDK');
  }
  console.log('[initRelayerSDK] SDK initialized successfully');
}

function checkIsAddress(a: unknown): a is `0x${string}` {
  if (typeof a !== 'string') {
    return false;
  }
  if (!isAddress(a)) {
    return false;
  }
  return true;
}

/**
 * Create FHEVM instance with automatic Mock/Relayer detection
 * 
 * Logic:
 * - If chainId === 31337 AND fhevm_relayer_metadata exists → use @fhevm/mock-utils
 * - Otherwise → use @zama-fhe/relayer-sdk with network config
 */
export async function createFhevmInstance(
  provider: Eip1193Provider | string,
  onStatusChange?: (status: FhevmStatus) => void
): Promise<FhevmInstance> {
  const notify = (status: FhevmStatus) => {
    if (onStatusChange) onStatusChange(status);
  };

  try {
    // Step 1: Get chainId
    const chainId = await getChainId(provider);
    console.log('[createFhevmInstance] chainId:', chainId);
    
    // Step 2: Check if it's a local mock chain
    if (isLocalNetwork(chainId)) {
      console.log('[createFhevmInstance] Local network detected, attempting Mock mode');
      
      // Get RPC URL
      let rpcUrl: string;
      if (typeof provider === 'string') {
        rpcUrl = provider;
      } else {
        // Default to localhost:8545 for local network
        rpcUrl = 'http://127.0.0.1:8545';
      }
      
      console.log('[createFhevmInstance] Trying to fetch FHEVM metadata from:', rpcUrl);
      const metadata = await tryFetchFhevmMetadata(rpcUrl);

      if (metadata) {
        console.log('[createFhevmInstance] FHEVM metadata found:', metadata);
        notify('creating');
        
        // Use Mock Utils (dynamic import to avoid bundling in production)
        const { MockFhevmInstance } = await import('@fhevm/mock-utils');
        const { JsonRpcProvider } = await import('ethers');
        
        const mockProvider = new JsonRpcProvider(rpcUrl);
        const mockInstance = await MockFhevmInstance.create(mockProvider, mockProvider, {
          aclContractAddress: metadata.ACLAddress,
          chainId,
          gatewayChainId: 55815,
          inputVerifierContractAddress: metadata.InputVerifierAddress,
          kmsContractAddress: metadata.KMSVerifierAddress,
          verifyingContractAddressDecryption: '0x5ffdaAB0373E62E2ea2944776209aEf29E631A64',
          verifyingContractAddressInputVerification: '0x812b06e1CDCE800494b79fFE4f925A504a9A9810',
        });

        console.log('[createFhevmInstance] Mock instance created successfully');
        notify('ready');
        return mockInstance;
      } else {
        console.error('[createFhevmInstance] No FHEVM metadata found on local network');
        throw new FhevmError(
          'MOCK_METADATA_NOT_FOUND',
          'Could not find FHEVM metadata on local network. Please ensure:\n' +
          '1. Hardhat node is running (npx hardhat node)\n' +
          '2. FHEVM plugin is properly configured\n' +
          '3. Contracts are deployed'
        );
      }
    }

    // Step 3: Use Relayer SDK for non-mock chains
    if (!isRelayerSDKLoaded()) {
      notify('sdk-loading');
      await loadRelayerSDK();
      notify('sdk-loaded');
    }

    if (!isFhevmInitialized()) {
      notify('sdk-initializing');
      await initRelayerSDK();
      notify('sdk-initialized');
    }

    notify('creating');
    const relayerSDK = (window as any).relayerSDK;

    const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
    if (!checkIsAddress(aclAddress)) {
      throw new Error(`Invalid ACL address: ${aclAddress}`);
    }

    const stored = await publicKeyStorageGet(aclAddress);
    
    const config: any = {
      ...relayerSDK.SepoliaConfig,
      network: provider,
      ...(stored.publicKey && { publicKey: stored.publicKey }),
      ...(stored.publicParams && { publicParams: stored.publicParams }),
    };

    const instance = await relayerSDK.createInstance(config);

    // Save the public key and params
    const publicKey = instance.getPublicKey();
    const publicParams = instance.getPublicParams(2048);
    await publicKeyStorageSet(aclAddress, publicKey, publicParams);

    notify('ready');
    return instance;
  } catch (error) {
    notify('error');
    if (error instanceof FhevmError) {
      throw error;
    }
    throw new FhevmError('CREATE_INSTANCE_FAILED', `Failed to create FHEVM instance: ${error}`);
  }
}

// Decryption signature storage (per account)
export function getDecryptionSignature(account: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`fhevm.decryptionSignature.${account.toLowerCase()}`);
}

export function storeDecryptionSignature(account: string, signature: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`fhevm.decryptionSignature.${account.toLowerCase()}`, signature);
}

export function clearDecryptionSignature(account: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`fhevm.decryptionSignature.${account.toLowerCase()}`);
}
