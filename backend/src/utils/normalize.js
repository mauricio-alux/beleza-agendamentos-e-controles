function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

const PHONE_COUNTRIES = {
  BR: {
    dialCode: '55',
    minLength: 10,
    maxLength: 11,
    validateNational(national) {
      const ddd = Number(national.slice(0, 2));
      return ddd >= 11 && ddd <= 99 && (national.length === 10 || national.length === 11);
    }
  },
  US: {
    dialCode: '1',
    minLength: 10,
    maxLength: 10
  },
  PT: {
    dialCode: '351',
    minLength: 9,
    maxLength: 9
  }
};

function normalizePhoneToE164(value = '', country = 'BR') {
  const config = PHONE_COUNTRIES[country] || PHONE_COUNTRIES.BR;
  const digits = onlyDigits(value);

  if (!digits) return null;

  const national = digits.startsWith(config.dialCode)
    ? digits.slice(config.dialCode.length)
    : digits;

  const validLength = national.length >= config.minLength && national.length <= config.maxLength;
  const validNational = config.validateNational ? config.validateNational(national) : validLength;

  if (!validLength || !validNational) {
    const error = new Error('Telefone invalido para o pais selecionado.');
    error.code = 'INVALID_PHONE';
    throw error;
  }

  return `+${config.dialCode}${national}`;
}

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeSlug(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

module.exports = {
  onlyDigits,
  normalizePhoneToE164,
  normalizeEmail,
  normalizeSlug
};
