const eventLogsRepository = require('./eventLogs.repository');

async function logEvent(eventType, context = {}) {
  const payload = {
    tenant_id: context.tenantId || null,
    usuario_id: context.usuarioId || null,
    event_type: eventType,
    origem: context.origem || 'backend',
    ip_address: context.ipAddress || null,
    user_agent: context.userAgent || null,
    payload: context.payload || {}
  };

  try {
    return await eventLogsRepository.create(payload);
  } catch (error) {
    console.error('Failed to persist event log', { eventType, error });
    return null;
  }
}

module.exports = {
  logEvent
};
