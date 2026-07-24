const occupancyEngine = require('./occupancy.engine');

function buildAnalyticsContext({ appointments, schedules, date, durationMinutes }) {
  const workIntervals = schedules
    .filter((schedule) => schedule.hora_inicio && schedule.hora_fim)
    .map((schedule) => ({
      start: new Date(`${date}T${String(schedule.hora_inicio).slice(0, 5)}:00`),
      end: new Date(`${date}T${String(schedule.hora_fim).slice(0, 5)}:00`)
    }));

  return occupancyEngine.calculateAnalytics({
    appointments,
    workIntervals,
    durationMinutes
  });
}

function buildOptimizationHints(analytics) {
  const hints = [];

  if (analytics.agenda_fragmentation > 1) {
    hints.push({
      id: 'fragmentation',
      title: 'Agenda fragmentada',
      description: 'Existem buracos curtos entre atendimentos. Priorize slots com melhor ranking.',
      severity: 'medium'
    });
  }

  if (analytics.occupancy_rate < 45) {
    hints.push({
      id: 'low_occupancy',
      title: 'Baixa ocupacao',
      description: 'Ha espaco para concentrar horarios e aumentar eficiencia do dia.',
      severity: 'low'
    });
  }

  if (analytics.cancellation_rate >= 25) {
    hints.push({
      id: 'cancellation',
      title: 'Cancelamentos em atencao',
      description: 'O dia possui taxa elevada de cancelamento para acompanhamento futuro.',
      severity: 'high'
    });
  }

  return hints;
}

module.exports = {
  buildAnalyticsContext,
  buildOptimizationHints
};
