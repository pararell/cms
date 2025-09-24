import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Apiservice {
  apiUrl = environment.apiUrl;

  private readonly http = inject(HttpClient);

  getPages() {
    const url = this.apiUrl + 'api/v1/pages';
    return this.http.get(url).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }

  getBlogs() {
    const url = this.apiUrl + 'api/v1/blogs';
    return this.http.get(url).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error }))
    );
  }
}
