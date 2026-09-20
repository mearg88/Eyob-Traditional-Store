import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isDemoMode } from './data';

// ---------------------------------------------------------------------------
// Admin authentication.
//
// IMPORTANT, AND NOT OPTIONAL BEFORE LAUNCH:
//
// This store controls what the admin UI *shows*. It is not, and must never be
// treated as, what protects admin *data*. Anyone can set a flag in their own
// browser. The real protection is:
//
//   1. Supabase Row Level Security, which refuses writes from a session whose
//      user id is not in admin_users (see supabase/schema.sql), and
//   2. the serverless functions, which check the caller's JWT before acting.
//
// So hiding a button here is a convenience for the owner, not a security
// boundary. In demo mode there is no real auth at all, which is why the login
// screen says so in plain words.
// ---------------------------------------------------------------------------

export type AdminRole = 'owner' | 'staff';

interface AdminState {
  signedIn: boolean;
  email: string | null;
  role: AdminRole;
  signIn(email: string, password: string): Promise<{ ok: boolean; message?: string }>;
  signOut(): void;
}

export const useAdmin = create<AdminState>()(
  persist(
    (set) => ({
      signedIn: false,
      email: null,
      role: 'owner',

      async signIn(email, password) {
        if (isDemoMode) {
          // Demo: any non-empty credentials open the door, because there is no
          // database to check them against. Labelled loudly in the UI.
          if (!email.includes('@') || password.length < 4) {
            return { ok: false, message: 'Enter an email address and any password of 4 characters or more.' };
          }
          set({ signedIn: true, email, role: 'owner' });
          return { ok: true };
        }

        const { createClient } = await import('@supabase/supabase-js');
        const client = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!,
        );
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          return { ok: false, message: 'That email and password did not match. Please try again.' };
        }

        // Membership of admin_users is what actually grants access; RLS
        // enforces it on every query regardless of what this flag says.
        const { data: adminRow } = await client
          .from('admin_users')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!adminRow) {
          await client.auth.signOut();
          return { ok: false, message: 'That account does not have access to the admin area.' };
        }

        set({ signedIn: true, email, role: (adminRow.role as AdminRole) ?? 'staff' });
        return { ok: true };
      },

      signOut() {
        set({ signedIn: false, email: null });
      },
    }),
    { name: 'ets.admin.v1' },
  ),
);
