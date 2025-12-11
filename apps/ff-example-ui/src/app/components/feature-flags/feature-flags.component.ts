import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureFlagsService } from '../../services/feature-flags.service';
import { FeatureFlag } from '../../models/feature-flag.model';

interface CategoryGroup {
  category: string;
  flags: FeatureFlag[];
}

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-flags.component.html',
  styleUrl: './feature-flags.component.scss',
})
export class FeatureFlagsComponent {
  private featureFlagsService = inject(FeatureFlagsService);

  categories = computed<CategoryGroup[]>(() => {
    const flags = this.featureFlagsService.flags();
    return this.updateCategories(flags);
  });

  private updateCategories(flags: Map<string, FeatureFlag>): CategoryGroup[] {
    // Group flags by category
    const categoryMap = new Map<string, FeatureFlag[]>();

    flags.forEach((flag) => {
      const category = flag.category || 'General';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      const categoryFlags = categoryMap.get(category);
      if (categoryFlags) {
        categoryFlags.push(flag);
      }
    });

    // Convert to array
    return Array.from(categoryMap.entries()).map(([category, flags]) => ({
      category,
      flags,
    }));
  }
}

