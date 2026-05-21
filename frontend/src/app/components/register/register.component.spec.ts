import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user';
import { RegisterComponent } from './register.component';

interface AuthSpy extends jasmine.SpyObj<AuthService> {
  register: jasmine.Spy;
}

function configure(authSpy: AuthSpy, routerSpy: jasmine.SpyObj<Router>) {
  TestBed.configureTestingModule({
    imports: [RegisterComponent],
    providers: [
      { provide: AuthService, useValue: authSpy },
      { provide: Router, useValue: routerSpy },
    ],
  });
}

interface RegisterInternals {
  form: {
    setValue: (v: { email: string; password: string; confirmPassword: string }) => void;
    invalid: boolean;
  };
  submit: () => void;
  errorMsg: () => string | null;
  submitting: () => boolean;
}

describe('RegisterComponent', () => {
  let authSpy: AuthSpy;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['register']) as AuthSpy;
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
  });

  it('renders the form fields', () => {
    configure(authSpy, routerSpy);
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('formcontrolname="email"');
    expect(html).toContain('formcontrolname="password"');
    expect(html).toContain('formcontrolname="confirmPassword"');
  });

  it('calls AuthService.register and navigates to /login?registered=1 on success', () => {
    const user: User = { id: 1, email: 'a@b.c', createdAt: '2026-05-21T00:00:00Z' };
    authSpy.register.and.returnValue(of(user));
    configure(authSpy, routerSpy);

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as RegisterInternals;
    inst.form.setValue({
      email: 'a@b.c',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    inst.submit();

    expect(authSpy.register).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1' },
    });
  });

  it('shows the dup-email message on 409', () => {
    authSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' })),
    );
    configure(authSpy, routerSpy);

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as RegisterInternals;
    inst.form.setValue({
      email: 'taken@b.c',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    inst.submit();

    expect(inst.errorMsg()).toBe('An account with that email already exists.');
    expect(inst.submitting()).toBeFalse();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('shows generic error on non-409 failure', () => {
    authSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );
    configure(authSpy, routerSpy);

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as RegisterInternals;
    inst.form.setValue({
      email: 'a@b.c',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    inst.submit();

    expect(inst.errorMsg()).toBe('Something went wrong, please try again.');
  });

  it('keeps the form invalid and does not submit when passwords mismatch', () => {
    configure(authSpy, routerSpy);
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as RegisterInternals;
    inst.form.setValue({
      email: 'a@b.c',
      password: 'secret123',
      confirmPassword: 'different1',
    });

    expect(inst.form.invalid).toBeTrue();
    inst.submit();

    expect(authSpy.register).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
