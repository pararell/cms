import { InjectionToken, WritableSignal } from '@angular/core';

export const TOKEN = new InjectionToken<WritableSignal<string>>('TOKEN');
