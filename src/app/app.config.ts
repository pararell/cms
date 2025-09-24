import {
  ApplicationConfig,
  ENVIRONMENT_INITIALIZER,
  inject,
  PLATFORM_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MODE, ThemeMode } from './mode.token';
import { LANG } from './lang.token';
import { isPlatformBrowser } from '@angular/common';
import { TOKEN } from './user.token';

const readCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match?.[1] ?? null;
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    { provide: MODE, useFactory: () => signal<ThemeMode>('light') },
    { provide: LANG, useFactory: () => signal<string>('en') },
    { provide: TOKEN, useFactory: () => signal<string>('') },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        const mode = inject(MODE);
        const lang = inject(LANG);
        const token = inject(TOKEN);

        return () => {
          if (!isPlatformBrowser(platformId)) {
            return;
          }

          const nextMode = readCookie('mode');
          if (nextMode) {
            mode.set(nextMode === 'dark' ? 'dark' : 'light');
          }

          const nextLang = readCookie('lang');
          if (nextLang) {
            lang.set(nextLang.trim() || 'en');
          }

          const nextToken = readCookie('token');
          if (nextToken !== null) {
            token.set(nextToken);
          }
        };
      },
    },
  ],
};
