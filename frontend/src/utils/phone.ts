export function sanitizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhoneToE164(value: string) {
  const digits = sanitizePhone(value);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

export function isValidBrazilianPhone(value: string) {
  const normalized = normalizePhoneToE164(value);

  if (!/^55\d{10,11}$/.test(normalized)) {
    return false;
  }

  const national = normalized.slice(2);
  const ddd = Number(national.slice(0, 2));

  if (ddd < 11 || ddd > 99) {
    return false;
  }

  return national.length === 10 || national.length === 11;
}

export function formatPhone(value: string) {
  const digits = sanitizePhone(value);
  const national = digits.startsWith("55") ? digits.slice(2) : digits;
  const limited = national.slice(0, 11);
  const ddd = limited.slice(0, 2);
  const firstPart = limited.length > 10 ? limited.slice(2, 7) : limited.slice(2, 6);
  const secondPart = limited.length > 10 ? limited.slice(7, 11) : limited.slice(6, 10);

  if (limited.length <= 2) {
    return ddd ? `(${ddd}` : "";
  }

  if (!secondPart) {
    return `(${ddd}) ${firstPart}`;
  }

  return `(${ddd}) ${firstPart}-${secondPart}`;
}
