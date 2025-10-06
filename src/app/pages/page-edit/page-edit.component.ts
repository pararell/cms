import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { marked } from 'marked';
import { Apiservice } from '../../services/api.service';
import { SignalStore } from '../../services/signal-store';
import { prepareSlug, mapPageToFormValue, minifyHtml, PageFormValue } from '../../utils/page-utils';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-page-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './page-edit.component.html',
  styleUrl: './page-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Apiservice);
  private readonly store = inject(SignalStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly pages = this.store.pages;
  readonly user = this.store.user;

  readonly searchForm = this.fb.nonNullable.group({
    edit: [''],
  });

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    metaTitle: [''],
    image: [''],
    description: [''],
    url: [''],
    position: [''],
    hidden: ['false'],
    onlyHTML: ['false'],
    content: ['', Validators.required],
  });

  private readonly currentId = signal<number | null>(null);
  readonly currentSlug = signal<string | null>(null);
  readonly currentPage = signal<Record<string, unknown> | null>(null);

  readonly loading = signal(false);
  readonly pending = signal(false);
  readonly deletePending = signal(false);
  readonly confirmDelete = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showEditForm = signal(true);
  readonly showPreview = signal(true);

  private readonly formValueChanges = toSignal<PageFormValue>(
    this.form.valueChanges as Observable<PageFormValue>,
    { initialValue: this.form.getRawValue() as any }
  );

  readonly hasChanges = computed(() => {
    const current = this.currentPage();
    const currentFormValue = this.formValueChanges();
    if (!current || !currentFormValue) {
      return false;
    }
    const baseline = mapPageToFormValue(current);
    return Object.entries(baseline).some(([key, value]) => {
      const candidate = currentFormValue[key as keyof PageFormValue] ?? '';
      return candidate !== value;
    });
  });

  readonly viewUrl = computed(() => {
    const page = this.currentPage();
    const url = String(page?.['url'] ?? '').trim();
    if (url) {
      return url.startsWith('/') ? url : `/${url}`;
    }
    const slug = this.currentSlug();
    if (!slug || slug === 'home') {
      return '/';
    }
    return `/${slug}`;
  });

  readonly currentPageHtml: Signal<SafeHtml | null> = computed(() => {
    const page = this.currentPage();
    if (!page) {
      return null;
    }
    const content = minifyHtml(String(page['content'] ?? ''));
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(content) as string);
  });

  readonly previewContent: Signal<SafeHtml | null> = computed(() => {
    if (!this.showPreview()) {
      return null;
    }
    const content = this.form.controls.content.value ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(content) as string);
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const slug = params.get('edit');
      const resolvedSlug = slug && slug.trim() ? slug.trim() : 'home';
      this.searchForm.patchValue({ edit: resolvedSlug }, { emitEvent: false });
      this.loadPage(resolvedSlug);
    });
  }

  toggleEditForm() {
    this.showEditForm.update((state) => !state);
  }

  togglePreview() {
    this.showPreview.update((state) => !state);
  }

  startDelete() {
    if (this.deletePending()) {
      return;
    }
    this.confirmDelete.set(true);
  }

  cancelDelete() {
    if (this.deletePending()) {
      return;
    }
    this.confirmDelete.set(false);
  }

  onSearch() {
    const value = this.searchForm.controls.edit.value?.trim();
    const slug = value || 'home';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: slug },
      queryParamsHandling: 'merge',
    });
  }

  private loadPage(slug: string) {
    if (this.loading()) {
      return;
    }
    const nextSlug = slug.trim() || 'home';
    this.loading.set(true);
    this.errorMessage.set(null);
    this.api
      .getPage(nextSlug)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to load page.');
          return;
        }
        if (response?.message) {
          this.errorMessage.set(String(response.message));
          return;
        }
        this.currentPage.set(response);
        const formValue = mapPageToFormValue(response ?? {});
        this.form.patchValue(formValue);
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.currentId.set(Number(response?.id ?? null));
        this.currentSlug.set(String(response?.slug ?? nextSlug));
        this.successMessage.set(null);
        this.confirmDelete.set(false);
      });
  }

  onSubmit() {
    if (this.pending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.currentId();
    if (!id) {
      this.errorMessage.set('Select a page before saving.');
      return;
    }
    const payload = this.form.getRawValue();
    const body = {
      ...payload,
      id,
      slug: prepareSlug(payload.title),
    };

    this.pending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .updatePage(body)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to update page.');
          return;
        }
        if (response?.message) {
          this.errorMessage.set(String(response.message));
          return;
        }
        this.successMessage.set('Page updated successfully.');
        this.currentPage.set(response);
        const formValue = mapPageToFormValue(response ?? {});
        this.form.patchValue(formValue);
        this.form.markAsPristine();
        this.currentId.set(Number(response?.id ?? id));
        this.currentSlug.set(String(response?.slug ?? payload.title));
        this.store.getPages();
      });
  }

  deletePage() {
    if (this.deletePending()) {
      return;
    }
    const id = this.currentId();
    if (!id) {
      return;
    }
    this.deletePending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .deletePage(id)
      .pipe(finalize(() => this.deletePending.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to delete page.');
          this.confirmDelete.set(false);
          return;
        }
        if (response?.message) {
          this.errorMessage.set(String(response.message));
          this.confirmDelete.set(false);
          return;
        }
        this.store.getPages();
        this.confirmDelete.set(false);
        this.router.navigateByUrl('/');
      });
  }
}
