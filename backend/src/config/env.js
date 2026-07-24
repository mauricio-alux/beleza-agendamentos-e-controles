require('dotenv').config();
const { APP_BRAND, buildAppUrl } = require('./app-brand');

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  trialDays: Number(process.env.TRIAL_DAYS || 14),
  appName: APP_BRAND.appName,
  appLogoUrl: APP_BRAND.logoUrl,
  appDomain: APP_BRAND.appDomain,
  appUrl: APP_BRAND.appUrl,
  supportEmail: APP_BRAND.supportEmail,
  bookingBaseUrl: process.env.BOOKING_BASE_URL || buildAppUrl('/agendar'),
  whatsappProvider: process.env.WHATSAPP_PROVIDER || 'whatsapp_mysaas',
  whatsappCloudApiEnabled: process.env.WHATSAPP_CLOUD_API_ENABLED === 'true',
  whatsappCloudApiVersion: process.env.WHATSAPP_CLOUD_API_VERSION || 'v20.0',
  whatsappCloudPhoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || '',
  whatsappCloudAccessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '',
  whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  whatsappDryRun: process.env.WHATSAPP_DRY_RUN !== 'false',
  whatsappMaxAttempts: Number(process.env.WHATSAPP_MAX_ATTEMPTS || 5)
};
