const jobs = new Map();

function registerJob(name, handler) {
  jobs.set(name, handler);
}

function getJob(name) {
  return jobs.get(name);
}

function listJobs() {
  return Array.from(jobs.keys());
}

async function runJob(name, payload = {}) {
  const job = getJob(name);

  if (!job) {
    throw new Error(`Job not registered: ${name}`);
  }

  return job(payload);
}

module.exports = {
  registerJob,
  getJob,
  listJobs,
  runJob
};
