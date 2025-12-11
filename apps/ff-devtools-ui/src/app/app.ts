import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChromeExtensionService } from './services/chrome-extension.service';
import { ThemeService } from './services/theme.service';
import { FeatureFlag } from './models/feature-flag.model';

type FilterType = 'all' | 'enabled' | 'disabled' | 'overrides';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Feature Flags Devtools';
  
  public searchQuery = signal<string>('');
  public filterType = signal<FilterType>('all');

  public filteredFlags = computed(() => {
    let flags = this.chromeService.featureFlags();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.filterType();

    if (filter === 'enabled') {
      flags = flags.filter(f => f.enabled);
    } else if (filter === 'disabled') {
      flags = flags.filter(f => !f.enabled);
    } else if (filter === 'overrides') {
      flags = flags.filter(f => this.isOverride(f));
    }

    if (query) {
      flags = flags.filter(flag => 
        flag.name.toLowerCase().includes(query) ||
        flag.key.toLowerCase().includes(query) ||
        (flag.description && flag.description.toLowerCase().includes(query)) ||
        (flag.category && flag.category.toLowerCase().includes(query))
      );
    }

    return flags;
  });

  public groupedFeatures = computed(() => {
    const flags = this.filteredFlags();
    const groups: { [key: string]: FeatureFlag[] } = {};

    flags.forEach(flag => {
      const category = flag.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(flag);
    });

    return groups;
  });

  public categories = computed(() => {
    return Object.keys(this.groupedFeatures());
  });

  public totalFlags = computed(() => {
    return this.chromeService.featureFlags().length;
  });

  public enabledFlags = computed(() => {
    return this.chromeService.featureFlags().filter(f => f.enabled).length;
  });

  public overridesFlags = computed(() => {
    return this.chromeService.featureFlags().filter(f => this.isOverride(f)).length;
  });

  public filteredCount = computed(() => {
    return this.filteredFlags().length;
  });

  public isOverride(flag: FeatureFlag): boolean {
    if (flag.baselineEnabled === undefined) {
      return flag.updatedBy === 'extension';
    }
    return flag.enabled !== flag.baselineEnabled;
  }

  public chromeService = inject(ChromeExtensionService);
  public themeService = inject(ThemeService);

  public toggleFeature(flag: FeatureFlag): void {
    this.chromeService.toggleFeature(flag.key);
  }

  public refreshFeatures(): void {
    this.chromeService.requestFeatures(true);
  }

  public cycleTheme(): void {
    this.themeService.cycleTheme();
  }

  public getStatusColor(enabled: boolean): string {
    return enabled 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }

  public onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  public setFilter(type: FilterType): void {
    this.filterType.set(type);
  }

  public isFilterActive(type: FilterType): boolean {
    return this.filterType() === type;
  }
}
