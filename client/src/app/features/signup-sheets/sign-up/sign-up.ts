import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Api } from '../../../core/api';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
  // --- SIGN UP ---
  sign_sheetId = '';
  sign_slotId = '';
  sign_memberId = '';
  sign_msg: string | null = null;
  sign_error: string | null = null;

  // --- DELETE SIGN UP ---
  del_sheetId = '';
  del_memberId = '';
  del_msg: string | null = null;
  del_error: string | null = null;

  // --- LIST SLOT MEMBERS ---
  list_slotId = '';
  list_msg: string | null = null;
  list_error: string | null = null;
  slotMembers: any[] = [];
  loading = false;

  constructor(private api: Api) {}

  signUp() {
    this.sign_msg = null;
    this.sign_error = null;

    if (!this.sign_sheetId || !this.sign_slotId || !this.sign_memberId) {
      this.sign_error = 'All fields are required.';
      return;
    }

    this.api.signUp(this.sign_sheetId, this.sign_slotId, this.sign_memberId).subscribe({
      next: () => {
        this.sign_msg = 'Sign-up successful.';
        
        // reset form fields
        this.sign_sheetId = '';
        this.sign_slotId = '';
        this.sign_memberId = '';

        // Refresh list
        this.listMembers();
      },
      error: (err) => {
        this.sign_error = err.error?.error || 'Failed to sign up.';
      },
    });
  }

  removeSignUp() {
    this.del_msg = null;
    this.del_error = null;

    if (!this.del_sheetId || !this.del_memberId) {
      this.del_error = 'All fields are required.';
      return;
    }

    this.api.removeSignUp(this.del_sheetId, this.del_memberId).subscribe({
      next: () => {
        this.del_msg = 'Sign-up deleted.';

        // reset delete form fields
        this.del_sheetId = '';
        this.del_memberId = '';
        
        // Refresh list
        this.listMembers();
      },
      error: (err) => {
        this.del_error = err.error?.error || 'Failed to delete.';
      },
    });
  }

  listMembers() {
    this.list_msg = null;
    this.list_error = null;
    this.loading = true;

    if (!this.list_slotId) {
      this.list_error = 'Slot ID required.';
      this.loading = false;
      return;
    }

    this.api.getSlotMembers(this.list_slotId).subscribe({
      next: (res) => {
        this.loading = false;
        this.slotMembers = res.members;
      },
      error: (err) => {
        this.loading = false;
        this.list_error = err.error?.error || 'Failed to load.';
      },
    });
  }
}
