export const REGEX_NAME = /^[a-zA-Z\s.'\-]+$/;
export const REGEX_SID = /^[a-zA-Z0-9\-_\/]+$/;
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEX_ZONE_NAME = /^[a-zA-Z0-9\s\-]+$/;

export function validateField(value: string, regex: RegExp): boolean {
  if (!value) return true; // empty handled by required check
  return regex.test(value);
}
