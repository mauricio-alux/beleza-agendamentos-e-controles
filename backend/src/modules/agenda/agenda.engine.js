const { AppError } = require('../../utils/errors');

const DEFAULT_SLOT_INTERVAL = 30;
const DEFAULT_MIN_ADVANCE = 60;

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

function subtractBreaks(workIntervals, schedule, date) {
  if (!schedule.hora_intervalo_inicio || !schedule.hora_intervalo_fim) {
    return workIntervals;
  }

  const breakStart = dateAtTime(date, schedule.hora_intervalo_inicio);
  const breakEnd = dateAtTime(date, schedule.hora_intervalo_fim);

  return workIntervals.flatMap((interval) => {
    if (!rangesOverlap(interval.start, interval.end, breakStart, breakEnd)) {
      return [interval];
    }

    return [
      interval.start < breakStart ? { start: interval.start, end: breakStart } : null,
      breakEnd < interval.end ? { start: breakEnd, end: interval.end } : null
    ].filter(Boolean);
  });
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

function scoreSlot(start, end, busyRanges, intervalMinutes) {
  const beforeGap = busyRanges
    .filter((range) => range.end <= start)
    .map((range) => (start - range.end) / 60000)
    .sort((a, b) => a - b)[0];

  const afterGap = busyRanges
    .filter((range) => range.start >= end)
    .map((range) => (range.start - end) / 60000)
    .sort((a, b) => a - b)[0];

  let score = 100;
  if (beforeGap !== undefined && beforeGap > 0 && beforeGap < intervalMinutes) score -= 20;
  if (afterGap !== undefined && afterGap > 0 && afterGap < intervalMinutes) score -= 20;
  if (beforeGap === 0 || afterGap === 0) score += 8;
  return Math.max(0, Math.min(score, 100));
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
  const earliest = addMinutes(now, minAdvance);
  const busyRanges = getBusyRanges(appointments, blocks);

  const workIntervals = schedules.flatMap((schedule) => {
    const interval = {
      start: dateAtTime(date, schedule.hora_inicio),
      end: dateAtTime(date, schedule.hora_fim)
    };

    return subtractBreaks([interval], schedule, date);
  });

  if (!workIntervals.length) {
    return {
      available: [],
      unavailable_reason: 'Profissional sem disponibilidade'
    };
  }

  const slots = [];

  for (const interval of workIntervals) {
    for (
      let cursor = new Date(interval.start);
      addMinutes(cursor, durationMinutes) <= interval.end;
      cursor = addMinutes(cursor, slotInterval)
    ) {
      const start = new Date(cursor);
      const end = addMinutes(start, durationMinutes);

      if (start < earliest) {
        continue;
      }

      if (!isInsideInterval(start, end, interval)) {
        continue;
      }

      if (hasConflict(start, end, busyRanges)) {
        continue;
      }

      slots.push({
        inicio: start.toISOString(),
        fim: end.toISOString(),
        hora: toTime(start.getHours() * 60 + start.getMinutes()),
        score: scoreSlot(start, end, busyRanges, slotInterval)
      });
    }
  }

  return {
    available: slots.sort((a, b) => b.score - a.score || a.inicio.localeCompare(b.inicio)),
    unavailable_reason: slots.length ? null : 'Horario indisponivel'
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
    durationMinutes
  };
}

module.exports = {
  generateAvailability,
  assertAvailability,
  addMinutes
};
