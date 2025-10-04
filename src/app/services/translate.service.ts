import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TranslateService {
  private currentLang = new BehaviorSubject<string>('en');
  translations: Record<string, string> = {};

  constructor(private http: HttpClient) {
  }

  setLang(lang: string) {
    this.currentLang.next(lang);
    this.http.get<Record<string, string>>(`/public/i18n/${lang}.json`).subscribe((t) => {
      this.translations = t;
    });
  }

  get currentLanguage() {
    return this.currentLang.asObservable();
  }

  translate(key: string): string {
    return this.translations[key] || key;
  }
}
