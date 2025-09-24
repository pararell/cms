import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DOCUMENT, isPlatformBrowser, JsonPipe } from '@angular/common';
import { Header } from './components/header/header';
import { SignalStore } from './services/signal-store';
import { MODE } from './mode.token';
import { LANG } from './lang.token';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, JsonPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  store = inject(SignalStore);
  mode = inject(MODE);
  lang = inject(LANG);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);


  pages = this.store.pages;
  blogs = this.store.blogs;
  user = this.store.user;

  constructor() {
    this.store.getPages();
    this.store.getBlogs();
    this.store.getUser();

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
