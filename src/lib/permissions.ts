import type { Permission, Role, RoleName } from './types';

// ---------------------------------------------------------------------------
// Roles and permissions.
//
// Two roles ship, as chosen: Owner and Staff. They are defined as DATA rather
// than as branches in code, so adding a third — a Measurement Specialist who
// sees customer contact details but not prices, say — is an edit to this file
// and a row in the database, not a rewrite of every screen.
//
// WHAT THIS FILE IS NOT: security. Anything here only decides what the
// interface OFFERS. What the database actually permits is enforced by Row
// Level Security in supabase/schema.sql, which checks the signed-in user's
// role on every single query. A staff member who edits their own browser still
// cannot read a row the database refuses them.
//
// Hiding a button is a courtesy. The policy is the defence.
// ---------------------------------------------------------------------------

export const ALL_PERMISSIONS: Permission[] = [
  'designs.read', 'designs.write',
  'orders.read', 'orders.write',
  'measurements.read', 'measurements.write',
  'customers.read',
  'prices.read', 'prices.write',
  'settings.write',
  'users.manage',
  'revenue.read',
];

export const ROLES: Record<RoleName, Role> = {
  owner: {
    name: 'owner',
    label: 'Owner',
    // Everything, including creating other staff and seeing revenue.
    permissions: [...ALL_PERMISSIONS],
  },
  staff: {
    name: 'staff',
    label: 'Staff',
    /*
     * Staff can run the shop day to day: designs, orders, measurements and
     * customers. They cannot create other users, change payment or store
     * settings, or see revenue totals.
     *
     * Note that staff CAN see prices, because they cannot process an order
     * without them. If the person doing measurement verification should be
     * blind to money, that is a third role rather than a change to this one —
     * see the file header.
     */
    permissions: [
      'designs.read', 'designs.write',
      'orders.read', 'orders.write',
      'measurements.read', 'measurements.write',
      'customers.read',
      'prices.read', 'prices.write',
    ],
  },
};

export function can(role: RoleName | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLES[role]?.permissions.includes(permission) ?? false;
}

export function canAny(role: RoleName | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** Human-readable summary, used on the staff management screen. */
export function describeRole(role: RoleName): string {
  return role === 'owner'
    ? 'Full access, including adding staff and seeing revenue.'
    : 'Can manage designs, orders and measurements. Cannot add staff, change settings, or see revenue.';
}
