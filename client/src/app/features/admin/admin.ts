import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Api } from '../../core/api';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  users: any[] = [];
  loading = false;

  // Add user
  newEmail = '';
  newPassword = '';
  newRole = 'TA';

  // Reset password
  resetEmail = '';
  resetNewPassword = '';

  // Messages
  addMsg = '';
  addErr = '';
  resetMsg = '';
  resetErr = '';
  listMsg = '';
  listErr = '';

  newMemberId = '';
  newTerm = 0;
  newSection = 1;

  constructor(private api: Api) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;

    this.api.listAllUsers().subscribe({
      next: (res) => {
        this.loading = false;
        this.users = res.users ?? [];
      },
      error: () => {
        this.loading = false;
        this.listErr = 'Failed to load users.';
      }
    });
  }

  addUser() {
    this.addMsg = '';
    this.addErr = '';

    if (!this.newEmail || !this.newPassword) {
      this.addErr = 'Email and password are required.';
      return;
    }

    if (this.newRole === 'STUDENT') {
      if (!this.newMemberId || !this.newTerm || !this.newSection) {
        this.addErr = 'Student requires memberId, term and section.';
        return;
      }
    }

    this.api
      .addUser(
        this.newEmail.trim(),
        this.newPassword.trim(),
        this.newRole,
        this.newMemberId.trim(),
        this.newTerm,
        this.newSection
      )
      .subscribe({
        next: () => {
          this.addMsg = 'User added successfully.';
          this.newEmail = '';
          this.newPassword = '';
          this.newRole = 'TA';
          this.newMemberId = '';
          this.newTerm = 0;
          this.newSection = 1;
          this.loadUsers();
        },
        error: (err) => {
          this.addErr = err.error?.error || 'Failed to add user.';
        },
      });
  }

  removeUser(email: string) {
    this.listMsg = '';
    this.listErr = '';

    this.api.removeUser(email).subscribe({
      next: () => {
        this.listMsg = 'User removed.';
        this.loadUsers();
      },
      error: (err) => {
        this.listErr = err.error?.error || 'Failed to remove user.';
      },
    });
  }

  resetPassword() {
    this.resetMsg = '';
    this.resetErr = '';

    if (!this.resetEmail || !this.resetNewPassword) {
      this.resetErr = 'Email and new password are required.';
      return;
    }

    this.api.adminResetPassword(this.resetEmail.trim(), this.resetNewPassword.trim()).subscribe({
      next: () => {
        this.resetMsg = 'Password reset successful. The user must change password on next login.';
        this.resetEmail = '';
        this.resetNewPassword = '';
      },
      error: (err) => {
        this.resetErr = err.error?.error || 'Failed to reset password.';
      }
    });
  }
}
