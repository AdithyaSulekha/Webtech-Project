import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Auth } from '../../../auth/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  error = '';

  constructor(private auth: Auth, private router: Router) {}

  login() {
    this.error = '';

    this.auth.login(this.email, this.password).then((res) => {
      if (!res.ok) {
        this.error = res.error || 'Login failed.';
        return;
      }

      // Save into service/localStorage
      this.auth.saveUser(res.email, res.firstLogin, res.role, res.memberId, res.term, res.section, res.token);

      /** FIRST LOGIN REDIRECTION */
      if (res.firstLogin) {
        this.router.navigate(['/change-password']);
        return;
      }

      /** ROLE-BASED REDIRECTION  */
      switch (res.role) {
        case 'ADMIN':
          this.router.navigate(['/admin']);
          break;

        case 'TA':
          this.router.navigate(['/courses']);
          break;

        case 'STUDENT':
        default:
          this.router.navigate(['/student']);
          break;
      }
    });
  }
}
