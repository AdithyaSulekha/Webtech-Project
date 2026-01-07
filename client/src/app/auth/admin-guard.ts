import { Injectable } from '@angular/core';
import { Auth } from './auth';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.role === 'ADMIN') return true;
    this.router.navigate(['/home']);
    return false;
  }
}
