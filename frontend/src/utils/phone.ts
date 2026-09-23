export type PhoneCountry = "BR" | "US" | "PT";

export const PHONE_COUNTRIES: Array<{
  code: PhoneCountry;
  label: string;
  dialCode: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
}> = [
  { code: "BR", label: "Brasil", dialCode: "55", placeholder: "(16) 99999-9999", minLength: 10, maxLength: 11 },
  { code: "US", label: "Estados Unidos", dialCode: "1", placeholder: "(555) 123-4567", minLength: 10, maxLength: 10 },
  { code: "PT", label: "Portugal", dialCode: "351", placeholder: "912 345 678", minLength: 9, maxLength: 9 }
];

export function sanitizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function getPhoneCountry(country: PhoneCountry = "BR") {
  return PHONE_COUNTRIES.find((item) => item.code === country) || PHONE_COUNTRIES[0];
}

export function getNationalPhone(value: string, country: PhoneCountry = "BR") {
  const config = getPhoneCountry(country);
  const digits = sanitizePhone(value);
  const national = digits.startsWith(config.dialCode) && digits.length > config.maxLength ? digits.slice(config.dialCode.length) : digits;
  return national;
}

export function normalizePhoneToE164(value: string, country: PhoneCountry = "BR") {
  const config = getPhoneCountry(country);
  const national = getNationalPhone(value, country);

  if (!national) {
    return "";
  }

  return `+${config.dialCode}${national}`;
}

export function isValidPhone(value: string, country: PhoneCountry = "BR") {
  const config = getPhoneCountry(country);
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return false;
  if (value.trim().startsWith("+") && (!sanitizePhone(value).startsWith(config.dialCode) || sanitizePhone(value).length <= config.maxLength)) return false;
  const national = getNationalPhone(value, country);

  if (national.length < config.minLength || national.length > config.maxLength) {
    return false;
  }

  if (country === "BR") {
    const ddd = Number(national.slice(0, 2));
    return ddd >= 11 && ddd <= 99 && (national.length === 10 || national.length === 11);
  }

  return true;
}

export function isValidBrazilianPhone(value: string) {
  return isValidPhone(value, "BR");
}

export function formatPhone(value: string, country: PhoneCountry = "BR") {
  const national = getNationalPhone(value, country);
  if (national.length > getPhoneCountry(country).maxLength) return value;

  if (country === "BR") {
    const ddd = national.slice(0, 2);
    const firstPart = national.length > 10 ? national.slice(2, 7) : national.slice(2, 6);
    const secondPart = national.length > 10 ? national.slice(7, 11) : national.slice(6, 10);

    if (national.length <= 2) {
      return ddd ? `(${ddd}` : "";
    }

    if (!secondPart) {
      return `(${ddd}) ${firstPart}`;
    }

    return `(${ddd}) ${firstPart}-${secondPart}`;
  }

  if (country === "US") {
    const area = national.slice(0, 3);
    const prefix = national.slice(3, 6);
    const line = national.slice(6, 10);
    if (national.length <= 3) return area ? `(${area}` : "";
    if (!line) return `(${area}) ${prefix}`;
    return `(${area}) ${prefix}-${line}`;
  }

  if (country === "PT") {
    return [national.slice(0, 3), national.slice(3, 6), national.slice(6, 9)].filter(Boolean).join(" ");
  }

  return national;
}

export function formatStoredPhone(value: string | null | undefined, country: PhoneCountry = "BR") {
  return formatPhone(value || "", country);
}
