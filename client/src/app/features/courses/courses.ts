import { Component, OnInit } from '@angular/core';
import { Api, Course } from '../../core/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './courses.html',
  styleUrls: ['./courses.css'],
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  loading = false;
  error: string | null = null;

  // Messages
  errCreate = '';
  msgCreate = '';
  errDelete = '';
  msgDelete = '';

  // Create/Edit form fields
  newTerm: number | null = null;
  newSection: number | null = 1;
  newCourseName = '';

  // Delete fields
  delTerm: number | null = null;
  delSection: number | null = 1;

  // Edit mode tracking
  editMode = false;
  editOriginalTerm: number | null = null;
  editOriginalSection: number | null = null;
  disableTermSection = false;   // true when sheets exist

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading = true;

    this.api.getCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load courses.';
        this.loading = false;
      },
    });
  }

  /*
      START EDIT MODE WHEN EDIT BUTTON IS CLICKED
  */
  startEdit(c: Course) {
    this.editMode = true;
    this.errCreate = '';
    this.msgCreate = '';

    // Store original reference to update
    this.editOriginalTerm = c.term;
    this.editOriginalSection = c.section;

    // Populate form fields
    this.newTerm = c.term;
    this.newSection = c.section;
    this.newCourseName = c.course;

    // Check if this course has sheets → disable term & section editing
    this.api.listSheets(c.term, c.section).subscribe((res) => {
      const sheets = res.sheets ?? [];
      this.disableTermSection = sheets.length > 0;
    });
  }

  /* 
      CANCEL EDIT
  */
  cancelEdit() {
    this.editMode = false;
    this.disableTermSection = false;

    // Clear fields
    this.newTerm = null;
    this.newSection = 1;
    this.newCourseName = '';
  }

  /* 
      SAVE CHANGES
  */
  saveChanges() {
    if (!this.newTerm || !this.newCourseName.trim()) {
      this.errCreate = 'Term and course name are required.';
      return;
    }

    const data: any = { course: this.newCourseName.trim() };

    // Only include newTerm/newSection if allowed to edit them
    if (!this.disableTermSection) {
      data.newTerm = this.newTerm;
      data.newSection = this.newSection;
    }

    this.api
      .updateCourse(this.editOriginalTerm!, this.editOriginalSection!, data)
      .subscribe({
        next: (res) => {
          if (!res.ok) {
            this.errCreate = res.error || 'Failed to update course.';
            return;
          }

          this.msgCreate = 'Course updated successfully.';
          this.editMode = false;
          this.disableTermSection = false;

          // Clear fields
          this.newTerm = null;
          this.newSection = 1;
          this.newCourseName = '';

          this.loadCourses();
        },
        error: () => {
          this.errCreate = 'Failed to update course.';
        },
      });
  }

  /* 
      CREATE COURSE
  */
  createCourse(): void {
    if (this.editMode) {
      this.saveChanges();
      return;
    }

    this.errCreate = '';
    this.msgCreate = '';

    if (!this.newTerm || !this.newCourseName.trim()) {
      this.errCreate = 'Term and course name are required.';
      return;
    }

    const section = this.newSection || 1;

    this.api.createCourse(this.newTerm, section, this.newCourseName.trim()).subscribe({
      next: (res) => {
        if (!res.ok) {
          this.errCreate = res.error || 'Failed to create course.';
          return;
        }

        this.msgCreate = 'Course created successfully.';

        this.newTerm = null;
        this.newSection = 1;
        this.newCourseName = '';

        this.loadCourses();
      },
      error: () => {
        this.error = 'Failed to create course.';
      },
    });
  }

  /* 
      DELETE COURSE
  */
  deleteCourse(): void {
  this.errDelete = '';
  this.msgDelete = '';

  if (!this.delTerm) {
    this.errDelete = 'Term is required to delete a course.';
    return;
  }

  const section = this.delSection || 1;

  this.api.deleteCourse(this.delTerm, section).subscribe({
    next: (res) => {
      if (!res.ok) {
        // Backend returns specific message here
        this.errDelete = res.error || 'Failed to delete course.';
        return;
      }

      this.msgDelete = 'Course deleted successfully.';
      this.delTerm = null;
      this.delSection = 1;
      this.loadCourses();
    },
    error: (err) => {
      // Capture delete failure message from backend
      this.errDelete = err.error?.error || 'Failed to delete course.';
    },
  });
}

}
