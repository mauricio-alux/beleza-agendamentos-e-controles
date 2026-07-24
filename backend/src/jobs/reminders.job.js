const { supabaseAdmin } = require('../config/supabase');
const agendaEvents = require('../modules/agenda/events/agenda.events');

const REMINDERS = [
  {
    type: '24h',
    eventType: agendaEvents.AGENDA_EVENTS.REMINDER_24H,
    templateName: 'appointment_reminder_24h',
    offsetMinutes: 24 * 60
  },
  {
    type: '2h',
    eventType: agendaEvents.AGENDA_EVENTS.REMINDER_2H,
    templateName: 'appointment_reminder_2h',
    offsetMinutes: 2 * 60
  }
];

const PENDING_ATTENDANT_REMINDERS = [
  {
    type: 'pending_attendant_30m',
    attempt: 2,
    eventType: agendaEvents.AGENDA_EVENTS.PENDING_ATTENDANT_REMINDER_30M,
    templateName: 'appointment_pending_attendant_reminder_30m',
    ageMinutes: 30
  },
  {
    type: 'pending_attendant_60m',
    attempt: 3,
    eventType: agendaEvents.AGENDA_EVENTS.PENDING_ATTENDANT_REMINDER_60M,
    templateName: 'appointment_pending_attendant_reminder_60m',
    ageMinutes: 60
  },
  {
    type: 'pending_attendant_2h',
    attempt: 4,
    priority: 'high',
    eventType: agendaEvents.AGENDA_EVENTS.PENDING_ATTENDANT_REMINDER_2H,
    templateName: 'appointment_pending_attendant_reminder_2h',
    offsetMinutes: 2 * 60
  }
];

const ELIGIBLE_STATUSES = ['pendente_cliente', 'confirmado'];
const PENDING_ATTENDANT_STATUS = 'pendente_atendente';
const PENDING_ATTENDANT_STOP_STATUSES = [
  'pendente_cliente',
  'confirmado',
  'cancelado',
  'reagendado',
  'concluido',
  'no_show',
  'expirado_atendente',
  'expirado_cliente'
];
const DEFAULT_WINDOW_MINUTES = Math.max(1, Number(process.env.REMINDER_WINDOW_MINUTES || 15));

function minutes(value) {
  return value * 60 * 1000;
}

function reminderWindow(now, offsetMinutes, windowMinutes) {
  const target = now.getTime() + minutes(offsetMinutes);
  return {
    start: new Date(target - minutes(windowMinutes)).toISOString(),
    end: new Date(target + minutes(windowMinutes)).toISOString()
  };
}

async function listCandidates({ now, offsetMinutes, windowMinutes }) {
  const window = reminderWindow(now, offsetMinutes, windowMinutes);
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id, tenant_id, cliente_id, profissional_id, data_inicio, status')
    .in('status', ELIGIBLE_STATUSES)
    .gte('data_inicio', window.start)
    .lte('data_inicio', window.end)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true });

  if (error) throw error;

  return {
    window,
    appointments: data || []
  };
}

async function listPendingAttendantAgeCandidates({ now, ageMinutes }) {
  const threshold = new Date(now.getTime() - minutes(ageMinutes)).toISOString();
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id, tenant_id, cliente_id, profissional_id, data_inicio, status, created_at, updated_at')
    .eq('status', PENDING_ATTENDANT_STATUS)
    .lte('created_at', threshold)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return {
    threshold,
    appointments: data || []
  };
}

async function listPendingAttendantTwoHourCandidates({ now, offsetMinutes, windowMinutes }) {
  const window = reminderWindow(now, offsetMinutes, windowMinutes);
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id, tenant_id, cliente_id, profissional_id, data_inicio, status, created_at, updated_at')
    .eq('status', PENDING_ATTENDANT_STATUS)
    .gte('data_inicio', window.start)
    .lte('data_inicio', window.end)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true });

  if (error) throw error;

  return {
    window,
    appointments: data || []
  };
}

async function listRecentlyInterruptedPendingAttendant(now, windowMinutes) {
  const since = new Date(now.getTime() - minutes(windowMinutes)).toISOString();
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id, tenant_id, status, updated_at')
    .in('status', PENDING_ATTENDANT_STOP_STATUSES)
    .gte('updated_at', since)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return {
    since,
    appointments: data || []
  };
}

async function listExistingReminderAppointmentIds(eventType, templateName, appointmentIds) {
  if (!appointmentIds.length) return new Set();

  let { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('agendamento_id')
    .in('agendamento_id', appointmentIds)
    .eq('tipo_evento', eventType)
    .is('deleted_at', null);

  if (['42703', 'PGRST204', 'PGRST205'].includes(error?.code)) {
    const fallback = await supabaseAdmin
      .from('mensagens_whatsapp')
      .select('agendamento_id')
      .in('agendamento_id', appointmentIds)
      .eq('template_nome', templateName)
      .is('deleted_at', null);

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return new Set((data || []).map((item) => item.agendamento_id).filter(Boolean));
}

async function dispatchReminder(reminder, appointment, nowIso) {
  console.log('[reminders-scheduler-debug] dispatching reminder event', {
    reminder: reminder.type,
    eventType: reminder.eventType,
    tenant_id: appointment.tenant_id,
    appointment_id: appointment.id,
    data_inicio: appointment.data_inicio,
    now: nowIso
  });

  await agendaEvents.publish(reminder.eventType, {
    tenantId: appointment.tenant_id,
    usuarioId: null,
    payload: {
      appointment_id: appointment.id,
      reminder_type: reminder.type,
      attempt: reminder.attempt || null,
      priority: reminder.priority || 'normal',
      scheduled_for: appointment.data_inicio,
      scheduler_now: nowIso,
      generated_by: 'reminders.scheduler'
    }
  });
}

async function processPendingAttendantReminder(reminder, now, nowIso, windowMinutes) {
  const candidateResult = reminder.ageMinutes
    ? await listPendingAttendantAgeCandidates({ now, ageMinutes: reminder.ageMinutes })
    : await listPendingAttendantTwoHourCandidates({
      now,
      offsetMinutes: reminder.offsetMinutes,
      windowMinutes
    });
  const appointments = candidateResult.appointments;
  const appointmentIds = appointments.map((appointment) => appointment.id);

  console.log('[pending-attendant-reminders-debug] candidates found', {
    reminder: reminder.type,
    eventType: reminder.eventType,
    now: nowIso,
    threshold: candidateResult.threshold || null,
    window: candidateResult.window || null,
    count: appointments.length,
    appointment_ids: appointmentIds
  });

  const alreadySentIds = await listExistingReminderAppointmentIds(
    reminder.eventType,
    reminder.templateName,
    appointmentIds
  );
  const eligibleAppointments = appointments.filter((appointment) => !alreadySentIds.has(appointment.id));

  console.log('[pending-attendant-reminders-debug] duplicate filter applied', {
    reminder: reminder.type,
    skipped_count: alreadySentIds.size,
    skipped_appointment_ids: [...alreadySentIds],
    eligible_count: eligibleAppointments.length,
    eligible_appointment_ids: eligibleAppointments.map((appointment) => appointment.id)
  });

  const dispatched = [];
  const errors = [];

  for (const appointment of eligibleAppointments) {
    try {
      await dispatchReminder(reminder, appointment, nowIso);
      dispatched.push(appointment.id);
    } catch (error) {
      console.error('[pending-attendant-reminders-debug] reminder dispatch failed', {
        reminder: reminder.type,
        eventType: reminder.eventType,
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
        message: error.message,
        code: error.code || null
      });
      errors.push({
        appointment_id: appointment.id,
        message: error.message,
        code: error.code || null
      });
    }
  }

  return {
    reminder: reminder.type,
    event_type: reminder.eventType,
    attempt: reminder.attempt,
    priority: reminder.priority || 'normal',
    threshold: candidateResult.threshold || null,
    window: candidateResult.window || null,
    found_count: appointments.length,
    found_appointment_ids: appointmentIds,
    skipped_duplicate_count: alreadySentIds.size,
    dispatched_count: dispatched.length,
    dispatched_appointment_ids: dispatched,
    errors
  };
}

async function processReminderJob(payload = {}) {
  const now = payload.now ? new Date(payload.now) : new Date();
  const windowMinutes = Math.max(1, Number(payload.windowMinutes || DEFAULT_WINDOW_MINUTES));

  if (Number.isNaN(now.getTime())) {
    throw new Error(`Invalid reminder scheduler date: ${payload.now}`);
  }

  const nowIso = now.toISOString();
  console.log('[reminders-scheduler-debug] scheduler execution started', {
    now: nowIso,
    windowMinutes
  });

  const summary = {
    type: 'reminders',
    status: 'processed',
    now: nowIso,
    window_minutes: windowMinutes,
    reminders: [],
    pending_attendant_reminders: []
  };

  const interruptionSignals = await listRecentlyInterruptedPendingAttendant(now, windowMinutes);
  console.log('[pending-attendant-reminders-debug] interruption signals checked', {
    now: nowIso,
    since: interruptionSignals.since,
    count: interruptionSignals.appointments.length,
    appointment_statuses: interruptionSignals.appointments.map((appointment) => ({
      id: appointment.id,
      tenant_id: appointment.tenant_id,
      status: appointment.status,
      updated_at: appointment.updated_at
    }))
  });
  summary.pending_attendant_interruptions = {
    since: interruptionSignals.since,
    count: interruptionSignals.appointments.length,
    appointment_ids: interruptionSignals.appointments.map((appointment) => appointment.id)
  };

  for (const reminder of REMINDERS) {
    const { window, appointments } = await listCandidates({
      now,
      offsetMinutes: reminder.offsetMinutes,
      windowMinutes
    });
    const appointmentIds = appointments.map((appointment) => appointment.id);

    console.log('[reminders-scheduler-debug] candidates found', {
      reminder: reminder.type,
      eventType: reminder.eventType,
      now: nowIso,
      window,
      count: appointments.length,
      appointment_ids: appointmentIds
    });

    const alreadySentIds = await listExistingReminderAppointmentIds(
      reminder.eventType,
      reminder.templateName,
      appointmentIds
    );
    const eligibleAppointments = appointments.filter((appointment) => !alreadySentIds.has(appointment.id));

    console.log('[reminders-scheduler-debug] duplicate filter applied', {
      reminder: reminder.type,
      skipped_count: alreadySentIds.size,
      skipped_appointment_ids: [...alreadySentIds],
      eligible_count: eligibleAppointments.length,
      eligible_appointment_ids: eligibleAppointments.map((appointment) => appointment.id)
    });

    const dispatched = [];
    const errors = [];

    for (const appointment of eligibleAppointments) {
      try {
        await dispatchReminder(reminder, appointment, nowIso);
        dispatched.push(appointment.id);
      } catch (error) {
        console.error('[reminders-scheduler-debug] reminder dispatch failed', {
          reminder: reminder.type,
          eventType: reminder.eventType,
          tenant_id: appointment.tenant_id,
          appointment_id: appointment.id,
          message: error.message,
          code: error.code || null
        });
        errors.push({
          appointment_id: appointment.id,
          message: error.message,
          code: error.code || null
        });
      }
    }

    summary.reminders.push({
      reminder: reminder.type,
      event_type: reminder.eventType,
      window,
      found_count: appointments.length,
      found_appointment_ids: appointmentIds,
      skipped_duplicate_count: alreadySentIds.size,
      dispatched_count: dispatched.length,
      dispatched_appointment_ids: dispatched,
      errors
    });
  }

  for (const reminder of PENDING_ATTENDANT_REMINDERS) {
    summary.pending_attendant_reminders.push(
      await processPendingAttendantReminder(reminder, now, nowIso, windowMinutes)
    );
  }

  console.log('[reminders-scheduler-debug] scheduler execution finished', summary);
  return summary;
}

module.exports = {
  name: 'reminders.process',
  handler: processReminderJob,
  processReminderJob
};
