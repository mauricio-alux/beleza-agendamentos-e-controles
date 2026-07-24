const crypto = require('crypto');
const { appUrl, bookingBaseUrl } = require('../../../config/env');

function getPublicAppUrl() {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.trim().replace(/\/+$/, '');
  }

  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.trim().replace(/\/+$/, '');
  }

  const bookingBase = String(bookingBaseUrl || '').trim().replace(/\/+$/, '');
  if (bookingBase.endsWith('/agendar')) {
    return bookingBase.slice(0, -'/agendar'.length);
  }

  return String(appUrl || '').trim().replace(/\/+$/, '');
}

function buildPublicAppUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  const baseUrl = getPublicAppUrl();

  if (!normalizedPath) return baseUrl;
  return `${baseUrl}/${normalizedPath.replace(/^\/+/, '')}`;
}

function generateOperationalToken() {
  return `apt_${crypto.randomBytes(24).toString('base64url')}`;
}

function buildOperationalLinks(token) {
  const encoded = encodeURIComponent(token);

  return {
    confirmar: buildPublicAppUrl(`/acao_agendamento?cmd=confirmar&tk=${encoded}`),
    cancelar: buildPublicAppUrl(`/acao_agendamento?cmd=cancelar&tk=${encoded}`),
    reagendar: buildPublicAppUrl(`/reagendar?tk=${encoded}`)
  };
}

function getFirstAppointmentService(appointment) {
  return appointment?.servicos?.[0]?.servico || appointment?.servicos?.[0] || null;
}

function buildOperationalMessage(appointment) {
  const token = appointment?.token_confirmacao;
  const links = token ? buildOperationalLinks(token) : null;
  const service = getFirstAppointmentService(appointment);
  const professionalName = appointment?.profissional?.nome_publico || appointment?.profissional?.nome || 'profissional';
  const date = appointment?.data_inicio
    ? new Date(appointment.data_inicio).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo'
      })
    : 'data a confirmar';

  if (!links) {
    return null;
  }

  return {
    channel: 'whatsapp',
    template: 'appointment_operational_links',
    text: [
      `Seu agendamento de ${service?.nome || 'atendimento'} com ${professionalName} esta previsto para ${date}.`,
      `Confirmar: ${links.confirmar}`,
      `Cancelar: ${links.cancelar}`,
      `Reagendar: ${links.reagendar}`
    ].join('\n')
  };
}

module.exports = {
  generateOperationalToken,
  buildOperationalLinks,
  buildOperationalMessage
};
