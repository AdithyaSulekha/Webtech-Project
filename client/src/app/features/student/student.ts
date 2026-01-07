import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Api } from '../../core/api';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student.html',
  styleUrls: ['./student.css'],
})
export class Student {
  msg = '';
  err = '';

  mySlots: any[] = [];
  availableSlots: any[] = [];

  memberId = '';
  term = 0;
  section = 0;

  constructor(private api: Api, private auth: Auth) {}

  ngOnInit() {
    this.memberId = this.auth.memberId || '';
    this.term = Number(this.auth.term);
    this.section = Number(this.auth.section);

    if (!this.memberId || !this.term || !this.section) {
      this.err = 'Student is not linked to a course. Contact admin.';
      return;
    }

    this.loadAllSlots();
  }

  /** Check if already signed up for a slot */
  isAlreadySignedUp(slot: any): boolean {
    return slot.members?.some((m: any) => m.memberId === this.memberId);
  }

  /** Load all sheets and prepare mySlots + availableSlots */
  loadAllSlots() {
    this.msg = '';
    this.err = '';

    this.api.listSheets(this.term, this.section).subscribe({
      next: (res) => {
        if (!res.ok) {
          this.err = res.error || 'Failed to load sheets.';
          return;
        }

        const sheets = res.sheets || [];
        const my: any[] = [];
        const available: any[] = [];

        const now = Date.now();
        const ONE_HOUR = 3600000;

        for (const sheet of sheets) {
          for (const slot of sheet.slots) {
            const start = Number(slot.start);
            const isMine = slot.members.some((m: any) => m.memberId === this.memberId);
            const isFull = slot.members.length >= slot.capacity;

            // MY SLOTS
            if (isMine) {
              my.push({
                sheetId: sheet.id,
                assignment: sheet.assignment,
                start,
                startStr: new Date(start).toLocaleString(),
                slotId: slot.id,
              });
            }

            // AVAILABLE SLOTS
            const oneHourAhead = start - now >= ONE_HOUR;

            // requirement: show ALL future non-full slots
            if (oneHourAhead && !isFull) {
              available.push({
                sheetId: sheet.id,
                assignment: sheet.assignment,
                start,
                startStr: new Date(start).toLocaleString(),
                slotId: slot.id,
                capacity: slot.capacity,
                members: slot.members,
              });
            }
          }
        }

        my.sort((a, b) => a.start - b.start);
        available.sort((a, b) => a.start - b.start);

        this.mySlots = my;
        this.availableSlots = available;
      },
      error: () => {
        this.err = 'Failed to load sheets.';
      },
    });
  }

  /** Sign up for a slot */
  signUp(slot: any) {
    this.msg = '';
    this.err = '';

    const now = Date.now();
    const ONE_HOUR = 3600000;

    if (slot.start - now < ONE_HOUR) {
      this.err = 'Cannot sign up less than 1 hour before slot starts.';
      return;
    }

    if (slot.members.length >= slot.capacity) {
      this.err = 'Slot is full.';
      return;
    }

    this.api.signUp(slot.sheetId, slot.slotId, this.memberId).subscribe({
      next: () => {
        this.msg = 'Sign-up successful.';
        this.loadAllSlots();
      },
      error: (err) => {
        this.err = err.error?.error || 'Sign-up failed.';
      },
    });
  }

  /** Leave a signed-up slot */
  leave(slot: any) {
    this.msg = '';
    this.err = '';

    const now = Date.now();
    const TWO_HOURS = 7200000;

    if (slot.start - now < TWO_HOURS) {
      this.err = 'Cannot leave a slot less than 2 hours before start.';
      return;
    }

    this.api.removeSignUp(slot.sheetId, this.memberId).subscribe({
      next: () => {
        this.msg = 'Left slot successfully.';
        this.loadAllSlots();
      },
      error: (err) => {
        this.err = err.error?.error || 'Leave failed.';
      },
    });
  }
}
