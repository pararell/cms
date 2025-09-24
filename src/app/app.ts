import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Header } from './components/header/header';
import { SignalStore } from './services/signal-store';
import { MODE } from './mode.token';
import { LANG } from './lang.token';
import { PLATFORM_ID } from '@angular/core';
import { TOKEN } from './user.token';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  store = inject(SignalStore);
  mode = inject(MODE);
  lang = inject(LANG);
  token = inject(TOKEN);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);


  pages = this.store.pages;
  blogs = this.store.blogs;

  constructor() {
    this.store.getPages();
    this.store.getBlogs();

    effect(() => {
      const currentMode = this.mode();
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      const targets = [this.document.documentElement, this.document.body].filter(Boolean);
      targets.forEach((node) => {
        node.classList.toggle('dark', currentMode === 'dark');
      });
    });
  }

}
