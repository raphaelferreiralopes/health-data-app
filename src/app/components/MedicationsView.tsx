'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import {
  MEDICATION_CATEGORIES,
  MEDICATION_CATEGORY_LABELS,
  MEDICATION_FREQUENCY_TYPES,
  MEDICATION_FREQUENCY_LABELS,
  WEEKDAY_LABELS,
  addDaysToIso,
  isMedicationDueOn,
  todayIso,
  type Medication,
  type MedicationCategory,
  type MedicationFrequencyType,
} from '@/core/medicationSchedule';

type ViewMode = 'heute' | 'verwalten';

type FormState = {
  name: string;
  description: string;
  category: MedicationCategory;
  frequencyType: MedicationFrequencyType;
  weekdays: number[];
  intervalDays: string;
  startDate: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  category: 'medikament',
  frequencyType: 'taeglich',
  weekdays: [],
  intervalDays: '2',
  startDate: todayIso(),
  active: true,
};

// Anzeige Montag-first, Werte bleiben JS-getDay-kompatibel (0 = Sonntag).
const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formToPayload(form: FormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    frequencyType: form.frequencyType,
    weekdays: form.weekdays,
    intervalDays: form.frequencyType === 'intervall' ? Number(form.intervalDays) || null : null,
    startDate: form.startDate,
    active: form.active,
  };
}

function medicationToForm(medication: Medication): FormState {
  return {
    name: medication.name,
    description: medication.description,
    category: medication.category,
    frequencyType: medication.frequencyType,
    weekdays: medication.weekdays,
    intervalDays: medication.intervalDays != null ? String(medication.intervalDays) : '2',
    startDate: medication.startDate,
    active: medication.active,
  };
}

function segmentButtonClass(active: boolean): string {
  return `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
  }`;
}

function toggleButtonClass(active: boolean): string {
  return `rounded-xl border px-3 py-2 text-sm font-medium transition ${
    active ? 'border-brand bg-brand-pale text-brand-deep' : 'border-line bg-card text-ink hover:border-brand'
  }`;
}

function formatDateLabel(dateIso: string): string {
  const today = todayIso();
  if (dateIso === today) return 'Heute';
  if (dateIso === addDaysToIso(today, -1)) return 'Gestern';
  return new Date(`${dateIso}T00:00:00Z`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function MedicationForm({
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
      <h3 className="text-base font-semibold text-ink">{isEditing ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h3>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="medication-name">
            Name
          </label>
          <input
            id="medication-name"
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="z. B. Vitamin D3, Ibuprofen"
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink" htmlFor="medication-description">
            Beschreibung / Dosierung
          </label>
          <textarea
            id="medication-description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="z. B. 2000 IE, morgens mit dem Frühstück"
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <span className="text-sm font-medium text-ink">Kategorie</span>
          <div className="mt-1.5 flex gap-2">
            {MEDICATION_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setForm((current) => ({ ...current, category }))}
                className={`flex-1 ${toggleButtonClass(form.category === category)}`}
              >
                {MEDICATION_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-ink">Frequenz</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {MEDICATION_FREQUENCY_TYPES.map((frequencyType) => (
              <button
                key={frequencyType}
                type="button"
                onClick={() => setForm((current) => ({ ...current, frequencyType }))}
                className={toggleButtonClass(form.frequencyType === frequencyType)}
              >
                {MEDICATION_FREQUENCY_LABELS[frequencyType]}
              </button>
            ))}
          </div>
        </div>

        {form.frequencyType === 'wochentage' ? (
          <div>
            <span className="text-sm font-medium text-ink">Wochentage</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {WEEKDAY_DISPLAY_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      weekdays: current.weekdays.includes(day)
                        ? current.weekdays.filter((value) => value !== day)
                        : [...current.weekdays, day],
                    }))
                  }
                  className={`h-10 w-12 ${toggleButtonClass(form.weekdays.includes(day))}`}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {form.frequencyType === 'intervall' ? (
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="medication-interval">
              Alle wie viele Tage?
            </label>
            <input
              id="medication-interval"
              type="number"
              min={1}
              max={365}
              value={form.intervalDays}
              onChange={(event) => setForm((current) => ({ ...current, intervalDays: event.target.value }))}
              className="mt-1.5 w-24 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
        ) : null}

        <div>
          <label className="text-sm font-medium text-ink" htmlFor="medication-start-date">
            Start
          </label>
          <input
            id="medication-start-date"
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none sm:w-48"
          />
        </div>

        {isEditing ? (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              className="h-4 w-4 rounded border-line"
            />
            Aktiv (erscheint auf der Checkliste)
          </label>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving || !form.name.trim()}
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

export function MedicationsView() {
  const [viewMode, setViewMode] = useState<ViewMode>('heute');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

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
        const response = await fetch('/api/medications', { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await response.json()) as { medications?: Medication[] };
        setMedications(payload.medications ?? []);
      } catch {
        // list stays empty; retry happens on next visit
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const loadLogs = async () => {
      try {
        const response = await fetch(`/api/medication-logs?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = (await response.json()) as { medicationIds?: string[] };
        setCheckedIds(new Set(payload.medicationIds ?? []));
      } catch {
        setCheckedIds(new Set());
      }
    };
    void loadLogs();
  }, [accessToken, selectedDate]);

  const dueMedications = useMemo(() => {
    return medications
      .filter((medication) => medication.active && medication.frequencyType !== 'nach_bedarf' && isMedicationDueOn(medication, selectedDate))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medications, selectedDate]);

  const asNeededMedications = useMemo(() => {
    return medications.filter((medication) => medication.active && medication.frequencyType === 'nach_bedarf').sort((a, b) => a.name.localeCompare(b.name));
  }, [medications]);

  const toggleChecked = async (medicationId: string) => {
    if (!accessToken) return;
    const isChecked = checkedIds.has(medicationId);
    setPendingId(medicationId);
    setCheckedIds((current) => {
      const next = new Set(current);
      if (isChecked) next.delete(medicationId);
      else next.add(medicationId);
      return next;
    });

    try {
      if (isChecked) {
        await fetch(`/api/medication-logs?medicationId=${medicationId}&date=${selectedDate}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } else {
        await fetch('/api/medication-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ medicationId, date: selectedDate }),
        });
      }
    } catch {
      // best-effort; a failed toggle resets on next reload of that day
    } finally {
      setPendingId(null);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (medication: Medication) => {
    setEditingId(medication.id);
    setForm(medicationToForm(medication));
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const submitForm = async () => {
    if (!accessToken || !form.name.trim()) return;
    setIsSaving(true);
    setFormError('');
    try {
      const response = await fetch(editingId ? `/api/medications/${editingId}` : '/api/medications', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(formToPayload(form)),
      });
      const payload = (await response.json()) as { entry?: Medication; error?: string };
      if (!response.ok || !payload.entry) {
        setFormError(payload.error ?? 'Speichern fehlgeschlagen.');
        return;
      }
      setMedications((current) => {
        if (editingId) {
          return current.map((medication) => (medication.id === editingId ? (payload.entry as Medication) : medication));
        }
        return [payload.entry as Medication, ...current];
      });
      closeForm();
    } catch {
      setFormError('Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMedication = async (medicationId: string) => {
    if (!accessToken) return;
    setMedications((current) => current.filter((medication) => medication.id !== medicationId));
    try {
      await fetch(`/api/medications/${medicationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // best-effort; reappears on next reload if the delete failed
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <p className="text-sm text-muted">Lade…</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <p className="text-sm text-muted">Bitte melde dich an, um deine Medikamente und Supplements zu verwalten.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="inline-flex gap-1 rounded-xl bg-card p-1">
        <button type="button" onClick={() => setViewMode('heute')} className={segmentButtonClass(viewMode === 'heute')}>
          Heute
        </button>
        <button type="button" onClick={() => setViewMode('verwalten')} className={segmentButtonClass(viewMode === 'verwalten')}>
          Verwalten
        </button>
      </div>

      {viewMode === 'heute' ? (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedDate((current) => addDaysToIso(current, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
                aria-label="Vorheriger Tag"
              >
                ←
              </button>
              <span className="text-base font-semibold text-ink">{formatDateLabel(selectedDate)}</span>
              <button
                type="button"
                onClick={() => setSelectedDate((current) => addDaysToIso(current, 1))}
                disabled={selectedDate >= todayIso()}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:text-ink disabled:opacity-40"
                aria-label="Nächster Tag"
              >
                →
              </button>
            </div>
            {dueMedications.length > 0 ? (
              <span className="text-sm text-muted">
                {dueMedications.filter((medication) => checkedIds.has(medication.id)).length} von {dueMedications.length} erledigt
              </span>
            ) : null}
          </div>

          {medications.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              Noch keine Medikamente oder Supplements angelegt. Wechsle zu &bdquo;Verwalten&ldquo;, um den ersten Eintrag hinzuzufügen.
            </p>
          ) : (
            <>
              {dueMedications.length === 0 ? (
                <p className="mt-6 text-sm text-muted">Für diesen Tag ist nichts geplant.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {dueMedications.map((medication) => (
                    <ChecklistRow
                      key={medication.id}
                      medication={medication}
                      isChecked={checkedIds.has(medication.id)}
                      isPending={pendingId === medication.id}
                      onToggle={() => toggleChecked(medication.id)}
                    />
                  ))}
                </div>
              )}

              {asNeededMedications.length > 0 ? (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-muted">Bei Bedarf</h3>
                  <div className="mt-2 flex flex-col gap-2">
                    {asNeededMedications.map((medication) => (
                      <ChecklistRow
                        key={medication.id}
                        medication={medication}
                        isChecked={checkedIds.has(medication.id)}
                        isPending={pendingId === medication.id}
                        onToggle={() => toggleChecked(medication.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Deine Einträge</h2>
            {!isFormOpen ? (
              <button
                type="button"
                onClick={openAddForm}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep"
              >
                + Neuer Eintrag
              </button>
            ) : null}
          </div>

          {isFormOpen ? (
            <>
              <MedicationForm form={form} setForm={setForm} onSubmit={submitForm} onCancel={closeForm} isSaving={isSaving} isEditing={editingId !== null} />
              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            </>
          ) : null}

          {medications.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Einträge. Füge dein erstes Medikament oder Supplement hinzu.</p>
          ) : (
            medications.map((medication) => (
              <div key={medication.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-ink">{medication.name}</span>
                    <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-line">
                      {MEDICATION_CATEGORY_LABELS[medication.category]}
                    </span>
                    {!medication.active ? (
                      <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-line">Pausiert</span>
                    ) : null}
                  </div>
                  {medication.description ? <span className="text-sm text-muted">{medication.description}</span> : null}
                  <span className="text-xs text-muted">
                    {MEDICATION_FREQUENCY_LABELS[medication.frequencyType]}
                    {medication.frequencyType === 'wochentage' && medication.weekdays.length > 0
                      ? `: ${medication.weekdays
                          .slice()
                          .sort((a, b) => WEEKDAY_DISPLAY_ORDER.indexOf(a) - WEEKDAY_DISPLAY_ORDER.indexOf(b))
                          .map((day) => WEEKDAY_LABELS[day])
                          .join(', ')}`
                      : ''}
                    {medication.frequencyType === 'intervall' ? ` (${medication.intervalDays} Tage)` : ''}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <button type="button" onClick={() => openEditForm(medication)} className="text-sm font-medium text-brand-deep hover:underline">
                    Bearbeiten
                  </button>
                  <button type="button" onClick={() => deleteMedication(medication.id)} className="text-sm font-medium text-muted hover:text-ink">
                    Löschen
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

function ChecklistRow({
  medication,
  isChecked,
  isPending,
  onToggle,
}: {
  medication: Medication;
  isChecked: boolean;
  isPending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition disabled:opacity-70 ${
        isChecked ? 'border-brand bg-brand-pale' : 'border-line bg-surface hover:border-brand'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          isChecked ? 'bg-brand text-white' : 'border border-line text-muted'
        }`}
      >
        {isChecked ? '✓' : ''}
      </span>
      <span className="flex flex-col">
        <span className={`text-sm font-medium ${isChecked ? 'text-brand-deep' : 'text-ink'}`}>{medication.name}</span>
        {medication.description ? <span className="text-xs text-muted">{medication.description}</span> : null}
      </span>
    </button>
  );
}
