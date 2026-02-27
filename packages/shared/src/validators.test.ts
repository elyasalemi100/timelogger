import { isValidEmail, isValidInviteCode } from './validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(isValidEmail('a@b.com')).toBe(true);
      expect(isValidEmail('user@example.com')).toBe(true);
    });
    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('no-at')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('isValidInviteCode', () => {
    it('accepts 6-12 alphanumeric', () => {
      expect(isValidInviteCode('ABC123')).toBe(true);
      expect(isValidInviteCode('abcdef')).toBe(true);
    });
    it('rejects too short', () => {
      expect(isValidInviteCode('ABC')).toBe(false);
    });
  });
});
