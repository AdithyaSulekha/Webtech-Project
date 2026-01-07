import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CoursesComponent } from './features/courses/courses';
import { Members } from './features/members/members';
import { SignupSheets } from './features/signup-sheets/signup-sheets';
import { Slots } from './features/signup-sheets/slots/slots';
import { SignUp } from './features/signup-sheets/sign-up/sign-up';
import { Grading } from './features/grading/grading';
import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';
import { AuthGuard } from './auth/auth-guard';
import { FirstLoginGuard } from './auth/first-login-guard';
import { Home } from './features/home/home';
import { Admin } from './features/admin/admin';
import { AdminGuard } from './auth/admin-guard';
import { Student } from './features/student/student';

const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'login', component: Login },
  { path: 'change-password', component: ChangePassword },
  // Default route should go to home
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // PROTECTED ROUTES
  {
    path: '',
    canActivate: [AuthGuard, FirstLoginGuard],
    children: [
      { path: '', redirectTo: 'courses', pathMatch: 'full' },
      { path: 'courses', component: CoursesComponent },
      { path: 'members', component: Members },
      { path: 'signup-sheets', component: SignupSheets },
      { path: 'slots', component: Slots },
      { path: 'sign-up', component: SignUp },
      { path: 'grading', component: Grading },
      // Student UI
      { path: 'student', component: Student },
      // Admin only route
      {
        path: 'admin',
        component: Admin,
        canActivate: [AdminGuard]
      }
    ]
  },
  { path: '**', redirectTo: 'courses' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
