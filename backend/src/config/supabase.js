const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const env = require('./env');

const options = {
  realtime: {
    transport: WebSocket
  },
  auth: { persistSession: false, autoRefreshToken: false }
};

const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  ...options
});

const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  ...options
});

function createSupabaseForToken(accessToken) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...options,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

module.exports = {
  supabase,
  supabaseAdmin,
  createSupabaseForToken
};
