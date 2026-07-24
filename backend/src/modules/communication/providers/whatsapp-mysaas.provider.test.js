const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTemplatePayload,
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
