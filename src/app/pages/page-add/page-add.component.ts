import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { Apiservice } from '../../services/api.service';
import { SignalStore } from '../../services/signal-store';
import { LANG } from '../../lang.token';
import { prepareSlug, PageFormValue } from '../../utils/page-utils';
import { marked } from 'marked';

@Component({
  selector: 'app-page-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './page-add.component.html',
  styleUrl: './page-add.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageAddComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Apiservice);
  private readonly store = inject(SignalStore);
  private readonly langSignal = inject(LANG);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly user = this.store.user;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    metaTitle: [''],
    image: [''],
    description: [''],
    url: [''],
    position: [''],
    hidden: ['false'],
    onlyHTML: ['false'],
    content: ['# T', [Validators.required]],
  });

  readonly pending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showPreview = signal(true);

  private readonly formValueChanges = toSignal<PageFormValue>(
    this.form.valueChanges as unknown as import('rxjs').Observable<PageFormValue>,
    {
      initialValue: this.form.getRawValue() as any,
    }
  );

  readonly draftValues = computed(() => this.formValueChanges() ?? this.form.getRawValue());

  readonly draftSlug = computed(() => {
    const { title } = this.draftValues();
    const candidate = title?.trim() ? prepareSlug(title) : '';
    return candidate;
  });

  readonly targetUrl = computed(() => {
    const slug = this.draftSlug();
    if (!slug) {
      return '';
    }
    return slug === 'home' ? '/' : `/${slug}`;
  });

  readonly previewContent: Signal<SafeHtml | null> = computed(() => {
    if (!this.showPreview()) {
      return null;
    }
    const content = this.draftValues().content ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(content) as string);
  });

  togglePreview() {
    this.showPreview.update((state) => !state);
  }

  onSubmit() {
    if (this.pending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const lang = this.langSignal();
    const payload = this.form.getRawValue();

    const body = {
      ...payload,
      slug: prepareSlug(payload.title),
      lang,
    };

    this.pending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .createPage(body)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to create page.');
          return;
        }
        if (response?.message) {
          this.errorMessage.set(String(response.message));
          return;
        }
        this.successMessage.set('Page created successfully.');
        this.store.getPages();
        this.router.navigateByUrl('/');
      });
  }
}
