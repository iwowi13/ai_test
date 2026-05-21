import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Functional CanActivateFn protecting admin routes.
 *
 * If the user is authenticated, allow navigation. Otherwise, redirect to
 * /login with a `returnUrl` so the LoginComponent can bounce them back to
 * the original destination after a successful sign-in.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
