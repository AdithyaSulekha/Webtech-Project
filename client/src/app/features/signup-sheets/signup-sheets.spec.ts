import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupSheets } from './signup-sheets';

describe('SignupSheets', () => {
  let component: SignupSheets;
  let fixture: ComponentFixture<SignupSheets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SignupSheets]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignupSheets);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
