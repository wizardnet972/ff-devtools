import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  public themeMode = signal<ThemeMode>('system');
  public isDarkMode = signal<boolean>(false);

  private systemPreferenceQuery: MediaQueryList | null = null;
  private systemPreferenceListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;

    if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
      this.themeMode.set(savedTheme);
    } else {
      this.themeMode.set('system');
    }

    this.initializeSystemPreference();

    this.updateDarkMode();

    effect(() => {
      this.updateDarkMode();
      this.applyTheme();
    });
  }

  private initializeSystemPreference(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    this.systemPreferenceQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.systemPreferenceListener = (e: MediaQueryListEvent) => {
      if (this.themeMode() === 'system') {
        this.isDarkMode.set(e.matches);
        this.applyTheme();
      }
    };

    this.systemPreferenceQuery.addEventListener('change', this.systemPreferenceListener);
  }

  private updateDarkMode(): void {
    const mode = this.themeMode();

    if (mode === 'system') {
      if (this.systemPreferenceQuery) {
        this.isDarkMode.set(this.systemPreferenceQuery.matches);
      } else if (typeof window !== 'undefined' && window.matchMedia) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.isDarkMode.set(prefersDark);
      } else {
        this.isDarkMode.set(false);
      }
    } else {
      this.isDarkMode.set(mode === 'dark');
    }
  }

  public cycleTheme(): void {
    const current = this.themeMode();
    let next: ThemeMode;

    if (current === 'system') {
      next = 'light';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'system';
    }

    this.setTheme(next);
  }

  public setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    localStorage.setItem('theme', mode);
  }

  public getThemeIcon(): string {
    const mode = this.themeMode();
    if (mode === 'system') {
      return 'system';
    } else if (mode === 'dark') {
      return 'dark';
    } else {
      return 'light';
    }
  }

  public getThemeLabel(): string {
    const mode = this.themeMode();
    if (mode === 'system') {
      return 'System';
    } else if (mode === 'dark') {
      return 'Dark';
    } else {
      return 'Light';
    }
  }

  private applyTheme(): void {
    const html = document.documentElement;

    if (this.isDarkMode()) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  ngOnDestroy(): void {
    if (this.systemPreferenceQuery && this.systemPreferenceListener) {
      this.systemPreferenceQuery.removeEventListener('change', this.systemPreferenceListener);
    }
  }
}
