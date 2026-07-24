const { APP_BRAND } = require('../../config/app-brand');

const TEXT_CHANNELS = new Set(['whatsapp', 'sms', 'push', 'text']);
const VISUAL_CHANNELS = new Set(['email', 'html', 'portal', 'dashboard', 'web', 'pdf']);

function getInstitutionalSignatureText() {
  return `Mensagem automática enviada pela plataforma ${APP_BRAND.appName}.`;
}

function appendInstitutionalSignature(content = '') {
  const text = String(content || '').trimEnd();
  const signature = getInstitutionalSignatureText();

  if (text.includes(signature)) {
    return text;
  }

  return text ? `${text}\n\n${signature}` : signature;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getInstitutionalSignatureHtml() {
  const logo = APP_BRAND.logoUrl
    ? `<img src="${escapeHtml(APP_BRAND.logoUrl)}" alt="" width="24" height="24" style="display:block;object-fit:contain">`
    : '';

  return [
    '<div data-platform-signature="true" style="display:flex;align-items:center;gap:8px;color:#666;font-size:12px">',
    logo,
    `<span>${escapeHtml(getInstitutionalSignatureText())}</span>`,
    '</div>'
  ].join('');
}

function appendInstitutionalSignatureHtml(content = '') {
  const html = String(content || '').trimEnd();

  if (html.includes('data-platform-signature="true"')) {
    return html;
  }

  const signature = getInstitutionalSignatureHtml();
  return html ? `${html}${signature}` : signature;
}

function applyInstitutionalSignature(content, channel = 'text') {
  const normalizedChannel = String(channel || '').trim().toLowerCase();

  if (VISUAL_CHANNELS.has(normalizedChannel)) {
    return appendInstitutionalSignatureHtml(content);
  }

  if (TEXT_CHANNELS.has(normalizedChannel)) {
    return appendInstitutionalSignature(content);
  }

  return appendInstitutionalSignature(content);
}

module.exports = {
  TEXT_CHANNELS,
  VISUAL_CHANNELS,
  getInstitutionalSignatureText,
  getInstitutionalSignatureHtml,
  appendInstitutionalSignature,
  appendInstitutionalSignatureHtml,
  applyInstitutionalSignature
};
