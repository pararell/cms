import { ApplicationConfig, inject, PLATFORM_ID, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MODE, ThemeMode } from './mode.token';
import { LANG } from './lang.token';
import { isPlatformBrowser } from '@angular/common';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    {
      provide: MODE,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        const coerceMode = (value?: string): ThemeMode => (value === 'dark' ? 'dark' : 'light');

        if (isPlatformBrowser(platformId)) {
          const cookieMatch = document.cookie.match(/(?:^|;\s*)mode=([^;]*)/);
          return signal<ThemeMode>(coerceMode(cookieMatch?.[1]));
        }

        return signal<ThemeMode>('light');
      },
    },
    { provide: LANG, useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        if (isPlatformBrowser(platformId)) {
          const cookieMatch = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
          return signal<string>(cookieMatch?.[1]);
        }
        return signal<string>('en');
      },
    },
  ]
};
