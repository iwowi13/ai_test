import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

function runGuard(state: Partial<RouterStateSnapshot>): boolean | UrlTree {
  // CanActivateFn is invoked through the injection context. TestBed.runInInjectionContext
  // gives us that context so `inject()` calls inside the guard resolve.
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, state as RouterStateSnapshot),
  ) as boolean | UrlTree;
}

describe('authGuard', () => {
  let authStub: { isAuthenticated: WritableSignal<boolean> };
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // isAuthenticated is a Signal on the real service. Use a writable signal
    // here so the guard's `auth.isAuthenticated()` call returns our value.
    authStub = { isAuthenticated: signal(false) };
    routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('allows activation when the user is authenticated', () => {
    authStub.isAuthenticated.set(true);

    const result = runGuard({ url: '/admin' });

    expect(result).toBeTrue();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects anonymous users to /login with the returnUrl preserved', () => {
    authStub.isAuthenticated.set(false);
    const urlTree = {} as UrlTree;
    routerSpy.createUrlTree.and.returnValue(urlTree);

    const result = runGuard({ url: '/admin/posts/new' });

    expect(result).toBe(urlTree);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/posts/new' },
    });
  });
});
