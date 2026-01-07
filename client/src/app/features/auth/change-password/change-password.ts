import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Auth } from '../../../auth/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePassword {
  email = '';
  currentPassword = '';
  newPassword = '';
  confirm = '';
  error = '';
  success = '';

  constructor(private auth: Auth, private router: Router) {
    this.email = this.auth.email ?? '';
  }

  change() {
    this.error = '';
    this.success = '';

    if (this.newPassword !== this.confirm) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.auth
      .changePassword(this.email, this.currentPassword, this.newPassword)
      .then((res) => {
        if (!res.ok) {
          this.error = res.error || 'Password update failed.';
          return;
        }

        this.success = 'Password updated. Please login again.';
        this.auth.logout();
        setTimeout(() => this.router.navigate(['/login']), 6000);
      });
  }
}
