const test = require('node:test');
const assert = require('node:assert/strict');
const { validBirthDate, normalizePair, eligibleClient, eligibleTenant, eligibleLink } = require('./identity-policy');
const { normalizePhoneToE164 } = require('../../utils/normalize');
const { createIdentityLimiter } = require('./identity-rate-limit');
const { campaignTestPhone } = require('../../../scripts/campaign-test-phone');

for (const value of ['+5516999999999','16999999999','(16) 99999-9999','16 99999 9999']) {
  test(`BR normalization ${value}`, () => assert.equal(normalizePhoneToE164(value), '+5516999999999'));
}
test('DDD 55 remains national, both lengths; explicit prefix recognized', () => {
  assert.equal(normalizePhoneToE164('55999999999'), '+5555999999999');
  assert.equal(normalizePhoneToE164('5533334444'), '+555533334444');
  assert.equal(normalizePhoneToE164('+55 (55) 99999-9999'), '+5555999999999');
  assert.equal(normalizePhoneToE164('(16) 3333-4444'), '+551633334444');
});
test('excess digits, other country, letters and trunk prefixes are rejected', () => {
  for (const phone of ['169999999999','+55169999999999','+12125551234','abc16999999999','016999999999','005516999999999']) {
    assert.throws(() => normalizePhoneToE164(phone));
  }
});
test('date-only validation: leap year, calendar, future, null and timestamp', () => {
  for (const value of ['2000-02-29','1990-12-31']) assert.equal(validBirthDate(value, '2026-09-17'), true);
  for (const value of ['1900-02-29','2025-02-29','2026-04-31','2026-09-18','0000-01-01',null,'2000-01-01T00:00:00Z']) {
    assert.equal(validBirthDate(value, '2026-09-17'), false);
  }
});
test('pair requires both factors', () => {
  assert.throws(() => normalizePair({ telefone: '16999999999' }), { code: 'CLIENT_MATCH_UNAVAILABLE' });
});
test('eligibility fails closed for inactive/deleted/missing client and relationship', () => {
  const row = { ativo: true, status: 'ativo', cliente: { ativo: true } };
  assert.equal(eligibleClient(row), true);
  for (const change of [{ativo:false},{deleted_at:'date'},{status:'bloqueado'},{status:'inativo'},{cliente:{ativo:false}},{cliente:{ativo:true,deleted_at:'date'}},{cliente:null}]) {
    assert.equal(eligibleClient({...row,...change}),false);
  }
  for (const status of ['suspenso','cancelado','inadimplente']) assert.equal(eligibleTenant({ativo:true,status}),false);
  assert.equal(eligibleTenant({ativo:true,status:'trial'}),true);
  const link = {ativo:true,acesso_publico:true};
  assert.equal(eligibleLink(link),true);
  for (const change of [{ativo:false},{acesso_publico:false},{deleted_at:'date'},{expira_em:'2000-01-01'}]) assert.equal(eligibleLink({...link,...change}),false);
});
test('rate limits pair, IP and aggregate, expire, never challenge a token request', () => {
  let clock = 1000;
  const make = (options={}) => createIdentityLimiter({now:()=>clock,secret:'test',...options});
  const res = {set(){}};
  const request = (limit, phone='16999999999', ip='one', extra={}) => {
    let error; limit({path:'/booking/studio/identity',body:{telefone:phone,data_nascimento:'1990-01-01',...extra},ip},res,e=>{error=e;});return error;
  };
  const limit=make();
  for(let n=0;n<5;n++) assert.equal(request(limit),undefined);
  assert.equal(request(limit).statusCode,429);
  assert.equal(request(limit,'16999999999','different').statusCode,429);
  assert.equal(request(limit,'16999999999','one',{token:'existing'}),undefined);
  clock+=900001; assert.equal(request(limit),undefined);
  const ip=make({ipLimit:1}); request(ip); assert.equal(request(ip,'16988888888').statusCode,429);
  const all=make({totalLimit:1}); request(all); assert.equal(request(all,'16988888888','two').statusCode,429);
});
test('unknown token field cannot bypass appointment or discovery limiter',()=>{
  const limiter=createIdentityLimiter({pairLimit:0});
  for(const path of ['/booking/studio/appointments','/booking/access/locate']){
    let error;
    limiter({path,ip:'fixture',body:{token:'ignored-field',telefone:'16999999999',data_nascimento:'1990-01-01'}},{set(){}},e=>{error=e;});
    assert.equal(error.statusCode,429);
  }
});
test('seed generation is unique per tenant ordinal, including invalid fixtures', () => {
  const values = Array.from({length:100},(_,i)=>campaignTestPhone(i,i%4===0));
  assert.equal(new Set(values).size,values.length);
  assert.throws(()=>campaignTestPhone(1000000));
});
