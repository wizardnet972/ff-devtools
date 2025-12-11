export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
  updatedBy?: 'app' | 'extension';
  baselineEnabled?: boolean;
}

export interface FeatureFlagsMessage {
  source: string;
  type: string;
  features?: FeatureFlag[];
}
