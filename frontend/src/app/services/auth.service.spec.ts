import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('ai_test_jwt');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('ai_test_jwt');
  });

  it('starts logged out when no token is stored', () => {
    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('login updates the token signal and persists to localStorage', () => {
    service.login({ email: 'a@b.c', password: 'secret123' }).subscribe();

    const req = httpMock.expectOne('http://localhost:8000/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ access_token: 'tok-xyz', token_type: 'bearer' });

    expect(service.token()).toBe('tok-xyz');
    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('ai_test_jwt')).toBe('tok-xyz');
  });

  it('logout clears token signal and localStorage', () => {
    service.login({ email: 'a@b.c', password: 'secret123' }).subscribe();
    httpMock
      .expectOne('http://localhost:8000/auth/login')
      .flush({ access_token: 'tok-xyz', token_type: 'bearer' });

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('ai_test_jwt')).toBeNull();
  });

  it('maps /auth/me snake_case response to camelCase User', () => {
    let received: { id: number; email: string; createdAt: string } | undefined;
    service.loadCurrentUser().subscribe((u) => (received = u));

    httpMock.expectOne('http://localhost:8000/auth/me').flush({
      id: 7,
      email: 'me@x.com',
      created_at: '2026-05-21T10:00:00Z',
    });

    expect(received).toEqual({ id: 7, email: 'me@x.com', createdAt: '2026-05-21T10:00:00Z' });
    expect(service.currentUser()?.id).toBe(7);
  });

  it('hydrates the token signal from localStorage on construction', () => {
    localStorage.setItem('ai_test_jwt', 'already-here');
    // Re-create the TestBed so AuthService is constructed after we seed storage.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(AuthService);
    expect(fresh.token()).toBe('already-here');
    expect(fresh.isAuthenticated()).toBeTrue();
  });
});
