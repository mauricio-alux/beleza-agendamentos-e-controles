const assert = require('node:assert/strict');
const { afterEach, describe, it, mock } = require('node:test');
const repository = require('./client-identity.repository');
const service = require('./client-identity.service');

const tenant = { id: '11111111-1111-4111-8111-111111111111', ativo: true, status: 'trial' };
const otherTenantId = '22222222-2222-4222-8222-222222222222';
const clientId = '33333333-3333-4333-8333-333333333333';
const tokenId = '44444444-4444-4444-8444-444444444444';
const link = { id: '55555555-5555-4555-8555-555555555555', ativo: true, acesso_publico: true };

function clientContext() {
  return {
    tenant_id: tenant.id,
    cliente_id: clientId,
    nome_no_tenant: 'Ana',
    status: 'ativo',
    ativo: true,
    metadata: {},
    cliente: {
      id: clientId,
      ativo: true,
      nome: 'Ana',
      telefone: '+5516999999999',
      email: null
    }
  };
}

afterEach(() => mock.restoreAll());

describe('public booking client identity', () => {
  it('delegates pair and scoped additive hash to v2, never calls legacy RPC or profile mutation', async () => {
    let received;
    mock.method(repository, 'identifyClient', async () => { throw Error('legacy bypass'); });
    mock.method(repository, 'revokeActiveTokens', async () => { throw Error('revocation'); });
    mock.method(repository, 'updateIdentifiedClient', async () => { throw Error('profile write'); });
    mock.method(repository, 'identifyWithBirth', async payload => { received = payload; return {client_id:clientId,recognized:true}; });
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'listRecentAppointments', async () => []);
    const result = await service.identify(tenant, link, {cliente:{nome:'Different',email:'other@example.test',telefone:'(16) 99999-9999',data_nascimento:'1990-01-01'}});
    assert.equal(received.tenantId,tenant.id);
    assert.equal(received.telefone,'+5516999999999');
    assert.equal(received.data_nascimento,'1990-01-01');
    assert.equal(received.tokenHash,service.hashToken(result.token));
    assert.equal(result.client.nome,'Ana');
    assert.equal(result.client.email,null);
    assert.equal(result.clientId,clientId);
  });

  it('rejects phone alone and legacy lookup_only without birth uniformly before repository', async () => {
    mock.method(repository,'identifyWithBirth',async()=>{throw Error('unexpected database call');});
    for (const lookup_only of [true,false]) for (const telefone of ['', '123', '+5516999999999']) {
      await assert.rejects(service.identify(tenant,link,{lookup_only,cliente:{nome:'Any',telefone}}),
        {code:'CLIENT_MATCH_UNAVAILABLE'});
    }
  });

  it('lookup_only with complete pair cannot create a new client',async()=>{
    let payload;
    mock.method(repository,'identifyWithBirth',async input=>{payload=input;return {client_id:clientId,recognized:true};});
    mock.method(repository,'findClientContext',async()=>clientContext());
    mock.method(repository,'listRecentAppointments',async()=>[]);
    await service.identify(tenant,link,{lookup_only:true,cliente:{telefone:'+5516999999999',data_nascimento:'1990-01-01'}});
    assert.equal(payload.lookupOnly,true);
  });

  it('new credential does not replace the existing Safari credential',async()=>{
    const issued = new Map([['safari',{id:tokenId,tenant_id:tenant.id,cliente_id:clientId,expira_em:new Date(Date.now()+60000).toISOString()}]]);
    mock.method(repository,'identifyWithBirth',async payload=>{
      issued.set(payload.tokenHash,{id:'new-token',tenant_id:tenant.id,cliente_id:clientId,expira_em:payload.expiresAt});
      return {client_id:clientId,recognized:true};
    });
    mock.method(repository,'findToken',async hash=>hash===service.hashToken('safari')?issued.get('safari'):issued.get(hash));
    mock.method(repository,'findClientContext',async()=>clientContext());
    mock.method(repository,'listRecentAppointments',async()=>[]);
    mock.method(repository,'touchIdentity',async()=>{});
    const fresh=await service.identify(tenant,link,{cliente:{nome:'Ana',telefone:'+5516999999999',data_nascimento:'1990-01-01'}});
    assert.equal(await service.resolveClientForAppointment(tenant.id,'safari'),clientId);
    assert.equal(await service.resolveClientForAppointment(tenant.id,fresh.token),clientId);
    assert.notEqual(fresh.token,'safari');
  });

  it('personal appointment scope never expands by phone',async()=>{
    mock.method(repository,'findClientById',async()=>{throw Error('phone expansion');});
    mock.method(repository,'listClientIdsByPhone',async()=>{throw Error('phone expansion');});
    assert.deepEqual(await service.listRelatedClientIdsForAppointment(tenant.id,clientId),[clientId]);
  });

  it('accepts a valid tenant-scoped token', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: tenant.id,
      cliente_id: clientId,
      expira_em: new Date(Date.now() + 60000).toISOString()
    }));
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'touchIdentity', async () => undefined);
    mock.method(repository, 'listRecentAppointments', async () => []);

    const resolvedClientId = await service.resolveClientForAppointment(tenant.id, 'valid-token');
    assert.equal(resolvedClientId, clientId);
  });

  it('rejects a token issued for another tenant', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: otherTenantId,
      cliente_id: clientId,
      expira_em: new Date(Date.now() + 60000).toISOString()
    }));

    await assert.rejects(
      service.resolveClientForAppointment(tenant.id, 'other-tenant-token'),
      (error) => error.code === 'CLIENT_TOKEN_INVALID'
    );
  });

  it('rejects an expired token', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: tenant.id,
      cliente_id: clientId,
      expira_em: new Date(Date.now() - 60000).toISOString()
    }));

    await assert.rejects(
      service.resolveClientForAppointment(tenant.id, 'expired-token'),
      (error) => error.code === 'CLIENT_TOKEN_EXPIRED'
    );
  });

  it('returns a public self profile for a valid tenant-scoped token', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: tenant.id,
      cliente_id: clientId,
      expira_em: new Date(Date.now() + 60000).toISOString()
    }));
    mock.method(repository, 'findClientContext', async () => ({
      ...clientContext(),
      aceita_campanhas: false,
      cliente: {
        ...clientContext().cliente,
        email: 'ana@example.com',
        metadata: { endereco: { cep: '14000000', cidade: 'Ribeirao Preto' } }
      }
    }));
    mock.method(repository, 'touchIdentity', async () => undefined);
    mock.method(repository, 'listRecentAppointments', async () => []);

    const result = await service.getSelfProfile(tenant.id, 'valid-token');

    assert.deepEqual(result, {
      nome: 'Ana',
      telefone: '+5516999999999',
      email: 'ana@example.com',
      endereco: { cep: '14000000', cidade: 'Ribeirao Preto' },
      aceita_campanhas: false,
      status: 'ativo'
    });
  });

  it('updates only allowed public self profile fields', async () => {
    const writes = {};
    mock.method(repository, 'hasOtherTenantLinks', async () => false);
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: tenant.id,
      cliente_id: clientId,
      expira_em: new Date(Date.now() + 60000).toISOString()
    }));
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'touchIdentity', async () => undefined);
    mock.method(repository, 'listRecentAppointments', async () => []);
    mock.method(repository, 'findClientByPhone', async (receivedTenantId, telefone) => {
      writes.phoneLookup = { receivedTenantId, telefone };
      return { id: clientId };
    });
    mock.method(repository, 'updateSelfProfile', async (receivedTenantId, receivedClientId, payload) => {
      writes.update = { receivedTenantId, receivedClientId, payload };
      return {
        ...clientContext(),
        nome_no_tenant: payload.nome,
        aceita_campanhas: payload.aceita_campanhas,
        cliente: {
          ...clientContext().cliente,
          nome: payload.nome,
          telefone: payload.telefone,
          email: payload.email,
          metadata: { endereco: payload.endereco }
        }
      };
    });

    const result = await service.updateSelfProfile(tenant.id, 'valid-token', {
      nome: 'Ana Paula',
      telefone: '(16) 98888-7777',
      email: 'ANA.PAULA@EXAMPLE.COM',
      endereco: { cep: '14000-000', cidade: 'Ribeirao Preto' },
      aceita_campanhas: false
    });

    assert.deepEqual(writes.phoneLookup, {
      receivedTenantId: tenant.id,
      telefone: '+5516988887777'
    });
    assert.equal(writes.update.receivedTenantId, tenant.id);
    assert.equal(writes.update.receivedClientId, clientId);
    assert.deepEqual(writes.update.payload, {
      nome: 'Ana Paula',
      email: 'ana.paula@example.com',
      aceita_campanhas: false,
      endereco: {
        cep: '14000000',
        uf: null,
        cidade: 'Ribeirao Preto',
        logradouro: null,
        numero: null
      },
      telefone: '+5516988887777'
    });
    assert.equal(result.nome, 'Ana Paula');
    assert.equal(result.telefone, '+5516988887777');
  });

  it('rejects self profile WhatsApp updates that collide inside the tenant', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: tenant.id,
      cliente_id: clientId,
      expira_em: new Date(Date.now() + 60000).toISOString()
    }));
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'touchIdentity', async () => undefined);
    mock.method(repository, 'listRecentAppointments', async () => []);
    mock.method(repository, 'findClientByPhone', async () => ({ id: otherTenantId }));

    await assert.rejects(
      service.updateSelfProfile(tenant.id, 'valid-token', {
        telefone: '(16) 98888-7777'
      }),
      (error) => error.code === 'CLIENT_PHONE_DUPLICATE'
    );
  });
});

describe('read-only context availability',()=>{
 for(const scenario of ['valid','missing','wrong tenant','expired','blocked client','repository failure'])it(scenario+' performs only validation reads',async()=>{
  const calls=[];
  for(const key of Object.keys(repository))if(typeof repository[key]==='function')mock.method(repository,key,async()=>{calls.push(key);throw Error('Forbidden repository call '+key);});
  mock.method(repository,'findToken',async()=>{calls.push('findToken');if(scenario==='repository failure')throw Error('offline');return scenario==='missing'?null:{id:tokenId,tenant_id:scenario==='wrong tenant'?otherTenantId:tenant.id,cliente_id:clientId,expira_em:scenario==='expired'?'2000-01-01': '2099-01-01'};});
  mock.method(repository,'findClientContext',async()=>{calls.push('findClientContext');const c=clientContext();if(scenario==='blocked client')c.cliente.ativo=false;return c;});
  if(scenario==='valid')assert.deepEqual(await service.probeClientContext(tenant.id,'synthetic-token'),{available:true});
  else await assert.rejects(service.probeClientContext(tenant.id,'synthetic-token'));
  assert.ok(calls.every(x=>['findToken','findClientContext'].includes(x)));
 });
});
