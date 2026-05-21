import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { LoginComponent } from './login.component';

interface AuthSpy extends jasmine.SpyObj<AuthService> {
  login: jasmine.Spy;
}

function configure(opts: {
  authSpy: AuthSpy;
  routerSpy: jasmine.SpyObj<Router>;
  returnUrl?: string | null;
}) {
  const route = {
    snapshot: {
      queryParamMap: { get: (k: string) => (k === 'returnUrl' ? opts.returnUrl ?? null : null) },
    },
  };
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      { provide: AuthService, useValue: opts.authSpy },
      { provide: Router, useValue: opts.routerSpy },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
}

describe('LoginComponent', () => {
  let authSpy: AuthSpy;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']) as AuthSpy;
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
  });

  it('does not call AuthService when form is invalid', () => {
    configure({ authSpy, routerSpy });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: () => void }).submit();

    expect(authSpy.login).not.toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to "/" on successful login when no returnUrl', () => {
    authSpy.login.and.returnValue(of({ access_token: 'tok', token_type: 'bearer' }));
    configure({ authSpy, routerSpy });

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      form: { setValue: (v: { email: string; password: string }) => void };
      submit: () => void;
    };
    inst.form.setValue({ email: 'a@b.c', password: 'secret123' });
    inst.submit();

    expect(authSpy.login).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' });
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('navigates to the returnUrl query param when present', () => {
    authSpy.login.and.returnValue(of({ access_token: 'tok', token_type: 'bearer' }));
    configure({ authSpy, routerSpy, returnUrl: '/admin' });

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      form: { setValue: (v: { email: string; password: string }) => void };
      submit: () => void;
    };
    inst.form.setValue({ email: 'a@b.c', password: 'secret123' });
    inst.submit();

    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/admin');
  });

  it('shows "Invalid credentials." on 401', () => {
    authSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    configure({ authSpy, routerSpy });

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      form: { setValue: (v: { email: string; password: string }) => void };
      submit: () => void;
      errorMsg: () => string | null;
      submitting: () => boolean;
    };
    inst.form.setValue({ email: 'a@b.c', password: 'bad' });
    inst.submit();

    expect(inst.errorMsg()).toBe('Invalid credentials.');
    expect(inst.submitting()).toBeFalse();
    expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows generic error on non-401 failure', () => {
    authSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );
    configure({ authSpy, routerSpy });

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      form: { setValue: (v: { email: string; password: string }) => void };
      submit: () => void;
      errorMsg: () => string | null;
    };
    inst.form.setValue({ email: 'a@b.c', password: 'secret123' });
    inst.submit();

    expect(inst.errorMsg()).toBe('Login failed, try again.');
  });
});
