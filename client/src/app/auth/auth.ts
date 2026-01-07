import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Auth {
  constructor() {}

  // LOGIN API
  login(email: string, password: string) {
    return fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => r.json());
  }

  // CHANGE PASSWORD: send token if present
  changePassword(email: string, currentPassword: string, newPassword: string) {
    const token = this.token;
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch('/api/change-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, currentPassword, newPassword }),
    }).then((r) => r.json());
  }

  // SAVE USER TO STORAGE
  saveUser(
    email: string,
    firstLogin: boolean,
    role: string,
    memberId?: string,
    term?: number,
    section?: number,
    token?: string
  ) {
    localStorage.setItem('auth_email', email);
    localStorage.setItem('firstLogin', String(firstLogin));
    localStorage.setItem('role', role);
    localStorage.setItem('memberId', String(memberId));
    localStorage.setItem('term', String(term));
    localStorage.setItem('section', String(section));
    localStorage.setItem('auth_token', String(token));
  }

  // GETTERS (READ-ONLY)
  get email(): string | null {
    return localStorage.getItem('auth_email');
  }

  get firstLogin(): boolean {
    return localStorage.getItem('firstLogin') === 'true';
  }

  get role(): string | null {
    return localStorage.getItem('role');
  }

  get loggedIn(): boolean {
    return !!this.token;
  }

  get memberId() {
    return localStorage.getItem('memberId');
  }

  get term() {
    return Number(localStorage.getItem('term'));
  }

  get section() {
    return Number(localStorage.getItem('section'));
  }

  get token(): string | null {
    return localStorage.getItem('auth_token');
  }

  // ROLE HELPERS
  isTA(): boolean {
    return this.role === 'TA';
  }

  isStudent(): boolean {
    return this.role === 'STUDENT';
  }

  isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  // LOGOUT
  logout() {
    localStorage.removeItem('auth_email');
    localStorage.removeItem('role');
    localStorage.removeItem('firstLogin');
    localStorage.removeItem('memberId');
    localStorage.removeItem('term');
    localStorage.removeItem('section');
    localStorage.removeItem('auth_token');
  }
}
