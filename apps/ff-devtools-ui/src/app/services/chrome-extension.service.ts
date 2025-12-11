import { Injectable, signal } from '@angular/core';
import { FeatureFlag } from '../models/feature-flag.model';

declare const chrome: any;

@Injectable({
  providedIn: 'root',
})
export class ChromeExtensionService {
  private port: any;
  public featureFlags = signal<FeatureFlag[]>([]);
  public isConnected = signal<boolean>(false);
  public isLoading = signal<boolean>(true);

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection(): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        this.port = chrome.runtime.connect({ name: 'popup' });
        this.isConnected.set(true);

        this.port.onMessage.addListener((message: any) => {
          if (message.type === 'FEATURE_FLAGS_UPDATED') {
            this.featureFlags.set(message.features || []);
            this.isLoading.set(false);
          }
        });

        this.port.onDisconnect.addListener(() => {
          this.isConnected.set(false);
        });

        this.requestFeatures();
      } else {
        this.isConnected.set(false);
        this.isLoading.set(false);
      }
    } catch (error) {
      this.isConnected.set(false);
      this.isLoading.set(false);
    }
  }

  public requestFeatures(resetOverrides = false): void {
    if (this.port) {
      this.isLoading.set(true);

      if (resetOverrides) {
        this.port.postMessage({ type: 'RESET_AND_RELOAD' });
      } else {
        this.port.postMessage({ type: 'REQUEST_FEATURES' });
      }

      setTimeout(() => {
        if (this.featureFlags().length === 0) {
          this.isLoading.set(false);
        }
      }, 500);
    }
  }

  public toggleFeature(key: string): void {
    const flag = this.featureFlags().find((f) => f.key === key);
    if (!flag) return;

    const nextEnabled = !flag.enabled;

    if (this.port) {
      this.port.postMessage({
        type: 'TOGGLE_FEATURE',
        key,
        enabled: nextEnabled,
      });
    }
  }

  public disconnect(): void {
    if (this.port) {
      this.port.disconnect();
    }
  }
}
