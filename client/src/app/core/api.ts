import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Auth } from '../auth/auth';

export interface Course {
  term: number;
  section: number;
  course: string;
}
export interface CoursesResponse {
  error: string;
  ok: boolean;
  courses: Course[];
}

// Member model
export interface Member {
  id: string;
  first: string;
  last: string;
  role: string;
}

// GET /api/courses/members
export interface MembersResponse {
  ok: boolean;
  term: number;
  section: number;
  role: string | null;
  count: number;
  members: Member[];
}

// POST /api/courses/members
export interface AddMembersResponse {
  ok: boolean;
  added: string[];
  ignored: (string | null)[];
  addedCount: number;
}

// DELETE /api/courses/members
export interface DeleteMembersResponse {
  ok: boolean;
  removed: number;
}

export interface ApiOk {
  ok: boolean;
}

export interface SlotsListResponse extends ApiOk {
  slots: any[];
}

export interface SlotMembersResponse {
  ok: boolean;
  members: { memberId: string }[];
}

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly base = '/api';

  constructor(private http: HttpClient, private auth: Auth) {}

  private authHeaders() {
    const token = this.auth.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private get<T>(url: string, options: any = {}) {
    return this.http.get<T>(url, {
      ...options,
      observe: 'body',
      headers: { ...(options.headers || {}), ...this.authHeaders() },
    });
  }

  private post<T>(url: string, body: any, options: any = {}) {
    return this.http.post<T>(url, body, {
      ...options,
      observe: 'body',
      headers: { ...(options.headers || {}), ...this.authHeaders() },
    });
  }

  private patch<T>(url: string, body: any, options: any = {}) {
    return this.http.patch<T>(url, body, {
      ...options,
      observe: 'body',
      headers: { ...(options.headers || {}), ...this.authHeaders() },
    });
  }

  private delete<T>(url: string, options: any = {}) {
    return this.http.delete<T>(url, {
      ...options,
      observe: 'body',
      headers: { ...(options.headers || {}), ...this.authHeaders() },
    });
  }

  /* ---------------- Courses API ---------------- */
  // List courses
  getCourses(): Observable<Course[]> {
    return this
      .get<CoursesResponse>(`${this.base}/courses`)
      .pipe(map((res:any) => res.courses ?? []));
  }

  // Create course
  createCourse(term: number, section: number, course: string): Observable<CoursesResponse> {
    return this.post<CoursesResponse>(`${this.base}/courses`, {
      term,
      section,
      course,
    }).pipe(map((res: any) => res));
  }

  // Delete course
  deleteCourse(term: number, section: number): Observable<CoursesResponse> {
    const params = new HttpParams().set('term', String(term)).set('section', String(section));
    return this.delete<CoursesResponse>(`${this.base}/courses`, { params }).pipe(map((res: any) => res));
  }

  // Update course
  updateCourse(term: number, section: number, data: any) {
    return this.patch<any>('/api/courses', {
      term,
      section,
      ...data,
    }).pipe(map((res:any) => res));
  }

  /* ---------------- Members API ---------------- */
  // List members
  listMembers(term: number, section: number = 1, role: string = ''): Observable<MembersResponse> {
    let params = new HttpParams().set('term', term.toString()).set('section', section.toString());

    if (role.trim() !== '') {
      params = params.set('role', role.trim());
    }

    return this.get<MembersResponse>(`${this.base}/courses/members`, { params }).pipe(map((res:any) => res));
  }

  // Add members
  addMembers(term: number, section: number, members: Member[]): Observable<AddMembersResponse> {
    const body = {
      term,
      section,
      list: members,
    };

    return this.post<AddMembersResponse>(`${this.base}/courses/members`, body).pipe(map((res:any) => res));
  }

  // Delete members
  deleteMembers(
    term: number,
    section: number,
    memberIds: string[]
  ): Observable<DeleteMembersResponse> {
    const params = new HttpParams()
      .set('term', term.toString())
      .set('section', section.toString())
      .set('memberIds', memberIds.join(',')); // server expects "memberIds"

    return this.delete<DeleteMembersResponse>(`${this.base}/courses/members`, { params }).pipe(map((res:any) => res));
  }

  /* ---------------- Signup Sheets API ---------------- */
  // Create signup sheets
  createSheet(
    term: number,
    section: number,
    assignment: string,
    notBefore: number,
    notAfter: number
  ) {
    return this.post<any>(`${this.base}/sheets`, {
      term,
      section,
      assignment,
      notBefore,
      notAfter,
    }).pipe(map((res:any) => res));
  }

  // List signup sheets
  listSheets(term: number, section: number) {
    return this.get<any>(`${this.base}/sheets`, {
      params: {
        term,
        section,
        t: Date.now().toString(),
      },
    }).pipe(map((res:any) => res));
  }

  // Delete signup sheet
  deleteSheet(id: string) {
    return this.delete<any>(`${this.base}/sheets/${id}`).pipe(map((res:any) => res));
  }

  /* ---------------- Slots API ---------------- */
  // ADD SLOTS
  addSlots(data: {
    sheetId: string;
    start: number;
    duration: number;
    numSlots: number;
    maxMembers: number;
  }) {
    return this.post<any>(`${this.base}/sheets/${data.sheetId}/slots`, {
      start: data.start,
      duration: data.duration,
      numSlots: data.numSlots,
      maxMembers: data.maxMembers,
    }).pipe(map((res:any) => res));
  }

  // LIST SLOTS
  listSlots(sheetId: string) {
    return this.get<any>(`${this.base}/sheets/${sheetId}/slots`).pipe(map((res:any) => res));
  }

  // UPDATE SLOT
  updateSlot(data: { id: string; start: number; duration: number; capacity: number }) {
    return this.patch<any>(`${this.base}/slots/${data.id}`, {
      start: data.start,
      duration: data.duration,
      capacity: data.capacity,
    }).pipe(map((res:any) => res));
  }

  // DELETE SLOT
  deleteSlot(slotId: string) {
    return this.delete<any>(`${this.base}/slots/${slotId}`).pipe(map((res:any) => res));
  }

  /* ---------------- Sign-Up API ---------------- */
  // SIGN-UP: create
  signUp(sheetId: string, slotId: string, memberId: string): Observable<ApiOk> {
    return this.post<ApiOk>(`${this.base}/signups`, {
      sheetId,
      slotId,
      memberId,
    }).pipe(map((res:any) => res));
  }

  // SIGN-UP: remove
  removeSignUp(sheetId: string, memberId: string) {
    return this.delete(`/api/signups`, {
      params: { sheetId, memberId },
    }).pipe(map((res:any) => res));
  }

  // SIGN-UP: list slot members
  getSlotMembers(slotId: string): Observable<SlotMembersResponse> {
    return this.get<SlotMembersResponse>(`${this.base}/slots/${slotId}/members`).pipe(map((res:any) => res));
  }

  /* ---------------- Grading API ---------------- */
  // Submit grade
  submitGrade(sheetId: string, memberId: string, grade: number, comment: string) {
    const body = { sheetId, memberId, grade, comment };
    return this.post<any>(`${this.base}/grades`, body).pipe(map((res:any) => res));
  }

  // Search signup sheets
  searchSignupSheets(course: string) {
    return this.http.get<any>(`/api/public/search?course=${encodeURIComponent(course)}`).pipe(map((res:any) => res));
  }

  // GRADING MODE: get current active slot
  getCurrentSlot() {
    return this.get<any>('/api/current').pipe(map((res:any) => res));
  }

  // Navigate to next slot
  getNextSlot(slotId: string) {
    return this.get<any>(`/api/slot/next`, { params: { slotId } }).pipe(map((res:any) => res));
  }

  // Navigate to previous slot
  getPreviousSlot(slotId: string) {
    return this.get<any>(`/api/slot/prev`, { params: { slotId } }).pipe(map((res:any) => res));
  }

  // Update grade (bonus, penalty, comment)
  updateGrade(data: {
    sheetId: string;
    memberId: string;
    grade?: number | null;
    bonus?: number | null;
    penalty?: number | null;
    comment?: string | null;
    changedBy?: string | null;
  }) {
    return this.post<any>('/api/grades/update', data).pipe(map((res:any) => res));
  }

  // List all users
  listAllUsers() {
    return this.get<any>('/api/users').pipe(map((res:any) => res));
  }

  // Admin:  Add user
  addUser(
    email: string,
    password: string,
    role: string,
    memberId?: string,
    term?: number,
    section?: number
  ) {
    return this.post<any>('/api/admin/add-user', {
      email,
      password,
      role,
      memberId,
      term,
      section,
    }).pipe(map((res:any) => res));
  }

  // Admin:  Remove user
  removeUser(email: string) {
    return this.delete<any>('/api/admin/remove-user', {
      params: { email },
    }).pipe(map((res:any) => res));
  }

  // Admin: Reset user password
  adminResetPassword(email: string, newPassword: string) {
    return this.post<any>('/api/admin/reset-password', {
      email,
      newPassword,
    }).pipe(map((res:any) => res));
  }
}
