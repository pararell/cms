import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { REQUEST } from '@angular/core';

export const serverInterceptor: HttpInterceptorFn = (req, next) => {
  const request = inject(REQUEST, { optional: true });

  if (request) {
    // We are on the server (SSR)
    const cookieHeader = request.headers['cookie'] ?? '';
    console.log('Attaching cookie header to request:', request); // --- IGNORE ---
    req = req.clone({
      setHeaders: {
        Cookie: cookieHeader,
      },
      withCredentials: true,
    });
  }

  return next(req);
};
