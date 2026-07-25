import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Aguarda inicialização assíncrona da sessão Supabase
  await supabase.waitForAuthReady();

  if (supabase.currentUser()) {
    return true;
  }

  // Redireciona para login se não autenticado
  router.navigate(['/login']);
  return false;
};
