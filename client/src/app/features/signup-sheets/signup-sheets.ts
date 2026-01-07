import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Api } from '../../core/api';

@Component({
  selector: 'app-signup-sheets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signup-sheets.html',
  styleUrl: './signup-sheets.css',
})
export class SignupSheets {
  // CREATE state
  createTerm = 0;
  createSection = 1;
  assignment = '';
  nbLocal = '';
  naLocal = '';
  createMsg = '';
  createError = '';

  // DELETE SHEET state
  delTerm = 0;
  delSection = 1;
  deleteSheets: any[] = [];
  deleteSheetsLoaded = false;
  deleteId: string = '';
  deleteMsg = '';
  deleteError = '';

  // LIST state
  listTerm = 0;
  listSection = 1;
  sheets: any[] = [];
  loading = false;
  listError = '';

  constructor(private api: Api) {}

  // Convert datetime-local → timestamp
  private toUnix(dt: string): number {
    if (!dt) return 0;
    return Math.floor(new Date(dt).getTime());
  }

  // CREATE SHEET
  createSheet() {
    this.createMsg = '';
    this.createError = '';

    if (!this.createTerm || !this.assignment.trim()) {
      this.createError = 'Term and assignment are required.';
      return;
    }

    const notBefore = this.toUnix(this.nbLocal);
    const notAfter = this.toUnix(this.naLocal);

    this.api
      .createSheet(this.createTerm, this.createSection, this.assignment.trim(), notBefore, notAfter)
      .subscribe({
        next: (res) => {
          if (res.ok) {
            this.createMsg = `Sheet created with ID: ${res.id}`;
            this.assignment = '';
            this.nbLocal = '';
            this.naLocal = '';
          } else {
            this.createError = res.error || 'Failed to create sheet.';
          }

          // Refresh list
          this.listSheets();
        },
        error: (err) => {
          this.createError = err.error?.error || 'Server error while creating sheet.';
        },
      });
  }

  // LIST SHEETS
  listSheets() {
    this.loading = true;
    this.listError = '';
    this.sheets = [];

    this.api.listSheets(this.listTerm, this.listSection).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.ok) {
          this.sheets = res.sheets;
        } else {
          this.listError = res.error || 'Failed to fetch sheets.';
        }
      },
      error: () => {
        this.loading = false;
        this.listError = 'Server error while fetching sheets.';
      },
    });
  }

  // DELETE SHEET
  onDeleteSheet() {
    this.deleteMsg = '';
    this.deleteError = '';

    if (!this.deleteId) {
      this.deleteError = 'Select a sheet to delete.';
      return;
    }

    this.api.deleteSheet(this.deleteId).subscribe({
      next: (res) => {
        if (res.ok) {
          this.deleteMsg = 'Sheet deleted successfully.';
          this.deleteError = '';

          const deleted = this.deleteId;

          // reset selection
          this.deleteId = '';

          // refresh sheet list (after deletion)
          this.loadSheetsForDeletion();
        } else {
          this.deleteError = res.error || 'Failed to delete sheet.';
        }
      },
      error: (err) => {
        this.deleteMsg = '';
        this.deleteError = err.error?.error || 'Failed to delete sheet.';
      },
    });
  }

  loadSheetsForDeletion() {
    this.deleteSheets = [];
    this.deleteSheetsLoaded = false;

    if (!this.delTerm) {
      this.deleteError = 'Enter term.';
      return;
    }

    this.api.listSheets(this.delTerm, this.delSection).subscribe({
      next: (res) => {
        if (res.ok) {
          this.deleteSheets = res.sheets;
        } else {
          this.deleteError = res.error || 'Failed to load sheets.';
        }
        this.deleteSheetsLoaded = true;
      },
      error: () => {
        this.deleteError = 'Server error loading sheets.';
        this.deleteSheetsLoaded = true;
      },
    });
  }
}
