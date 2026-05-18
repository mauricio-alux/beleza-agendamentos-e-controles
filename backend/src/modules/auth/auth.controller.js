const authService = require('./auth.service');
const { registerSchema, loginSchema, refreshTokenSchema } = require('./auth.validators');

async function register(req, res) {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.status(201).json({ data: result });
}

async function login(req, res) {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.json({ data: result });
}

async function refresh(req, res) {
  const input = refreshTokenSchema.parse(req.body);
  const result = await authService.refreshToken(input.refresh_token);

  return res.json({ data: result });
}

async function logout(req, res) {
  const result = await authService.logout(req.auth.accessToken);

  return res.json({ data: result });
}

async function me(req, res) {
  const result = await authService.getMe(req.auth.user);
  return res.json({ data: result });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me
};
