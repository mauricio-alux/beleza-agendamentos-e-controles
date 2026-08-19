const { AppError } = require('../../utils/errors');
const occupancyEngine = require('./domain/occupancy.engine');

const DEFAULT_SLOT_INTERVAL = 30;
const DEFAULT_MIN_ADVANCE = 60;
const UNAVAILABILITY_REASONS = {
  MINIMUM_NOTICE: 'minimum_notice',
  OUTSIDE_WORKING_HOURS: 'outside_working_hours',
  SERVICE_DURATION: 'service_duration',
  SCHEDULE_CONFLICT: 'schedule_conflict',
  PROFESSIONAL_UNAVAILABLE: 'professional_unavailable',
  BLOCKED_TIME: 'blocked_time',
  MISSING_SCALE: 'missing_scale',
  NO_MATCHING_SPECIALTY: 'no_matching_specialty',
  NO_PROFESSIONAL_LINK: 'no_professional_link',
  OTHER: 'other'
};

function toMinutes(time) {
  const [hour, minute] = String(time).slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function toTime(minutes) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

function dateAtTime(date, time) {
  return new Date(`${date}T${String(time).slice(0, 5)}:00`);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function isInsideInterval(start, end, interval) {
  return start >= interval.start && end <= interval.end;
}

function getBoundedMinutes(value, fallback = 0, max = 60) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(0, Math.trunc(numberValue)));
}

function getScheduleBreak(schedule, date) {
  if (!schedule.hora_intervalo_inicio || !schedule.hora_intervalo_fim) {
    return null;
  }

  return {
    start: dateAtTime(date, schedule.hora_intervalo_inicio),
    end: dateAtTime(date, schedule.hora_intervalo_fim)
  };
}

function isSlotAllowedByBreak(start, end, scheduleBreak, toleranceMinutes) {
  if (!scheduleBreak || !rangesOverlap(start, end, scheduleBreak.start, scheduleBreak.end)) {
    return true;
  }

  if (start >= scheduleBreak.start) {
    return false;
  }

  const toleratedBreakEnd = addMinutes(scheduleBreak.start, toleranceMinutes);
  const maxAllowedEnd = toleratedBreakEnd < scheduleBreak.end ? toleratedBreakEnd : scheduleBreak.end;
  return end <= maxAllowedEnd;
}

function isSlotAllowedByWorkEnd(start, end, workEnd, toleranceMinutes) {
  if (start >= workEnd) {
    return false;
  }

  return end <= addMinutes(workEnd, toleranceMinutes);
}

function getBusyRanges(appointments = [], blocks = []) {
  return [
    ...appointments.map((item) => ({
      start: new Date(item.data_inicio),
      end: new Date(item.data_fim),
      type: 'appointment'
    })),
    ...blocks.map((item) => ({
      start: new Date(item.data_inicio),
      end: new Date(item.data_fim),
      type: 'block'
    }))
  ];
}

function hasConflict(start, end, busyRanges) {
  return busyRanges.some((range) => rangesOverlap(start, end, range.start, range.end));
}

function getConflictReason(start, end, busyRanges) {
  const range = busyRanges.find((item) => rangesOverlap(start, end, item.start, item.end));
  if (!range) return null;
  return range.type === 'block' ? UNAVAILABILITY_REASONS.BLOCKED_TIME : UNAVAILABILITY_REASONS.SCHEDULE_CONFLICT;
}

function createEmptyReasonCounts() {
  return Object.values(UNAVAILABILITY_REASONS).reduce((acc, reason) => ({
    ...acc,
    [reason]: 0
  }), {});
}

function incrementReason(reasonCounts, reason) {
  reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
}

function getPredominantReason(reasonCounts) {
  const entries = Object.entries(reasonCounts).filter(([, count]) => count > 0);
  if (!entries.length) return UNAVAILABILITY_REASONS.OTHER;

  entries.sort((left, right) => right[1] - left[1]);
  return entries[0][0];
}

function getLatestWorkEnd(workIntervals) {
  return workIntervals.reduce((latest, interval) => {
    if (!latest || interval.end > latest) return interval.end;
    return latest;
  }, null);
}

function toClock(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return toTime(date.getHours() * 60 + date.getMinutes());
}

function buildDiagnostics({
  reason,
  reasonCounts,
  settings,
  durationMinutes,
  workIntervals,
  earliest,
  totalCandidates
}) {
  const latestWorkEnd = getLatestWorkEnd(workIntervals);

  return {
    predominant_reason: reason,
    reason_counts: reasonCounts,
    total_candidates: totalCandidates,
    minimum_notice_minutes: settings?.antecedencia_minima_minutos ?? DEFAULT_MIN_ADVANCE,
    service_duration_minutes: durationMinutes,
    latest_work_end: toClock(latestWorkEnd),
    earliest_start: toClock(earliest)
  };
}

function generateAvailability({
  date,
  schedules,
  durationMinutes,
  settings,
  appointments,
  blocks,
  now = new Date()
}) {
  const slotInterval = settings?.intervalo_padrao_minutos || DEFAULT_SLOT_INTERVAL;
  const minAdvance = settings?.antecedencia_minima_minutos ?? DEFAULT_MIN_ADVANCE;
  const breakTolerance = getBoundedMinutes(settings?.tolerancia_intervalo_min, 0, 60);
  const workEndTolerance = getBoundedMinutes(settings?.tolerancia_fim_expediente_min, 0, 60);
  const earliest = addMinutes(now, minAdvance);
  const busyRanges = getBusyRanges(appointments, blocks);
  const reasonCounts = createEmptyReasonCounts();
  let totalCandidates = 0;

  const workIntervals = schedules.flatMap((schedule) => {
    if (schedule.is_working === false) {
      return [];
    }

    if (!schedule.hora_inicio || !schedule.hora_fim) {
      return [];
    }

    return [{
      start: dateAtTime(date, schedule.hora_inicio),
      end: dateAtTime(date, schedule.hora_fim),
      break: getScheduleBreak(schedule, date)
    }];
  });

  if (!workIntervals.length) {
    const reason = schedules.length
      ? UNAVAILABILITY_REASONS.PROFESSIONAL_UNAVAILABLE
      : UNAVAILABILITY_REASONS.MISSING_SCALE;
    incrementReason(reasonCounts, reason);

    return {
      available: [],
      unavailable_reason: 'Profissional sem disponibilidade',
      unavailability: buildDiagnostics({
        reason,
        reasonCounts,
        settings,
        durationMinutes,
        workIntervals,
        earliest,
        totalCandidates
      }),
      intelligence: {
        ranking_strategy: 'occupancy_engine_v1',
        realtime_ready: true,
        ai_ready: true
      }
    };
  }

  const slots = [];

  for (const interval of workIntervals) {
    for (
      let cursor = new Date(interval.start);
      cursor < interval.end;
      cursor = addMinutes(cursor, slotInterval)
    ) {
      const start = new Date(cursor);
      const end = addMinutes(start, durationMinutes);
      totalCandidates += 1;

      if (start < earliest) {
        incrementReason(reasonCounts, UNAVAILABILITY_REASONS.MINIMUM_NOTICE);
        continue;
      }

      if (!isInsideInterval(start, start, interval)) {
        incrementReason(reasonCounts, UNAVAILABILITY_REASONS.OUTSIDE_WORKING_HOURS);
        continue;
      }

      if (!isSlotAllowedByBreak(start, end, interval.break, breakTolerance)) {
        incrementReason(reasonCounts, UNAVAILABILITY_REASONS.OUTSIDE_WORKING_HOURS);
        continue;
      }

      if (!isSlotAllowedByWorkEnd(start, end, interval.end, workEndTolerance)) {
        incrementReason(reasonCounts, UNAVAILABILITY_REASONS.SERVICE_DURATION);
        continue;
      }

      const conflictReason = getConflictReason(start, end, busyRanges);
      if (conflictReason) {
        incrementReason(reasonCounts, conflictReason);
        continue;
      }

      slots.push({
        inicio: start.toISOString(),
        fim: end.toISOString(),
        hora: toTime(start.getHours() * 60 + start.getMinutes())
      });
    }
  }

  const rankedSlots = occupancyEngine.rankSlots(slots, {
    busyRanges,
    workIntervals,
    durationMinutes,
    slotInterval
  });
  const predominantReason = rankedSlots.length ? null : getPredominantReason(reasonCounts);

  return {
    available: rankedSlots.map((slot) => ({
      ...slot,
      score: slot.ranking_score
    })),
    unavailable_reason: rankedSlots.length ? null : 'Horario indisponivel',
    unavailability: rankedSlots.length
      ? null
      : buildDiagnostics({
        reason: predominantReason,
        reasonCounts,
        settings,
        durationMinutes,
        workIntervals,
        earliest,
        totalCandidates
      }),
    intelligence: {
      ranking_strategy: 'occupancy_engine_v1',
      realtime_ready: true,
      ai_ready: true
    }
  };
}

function assertAvailability(startIso, durationMinutes, availability, ignoreMessage = 'Horario indisponivel') {
  const target = new Date(startIso).toISOString();
  const slot = availability.available.find((item) => item.inicio === target);

  if (!slot) {
    throw new AppError(ignoreMessage, 409, 'SLOT_UNAVAILABLE');
  }

  return {
    start: new Date(slot.inicio),
    end: new Date(slot.fim),
    durationMinutes,
    ranking_score: slot.ranking_score,
    occupancy_score: slot.occupancy_score,
    slot_quality: slot.slot_quality
  };
}

module.exports = {
  generateAvailability,
  assertAvailability,
  addMinutes,
  UNAVAILABILITY_REASONS
};
