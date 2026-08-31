import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser;
  const role = user?.role?.toUpperCase();

  if (role === 'ADMIN') {
    return true;
  }

  // Rediriger vers l'accueil si l'utilisateur n'est pas admin
  return router.createUrlTree(['/']);
};
