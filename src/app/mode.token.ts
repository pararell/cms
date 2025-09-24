import { InjectionToken, WritableSignal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

export const MODE = new InjectionToken<WritableSignal<ThemeMode>>('MODE');
