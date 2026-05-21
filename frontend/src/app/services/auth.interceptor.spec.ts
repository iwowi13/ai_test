import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let routerSpy: jasmine.SpyObj<Router>;
  let api: ApiConfigService;

  beforeEach(() => {
    localStorage.removeItem('ai_test_jwt');
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    api = TestBed.inject(ApiConfigService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('ai_test_jwt');
  });

  it('adds Authorization: Bearer header when a token is set and URL is not an auth endpoint', () => {
    auth.token.set('tok-123');
    http.get(api.buildUrl('/posts')).subscribe();

    const req = httpMock.expectOne(api.buildUrl('/posts'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush([]);
  });

  it('does NOT add Authorization header for /auth/login even when a token is set', () => {
    auth.token.set('tok-123');
    http.post(api.buildUrl('/auth/login'), { email: 'a@b.c', password: 'x' }).subscribe();

    const req = httpMock.expectOne(api.buildUrl('/auth/login'));
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ access_token: 'tok-123', token_type: 'bearer' });
  });

  it('does NOT add Authorization header for /auth/register even when a token is set', () => {
    auth.token.set('tok-123');
    http.post(api.buildUrl('/auth/register'), { email: 'a@b.c', password: 'x' }).subscribe();

    const req = httpMock.expectOne(api.buildUrl('/auth/register'));
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ id: 1, email: 'a@b.c', created_at: '2026-05-21T09:00:00Z' });
  });

  it('on 401 from a protected endpoint, calls logout and redirects to /login', () => {
    auth.token.set('tok-123');
    spyOn(auth, 'logout').and.callThrough();

    let captured: HttpErrorResponse | undefined;
    http.get(api.buildUrl('/posts')).subscribe({
      next: () => {},
      error: (err: HttpErrorResponse) => (captured = err),
    });

    httpMock
      .expectOne(api.buildUrl('/posts'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    expect(captured?.status).toBe(401);
  });

  it('on 401 from /auth/login, does NOT force logout or redirect', () => {
    spyOn(auth, 'logout').and.callThrough();

    http.post(api.buildUrl('/auth/login'), { email: 'a@b.c', password: 'bad' }).subscribe({
      next: () => {},
      error: () => {},
    });

    httpMock
      .expectOne(api.buildUrl('/auth/login'))
      .flush({ detail: 'bad' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
