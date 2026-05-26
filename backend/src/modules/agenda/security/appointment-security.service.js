const crypto = require('crypto');

const DEFAULT_SECURITY_SETTINGS = {
  confirmation_policy: 'flexible',
  attendant_confirmation_timeout_minutes: 30,
  client_confirmation_timeout_minutes: 60,
  weekly_booking_limit: 3,
  block_when_weekly_limit_exceeded: false
};

function normalizeSecuritySettings(settings = {}) {
  const nested = settings.configuracoes_ia?.agenda_security || {};

  return {
    confirmation_policy: settings.confirmation_policy || nested.confirmation_policy || DEFAULT_SECURITY_SETTINGS.confirmation_policy,
    attendant_confirmation_timeout_minutes:
      Number(settings.attendant_confirmation_timeout_minutes || nested.attendant_confirmation_timeout_minutes)
      || DEFAULT_SECURITY_SETTINGS.attendant_confirmation_timeout_minutes,
    client_confirmation_timeout_minutes:
      Number(settings.client_confirmation_timeout_minutes || nested.client_confirmation_timeout_minutes)
      || DEFAULT_SECURITY_SETTINGS.client_confirmation_timeout_minutes,
    weekly_booking_limit:
      Number(settings.weekly_booking_limit || nested.weekly_booking_limit)
      || DEFAULT_SECURITY_SETTINGS.weekly_booking_limit,
    block_when_weekly_limit_exceeded:
      settings.block_when_weekly_limit_exceeded ?? nested.block_when_weekly_limit_exceeded ?? DEFAULT_SECURITY_SETTINGS.block_when_weekly_limit_exceeded
  };
}

function hashDevice(input = {}) {
  const raw = [
    input.device_hash,
    input.user_agent,
    input.timezone,
    input.locale
  ].filter(Boolean).join('|');

  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateClientToken() {
  return crypto.randomBytes(24).toString('hex');
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000).toISOString();
}

function buildConfirmationContext(settings, now = new Date()) {
  const security = normalizeSecuritySettings(settings);

  return {
    ...security,
    pending_attendant_expires_at: addMinutes(now, security.attendant_confirmation_timeout_minutes),
    pending_client_expires_at: addMinutes(now, security.client_confirmation_timeout_minutes)
  };
}

function evaluateClientIdentity(client, context = {}) {
  const deviceHash = hashDevice(context);
  const trustedHash = client?.trusted_device_hash || null;
  let trustScore = Number(client?.trust_score ?? 0);
  let identityStatus = client?.identity_status || 'normal';

  if (deviceHash && trustedHash && deviceHash === trustedHash) {
    trustScore = Math.min(100, trustScore + 10);
  } else if (deviceHash && trustedHash && deviceHash !== trustedHash) {
    trustScore = Math.max(0, trustScore - 10);
    if (trustScore < 20) identityStatus = 'validacao_pendente';
  }

  if (identityStatus === 'bloqueado') {
    return {
      deviceHash,
      trustScore,
      identityStatus,
      suspicious: true,
      reason: 'client_blocked'
    };
  }

  return {
    deviceHash,
    trustScore,
    identityStatus,
    suspicious: identityStatus === 'suspeito' || identityStatus === 'validacao_pendente',
    reason: identityStatus === 'normal' ? null : identityStatus
  };
}

module.exports = {
  DEFAULT_SECURITY_SETTINGS,
  normalizeSecuritySettings,
  hashDevice,
  generateClientToken,
  buildConfirmationContext,
  evaluateClientIdentity
};
