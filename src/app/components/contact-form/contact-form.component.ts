import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Apiservice } from '../../services/api.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Apiservice);

  readonly form = this.fb.nonNullable.group({
    subject: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    note: ['', Validators.required],
  });

  readonly pending = signal(false);
  readonly resultMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  onSubmit() {
    if (this.pending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.resultMessage.set(null);
    this.errorMessage.set(null);

    const payload = this.form.getRawValue();

    this.api
      .sendContact(payload)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to send message.');
          return;
        }
        if (response?.message) {
          this.resultMessage.set(String(response.message));
          this.form.reset();
          return;
        }
        this.resultMessage.set('Message sent.');
        this.form.reset();
      });
  }
}
