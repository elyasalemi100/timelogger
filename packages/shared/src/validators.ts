export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/i.test(code);
}

export function clampAccuracy(accuracy: number | undefined): number | undefined {
  if (accuracy == null || accuracy < 0) return undefined;
  return Math.min(accuracy, 9999);
}
