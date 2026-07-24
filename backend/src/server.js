const app = require('./app');
const env = require('./config/env');
const { APP_BRAND } = require('./config/app-brand');
const { startSchedulers } = require('./jobs/scheduler');

app.listen(env.port, env.host, () => {
  console.log(`${APP_BRAND.appName} backend listening on ${env.host}:${env.port}`);
  startSchedulers();
});
