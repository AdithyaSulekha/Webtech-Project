import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { FirstLoginGuard } from './first-login-guard';

describe('firstLoginGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => FirstLoginGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
