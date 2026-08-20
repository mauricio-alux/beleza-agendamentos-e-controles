const jobRegistry = require('./index');

const DEFAULT_REMINDER_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS || 5 * 60_000)
);
const REMINDER_SCHEDULER_ENABLED = process.env.REMINDER_SCHEDULER_ENABLED !== 'false';
const DEFAULT_WHATSAPP_INTERVAL_MS = Math.max(
  15_000,
  Number(process.env.WHATSAPP_QUEUE_INTERVAL_MS || 60_000)
);
const WHATSAPP_QUEUE_ENABLED = process.env.WHATSAPP_QUEUE_ENABLED !== 'false';
const DEFAULT_CAMPAIGN_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.CAMPAIGN_SCHEDULER_INTERVAL_MS || 5 * 60_000)
);
const CAMPAIGN_SCHEDULER_ENABLED = process.env.CAMPAIGN_SCHEDULER_ENABLED !== 'false';
const DEFAULT_BIRTHDAY_GREETING_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.BIRTHDAY_GREETING_SCHEDULER_INTERVAL_MS || 5 * 60_000)
);
const BIRTHDAY_GREETING_SCHEDULER_ENABLED = process.env.BIRTHDAY_GREETING_SCHEDULER_ENABLED !== 'false';

let remindersTimer = null;
let remindersRunning = false;
let whatsappTimer = null;
let whatsappRunning = false;
let campaignsTimer = null;
let campaignsRunning = false;
let birthdayGreetingsTimer = null;
let birthdayGreetingsRunning = false;

async function runReminders(reason = 'interval') {
  if (remindersRunning) {
    console.log('[reminders-scheduler-debug] scheduler execution skipped because previous run is still active', {
      reason
    });
    return null;
  }

  remindersRunning = true;
  try {
    console.log('[reminders-scheduler-debug] scheduler run requested', {
      reason,
      now: new Date().toISOString()
    });
    return await jobRegistry.runJob('reminders.process', { reason });
  } catch (error) {
    console.error('[reminders-scheduler-debug] scheduler execution failed', {
      reason,
      message: error.message,
      code: error.code || null
    });
    return null;
  } finally {
    remindersRunning = false;
  }
}

async function runWhatsAppQueue(reason = 'interval') {
  if (whatsappRunning) {
    console.log('[whatsapp-queue-debug] queue execution skipped because previous run is still active', {
      reason
    });
    return null;
  }

  whatsappRunning = true;
  try {
    console.log('[whatsapp-queue-debug] queue run requested', {
      reason,
      now: new Date().toISOString()
    });
    return await jobRegistry.runJob('whatsapp.process', { reason });
  } catch (error) {
    console.error('[whatsapp-queue-debug] queue execution failed', {
      reason,
      message: error.message,
      code: error.code || null
    });
    return null;
  } finally {
    whatsappRunning = false;
  }
}

async function runCampaigns(reason = 'interval') {
  if (campaignsRunning) {
    console.log('[campaigns-scheduler-debug] scheduler execution skipped because previous run is still active', {
      reason
    });
    return null;
  }

  campaignsRunning = true;
  try {
    console.log('[campaigns-scheduler-debug] scheduler run requested', {
      reason,
      now: new Date().toISOString()
    });
    return await jobRegistry.runJob('campaigns.process', { reason });
  } catch (error) {
    console.error('[campaigns-scheduler-debug] scheduler execution failed', {
      reason,
      message: error.message,
      code: error.code || null
    });
    return null;
  } finally {
    campaignsRunning = false;
  }
}

async function runBirthdayGreetings(reason = 'interval') {
  if (birthdayGreetingsRunning) {
    console.log('[birthday-greetings-scheduler-debug] scheduler execution skipped because previous run is still active', {
      reason
    });
    return null;
  }

  birthdayGreetingsRunning = true;
  try {
    console.log('[birthday-greetings-scheduler-debug] scheduler run requested', {
      reason,
      now: new Date().toISOString()
    });
    return await jobRegistry.runJob('birthday_greetings.process', { reason });
  } catch (error) {
    console.error('[birthday-greetings-scheduler-debug] scheduler execution failed', {
      reason,
      message: error.message,
      code: error.code || null
    });
    return null;
  } finally {
    birthdayGreetingsRunning = false;
  }
}

function startSchedulers() {
  const status = {};

  if (!REMINDER_SCHEDULER_ENABLED) {
    console.log('[reminders-scheduler-debug] reminder scheduler disabled by REMINDER_SCHEDULER_ENABLED=false');
    status.reminders = 'disabled';
  } else if (remindersTimer) {
    console.log('[reminders-scheduler-debug] reminder scheduler already started');
    status.reminders = 'already_started';
  } else {
    console.log('[reminders-scheduler-debug] reminder scheduler started', {
      interval_ms: DEFAULT_REMINDER_INTERVAL_MS,
      jobs: jobRegistry.listJobs()
    });

    setTimeout(() => {
      runReminders('startup');
    }, 2_000).unref?.();

    remindersTimer = setInterval(() => {
      runReminders('interval');
    }, DEFAULT_REMINDER_INTERVAL_MS);
    remindersTimer.unref?.();
    status.reminders = 'started';
    status.reminders_interval_ms = DEFAULT_REMINDER_INTERVAL_MS;
  }

  if (!WHATSAPP_QUEUE_ENABLED) {
    console.log('[whatsapp-queue-debug] WhatsApp queue disabled by WHATSAPP_QUEUE_ENABLED=false');
    status.whatsapp = 'disabled';
  } else if (whatsappTimer) {
    console.log('[whatsapp-queue-debug] WhatsApp queue already started');
    status.whatsapp = 'already_started';
  } else {
    console.log('[whatsapp-queue-debug] WhatsApp queue started', {
      interval_ms: DEFAULT_WHATSAPP_INTERVAL_MS,
      jobs: jobRegistry.listJobs()
    });

    setTimeout(() => {
      runWhatsAppQueue('startup');
    }, 4_000).unref?.();

    whatsappTimer = setInterval(() => {
      runWhatsAppQueue('interval');
    }, DEFAULT_WHATSAPP_INTERVAL_MS);
    whatsappTimer.unref?.();
    status.whatsapp = 'started';
    status.whatsapp_interval_ms = DEFAULT_WHATSAPP_INTERVAL_MS;
  }

  if (!CAMPAIGN_SCHEDULER_ENABLED) {
    console.log('[campaigns-scheduler-debug] campaign scheduler disabled by CAMPAIGN_SCHEDULER_ENABLED=false');
    status.campaigns = 'disabled';
  } else if (campaignsTimer) {
    console.log('[campaigns-scheduler-debug] campaign scheduler already started');
    status.campaigns = 'already_started';
  } else {
    console.log('[campaigns-scheduler-debug] campaign scheduler started', {
      interval_ms: DEFAULT_CAMPAIGN_INTERVAL_MS,
      jobs: jobRegistry.listJobs()
    });

    setTimeout(() => {
      runCampaigns('startup');
    }, 6_000).unref?.();

    campaignsTimer = setInterval(() => {
      runCampaigns('interval');
    }, DEFAULT_CAMPAIGN_INTERVAL_MS);
    campaignsTimer.unref?.();
    status.campaigns = 'started';
    status.campaigns_interval_ms = DEFAULT_CAMPAIGN_INTERVAL_MS;
  }

  if (!BIRTHDAY_GREETING_SCHEDULER_ENABLED) {
    console.log('[birthday-greetings-scheduler-debug] scheduler disabled by BIRTHDAY_GREETING_SCHEDULER_ENABLED=false');
    status.birthday_greetings = 'disabled';
  } else if (birthdayGreetingsTimer) {
    console.log('[birthday-greetings-scheduler-debug] scheduler already started');
    status.birthday_greetings = 'already_started';
  } else {
    console.log('[birthday-greetings-scheduler-debug] scheduler started', {
      interval_ms: DEFAULT_BIRTHDAY_GREETING_INTERVAL_MS,
      jobs: jobRegistry.listJobs()
    });

    setTimeout(() => {
      runBirthdayGreetings('startup');
    }, 8_000).unref?.();

    birthdayGreetingsTimer = setInterval(() => {
      runBirthdayGreetings('interval');
    }, DEFAULT_BIRTHDAY_GREETING_INTERVAL_MS);
    birthdayGreetingsTimer.unref?.();
    status.birthday_greetings = 'started';
    status.birthday_greetings_interval_ms = DEFAULT_BIRTHDAY_GREETING_INTERVAL_MS;
  }

  return status;
}

function stopSchedulers() {
  if (remindersTimer) {
    clearInterval(remindersTimer);
    remindersTimer = null;
  }

  if (whatsappTimer) {
    clearInterval(whatsappTimer);
    whatsappTimer = null;
  }

  if (campaignsTimer) {
    clearInterval(campaignsTimer);
    campaignsTimer = null;
  }

  if (birthdayGreetingsTimer) {
    clearInterval(birthdayGreetingsTimer);
    birthdayGreetingsTimer = null;
  }

  return {
    reminders: 'stopped',
    whatsapp: 'stopped',
    campaigns: 'stopped',
    birthday_greetings: 'stopped'
  };
}

module.exports = {
  startSchedulers,
  stopSchedulers,
  runReminders,
  runWhatsAppQueue,
  runCampaigns,
  runBirthdayGreetings
};
