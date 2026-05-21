import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { LoginComponent } from './login.component';

interface AuthSpy extends jasmine.SpyObj<AuthService> {
  login: jasmine.Spy;
}

function configure(opts: {
  authSpy: AuthSpy;
  returnUrl?: string | null;
  registered?: string | null;
}) {
  const route = {
    snapshot: {
      queryParamMap: {
        get: (k: string) => {
          if (k === 'returnUrl') return opts.returnUrl ?? null;
          if (k === 'registered') return opts.registered ?? null;
          return null;
        },
      },
    },
  };
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: opts.authSpy },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
}

function spyOnRouter(): jasmine.Spy {
  const router = TestBed.inject(Router);
  return spyOn(router, 'navigateByUrl').and.resolveTo(true);
}

describe('LoginComponent', () => {
  let authSpy: AuthSpy;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']) as AuthSpy;
  });

  it('does not call AuthService when form is invalid', () => {
    configure({ authSpy });
    const navSpy = spyOnRouter();
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: () => void }).submit();

    expect(authSpy.login).not.toHaveBeenCalled();
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('navigates to "/" on successful login when no returnUrl', () => {
    authSpy.login.and.returnValue(of({ access_token: 'tok', token_type: 'bearer' }));
    configure({ authSpy });
    const navSpy = spyOnRouter();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      form: { setValue: (v: { email: string; password: string }) => void };
      submit: () => void;
    };
    inst.form.setValue({ email: 'a@b.c', password: 'secret123' });
    inst.submit();

    expect(authSpy.login).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' });
    expect(navSpy).toHaveBeenCalledWith('/');
  });

  it('navigates to the returnUrl query param when present', () => {
    authSpy.login.and.returnValue(of({ access_token: 'tok', token_type: 'bearer' }));
    configure({ authSpy, returnUrl: '/admin' });
    const navSpy = spyOnRouter();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      form: { setValue: (v: { email: string; password: string }) => void };
      submit: () => void;
    };
    inst.form.setValue({ email: 'a@b.c', password: 'secret123' });
    inst.submit();

    expect(navSpy).toHaveBeenCalledWith('/admin');
  });

  it('shows "Invalid credentials." on 401', () => {
    authSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    configure({ authSpy });
    const navSpy = spyOnRouter();

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
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('shows generic error on non-401 failure', () => {
    authSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );
    configure({ authSpy });
    spyOnRouter();

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

  it('shows the success banner when ?registered=1 is present', () => {
    configure({ authSpy, registered: '1' });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Account created');
    const inst = fixture.componentInstance as unknown as { justRegistered: () => boolean };
    expect(inst.justRegistered()).toBeTrue();
  });

  it('does not show the success banner without ?registered=1', () => {
    configure({ authSpy });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).not.toContain('Account created');
    const inst = fixture.componentInstance as unknown as { justRegistered: () => boolean };
    expect(inst.justRegistered()).toBeFalse();
  });
});
