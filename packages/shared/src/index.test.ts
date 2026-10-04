import { describe, expect, it } from 'vitest';
import { USER_ROLES } from './index';

describe('shared', () => {
  it('exposes the four roles from PLAN D3', () => {
    expect(USER_ROLES).toEqual(['admin', 'subadmin', 'technician', 'client']);
  });
});
