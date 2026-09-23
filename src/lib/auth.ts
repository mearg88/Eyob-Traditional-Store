import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isDemoMode } from './data';
import type { Customer, RoleName } from './types';

// ---------------------------------------------------------------------------
// Authentication.
//
// One store covers both audiences, because a person is either a customer or a
// member of staff and never usefully both at once:
//
//   customer  — orders, measurements, order history
//   staff     — the admin, with a role that decides what they may do
//
// SECURITY NOTE, since this file looks more powerful than it is: everything
// here decides what the INTERFACE shows. Anyone can set a flag in their own
// browser. What actually protects data is Row Level Security in the database,
// which re-checks the signed-in user on every query. That is why signing in
// "successfully" in demo mode is harmless — there is no data to protect.
//
// Accounts are required to order, by decision: the process runs for weeks and
// involves measurement approval, so a guest would have no way back in to see
// or confirm anything.
// ---------------------------------------------------------------------------

export type AuthResult = { ok: true } | { ok: false; message: string };

interface AuthState {
  customer: Customer | null;
  staffRole: RoleName | null;
  staffEmail: string | null;
  /** True while a session is being restored, so pages do not flash signed-out. */
  restoring: boolean;

  signUp(input: { email: string; password: string; fullName: string; phone: string }): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  signInStaff(email: string, password: string): Promise<AuthResult>;
  signOutStaff(): void;
  updateCustomer(patch: Partial<Customer>): void;
}

/**
 * A stable id from an email in demo mode, so the same address gets the same
 * saved measurements across reloads without any server.
 */
function demoIdFor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  return `demo-${Math.abs(hash).toString(36)}`;
}

async function supabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
  );
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      staffRole: null,
      staffEmail: null,
      restoring: false,

      async signUp({ email, password, fullName, phone }) {
        if (password.length < 8) {
          return { ok: false, message: 'Please choose a password of at least 8 characters.' };
        }

        if (isDemoMode) {
          set({
            customer: {
              id: demoIdFor(email),
              email,
              fullName,
              phone,
              preferredUnit: 'cm',
              createdAt: new Date().toISOString(),
            },
          });
          return { ok: true };
        }

        const client = await supabaseClient();
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone } },
        });

        if (error) {
          // Message chosen to be useful without confirming whether an address
          // is registered, which would let someone enumerate customers.
          return {
            ok: false,
            message: error.message.toLowerCase().includes('already')
              ? 'There is already an account with that email. Try signing in instead.'
              : 'We could not create the account. Please check the details and try again.',
          };
        }
        if (!data.user) {
          return { ok: false, message: 'Please check your email to confirm your account.' };
        }

        set({
          customer: {
            id: data.user.id,
            email,
            fullName,
            phone,
            preferredUnit: 'cm',
            createdAt: data.user.created_at ?? new Date().toISOString(),
          },
        });
        return { ok: true };
      },

      async signIn(email, password) {
        if (isDemoMode) {
          if (!email.includes('@') || password.length < 4) {
            return { ok: false, message: 'Enter an email address and a password.' };
          }
          set({
            customer: {
              id: demoIdFor(email),
              email,
              fullName: email.split('@')[0],
              preferredUnit: 'cm',
              createdAt: new Date().toISOString(),
            },
          });
          return { ok: true };
        }

        const client = await supabaseClient();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          return { ok: false, message: 'That email and password did not match. Please try again.' };
        }

        const meta = (data.user.user_metadata ?? {}) as { full_name?: string; phone?: string };
        set({
          customer: {
            id: data.user.id,
            email,
            fullName: meta.full_name ?? email.split('@')[0],
            phone: meta.phone,
            preferredUnit: 'cm',
            createdAt: data.user.created_at ?? new Date().toISOString(),
          },
        });
        return { ok: true };
      },

      async signOut() {
        if (!isDemoMode) {
          const client = await supabaseClient();
          await client.auth.signOut();
        }
        set({ customer: null });
      },

      async signInStaff(email, password) {
        if (isDemoMode) {
          if (!email.includes('@') || password.length < 4) {
            return { ok: false, message: 'Enter an email address and any password.' };
          }
          // Demo mode has no user table, so everyone is the owner. Said plainly
          // on the sign-in screen so nobody mistakes it for real access control.
          set({ staffRole: 'owner', staffEmail: email });
          return { ok: true };
        }

        const client = await supabaseClient();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          return { ok: false, message: 'That email and password did not match. Please try again.' };
        }

        // Membership of staff_users is what grants admin access. RLS enforces
        // it on every query regardless of what this store believes, so a
        // tampered browser gains nothing.
        const { data: row } = await client
          .from('staff_users')
          .select('role, active')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!row || row.active === false) {
          await client.auth.signOut();
          return { ok: false, message: 'That account does not have access to the admin area.' };
        }

        set({ staffRole: (row.role as RoleName) ?? 'staff', staffEmail: email });
        return { ok: true };
      },

      signOutStaff() {
        set({ staffRole: null, staffEmail: null });
        if (!isDemoMode) void supabaseClient().then((c) => c.auth.signOut());
      },

      updateCustomer(patch) {
        const current = get().customer;
        if (current) set({ customer: { ...current, ...patch } });
      },
    }),
    {
      name: 'ets.auth.v1',
      partialize: (s) => ({
        customer: s.customer,
        staffRole: s.staffRole,
        staffEmail: s.staffEmail,
      }),
    },
  ),
);
