import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const userRol = localStorage.getItem('rol');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRol = route.data['expectedRol'];
  
  if (expectedRol && userRol !== expectedRol) {
    router.navigate(['/ventas']); 
    return false;
  }

  return true;
};