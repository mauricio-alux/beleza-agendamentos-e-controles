const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTemplatePayload,
  normalizeTemplateComponents,
  normalizeTemplateParameters
} = require('./whatsapp-mysaas.provider');

test('normalizeTemplateParameters keeps named parameters for object input', () => {
  assert.deepEqual(normalizeTemplateParameters({ nome_cliente: 'Maria' }), [
    {
      type: 'text',
      parameter_name: 'nome_cliente',
      text: 'Maria'
    }
  ]);
});

test('normalizeTemplateParameters converts array input to Meta positional parameters', () => {
  assert.deepEqual(normalizeTemplateParameters(['Maria', 'Studio']), [
    {
      type: 'text',
      text: 'Maria'
    },
    {
      type: 'text',
      text: 'Studio'
    }
  ]);
});

test('buildTemplatePayload prefers providerParams for WhatsApp template sends', () => {
  const payload = buildTemplatePayload('+5511999999999', {
    templateName: 'master_tenant_created',
    providerTemplateName: 'master_tenant_created',
    language: 'pt_BR',
    params: {
      nome_responsavel: 'Mauricio',
      nome_empresa: 'Salao Modelo'
    },
    providerParams: ['Mauricio', 'Salao Modelo']
  });

  assert.deepEqual(payload.template.components[0].parameters, [
    {
      type: 'text',
      text: 'Mauricio'
    },
    {
      type: 'text',
      text: 'Salao Modelo'
    }
  ]);
  assert.equal(payload.template.components[0].parameters[0].parameter_name, undefined);
});

test('buildTemplatePayload uses explicit body and url button components', () => {
  const payload = buildTemplatePayload('+5511999999999', {
    templateName: 'appointment_confirmed',
    providerTemplateName: 'appointment_confirmed',
    language: 'pt_BR',
    providerComponents: [
      {
        type: 'body',
        parameters: ['Maria', 'Corte', 'Vivian', '13/08/2026', '14:00']
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: ['apt_token']
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 1,
        parameters: ['apt_token']
      }
    ]
  });

  assert.deepEqual(payload.template.components, [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'Maria' },
        { type: 'text', text: 'Corte' },
        { type: 'text', text: 'Vivian' },
        { type: 'text', text: '13/08/2026' },
        { type: 'text', text: '14:00' }
      ]
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: 'apt_token' }]
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '1',
      parameters: [{ type: 'text', text: 'apt_token' }]
    }
  ]);
});

test('normalizeTemplateComponents drops empty components', () => {
  assert.deepEqual(normalizeTemplateComponents([{ type: 'body', parameters: [] }]), []);
});
