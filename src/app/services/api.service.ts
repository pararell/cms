import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { catchError, map, of } from 'rxjs';
import { TOKEN } from '../user.token';

@Injectable({
  providedIn: 'root',
})
export class Apiservice {
  apiUrl = environment.apiUrl;
  token = inject(TOKEN);

  private readonly http = inject(HttpClient);

  private buildAuthOptions(): { headers: HttpHeaders; withCredentials: boolean } {
    let headers = new HttpHeaders();
    const tokenValue = this.token();

    if (tokenValue) {
      headers = headers.set('Authorization', `Bearer ${tokenValue}`);
    }

    return { headers, withCredentials: true };
  }

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

  getUser() {
    const url = this.apiUrl + 'api/v1/user';
    const options = this.buildAuthOptions();

    return this.http.get(url, options).pipe(
      map((response: any) =>
        response ? { ...response, isAdmin: response.email === environment.adminEmail } : response
      ),
      catchError((error: Error) => of({ error }))
    );
  }
}
