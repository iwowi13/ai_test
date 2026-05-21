import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Attaches `Authorization: Bearer <token>` to outgoing requests when
 * the auth service holds a token. Skips the public auth endpoints
 * (login / register) — sending a bearer there is harmless but pointless.
 *
 * On a 401 response from a protected call, we log the user out and
 * bounce them to /login so a stale token doesn't keep haunting the app.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint =
    req.url.endsWith('/auth/login') || req.url.endsWith('/auth/register');

  const token = auth.token();
  const handled =
    token && !isAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(handled).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthEndpoint && auth.token() !== null) {
        auth.logout();
        void router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
