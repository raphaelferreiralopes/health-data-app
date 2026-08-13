'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import type { AppointmentEntry } from '@/app/api/appointments/shared';

type FormState = {
  title: string;
  doctorName: string;
  location: string;
  date: string;
  time: string;
  notes: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: FormState = {
  title: '',
  doctorName: '',
  location: '',
  date: todayIso(),
  time: '',
  notes: '',
};

function formToPayload(form: FormState) {
  return {
    title: form.title.trim(),
    doctorName: form.doctorName.trim(),
    location: form.location.trim(),
    date: form.date,
    time: form.time || null,
    notes: form.notes.trim(),
  };
}

function appointmentToForm(appointment: AppointmentEntry): FormState {
  return {
    title: appointment.title,
    doctorName: appointment.doctorName,
    location: appointment.location,
    date: appointment.date,
    time: appointment.time ?? '',
    notes: appointment.notes,
  };
}

function formatDate(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function AppointmentForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isSaving,
  isEditing,
}: {
  form: FormState;
  setForm: (updater: (current: FormState) => FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isEditing: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-base font-semibold text-ink">{isEditing ? 'Termin bearbeiten' : 'Neuer Termin'}</h3>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="appointment-title">
            Titel
          </label>
          <input
            id="appointment-title"
            type="text"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="z. B. Kardiologe, Vorsorgeuntersuchung"
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink" htmlFor="appointment-doctor">
            Arzt / Praxis
          </label>
          <input
            id="appointment-doctor"
            type="text"
            value={form.doctorName}
            onChange={(event) => setForm((current) => ({ ...current, doctorName: event.target.value }))}
            placeholder="z. B. Dr. Müller"
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="appointment-date">
              Datum
            </label>
            <input
              id="appointment-date"
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none sm:w-48"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="appointment-time">
              Uhrzeit
            </label>
            <input
              id="appointment-time"
              type="time"
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none sm:w-32"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink" htmlFor="appointment-location">
            Ort
          </label>
          <input
            id="appointment-location"
            type="text"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            placeholder="z. B. Praxisklinik am Stadtpark"
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink" htmlFor="appointment-notes">
            Notizen
          </label>
          <textarea
            id="appointment-notes"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="z. B. nüchtern erscheinen, Unterlagen mitbringen"
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving || !form.title.trim() || !form.date}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
        >
          Speichern
        </button>
        <button type="button" onClick={onCancel} className="text-sm font-medium text-muted hover:text-ink">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentEntry[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const load = async () => {
      const client = getBrowserSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await response.json()) as { appointments?: AppointmentEntry[] };
        setAppointments(payload.appointments ?? []);
      } catch {
        // list stays empty; retry happens on next visit
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const { upcoming, past } = useMemo(() => {
    const today = todayIso();
    return {
      upcoming: appointments.filter((appointment) => appointment.date >= today),
      past: appointments.filter((appointment) => appointment.date < today),
    };
  }, [appointments]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (appointment: AppointmentEntry) => {
    setEditingId(appointment.id);
    setForm(appointmentToForm(appointment));
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const submitForm = async () => {
    if (!accessToken || !form.title.trim() || !form.date) return;
    setIsSaving(true);
    setFormError('');
    try {
      const response = await fetch(editingId ? `/api/appointments/${editingId}` : '/api/appointments', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(formToPayload(form)),
      });
      const payload = (await response.json()) as { entry?: AppointmentEntry; error?: string };
      if (!response.ok || !payload.entry) {
        setFormError(payload.error ?? 'Speichern fehlgeschlagen.');
        return;
      }
      setAppointments((current) => {
        const next = editingId
          ? current.map((appointment) => (appointment.id === editingId ? (payload.entry as AppointmentEntry) : appointment))
          : [...current, payload.entry as AppointmentEntry];
        return next.slice().sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
      });
      closeForm();
    } catch {
      setFormError('Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!accessToken) return;
    setAppointments((current) => current.filter((appointment) => appointment.id !== appointmentId));
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // best-effort; reappears on next reload if the delete failed
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-sm text-muted">Lade…</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-sm text-muted">Bitte melde dich an, um deine Arzttermine zu verwalten.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-ink">Admin</h1>
          <p className="mt-2 text-sm text-muted">Anstehende Arzttermine im Blick behalten.</p>
        </div>
        {!isFormOpen ? (
          <button
            type="button"
            onClick={openAddForm}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep"
          >
            + Neuer Termin
          </button>
        ) : null}
      </div>

      {isFormOpen ? (
        <div className="mt-6">
          <AppointmentForm form={form} setForm={setForm} onSubmit={submitForm} onCancel={closeForm} isSaving={isSaving} isEditing={editingId !== null} />
          {formError ? <p className="mt-2 text-sm text-red-600">{formError}</p> : null}
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Anstehend</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Keine anstehenden Termine. Füge deinen ersten Arzttermin hinzu.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {upcoming.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} onEdit={openEditForm} onDelete={deleteAppointment} />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-muted">Vergangen</h2>
          <div className="mt-4 flex flex-col gap-3">
            {past
              .slice()
              .reverse()
              .map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} onEdit={openEditForm} onDelete={deleteAppointment} isPast />
              ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AppointmentRow({
  appointment,
  onEdit,
  onDelete,
  isPast,
}: {
  appointment: AppointmentEntry;
  onEdit: (appointment: AppointmentEntry) => void;
  onDelete: (appointmentId: string) => void;
  isPast?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between ${
        isPast ? 'border-line bg-card opacity-70' : 'border-line bg-surface'
      }`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-ink">{appointment.title}</span>
          {appointment.doctorName ? <span className="text-sm text-muted">· {appointment.doctorName}</span> : null}
        </div>
        <span className="text-sm text-muted">
          {formatDate(appointment.date)}
          {appointment.time ? ` · ${appointment.time} Uhr` : ''}
          {appointment.location ? ` · ${appointment.location}` : ''}
        </span>
        {appointment.notes ? <span className="text-xs text-muted">{appointment.notes}</span> : null}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <button type="button" onClick={() => onEdit(appointment)} className="text-sm font-medium text-brand-deep hover:underline">
          Bearbeiten
        </button>
        <button type="button" onClick={() => onDelete(appointment.id)} className="text-sm font-medium text-muted hover:text-ink">
          Löschen
        </button>
      </div>
    </div>
  );
}
