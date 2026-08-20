const registry = require('./jobRegistry');
const campaignsJob = require('./campaigns.job');
const whatsappJob = require('./whatsapp.job');
const notificationsJob = require('./notifications.job');
const remindersJob = require('./reminders.job');
const aiJob = require('./ai.job');
const birthdayGreetingsJob = require('./birthday-greetings.job');

[
  campaignsJob,
  whatsappJob,
  notificationsJob,
  remindersJob,
  aiJob,
  birthdayGreetingsJob
].forEach((job) => registry.registerJob(job.name, job.handler));

module.exports = registry;
