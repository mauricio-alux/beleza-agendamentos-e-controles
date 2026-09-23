// Same ordinal is permitted across tenants, never duplicated inside one seed run/tenant.
function campaignTestPhone(index, invalid = false) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= 1000000) throw new Error('Invalid seed client ordinal');
  return invalid ? `invalid-${index}` : `+55119${String(70000000 + index)}`;
}
module.exports = { campaignTestPhone };
