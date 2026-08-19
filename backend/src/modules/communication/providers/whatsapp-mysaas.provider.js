const crypto = require('crypto');
const env = require('../../../config/env');
const { onlyDigits } = require('../../../utils/normalize');

const PROVIDER_NAME = 'whatsapp_mysaas';
const TEMPLATE_NOT_APPROVED_ERROR = 'Template não aprovado no provedor WhatsApp.';

function hasCloudApiCredentials() {
  return Boolean(env.whatsappCloudAccessToken && env.whatsappCloudPhoneNumberId);
}

function shouldDryRun() {
  return env.whatsappDryRun || !env.whatsappCloudApiEnabled || !hasCloudApiCredentials();
}

function buildTextPayload(to, text) {
  return {
    messaging_product: 'whatsapp',
    to: onlyDigits(to),
    type: 'text',
    text: {
      preview_url: true,
      body: text
    }
  };
}

function normalizeTemplateParameters(params = {}) {
  if (Array.isArray(params)) {
    return params
      .filter((value) => value !== null && value !== undefined && String(value) !== '')
      .map((value) => ({
        type: 'text',
        text: String(value)
      }));
  }

  return Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && String(value) !== '')
    .map(([key, value]) => ({
      type: 'text',
      parameter_name: key,
      text: String(value)
    }));
}

function normalizeTemplateComponents(components = []) {
  if (!Array.isArray(components)) return [];

  return components
    .filter((component) => component?.type)
    .map((component) => ({
      type: component.type,
      ...(component.sub_type ? { sub_type: component.sub_type } : {}),
      ...(component.index !== null && component.index !== undefined ? { index: String(component.index) } : {}),
      parameters: normalizeTemplateParameters(component.parameters || [])
    }))
    .filter((component) => component.parameters.length);
}

function buildTemplatePayload(to, message) {
  const parameters = normalizeTemplateParameters(message.providerParams || message.params);
  const providerComponents = normalizeTemplateComponents(message.providerComponents);
  const components = providerComponents.length
    ? providerComponents
    : parameters.length
      ? [
          {
            type: 'body',
            parameters
          }
        ]
      : [];

  return {
    messaging_product: 'whatsapp',
    to: onlyDigits(to),
    type: 'template',
    template: {
      name: message.providerTemplateName || message.templateName,
      language: {
        code: message.language || 'pt_BR'
      },
      ...(components.length ? { components } : {})
    }
  };
}

async function sendOperationalMessage(message) {
  if (!message?.to || !message?.text) {
    const error = new Error('Mensagem WhatsApp sem destinatario ou conteudo.');
    error.code = 'INVALID_WHATSAPP_MESSAGE';
    throw error;
  }

  if (shouldDryRun()) {
    console.log('[whatsapp-operational-debug] WhatsApp provider dry-run enabled', {
      provider: PROVIDER_NAME,
      to: onlyDigits(message.to),
      templateName: message.templateName || null
    });

    return {
      provider: PROVIDER_NAME,
      status: 'enviado',
      dry_run: true,
      provider_message_id: `dry_${crypto.randomBytes(8).toString('hex')}`,
      provider_payload: message.useTemplate
        ? buildTemplatePayload(message.to, message)
        : buildTextPayload(message.to, message.text)
    };
  }

  if (!message.useTemplate || !message.providerTemplateName || !message.language) {
    const error = new Error(TEMPLATE_NOT_APPROVED_ERROR);
    error.code = 'WHATSAPP_TEMPLATE_NOT_APPROVED';
    throw error;
  }

  const apiVersion = env.whatsappCloudApiVersion || 'v20.0';
  const url = `https://graph.facebook.com/${apiVersion}/${env.whatsappCloudPhoneNumberId}/messages`;
  const providerPayload = message.useTemplate
    ? buildTemplatePayload(message.to, message)
    : buildTextPayload(message.to, message.text);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsappCloudAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(providerPayload)
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Falha ao enviar mensagem WhatsApp.');
    error.code = body?.error?.code || 'WHATSAPP_PROVIDER_ERROR';
    error.providerPayload = body;
    throw error;
  }

  return {
    provider: PROVIDER_NAME,
    status: 'enviado',
    dry_run: false,
    provider_message_id: body?.messages?.[0]?.id || null,
    provider_payload: providerPayload,
    provider_response: body
  };
}

module.exports = {
  PROVIDER_NAME,
  TEMPLATE_NOT_APPROVED_ERROR,
  buildTemplatePayload,
  normalizeTemplateComponents,
  normalizeTemplateParameters,
  shouldDryRun,
  sendOperationalMessage
};
