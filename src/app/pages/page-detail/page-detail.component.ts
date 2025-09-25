import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { marked } from 'marked';
import { Apiservice } from '../../services/api.service';
import { minifyHtml } from '../../utils/page-utils';
import { PLATFORM_ID } from '@angular/core';
import { ContactFormComponent } from '../../components/contact-form/contact-form.component';

@Component({
  selector: 'app-page-detail',
  standalone: true,
  imports: [CommonModule, ContactFormComponent],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  private readonly api = inject(Apiservice);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly page = signal<Record<string, any> | null>(null);
  private readonly currentSlug = signal<string>('home');
  private readonly currentSubpage = signal<string | null>(null);

  readonly renderedContent: Signal<SafeHtml | null> = computed(() => {
    const current = this.page();
    if (!current) {
      return null;
    }
    const rawContent = String(current['content'] ?? '');
    const shouldMinify = !this.currentSubpage();
    const markdownSource = shouldMinify ? minifyHtml(rawContent) : rawContent;
    const html = marked.parse(markdownSource);
    return this.sanitizer.bypassSecurityTrustHtml(html as string);
  });

  readonly showContactForm = computed(() => this.currentSlug().toLowerCase() === 'contact');

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const slug = params.get('slug');
      const subpage = params.get('subpage');

      const targetSlug = slug && slug.trim() ? slug.trim() : 'home';
      this.currentSlug.set(targetSlug);
      this.currentSubpage.set(subpage && subpage.trim() ? subpage.trim() : null);

      this.fetchPage(targetSlug, this.currentSubpage());
    });

    effect(() => {
      const page = this.page();
      if (!page) {
        return;
      }
      const metaTitle = String(page['metaTitle'] ?? page['title'] ?? '');
      if (metaTitle) {
        this.title.setTitle(metaTitle);
      }
    });

    effect(() => {
      const content = this.renderedContent();
      if (!content) {
        return;
      }
      this.executeInjectedScripts();
    });
  }

  private fetchPage(slug: string, subpage: string | null) {
    if (!slug) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    const request$ = subpage ? this.api.getSubPage(slug, subpage) : this.api.getPage(slug);

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response: any) => {
        if (response?.error) {
          this.errorMessage.set('Unable to load page.');
          this.page.set(null);
          return;
        }
        if (response?.message && !response.content) {
          this.errorMessage.set(String(response.message));
          this.page.set(null);
          return;
        }
        this.page.set(response);
      });
  }

  private executeInjectedScripts() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const documentRef = this.document as Document;
      const container = documentRef.querySelector('.page-content');
      if (!container) {
        return;
      }
      const scripts = container.querySelectorAll('script[script-from-html]');
      scripts.forEach((script) => {
        const newScript = documentRef.createElement('script');
        Array.from(script.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (script['src']) {
          newScript.src = script['src'];
        } else {
          newScript.textContent = script.textContent ?? '';
        }
        documentRef.head.appendChild(newScript);
        script.removeAttribute('script-from-html');
      });
    }, 0);
  }
}
