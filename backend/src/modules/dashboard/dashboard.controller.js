const dashboardService = require('./dashboard.service');

async function summary(req, res) {
  const data = await dashboardService.getSummary(req.dashboardContext);
  return res.json({ data });
}

async function details(req, res) {
  const data = await dashboardService.getDetails(req.dashboardContext);
  return res.json({ data });
}

async function kpis(req, res) {
  const data = await dashboardService.getKpis(req.dashboardContext);
  return res.json({ data });
}

async function activity(req, res) {
  const data = await dashboardService.getActivity(req.dashboardContext);
  return res.json({ data });
}

async function agendaPreview(req, res) {
  const data = await dashboardService.getAgendaPreview(req.dashboardContext);
  return res.json({ data });
}

module.exports = {
  summary,
  details,
  kpis,
  activity,
  agendaPreview
};
