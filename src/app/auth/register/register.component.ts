import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly pending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  onSubmit() {
    if (this.pending() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const payload = this.form.getRawValue();

    this.authService
      .register(payload)
      .pipe(
        finalize(() => this.pending.set(false))
      )
      .subscribe({
        next: () => {
          this.successMessage.set('Registration successful. You can now sign in.');
          if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => this.router.navigateByUrl('/auth/login'), 500);
          } else {
            this.router.navigateByUrl('/auth/login');
          }
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string') {
        return error.error;
      }
      if (error.error?.error) {
        return String(error.error.error);
      }
      if (error.status === 0) {
        return 'Unable to reach the server. Please try again later.';
      }
    }
    return 'Registration failed. Please check your details and try again.';
  }
}
