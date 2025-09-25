import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { marked } from 'marked';
import { Apiservice } from '../../services/api.service';
import { SignalStore } from '../../services/signal-store';
import { prepareSlug, mapPageToFormValue, minifyHtml } from '../../utils/page-utils';

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
  private readonly currentSlug = signal<string | null>(null);
  readonly currentPage = signal<Record<string, unknown> | null>(null);

  readonly loading = signal(false);
  readonly pending = signal(false);
  readonly deletePending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showEditForm = signal(true);
  readonly showPreview = signal(false);

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
        this.currentId.set(Number(response?.id ?? null));
        this.currentSlug.set(String(response?.slug ?? nextSlug));
        this.successMessage.set(null);
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
          return;
        }
        if (response?.message) {
          this.errorMessage.set(String(response.message));
          return;
        }
        this.store.getPages();
        this.router.navigateByUrl('/');
      });
  }
}
