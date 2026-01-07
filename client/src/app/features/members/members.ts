import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Api,
  Member,
  MembersResponse,
  AddMembersResponse,
  DeleteMembersResponse,
} from '../../core/api';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './members.html',
  styleUrl: './members.css',
})
export class Members implements OnInit {
  term = 0;
  section = 1;
  role = ''; // empty => all roles
  first = '';
  last = '';
  userName = '';
  password = '';

  members: Member[] = [];

  loading = false;
  listError: string | null = null;
  addError = '';
  addSuccess = '';
  deleteError = '';
  deleteSuccess = '';

  // form fields
  addTerm: number | null = null;
  addSection = 1;
  newMembersText = '';
  deleteIdsText = '';

  csvTerm: number | null = null;
  csvSection = 1;
  csvFile: File | null = null;

  csvError = '';
  csvSuccess = '';

  constructor(private api: Api, private auth: Auth) {}

  ngOnInit(): void {}

  listMembers(): void {
    this.loading = true;
    this.listError = null;
    this.members = [];

    this.api.listMembers(this.term, this.section).subscribe({
      next: (res: MembersResponse) => {
        if (res.ok) {
          this.members = res.members;
        } else {
          this.listError = 'Server returned an error while loading members.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.listError = 'Failed to load members.';
      },
    });
  }

  addMembers() {
    this.addError = '';
    this.addSuccess = '';

    // Validation
    if (!this.addTerm || !this.addSection) {
      this.addError = 'Please enter a valid term and section.';
      return;
    }

    if (!this.first.trim() || !this.last.trim() || !this.userName.trim() || !this.password.trim()) {
      this.addError = 'All fields are required.';
      return;
    }

    if (this.userName.length !== 8) {
      this.addError = 'User name must be exactly 8 characters.';
      return;
    }

    // Prepare member object
    const member = {
      id: this.userName.trim().toUpperCase(),
      first: this.first.trim(),
      last: this.last.trim(),
      role: 'TA', // default role unless you want a select field
      password: this.password.trim(),
    };

    // API call
    this.api.addMembers(this.addTerm, this.addSection, [member]).subscribe({
      next: (res) => {
        if (res.ignored.length > 0) {
          this.addError = `Addition failed. Member already exists: ${res.ignored.join(', ')}`;
          return;
        }

        this.addSuccess = 'Member added successfully.';

        // Clear fields
        this.first = '';
        this.last = '';
        this.userName = '';
        this.password = '';

        // Refresh list
        this.listMembers();
      },

      error: () => {
        this.addError = 'Failed to add member. Please try again.';
      },
    });
  }

  deleteSingleMember(id: string) {
    this.deleteError = '';
    this.deleteSuccess = '';

    this.api.deleteMembers(this.term, this.section, [id]).subscribe({
      next: (res) => {
        if (res.removed === 0) {
          this.deleteError = 'Cannot delete member. Member may have active sign-ups.';
          return;
        }

        this.deleteSuccess = `Member ${id} deleted.`;
        this.listMembers();
      },
      error: (err) => {
        this.deleteError = err.error?.error || 'Failed to delete member.';
      },
    });
  }

  onCsvSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.csvFile = file;
  }

  uploadCsv() {
    this.csvError = '';
    this.csvSuccess = '';

    if (!this.csvTerm || !this.csvSection) {
      this.csvError = 'Please enter term and section.';
      return;
    }

    if (!this.csvFile) {
      this.csvError = 'Please select a CSV file.';
      return;
    }

    const formData = new FormData();
    formData.append('csv', this.csvFile);
    formData.append('term', String(this.csvTerm));
    formData.append('section', String(this.csvSection));

    // Retrieve JWT token from Auth service
    const token = this.auth.token;
    if (!token) {
      this.csvError = 'Authorization token missing. Please log in again.';
      return;
    }

    // POST multipart/form-data
    fetch('/api/courses/members/csv', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) {
          this.csvError = res.error || 'CSV upload failed.';
          return;
        }

        this.csvSuccess = `Added ${res.addedCount} new member(s). Ignored ${res.ignored.length}.`;
        this.listMembers();
      })
      .catch(() => {
        this.csvError = 'CSV upload failed.';
      });
  }
}
