import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  EnvironmentProviders,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { FeatureFlagsService } from './services/feature-flags.service';

export function provideFeatureFlagsDevtools(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const ff = inject(FeatureFlagsService);
    ff.setupMessageListener();
    ff.loadFeatureFlags();
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(),
    provideFeatureFlagsDevtools(),
  ],
};
