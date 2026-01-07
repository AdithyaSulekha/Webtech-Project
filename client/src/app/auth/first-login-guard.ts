import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from './auth';

@Injectable({ providedIn: 'root' })
export class FirstLoginGuard implements CanActivate {

  constructor(private router: Router, private auth: Auth) {}

  canActivate() {
    if (this.auth.firstLogin) {
      this.router.navigate(['/change-password']);
      return false;
    }
    return true;
  }
}
