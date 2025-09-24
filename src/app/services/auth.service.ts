import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl?.replace(/\/$/, '') ?? '';

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.buildUrl('api/v1/login'), payload, {
      withCredentials: true,
    });
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.buildUrl('api/v1/register'), payload, {
      withCredentials: true,
    });
  }

  logout(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(this.buildUrl('api/v1/logout'), {
      withCredentials: true,
    });
  }

  private buildUrl(path: string): string {
    if (!this.apiUrl) {
      return path;
    }
    return `${this.apiUrl}/${path}`;
  }
}
