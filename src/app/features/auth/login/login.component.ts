import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { parseApiError } from '../../../core/utils/api-error.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  // Two-step flow state
  step = signal<'phone' | 'otp'>('phone');

  // Step 1 — phone
  phoneNumber = signal('');
  phoneError = signal('');

  // Step 2 — OTP
  otpCode = signal('');
  otpError = signal('');

  // Shared
  rememberMe = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  // ── Step 1: send OTP ──────────────────────────────────────────────────────

  onSendOtp(): void {
    this.phoneError.set('');
    this.errorMessage.set('');

    const phone = this.phoneNumber().trim();
    if (!phone) {
      this.phoneError.set('Phone number is required.');
      return;
    }

    this.isLoading.set(true);
    this.auth.generateOtp(phone).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set('otp');
      },
      error: (err) => {
        this.errorMessage.set(parseApiError(err));
        this.isLoading.set(false);
      },
    });
  }

  // ── Step 2: verify OTP ────────────────────────────────────────────────────

  onVerifyOtp(): void {
    this.otpError.set('');
    this.errorMessage.set('');

    const otp = this.otpCode().trim();
    if (!otp) {
      this.otpError.set('OTP code is required.');
      return;
    }

    this.isLoading.set(true);
    this.auth.verifyOtp(this.phoneNumber().trim(), otp, this.rememberMe()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage.set(parseApiError(err));
        this.isLoading.set(false);
      },
    });
  }

  // ── Go back to phone step ─────────────────────────────────────────────────

  onBack(): void {
    this.step.set('phone');
    this.otpCode.set('');
    this.otpError.set('');
    this.errorMessage.set('');
  }
}
