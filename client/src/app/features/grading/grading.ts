import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Api } from '../../core/api';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-grading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grading.html',
  styleUrl: './grading.css',
})
export class Grading {
  loading = false;

  // mode toggle
  gradingMode = false;
  modeError = '';

  // manual grading
  sheetId = '';
  memberId = '';
  grade: number | null = null;
  comment = '';
  msg: string | null = null;
  error: string | null = null;

  currentSlot: {
    sheetId: string;
    assignment: string;
    slotId: string;
    slotNumber: number;
    slotStart: number;
    slotEnd: number;
    members: any[];
  } | null = null;

  slotError = '';
  taName = ''; // pulled from Auth (email)

  inlineMsg: string | null = null;
  inlineError: string | null = null;

  showModal = false;
  modalMember: any = null;
  modalError: string | null = null;

  constructor(private api: Api, private auth: Auth) {}

  ngOnInit() {
    // This name will appear in audit log
    this.taName = this.auth.email || 'Unknown';
  }

  formatComments(raw: string): string {
    if (!raw) return '';
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(', ');
  }

  // Mode switch handler
  onModeSwitch() {
    this.modeError = '';
    this.slotError = '';
    this.currentSlot = null;

    if (this.gradingMode) {
      this.loadCurrentSlot();
    }
  }

  // Load current slot
  loadCurrentSlot() {
    this.slotError = '';
    this.currentSlot = null;
    this.loading = true;

    this.api.getCurrentSlot().subscribe({
      next: (res) => {
        this.loading = false;

        if (!res.ok) {
          this.slotError = res.error || 'No active slot at this time.';
          this.currentSlot = null;
          return;
        }

        this.currentSlot = {
          sheetId: res.sheetId,
          assignment: res.assignment,
          slotId: res.slotId,
          slotNumber: res.slotNumber,
          slotStart: res.slotStart,
          slotEnd: res.slotEnd,
          members: res.members ?? [],
        };
      },
      error: () => {
        this.loading = false;
        this.slotError = 'Failed to load current slot.';
      },
    });
  }

  // INLINE grading
  submitInline(m: any) {
    if (!this.currentSlot) return;

    this.inlineMsg = null;
    this.inlineError = null;

    const gradeToSend = m.currentGradeInput;
    const newComment = m.currentInput?.trim() || '';

    this.api.updateGrade({
      sheetId: this.currentSlot.sheetId,
      memberId: m.memberId,
      grade: gradeToSend,
      comment: newComment,
      changedBy: this.taName
    }).subscribe({
      next: (res) => {
        // update table row
        m.grade = res.grade;
        m.finalGrade = res.finalGrade;
        m.comment = res.comment ?? m.comment;
        m.gradedTime = res.gradedTime;

        // attach audit to member row
        m.audit = res.audit;

        m.currentInput = '';
        m.currentGradeInput = null;

        this.inlineMsg = `Saved for ${m.first} ${m.last} (${m.memberId}).`;
        setTimeout(() => (this.inlineMsg = null), 10000);
      },
      error: (err) => {
        this.inlineError = err.error?.error || 'Failed to save.';
        setTimeout(() => (this.inlineError = null), 10000);
      }
    });
  }

  clearMessages() {
    this.msg = null;
    this.error = null;
  }

  resetFields() {
    this.sheetId = '';
    this.memberId = '';
    this.grade = null;
    this.comment = '';
  }

  // Manual grading form
  submit() {
    this.clearMessages();

    if (!this.sheetId || !this.memberId || this.grade === null) {
      this.error = 'Sheet ID, Member ID and Grade are required.';
      return;
    }

    this.api.updateGrade({
      sheetId: this.sheetId,
      memberId: this.memberId,
      grade: this.grade,
      comment: this.comment,
      changedBy: this.taName
    }).subscribe({
      next: (res) => {
        this.msg = `Grade saved. Current: ${res.grade}`;
        this.resetFields();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to submit grade.';
      },
    });
  }

  loadNext() {
    if (!this.currentSlot) return;

    this.api.getNextSlot(this.currentSlot.slotId).subscribe({
      next: (res) => {
        if (!res.ok) return;

        this.currentSlot = {
          sheetId: res.sheetId,
          assignment: res.assignment,
          slotId: res.slotId,
          slotNumber: res.slotNumber,
          slotStart: res.slotStart,
          slotEnd: res.slotEnd,
          members: res.members ?? [],
        };
      },
      error: (err) => {
        alert(err.error?.error || 'No next slot.');
      },
    });
  }

  loadPrevious() {
    if (!this.currentSlot) return;

    this.api.getPreviousSlot(this.currentSlot.slotId).subscribe({
      next: (res) => {
        if (!res.ok) return;

        this.currentSlot = {
          sheetId: res.sheetId,
          assignment: res.assignment,
          slotId: res.slotId,
          slotNumber: res.slotNumber,
          slotStart: res.slotStart,
          slotEnd: res.slotEnd,
          members: res.members ?? [],
        };
      },
      error: (err) => {
        alert(err.error?.error || 'No previous slot.');
      },
    });
  }

  openModal(m: any) {
    this.modalError = null;
    this.showModal = true;

    this.modalMember = {
      memberId: m.memberId,
      first: m.first,
      last: m.last,

      grade: m.grade ?? null,
      bonus: m.bonus ?? 0,
      penalty: m.penalty ?? 0,

      originalGrade: m.grade ?? null,
      originalBonus: m.bonus ?? 0,
      originalPenalty: m.penalty ?? 0,

      previousComment: m.comment ?? '',
      newComment: '',

      audit: m.audit
    };
  }

  closeModal() {
    this.showModal = false;
    this.modalMember = null;
    this.modalError = null;
  }

  saveModal() {
    if (!this.currentSlot || !this.modalMember) return;

    this.modalError = null;

    // Require comment when grade/bonus/penalty changed
    const changed =
      this.modalMember.grade !== this.modalMember.originalGrade ||
      this.modalMember.bonus !== this.modalMember.originalBonus ||
      this.modalMember.penalty !== this.modalMember.originalPenalty;

    const hasComment = this.modalMember.newComment?.trim().length > 0;

    // If no change AND no comment -> stay open, show message
    if (!changed && !hasComment) {
      this.modalError = 'No changes detected.';
      return;
    }

    // If change BUT no comment -> block
    if (changed && !hasComment) {
      this.modalError = 'A comment is required when modifying a grade.';
      return;
    }

    this.api.updateGrade({
      sheetId: this.currentSlot.sheetId,
      memberId: this.modalMember.memberId,
      grade: this.modalMember.grade,
      bonus: this.modalMember.bonus,
      penalty: this.modalMember.penalty,
      comment: this.modalMember.newComment,
      changedBy: this.taName
    }).subscribe({
      next: (res) => {
        const row = this.currentSlot!.members.find(
          (m) => m.memberId === res.memberId
        );
        if (row) {
          row.grade = res.grade;
          row.bonus = res.bonus;
          row.penalty = res.penalty;
          row.finalGrade = res.finalGrade;
          row.comment = res.comment;
          row.gradedTime = res.gradedTime;
          row.audit = res.audit;
        }

        this.closeModal();
      },
      error: (err) => {
        this.modalError = err.error?.error || 'Failed to update grade.';
      },
    });
  }
}
