import {
  Component,
  ChangeDetectionStrategy,
  Input,
  signal,
  computed,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '../../services/translate.service';
import { TranslatePipe } from '../../pipes/translate-pipe';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TranslatePipe, CommonModule],
})
export class Header {
  translateService = inject(TranslateService);
  locales: string[] = ['en', 'sk'];

  pages = input([]);
  blogs = input([]);

  readonly menuOpen = signal(false);
  readonly active = computed(() => (this.menuOpen() ? 'is-active' : ''));

  @Input() user?: { name?: string; email?: string; isAdmin?: boolean };
  @Input() mode: string = 'light';
  @Input() activeLang: string = 'en';
  @Input() headerLogo?: string;
  @Input() activeUrl: string;

  toggleMenu(force?: boolean) {
    if (force === undefined) {
      this.menuOpen.update((open) => !open);
      return;
    }
    this.menuOpen.set(force);
  }

  closeMenu() {
    this.toggleMenu(false);
  }

  onNavClick(event: Event) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a')) {
      this.closeMenu();
    }
  }

  readonly pagesInMenu = computed(() => {
    const basicPages = this.pages().filter(
      (onePage) => onePage.url.split('/').length <= 1 && onePage.hidden !== 'true'
    );
    const subPages = this.pages().filter(
      (onePage) => onePage.url.split('/').length > 1 && onePage.hidden !== 'true'
    );

    return basicPages
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
      .map((basicPage) => {
        const subpagesForPage = subPages.filter((subP) => subP.url.split('/')[0] === basicPage.url);
        if (subpagesForPage.length) {
          return {
            ...basicPage,
            subPages: subpagesForPage.map((subPage) => ({ ...subPage, subpage: true })),
          };
        }
        return basicPage;
      });
  });

  readonly categories = computed(() => {
    const blogs = this.blogs();
    if (!blogs) {
      return [] as string[];
    }
    const set = new Set<string>();
    blogs.forEach((blog) =>
      (blog.categories || '')
        .split(',')
        .map((cat) => cat.trim())
        .filter(Boolean)
        .forEach((cat) => set.add(cat))
    );
    return Array.from(set);
  });
}
