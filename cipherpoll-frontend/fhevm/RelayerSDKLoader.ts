const SDK_CDN_URL = 'https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs';

type TraceType = (message?: unknown, ...optionalParams: unknown[]) => void;

export class RelayerSDKLoader {
  private _trace?: TraceType;

  constructor(options: { trace?: TraceType }) {
    this._trace = options.trace;
  }

  public isLoaded() {
    if (typeof window === 'undefined') {
      throw new Error('RelayerSDKLoader: can only be used in the browser.');
    }
    return isFhevmWindowType(window, this._trace);
  }

  public load(): Promise<void> {
    console.log('[RelayerSDKLoader] load...');
    // Ensure this only runs in the browser
    if (typeof window === 'undefined') {
      console.log('[RelayerSDKLoader] window === undefined');
      return Promise.reject(
        new Error('RelayerSDKLoader: can only be used in the browser.')
      );
    }

    if ('relayerSDK' in window) {
      if (!isFhevmRelayerSDKType((window as any).relayerSDK, this._trace)) {
        console.log('[RelayerSDKLoader] window.relayerSDK === undefined');
        throw new Error('RelayerSDKLoader: Unable to load FHEVM Relayer SDK');
      }
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        `script[src="${SDK_CDN_URL}"]`
      );
      if (existingScript) {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(
            new Error(
              'RelayerSDKLoader: window object does not contain a valid relayerSDK object.'
            )
          );
        }
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = SDK_CDN_URL;
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        if (!isFhevmWindowType(window, this._trace)) {
          console.log('[RelayerSDKLoader] script onload FAILED...');
          reject(
            new Error(
              `RelayerSDKLoader: Relayer SDK script has been successfully loaded from ${SDK_CDN_URL}, however, the window.relayerSDK object is invalid.`
            )
          );
        }
        resolve();
      };

      script.onerror = () => {
        console.log('[RelayerSDKLoader] script onerror... ');
        reject(
          new Error(
            `RelayerSDKLoader: Failed to load Relayer SDK from ${SDK_CDN_URL}`
          )
        );
      };

      console.log('[RelayerSDKLoader] add script to DOM...');
      document.head.appendChild(script);
      console.log('[RelayerSDKLoader] script added!');
    });
  }
}

function isFhevmRelayerSDKType(o: unknown, trace?: TraceType): boolean {
  if (typeof o === 'undefined') {
    trace?.('RelayerSDKLoader: relayerSDK is undefined');
    return false;
  }
  if (o === null) {
    trace?.('RelayerSDKLoader: relayerSDK is null');
    return false;
  }
  if (typeof o !== 'object') {
    trace?.('RelayerSDKLoader: relayerSDK is not an object');
    return false;
  }
  if (!('initSDK' in o) || typeof (o as any).initSDK !== 'function') {
    trace?.('RelayerSDKLoader: relayerSDK.initSDK is invalid');
    return false;
  }
  if (!('createInstance' in o) || typeof (o as any).createInstance !== 'function') {
    trace?.('RelayerSDKLoader: relayerSDK.createInstance is invalid');
    return false;
  }
  if (!('SepoliaConfig' in o) || typeof (o as any).SepoliaConfig !== 'object') {
    trace?.('RelayerSDKLoader: relayerSDK.SepoliaConfig is invalid');
    return false;
  }
  if ('__initialized__' in o) {
    const init = (o as any).__initialized__;
    if (init !== true && init !== false) {
      trace?.('RelayerSDKLoader: relayerSDK.__initialized__ is invalid');
      return false;
    }
  }
  return true;
}

export function isFhevmWindowType(win: unknown, trace?: TraceType): boolean {
  if (typeof win === 'undefined') {
    trace?.('RelayerSDKLoader: window object is undefined');
    return false;
  }
  if (win === null) {
    trace?.('RelayerSDKLoader: window object is null');
    return false;
  }
  if (typeof win !== 'object') {
    trace?.('RelayerSDKLoader: window is not an object');
    return false;
  }
  if (!('relayerSDK' in win)) {
    trace?.('RelayerSDKLoader: window does not contain relayerSDK property');
    return false;
  }
  return isFhevmRelayerSDKType((win as any).relayerSDK);
}



