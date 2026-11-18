export function normalizePhone(raw: string): string {
  const cleaned = raw.trim().replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("00") && /^\d+$/.test(cleaned.slice(2))) {
    return `+${cleaned.slice(2)}`;
  }
  return cleaned;
}

export function isValidPhoneInput(raw: string): boolean {
  const normalized = normalizePhone(raw);
  const digitsOnly = normalized.replace(/^\+/, "");
  return /^\+?\d{7,15}$/.test(normalized) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

export function getPhoneLookupCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const normalized = normalizePhone(trimmed);
  const digits = normalized.replace(/\D/g, "");
  const set = new Set<string>();

  if (trimmed) set.add(trimmed);
  if (normalized) set.add(normalized);
  if (digits) set.add(digits);

  // Rwanda convenience variants (07xxxxxxxx <-> +2507xxxxxxxx <-> 2507xxxxxxxx)
  if (/^07\d{8}$/.test(digits)) {
    set.add(`+250${digits.slice(1)}`);
    set.add(`250${digits.slice(1)}`);
  } else if (/^2507\d{8}$/.test(digits)) {
    set.add(`+${digits}`);
    set.add(`0${digits.slice(3)}`);
  }

  return Array.from(set);
}

export function formatUserContact(email: string, phone?: string | null): string {
  if (email.endsWith("@phone.local") && phone) {
    return phone;
  }
  if (phone && email && !email.endsWith("@phone.local")) {
    return `${email} · ${phone}`;
  }
  return phone || email;
}
