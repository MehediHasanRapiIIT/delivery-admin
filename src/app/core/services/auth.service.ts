import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminSession,
  OtpGenerateRequest,
  OtpVerifyRequest,
  OtpVerifyResponse,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly LS_KEY = 'amarbazaar_session';

  private _user = signal<AdminSession | null>(this.#loadSession());

  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly currentUser = computed(() => this._user());

  constructor(private http: HttpClient, private router: Router) {}

  #loadSession(): AdminSession | null {
    try {
      const raw =
        localStorage.getItem(this.LS_KEY) ??
        sessionStorage.getItem(this.LS_KEY);
      return raw ? (JSON.parse(raw) as AdminSession) : null;
    } catch {
      return null;
    }
  }

  generateOtp(phoneNumber: string): Observable<void> {
    const body: OtpGenerateRequest = { phoneNumber };
    return this.http.post<void>(
      `${environment.apiBaseUrl}/app/auth/otp/generate`,
      body
    );
  }

  verifyOtp(
    phoneNumber: string,
    otpCode: string,
    rememberMe: boolean
  ): Observable<void> {
    const body: OtpVerifyRequest = { phoneNumber, otpCode };
    return this.http
      .post<OtpVerifyResponse>(
        `${environment.apiBaseUrl}/app/auth/otp/verify`,
        body
      )
      .pipe(
        tap((res) => {
          const session: AdminSession = {
            userId: res.userId,
            token: res.token,
            phoneNumber: res.phoneNumber,
          };
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem(this.LS_KEY, JSON.stringify(session));
          this._user.set(session);
        }),
        map(() => void 0)
      );
  }

  logout(): void {
    localStorage.removeItem(this.LS_KEY);
    sessionStorage.removeItem(this.LS_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
