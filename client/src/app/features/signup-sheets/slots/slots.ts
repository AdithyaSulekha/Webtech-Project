import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Api } from '../../../core/api';

@Component({
  selector: 'app-slots',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slots.html',
  styleUrl: './slots.css',
})
export class Slots {
  // ADD SLOTS
  sheetId: string = '';
  startLocal: string = '';
  duration: number | null = null;
  count: number | null = null;
  capacity: number | null = null;

  sheetTerm: number | null = null;
  sheetSection: number | null = 1;
  availableSheets: any[] = [];
  sheetsLoaded = false;

  msgAdd = '';
  errAdd = '';

  // LIST
  sheetIdList: string = '';
  slots: any[] = [];
  loading = false;
  list_error: string | null = null;

  // UPDATE / DELETE
  updateId: string = '';
  updateStartLocal: string = '';
  updateDuration: number | null = null;
  updateCapacity: number | null = null;

  msgUpdate = '';
  errUpdate = '';

  constructor(private api: Api) {}

  resetAddForm() {
    this.sheetId = '';
    this.startLocal = '';
    this.duration = null;
    this.count = null;
    this.capacity = null;
  }

  resetUpdateForm() {
    this.updateId = '';
    this.updateStartLocal = '';
    this.updateDuration = null;
    this.updateCapacity = null;
  }

  // ADD SLOTS
  addSlots() {
    this.msgAdd = '';
    this.errAdd = '';

    if (!this.sheetId || !this.startLocal || !this.duration || !this.count || !this.capacity) {
      this.errAdd = 'All fields are required.';
      return;
    }

    // Convert datetime-local to UNIX MS
    const startUnixMs = Date.parse(this.startLocal);
    if (!startUnixMs || isNaN(startUnixMs)) {
      this.errAdd = 'Invalid start time.';
      return;
    }

    this.api
      .addSlots({
        sheetId: this.sheetId,
        start: startUnixMs,
        duration: this.duration,
        numSlots: this.count,
        maxMembers: this.capacity,
      })
      .subscribe({
        next: () => {
          this.msgAdd = 'Slots added successfully.';
          this.resetAddForm();

          // Refresh list
          this.listSlots();
        },
        error: (err) => {
          this.errAdd = err.error?.error || 'Error adding slots.';
        },
      });
  }

  // LIST SLOTS
  listSlots() {
    this.list_error = null;
    this.loading = true;

    if (!this.sheetIdList) {
      this.list_error = 'Sheet ID is required.';
      this.loading = false;
      return;
    }

    this.api.listSlots(this.sheetIdList).subscribe({
      next: (res) => {
        this.slots = res.slots;
        this.loading = false;
      },
      error: (err) => {
        this.slots = [];
        this.loading = false;
        this.list_error = err.error?.error || 'Failed to load slots.';
      },
    });
  }


  // UPDATE SLOT
  updateSlot() {
    this.msgUpdate = '';
    this.errUpdate = '';

    if (!this.updateId || !this.updateStartLocal || !this.updateDuration || !this.updateCapacity) {
      this.errUpdate = 'Missing fields.';
      return;
    }

    const newStartMs = Date.parse(this.updateStartLocal);
    if (!newStartMs) {
      this.errUpdate = 'Invalid start time.';
      return;
    }

    this.api
      .updateSlot({
        id: this.updateId,
        start: newStartMs,
        duration: this.updateDuration,
        capacity: this.updateCapacity,
      })
      .subscribe({
        next: () => {
          this.msgUpdate = 'Slot updated.';
          this.resetUpdateForm();

          // Refresh list
          this.listSlots();
        },
        error: (err) => {
          this.errUpdate = err.error?.error || 'Error updating slot.';
        },
      });
  }

  // DELETE SLOT
  deleteSlot(id: string) {
    this.msgUpdate = '';
    this.errUpdate = '';

    if (!id) {
      this.errUpdate = 'Slot ID required.';
      return;
    }

    this.api.deleteSlot(id).subscribe({
      next: () => {
        this.msgUpdate = 'Slot deleted.';
        this.resetUpdateForm();

        // Refresh list
        this.listSlots();
      },
      error: (err) => {
        this.errUpdate = err.error?.error || 'Could not delete slot.';
      },
    });
  }

  loadSheetsForAdd() {
    this.msgAdd = '';
    this.errAdd = '';
    this.availableSheets = [];
    this.sheetsLoaded = false;

    if (!this.sheetTerm) {
      this.errAdd = 'Enter a valid term.';
      return;
    }

    this.api.listSheets(this.sheetTerm, this.sheetSection!).subscribe({
      next: (res) => {
        if (res.ok) {
          this.availableSheets = res.sheets;
        } else {
          this.errAdd = res.error || 'Failed to load sheets.';
        }
        this.sheetsLoaded = true;
      },
      error: () => {
        this.errAdd = 'Server error loading sheets.';
        this.sheetsLoaded = true;
      },
    });
  }

  private toLocalDatetime(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');

    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());

    return `${year}-${month}-${day}T${hours}:${mins}`;
  }

  onSlotSelected() {
    const slot = this.slots.find((s) => s.id === this.updateId);
    if (!slot) return;

    this.updateDuration = slot.duration;
    this.updateCapacity = slot.capacity;
    this.updateStartLocal = this.toLocalDatetime(slot.start);
  }

  /* Load slots when a sheet is selected in Update/Delete section */
  onSheetSelectedForUpdate(sheetId: string) {
    this.updateId = '';
    this.slots = [];
    this.msgUpdate = '';
    this.errUpdate = '';

    if (!sheetId) return;

    // store for listSlots()
    this.sheetIdList = sheetId;

    this.api.listSlots(sheetId).subscribe({
      next: (res) => {
        this.slots = res.slots;
      },
      error: (err) => {
        this.errUpdate = err.error?.error || 'Failed to load slots.';
      },
    });
  }
}
