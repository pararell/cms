import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { TOKEN } from '../../user.token';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly tokenSignal = inject(TOKEN, { optional: true });

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly pending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  onSubmit() {
    if (this.pending() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.errorMessage.set(null);
    const payload = this.form.getRawValue();

    this.authService
      .login(payload)
      .pipe(
        finalize(() => this.pending.set(false))
      )
      .subscribe({
        next: (response) => {
          const token = this.extractToken(response);
          if (!token) {
            this.errorMessage.set('Login succeeded but no token was returned.');
            return;
          }
          this.persistToken(token);
          this.router.navigateByUrl('/');
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private persistToken(token: string) {
    if (this.tokenSignal) {
      this.tokenSignal.set(token);
    }
    if (isPlatformBrowser(this.platformId)) {
      document.cookie = `token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
    }
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string') {
        return error.error;
      }
      if (error.status === 0) {
        return 'Unable to reach the server. Please try again later.';
      }
    }
    return 'Invalid email or password.';
  }

  private extractToken(response: any): string | null {
    if (response && typeof response === 'object' && 'token' in response) {
      const value = response.token;
      if (typeof value === 'string') {
        return value;
      }
    }
    return null;
  }
}
