import { Component, computed, effect, inject, REQUEST, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { DOCUMENT, isPlatformBrowser, JsonPipe } from '@angular/common';
import { Header } from './components/header/header';
import { SignalStore } from './services/signal-store';
import { MODE } from './mode.token';
import { LANG } from './lang.token';
import { PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { TranslateService } from './services/translate.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  store = inject(SignalStore);
  translateService = inject(TranslateService);
  mode = inject(MODE);
  lang = inject(LANG);
  modeVal = signal(this.mode());
  langVal = signal(this.lang());
  readonly currentYear = new Date().getFullYear();
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private router = inject(Router);
  private readonly serverRequest = inject(REQUEST, { optional: true }) as any;

  pages = this.store.pages;
  blogs = this.store.blogs;
  user = this.store.user;
  currentUrl = signal(this.router.url);
  readonly footerPages = computed(() => {
    return (this.pages() ?? [])
      .filter((page) => {
        const url = String(page?.url ?? '').trim();
        const isHidden = String(page?.hidden ?? '').toLowerCase() === 'true';
        if (!url || url === '/' || isHidden) {
          return false;
        }
        return !url.includes('/') || url.split('/').length === 1;
      })
      .slice(0, 5);
  });

  constructor() {
    this.store.getPages();
    this.store.getBlogs();
    this.store.getUser();

    if (!isPlatformBrowser(this.platformId)) {
      const cookieHeader = this.serverRequest?.headers?.get('cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((c) => {
            const [k, v] = c.split('=');
            return [k.trim(), decodeURIComponent(v ?? '')];
          })
        );
        if (cookies['mode']) {
          this.modeVal.set(cookies['mode']);
        }
        if (cookies['lang']) {
          this.langVal.set(cookies['lang']);
          this.translateService.setLang(cookies['lang']);
        }
      }
    } else {
       this.translateService.setLang(this.langVal());
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    effect(() => {
      const currentMode = this.modeVal();

      const targets = [this.document.documentElement, this.document.body].filter(Boolean);
      targets.forEach((node) => {
        node.classList.toggle('dark', currentMode === 'dark');
      });
    });
  }
}
