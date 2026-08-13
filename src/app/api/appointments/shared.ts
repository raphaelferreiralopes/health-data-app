export type AppointmentRow = {
  id: string;
  title: string;
  doctor_name: string;
  location: string;
  appointment_date: string;
  appointment_time: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type AppointmentEntry = {
  id: string;
  title: string;
  doctorName: string;
  location: string;
  date: string;
  time: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export function toAppointmentEntry(row: AppointmentRow): AppointmentEntry {
  return {
    id: row.id,
    title: row.title,
    doctorName: row.doctor_name,
    location: row.location,
    date: row.appointment_date,
    time: row.appointment_time,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TITLE_MAX_LENGTH = 200;
const TEXT_MAX_LENGTH = 500;
const NOTES_MAX_LENGTH = 2000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export type AppointmentPayload = {
  title: string;
  doctorName: string;
  location: string;
  date: string;
  time: string | null;
  notes: string;
};

/** Normalizes and validates a create/update payload; returns null if title or date is missing/invalid. */
export function parseAppointmentPayload(body: Record<string, unknown>): AppointmentPayload | null {
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, TITLE_MAX_LENGTH) : '';
  const date = typeof body.date === 'string' && DATE_PATTERN.test(body.date) ? body.date : '';
  if (!title || !date) return null;

  const doctorName = typeof body.doctorName === 'string' ? body.doctorName.trim().slice(0, TEXT_MAX_LENGTH) : '';
  const location = typeof body.location === 'string' ? body.location.trim().slice(0, TEXT_MAX_LENGTH) : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, NOTES_MAX_LENGTH) : '';
  const time = typeof body.time === 'string' && TIME_PATTERN.test(body.time) ? body.time : null;

  return { title, doctorName, location, date, time, notes };
}
