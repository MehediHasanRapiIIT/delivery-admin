import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly LS_KEY = 'amarbazaar_session';

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.#getToken();

    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.auth.logout();
        }
        return throwError(() => error);
      })
    );
  }

  #getToken(): string | null {
    try {
      const raw =
        localStorage.getItem(this.LS_KEY) ??
        sessionStorage.getItem(this.LS_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as { token?: string };
      return session?.token ?? null;
    } catch {
      return null;
    }
  }
}
