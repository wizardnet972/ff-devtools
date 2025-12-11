import { Injectable, NgZone, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { delay, of } from 'rxjs';
import { FeatureFlag, FeatureFlagsMessage } from '../models/feature-flag.model';

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagsService {
  private ngZone = inject(NgZone);
  private http = inject(HttpClient);
  private _flags = signal<Map<string, FeatureFlag>>(new Map());
  public flags = this._flags.asReadonly();
  private _initialFlags: FeatureFlag[] = [];
  private readonly STORAGE_KEY = 'feature-flags-overrides';

  private readonly mockFlags: FeatureFlag[] = [
    {
      key: 'API_V2',
      name: 'API Version 2',
      description: 'Use the new API v2 endpoints',
      enabled: true,
      category: 'Backend',
    },
    {
      key: 'REAL_TIME_UPDATES',
      name: 'Real-time Updates',
      description: 'Enable WebSocket connections for real-time data',
      enabled: false,
      category: 'Backend',
    },
    {
      key: 'NEW_DASHBOARD',
      name: 'New Dashboard',
      description: 'Enable the redesigned dashboard UI with modern components',
      enabled: true,
      category: 'UI',
    },
    {
      key: 'DARK_MODE',
      name: 'Dark Mode',
      description: 'Enable dark mode theme across the application',
      enabled: false,
      category: 'UI',
    },
    {
      key: 'ADVANCED_ANALYTICS',
      name: 'Advanced Analytics',
      description: 'Enable advanced analytics and reporting features',
      enabled: true,
      category: 'Features',
    },
    {
      key: 'BETA_SEARCH',
      name: 'Beta Search',
      description: 'New search algorithm with fuzzy matching',
      enabled: false,
      category: 'Features',
    },
    {
      key: 'EXPERIMENTAL_FEATURE_A',
      name: 'Experimental Feature A',
      description: 'Testing new experimental functionality',
      enabled: false,
      category: 'Experimental',
    },
    {
      key: 'EXPERIMENTAL_FEATURE_B',
      name: 'Experimental Feature B',
      description: 'Another experimental feature in development',
      enabled: false,
      category: 'Experimental',
    },
  ];

  loadFeatureFlags(): void {
    // Mock HTTP call with 1000ms delay
    // Create deep copy of mockFlags to ensure server data is never mutated
    const serverFlags = this.mockFlags.map((f) => ({ ...f }));
    of(serverFlags)
      .pipe(delay(2 * 1000))
      .subscribe({
        next: (flags) => this.applyFlags(flags, true),
        error: (err) => {
          console.error('[Demo App] Error loading feature flags:', err);
        },
      });
  }

  private applyFlags(flags: FeatureFlag[], sendToExtension: boolean): void {
    // Store baseline flags from server
    this._initialFlags = flags.map((f) => ({ ...f }));

    // Load overrides from localStorage
    const overrides = this.loadOverridesFromStorage();

    // Merge server flags with localStorage overrides
    const mergedFlags = flags.map((flag) => {
      const override = overrides.get(flag.key);
      if (override !== undefined) {
        return { ...flag, enabled: override };
      }
      return flag;
    });

    const flagsMap = new Map(mergedFlags.map((f) => [f.key, f]));
    this._flags.set(flagsMap);
    console.log(
      '[Demo App] Feature flags set (baseline + localStorage overrides applied)'
    );

    if (sendToExtension) {
      // Send baseline flags (from server only) to extension
      this.sendFeatureFlagsToExtension();
    }
  }

  private loadOverridesFromStorage(): Map<string, boolean> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const overrides = JSON.parse(stored);
        return new Map(Object.entries(overrides));
      }
    } catch (err) {
      console.error(
        '[Demo App] Error loading overrides from localStorage:',
        err
      );
    }
    return new Map();
  }

  private saveOverridesToStorage(overrides: Map<string, boolean>): void {
    try {
      console.log('[Demo App] Saving overrides to localStorage:', overrides);
      const overridesObj = Object.fromEntries(overrides);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(overridesObj));
    } catch (err) {
      console.error('[Demo App] Error saving overrides to localStorage:', err);
    }
  }

  private getCurrentOverrides(): Map<string, boolean> {
    const overrides = new Map<string, boolean>();
    const currentFlags = this._flags();
    const initialFlags = this._initialFlags;

    currentFlags.forEach((flag, key) => {
      const baseline = initialFlags.find((f) => f.key === key);
      if (baseline && flag.enabled !== baseline.enabled) {
        overrides.set(key, flag.enabled);
      }
    });

    return overrides;
  }

  setupMessageListener(): void {
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      // Only accept messages from the same window
      if (event.source !== window) {
        return;
      }

      this.ngZone.run(() => {
        const message = event.data as FeatureFlagsMessage;

        if (message?.source !== 'feature-flags-extension') {
          return;
        }

        console.log('[Demo App] Received message from extension:', message);

        if (message.type === 'REQUEST_FEATURES') {
          console.log('[Demo App] Extension requested feature flags');
          this.sendFeatureFlagsToExtension();
          return;
        }

        if (message.type === 'RELOAD_FEATURES') {
          console.log(
            '[Demo App] Extension requested reload - fetching from mock API'
          );
          localStorage.removeItem(this.STORAGE_KEY);
          // Create deep copy of mockFlags to ensure server data is never mutated
          const serverFlags = this.mockFlags.map((f) => ({ ...f }));
          this.applyFlags(serverFlags, true);
          this.loadFeatureFlags();
          return;
        }

        if (message.type === 'CLEAR_OVERRIDES_AND_RELOAD') {
          console.log(
            '[Demo App] Extension requested clear overrides and reload - fetching from mock API'
          );
          localStorage.removeItem(this.STORAGE_KEY);
          // Create deep copy of mockFlags to ensure server data is never mutated
          const serverFlags = this.mockFlags.map((f) => ({ ...f }));
          this.applyFlags(serverFlags, true);
          this.loadFeatureFlags();
          return;
        }

        if (message.type === 'TOGGLE_FEATURE') {
          console.log(
            '[Demo App] Extension toggled feature:',
            message.key,
            message.enabled
          );
          if (message.key == null || message.enabled == null) {
            return;
          }
          this.updateFlag(message.key, message.enabled);
          return;
        }

        if (message.type === 'APPLY_OVERRIDES') {
          console.log(
            '[Demo App] Extension applying overrides:',
            message.overrides
          );
          if (!message.overrides || message.overrides.length === 0) {
            return;
          }

          message.overrides.forEach(
            (override: { key: string; enabled: boolean }) => {
              const currentFlag = this._flags().get(override.key);
              if (currentFlag && currentFlag.enabled !== override.enabled) {
                this.updateFlag(override.key, override.enabled);
              }
            }
          );
        }
      });
    });

    // Send feature flags after initial load completes (1000ms delay + buffer)
    // The loadFeatureFlags() method will send flags automatically after loading

    // Also send on page visibility change (when returning to the tab)
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.ngZone.run(() => {
            this.sendFeatureFlagsToExtension();
          });
        }
      });
    });

    console.log(
      '[Demo App] Demo app ready! Open the Feature Flags extension to view and manage flags.'
    );
  }

  sendFeatureFlagsToExtension(): void {
    const currentFlags = Array.from(this._flags().values()).map((flag) => ({
      ...flag,
      baselineEnabled:
        this._initialFlags.find((f) => f.key === flag.key)?.enabled ??
        flag.enabled,
    }));

    const message: FeatureFlagsMessage = {
      source: 'feature-flags-app',
      type: 'FEATURE_FLAGS_LIST',
      features: currentFlags,
    };

    console.log(
      '[Demo App] Sending current feature flags to extension:',
      message
    );
    window.postMessage(message, '*');
  }

  private updateFlag(key: string, enabled: boolean): void {
    const currentFlags = new Map(this._flags());
    const flag = currentFlags.get(key);
    const baseline = this._initialFlags.find((f) => f.key === key);

    if (flag && baseline) {
      flag.enabled = enabled;
      currentFlags.set(key, flag);
      this._flags.set(currentFlags);

      // Update localStorage overrides
      const overrides = this.getCurrentOverrides();
      this.saveOverridesToStorage(overrides);

      // Note: sendFeatureFlagsToExtension is called by the caller
    }
  }

  getFlags(): Map<string, FeatureFlag> {
    return this._flags();
  }

  getBaselineFlag(key: string): boolean | undefined {
    const baseline = this._initialFlags.find((f) => f.key === key);
    return baseline?.enabled;
  }
}
