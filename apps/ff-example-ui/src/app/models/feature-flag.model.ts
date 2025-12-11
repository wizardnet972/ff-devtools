export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  /** Original baseline value from the server */
  baselineEnabled?: boolean;
}

export interface FeatureFlagsMessage {
  source: string;
  type: string;
  features?: FeatureFlag[];
  key?: string;
  enabled?: boolean;
  overrides?: Array<{ key: string; enabled: boolean }>;
}

