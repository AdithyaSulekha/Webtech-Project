import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from './auth';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private router: Router, private auth: Auth) {}

   canActivate() {
    if (!this.auth.loggedIn) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
