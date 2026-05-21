import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { AuthService } from './services/auth.service';

class AuthServiceStub {
  readonly token = signal<string | null>(null);
  readonly currentUser = signal(null);
  readonly isAuthenticated = signal(false);
  logout = jasmine.createSpy('logout');
}

function setup(loggedIn: boolean) {
  TestBed.resetTestingModule();
  const stub = new AuthServiceStub();
  stub.isAuthenticated.set(loggedIn);
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: stub },
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return { fixture, stub };
}

describe('App', () => {
  it('renders Home and About links regardless of auth state', () => {
    const { fixture } = setup(false);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.nav-links a'),
    ).map((a) => a.textContent?.trim());
    expect(labels).toContain('Home');
    expect(labels).toContain('About');
  });

  it('shows Login when logged out', () => {
    const { fixture } = setup(false);
    const el = fixture.nativeElement as HTMLElement;
    const labels = Array.from(el.querySelectorAll('.nav-links a, .nav-links button')).map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toContain('Login');
    expect(labels).not.toContain('Admin');
    expect(labels).not.toContain('Logout');
  });

  it('shows Admin link and Logout button when logged in', () => {
    const { fixture } = setup(true);
    const el = fixture.nativeElement as HTMLElement;
    const labels = Array.from(el.querySelectorAll('.nav-links a, .nav-links button')).map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toContain('Admin');
    expect(labels).toContain('Logout');
    expect(labels).not.toContain('Login');
  });

  it('calls authService.logout when the logout button is clicked', () => {
    const { fixture, stub } = setup(true);
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '.nav-links button',
    ) as HTMLButtonElement;
    button.click();
    expect(stub.logout).toHaveBeenCalled();
  });
});
