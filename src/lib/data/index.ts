import type { DataAdapter } from './adapter';
import { MockAdapter } from './mock';

// ---------------------------------------------------------------------------
// Adapter selection.
//
// With Supabase keys present the app uses the real database; without them it
// runs the demo adapter. That is the whole switch — no build flags and no
// separate entry point, so demo mode exercises the same components production
// does rather than a parallel mock UI that can drift.
// ---------------------------------------------------------------------------

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isDemoMode = !url || !anonKey;

let adapter: DataAdapter | null = null;
let loading: Promise<DataAdapter> | null = null;

export async function getData(): Promise<DataAdapter> {
  if (adapter) return adapter;
  if (loading) return loading;

  loading = (async () => {
    let created: DataAdapter;
    if (isDemoMode) {
      created = new MockAdapter();
    } else {
      // Loaded lazily so the Supabase client stays out of the bundle that
      // demo-mode visitors download. Written in M2, alongside authentication;
      // until then, configuring Supabase keys is not yet supported and we say
      // so rather than failing obscurely at runtime.
      throw new Error(
        'Supabase support is not wired up yet. Remove VITE_SUPABASE_URL and '
        + 'VITE_SUPABASE_ANON_KEY to run in demo mode.',
      );
    }
    adapter = created;
    return created;
  })();

  return loading;
}

export type { DataAdapter, DesignFilters } from './adapter';
