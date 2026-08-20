const birthdayGreetingService = require('../modules/automations/birthday-greeting.service');

async function processBirthdayGreetingsJob(payload) {
  const results = await birthdayGreetingService.processDueBirthdayGreetings({
    limit: Number(payload?.limit || process.env.BIRTHDAY_GREETING_SCHEDULER_BATCH_SIZE || 100)
  });

  return {
    type: 'birthday_greetings',
    status: 'processed',
    processed: results.length,
    results
  };
}

module.exports = {
  name: 'birthday_greetings.process',
  handler: processBirthdayGreetingsJob
};
