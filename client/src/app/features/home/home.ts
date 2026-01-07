import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Api } from '../../core/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  search = '';
  error = '';
  results: any[] = [];
  expandedSheet: any | null = null;
  searchClicked = false;

  constructor(private api: Api, private router: Router) {}

  doSearch() {
    this.error = '';
    this.expandedSheet = null;
    this.searchClicked = true;

    if (!this.search.trim()) {
      this.error = 'Enter a course code.';
      return;
    }

    this.api.searchSignupSheets(this.search).subscribe({
      next: (res) => {
        this.results = res.sheets;
      },
      error: () => {
        this.error = 'Failed to load results.';
      },
    });
  }

  toggleExpand(sheet: any) {
    // If already expanded, collapse it
    if (this.expandedSheet?.id === sheet.id) {
      this.expandedSheet = null;
      return;
    }

    // Load slots for clicked sheet
    this.api.listSlots(sheet.id).subscribe({
      next: (res) => {
        this.expandedSheet = {
          id: sheet.id,
          slots: res.slots,
        };
      },
      error: () => {
        this.error = 'Failed to load slots.';
      },
    });
  }

  gotoLogin() {
    this.router.navigate(['/login']);
  }
}
