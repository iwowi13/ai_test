import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import { LoginRequest, RegisterRequest, TokenResponse } from '../models/auth';
import { User } from '../models/user';
import { ApiConfigService } from './api-config.service';

/**
 * Snake_case → camelCase mapping happens at the service boundary
 * (this file + posts.service.ts). The rest of the app sees only
 * camelCase interfaces.
 */
const TOKEN_STORAGE_KEY = 'ai_test_jwt';

interface UserOut {
  id: number;
  email: string;
  created_at: string;
}

function mapUser(raw: UserOut): User {
  return {
    id: raw.id,
    email: raw.email,
    createdAt: raw.created_at,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  // Initialise from localStorage so a refresh keeps the user logged in.
  readonly token = signal<string | null>(this.readStoredToken());
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.token() !== null);

  register(req: RegisterRequest): Observable<User> {
    return this.http
      .post<UserOut>(this.api.buildUrl('/auth/register'), req)
      .pipe(map(mapUser));
  }

  login(req: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(this.api.buildUrl('/auth/login'), req)
      .pipe(tap((res) => this.setToken(res.access_token)));
  }

  /** Lazy-load the current user from `/auth/me`. */
  loadCurrentUser(): Observable<User> {
    return this.http.get<UserOut>(this.api.buildUrl('/auth/me')).pipe(
      map(mapUser),
      tap((u) => this.currentUser.set(u)),
    );
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // localStorage may be unavailable (e.g. tests / private mode) — ignore.
    }
  }

  private setToken(token: string): void {
    this.token.set(token);
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // ignore
    }
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
