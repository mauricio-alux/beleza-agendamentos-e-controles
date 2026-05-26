function signal(id, label, score, context = {}) {
  return {
    id,
    label,
    score,
    context,
    provider: 'agenda-operational-signals-v1'
  };
}

function buildSignals({ analytics, appointments = [], slots = [] }) {
  const signals = [];

  if (analytics.cancellation_rate >= 25) {
    signals.push(signal('high_cancellation_risk', 'Risco elevado de cancelamento', analytics.cancellation_rate, {
      cancellation_rate: analytics.cancellation_rate
    }));
  }

  if (analytics.occupancy_rate < 45) {
    signals.push(signal('low_occupancy_period', 'Periodo com baixa ocupacao', 100 - analytics.occupancy_rate, {
      occupancy_rate: analytics.occupancy_rate
    }));
  }

  if (analytics.agenda_fragmentation > 1) {
    signals.push(signal('schedule_fragmentation', 'Fragmentacao de agenda detectada', analytics.agenda_fragmentation * 20, {
      average_gap_time: analytics.average_gap_time
    }));
  }

  if (appointments.some((item) => item.status === 'no_show')) {
    signals.push(signal('high_no_show_window', 'Janela com historico de no-show', analytics.no_show_rate, {
      no_show_rate: analytics.no_show_rate
    }));
  }

  const bestSlot = slots[0];
  if (bestSlot) {
    signals.push(signal('ideal_return_window', 'Melhor janela operacional sugerida', bestSlot.ranking_score || bestSlot.score || 0, {
      inicio: bestSlot.inicio,
      hora: bestSlot.hora,
      slot_quality: bestSlot.slot_quality
    }));
  }

  return signals;
}

module.exports = {
  buildSignals
};
