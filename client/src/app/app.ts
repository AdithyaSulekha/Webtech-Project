import { Component } from '@angular/core';
import { Auth } from './auth/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css',
})
export class App {
  constructor(private auth: Auth, private router: Router) {}

  get showNav() {
    const url = this.router.url;

    // hide navbar if:
    if (!this.auth.loggedIn) return false; // user is NOT logged in
    if (url.startsWith('/home')) return false; // user is on the home page
    if (url.startsWith('/login')) return false; // user is on login page
    if (url.startsWith('/change-password')) return false; // user is on change-password page (first login)

    return true;
  }

  // Role helpers for the menu
  get isAdmin() {
    return this.auth.role === 'ADMIN';
  }

  get isTA() {
    return this.auth.role === 'TA';
  }

  get isStudent() {
    return this.auth.role === 'STUDENT';
  }

  // Logout
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
