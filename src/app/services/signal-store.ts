import { inject, Injectable, signal } from '@angular/core';
import { Apiservice } from './api.service';

export interface Page {
  url: string;
  hidden?: string;
  position?: number | string;
  [key: string]: unknown;
}

export interface Blog {
  categories?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class SignalStore {
  apiService = inject(Apiservice);

  pages = signal<Page[]>([]);
  blogs = signal<any[]>([]);
  user = signal<any>(null);

  getPages = () => {
    this.apiService.getPages().subscribe((response: any) => {
      this.pages.set(response);
    });
  };

  getBlogs = () => {
    this.apiService.getBlogs().subscribe((response: any) => {
      this.blogs.set(response);
    });
  };

  getUser = () => {
    this.apiService.getUser().subscribe((response: any) => {
      this.user.set(response);
    });
  };
}
