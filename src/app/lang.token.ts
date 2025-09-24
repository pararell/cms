import { InjectionToken, WritableSignal } from '@angular/core';

export const LANG = new InjectionToken<WritableSignal<string>>('LANG');
