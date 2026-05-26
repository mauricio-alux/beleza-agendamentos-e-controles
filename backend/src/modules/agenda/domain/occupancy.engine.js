function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((end - start) / 60000));
}

function findNearestGaps(start, end, busyRanges = [], workIntervals = []) {
  const previousBusyGap = busyRanges
    .filter((range) => range.end <= start)
    .map((range) => minutesBetween(range.end, start))
    .sort((a, b) => a - b)[0];

  const nextBusyGap = busyRanges
    .filter((range) => range.start >= end)
    .map((range) => minutesBetween(end, range.start))
    .sort((a, b) => a - b)[0];

  const interval = workIntervals.find((item) => start >= item.start && end <= item.end);

  return {
    beforeGapMinutes: previousBusyGap ?? (interval ? minutesBetween(interval.start, start) : null),
    afterGapMinutes: nextBusyGap ?? (interval ? minutesBetween(end, interval.end) : null)
  };
}

function getSlotQuality(score) {
  if (score >= 86) return 'otimo';
  if (score >= 68) return 'bom';
  if (score >= 45) return 'regular';
  return 'baixo';
}

function calculateFragmentationPenalty(gaps, durationMinutes, slotInterval) {
  const minimumUsefulGap = Math.max(durationMinutes, slotInterval);
  const fragments = [gaps.beforeGapMinutes, gaps.afterGapMinutes]
    .filter((gap) => gap !== null && gap > 0 && gap < minimumUsefulGap);

  return fragments.length * 18;
}

function calculateSlotScore({ start, end, busyRanges, workIntervals, durationMinutes, slotInterval }) {
  const gaps = findNearestGaps(start, end, busyRanges, workIntervals);
  const touchesExistingAppointment = gaps.beforeGapMinutes === 0 || gaps.afterGapMinutes === 0;
  const smallGapPenalty = calculateFragmentationPenalty(gaps, durationMinutes, slotInterval);
  const largeGapBonus = [gaps.beforeGapMinutes, gaps.afterGapMinutes]
    .filter((gap) => gap !== null && gap >= durationMinutes && gap <= durationMinutes + slotInterval)
    .length * 8;
  const adjacencyBonus = touchesExistingAppointment ? 18 : 0;
  const edgeBonus = [gaps.beforeGapMinutes, gaps.afterGapMinutes].some((gap) => gap === 0 || gap === null) ? 6 : 0;

  const occupancyScore = clampScore(76 + adjacencyBonus + edgeBonus + largeGapBonus - smallGapPenalty);
  const rankingScore = clampScore((occupancyScore * 0.72) + (touchesExistingAppointment ? 18 : 0) - smallGapPenalty);

  return {
    occupancy_score: occupancyScore,
    ranking_score: rankingScore,
    slot_quality: getSlotQuality(rankingScore),
    gap_before_minutes: gaps.beforeGapMinutes,
    gap_after_minutes: gaps.afterGapMinutes,
    intelligence: {
      reduces_idle_time: touchesExistingAppointment || smallGapPenalty === 0,
      fragmentation_risk: smallGapPenalty > 0 ? 'medium' : 'low',
      recommendation: rankingScore >= 86 ? 'recommended' : rankingScore >= 68 ? 'good' : 'available'
    }
  };
}

function rankSlots(slots, context) {
  return slots
    .map((slot) => ({
      ...slot,
      ...calculateSlotScore({
        start: new Date(slot.inicio),
        end: new Date(slot.fim),
        ...context
      })
    }))
    .sort((a, b) => b.ranking_score - a.ranking_score || a.inicio.localeCompare(b.inicio));
}

function calculateAnalytics({ appointments = [], workIntervals = [], durationMinutes = 0 }) {
  const totalWorkMinutes = workIntervals.reduce((total, interval) => total + minutesBetween(interval.start, interval.end), 0);
  const occupiedMinutes = appointments.reduce((total, appointment) => (
    total + minutesBetween(new Date(appointment.data_inicio), new Date(appointment.data_fim))
  ), 0);
  const cancelled = appointments.filter((item) => item.status === 'cancelado').length;
  const noShow = appointments.filter((item) => item.status === 'no_show').length;
  const sorted = [...appointments].sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
  const gaps = sorted.slice(1).map((appointment, index) => (
    minutesBetween(new Date(sorted[index].data_fim), new Date(appointment.data_inicio))
  )).filter((gap) => gap > 0);
  const averageGapTime = gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : 0;
  const fragmentation = gaps.filter((gap) => gap < Math.max(durationMinutes, 30)).length;

  return {
    occupancy_rate: totalWorkMinutes ? clampScore((occupiedMinutes / totalWorkMinutes) * 100) : 0,
    cancellation_rate: appointments.length ? clampScore((cancelled / appointments.length) * 100) : 0,
    no_show_rate: appointments.length ? clampScore((noShow / appointments.length) * 100) : 0,
    average_gap_time: averageGapTime,
    slot_efficiency: totalWorkMinutes ? clampScore(((occupiedMinutes - averageGapTime) / totalWorkMinutes) * 100) : 0,
    agenda_fragmentation: fragmentation,
    total_work_minutes: totalWorkMinutes,
    occupied_minutes: occupiedMinutes
  };
}

module.exports = {
  rankSlots,
  calculateSlotScore,
  calculateAnalytics
};
