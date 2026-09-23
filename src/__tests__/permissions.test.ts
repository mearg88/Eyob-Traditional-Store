import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, ROLES, can, canAny } from '../lib/permissions';

describe('roles', () => {
  it('gives the owner everything', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can('owner', permission)).toBe(true);
    }
  });

  it('lets staff run the shop day to day', () => {
    expect(can('staff', 'designs.write')).toBe(true);
    expect(can('staff', 'orders.write')).toBe(true);
    expect(can('staff', 'measurements.write')).toBe(true);
    expect(can('staff', 'customers.read')).toBe(true);
  });

  it('keeps staff out of user management, settings and revenue', () => {
    // These are the three that separate running the shop from owning it.
    expect(can('staff', 'users.manage')).toBe(false);
    expect(can('staff', 'settings.write')).toBe(false);
    expect(can('staff', 'revenue.read')).toBe(false);
  });

  it('grants nothing to someone signed out', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can(null, permission)).toBe(false);
      expect(can(undefined, permission)).toBe(false);
    }
  });

  it('never grants a permission that is not in the master list', () => {
    // Catches a typo in a role definition, which would otherwise silently
    // grant nothing and be noticed only when someone could not do their job.
    for (const role of Object.values(ROLES)) {
      for (const permission of role.permissions) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
    }
  });
});

describe('canAny', () => {
  it('is true when one of several permissions is held', () => {
    expect(canAny('staff', ['users.manage', 'designs.read'])).toBe(true);
  });

  it('is false when none are held', () => {
    expect(canAny('staff', ['users.manage', 'revenue.read'])).toBe(false);
  });

  it('is false for a signed-out user regardless of the list', () => {
    expect(canAny(null, ALL_PERMISSIONS)).toBe(false);
  });
});
