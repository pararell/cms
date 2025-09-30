import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformServer } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import type { Request as ExpressRequest } from 'express';
import { environment } from '../../environments/environment';
import { catchError, map, of } from 'rxjs';
import { TOKEN } from '../user.token';
import { LANG } from '../lang.token';

export interface ExpensePayload {
  title: string;
  value: string;
  description?: string;
  categories?: string;
  repeat?: string;
  currency?: string;
  lastPayment?: string;
  slug?: string;
  id?: number;
}

export interface NotePayload {
  title: string;
  content: string;
  categories?: string;
  position?: string;
  hidden?: string;
  date?: string;
  slug?: string;
  id?: number;
}

@Injectable({
  providedIn: 'root',
})
export class Apiservice {
  apiUrl = environment.apiUrl;
  token = inject(TOKEN);
  lang = inject(LANG);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly serverRequest = inject(REQUEST, { optional: true }) as ExpressRequest | any;

  private readonly http = inject(HttpClient);

  private readServerCookie(name: string): string | null {
    const cookieHeader = this.getServerCookieHeader();
    if (!cookieHeader) {
      return null;
    }

    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [rawKey, ...rawValue] = pair.split('=');
      if (!rawKey) {
        continue;
      }
      if (rawKey.trim() === name) {
        const joined = rawValue.join('=').trim();
        if (!joined) {
          return '';
        }
        try {
          return decodeURIComponent(joined);
        } catch {
          return joined;
        }
      }
    }
    return null;
  }

  private getServerCookieHeader(): string | null {
    if (!this.serverRequest?.headers) {
      return null;
    }
    const cookieHeader = this.serverRequest.headers.get('cookie');

    if (Array.isArray(cookieHeader)) {
      return cookieHeader.join(';');
    }
    return cookieHeader ?? null;
  }

  private buildAuthOptions(): { headers: HttpHeaders; withCredentials: boolean } {
    const headerEntries: Record<string, string> = {};
    const tokenValue = this.token();

    if (tokenValue) {
      headerEntries['Authorization'] = `Bearer ${tokenValue}`;
    }

    let langValue = (() => {
      const value = this.lang();
      return typeof value === 'string' && value.trim() ? value.trim() : 'en';
    })();

    if (isPlatformServer(this.platformId)) {
      const cookieLang = this.readServerCookie('lang');
      const cookieToken = this.readServerCookie('token');
      const mode = this.readServerCookie('mode');
      if (mode) {
        headerEntries['mode'] = mode;
      }

      if (cookieToken && cookieToken.trim()) {
        headerEntries['Authorization'] = `Bearer ${cookieToken.trim()}`;
      }

      if (cookieLang && cookieLang.trim()) {
        langValue = cookieLang.trim();
      }

      const cookieHeader = this.getServerCookieHeader();
      if (cookieHeader) {
        headerEntries['x-forwarded-cookie'] = cookieHeader;
      }
    }

    headerEntries['Accept'] = 'application/json';
    headerEntries['accept-language'] = langValue;

    const headers = new HttpHeaders(headerEntries);
    return { headers, withCredentials: true };
  }

  getPages() {
    const options = this.buildAuthOptions();
    const url = this.apiUrl + 'api/v1/pages';
    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getBlogs() {
    const options = this.buildAuthOptions();
    const url = this.apiUrl + 'api/v1/blogs';
    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getUser() {
    const url = this.apiUrl + 'api/v1/user';
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) =>
        response ? { ...response, isAdmin: response.email === environment.adminEmail } : response
      ),
      catchError((error: Error) => of({ error }))
    );
  }

  getPage(slug: string) {
    const url = `${this.apiUrl}api/v1/pages/${encodeURIComponent(slug)}`;
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getSubPage(slug: string, subpage: string) {
    const url = `${this.apiUrl}api/v1/pages/${encodeURIComponent(slug)}/${encodeURIComponent(subpage)}`;
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  createPage(payload: Record<string, unknown>) {
    const url = this.apiUrl + 'api/v1/pages/create';
    const options = this.buildAuthOptions();
    options.headers = options.headers.set('Content-Type', 'application/json');

    return this.http.post(url, payload, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  updatePage(payload: Record<string, unknown>) {
    const url = this.apiUrl + 'api/v1/pages/update';
    const options = this.buildAuthOptions();
    options.headers = options.headers.set('Content-Type', 'application/json');

    return this.http.patch(url, payload, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  deletePage(id: number | string) {
    const url = `${this.apiUrl}api/v1/pages/delete/${id}`;
    const options = this.buildAuthOptions();

    return this.http.delete(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getExpenses() {
    const url = this.apiUrl + 'api/v1/expenses';
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getExpense(slug: string) {
    const url = `${this.apiUrl}api/v1/expenses/${encodeURIComponent(slug)}`;
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  createExpense(payload: ExpensePayload) {
    const url = this.apiUrl + 'api/v1/expenses/create';
    const options = this.buildAuthOptions();
    options.headers = options.headers.set('Content-Type', 'application/json');

    return this.http.post(url, payload, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  updateExpense(payload: ExpensePayload) {
    const url = this.apiUrl + 'api/v1/expenses/update';
    const options = this.buildAuthOptions();
    options.headers = options.headers.set('Content-Type', 'application/json');

    return this.http.patch(url, payload, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  deleteExpense(id: number | string) {
    const url = `${this.apiUrl}api/v1/expenses/delete/${id}`;
    const options = this.buildAuthOptions();

    return this.http.delete(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getNotes() {
    const url = this.apiUrl + 'api/v1/notes';
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getNote(slug: string) {
    const url = `${this.apiUrl}api/v1/notes/${encodeURIComponent(slug)}`;
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  createNote(payload: NotePayload) {
    const url = this.apiUrl + 'api/v1/notes/create';
    const options = this.buildAuthOptions();
    options.headers = options.headers.set('Content-Type', 'application/json');

    return this.http.post(url, payload, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  updateNote(payload: NotePayload) {
    const url = this.apiUrl + 'api/v1/notes/update';
    const options = this.buildAuthOptions();
    options.headers = options.headers.set('Content-Type', 'application/json');

    return this.http.patch(url, payload, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  deleteNote(id: number | string) {
    const url = `${this.apiUrl}api/v1/notes/delete/${id}`;
    const options = this.buildAuthOptions();

    return this.http.delete(url, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getExchangeRates(base: string = 'eur') {
    const normalizedBase = base.toLowerCase();
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${encodeURIComponent(normalizedBase)}.json`;
    const headers = new HttpHeaders().set('Accept', 'application/json');

    return this.http.get(url, { headers, withCredentials: false }).pipe(
      map((response: any) => response),
      catchError(() => of(null))
    );
  }

  sendContact(payload: { subject: string; note: string; email: string }) {
    const url = this.apiUrl + 'api/v1/contact';
    const options = this.buildAuthOptions();
    options.headers = options.headers.set('Content-Type', 'application/json');

    return this.http.post(url, payload, options).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }
}
