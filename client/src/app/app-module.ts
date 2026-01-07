import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http'; 
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { CoursesComponent } from './features/courses/courses';
import { CommonModule } from '@angular/common';
import { Members } from './features/members/members';
import { SignupSheets } from './features/signup-sheets/signup-sheets';
import { Grading } from './features/grading/grading';
import { Admin } from './features/admin/admin';
import { Slots } from './features/signup-sheets/slots/slots';
import { Login } from './features/auth/login/login';
import { ChangePassword } from './features/auth/change-password/change-password';
import { SignUp } from './features/signup-sheets/sign-up/sign-up';
import { Home } from './features/home/home';
import { Student } from './features/student/student';


@NgModule({
  declarations: [
    App
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CoursesComponent,
    Members,
    SignupSheets,
    Grading,
    Admin,
    Slots,
    Login,
    ChangePassword,
    SignUp,
    Home,
    Student
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
