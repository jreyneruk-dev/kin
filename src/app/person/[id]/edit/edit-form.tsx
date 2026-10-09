"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person } from "@/lib/types";

export function EditForm({ person }: { person: Person }) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: person.fullName,
    nameNote: person.nameNote ?? "",
    aliases: person.aliases.join(", "),
    sex: person.sex ?? "",
    birthDate: person.birthDate ?? "",
    birthPlace: person.birthPlace ?? "",
    deathDate: person.deathDate ?? "",
    deathPlace: person.deathPlace ?? "",
    notes: person.notes ?? "",
    living: person.living,
    changeNote: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/people/${person.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        setBusy(false);
        if (res.ok) {
          router.push(`/person/${person.id}`);
          router.refresh();
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "save failed");
        }
      }}
    >
      <Field label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} required />
      <Field
        label="Name note"
        value={form.nameNote}
        onChange={(v) => set("nameNote", v)}
        placeholder="e.g. surname spelled McCartney in some records"
      />
      <Field
        label="Also recorded as (aliases)"
        value={form.aliases}
        onChange={(v) => set("aliases", v)}
        placeholder="e.g. Eileen McCartney, Eileen MacArtney — comma separated"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Birth date" value={form.birthDate} onChange={(v) => set("birthDate", v)} placeholder="e.g. 1898 or Q1 1898" />
        <Field label="Birth place" value={form.birthPlace} onChange={(v) => set("birthPlace", v)} />
        <Field
          label="Death date"
          value={form.deathDate}
          onChange={(v) => {
            set("deathDate", v);
            // Recording a death unticks Alive automatically; clearing both
            // death fields does not re-tick it (the family decides that).
            if (v.trim()) set("living", false);
          }}
        />
        <Field
          label="Death place"
          value={form.deathPlace}
          onChange={(v) => {
            set("deathPlace", v);
            if (v.trim()) set("living", false);
          }}
        />
      </div>
      <div className="flex items-center gap-6 text-sm text-stone-700">
        <label className="flex items-center gap-2">
          Sex
          <select
            value={form.sex}
            onChange={(e) => set("sex", e.target.value)}
            className="rounded-lg border border-stone-300 px-2 py-1"
          >
            <option value="">—</option>
            <option value="f">female</option>
            <option value="m">male</option>
            <option value="x">other</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={form.living && !(form.deathDate.trim() || form.deathPlace.trim())}
            disabled={Boolean(form.deathDate.trim() || form.deathPlace.trim())}
            onChange={(e) => set("living", e.target.checked)}
          />
          Alive
        </label>
      </div>
      <label className="block text-sm font-semibold text-stone-800">
        Notes
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
        />
      </label>
      <Field
        label="What changed? (for the activity log)"
        value={form.changeNote}
        onChange={(v) => set("changeNote", v)}
        placeholder="e.g. found 1911 census entry"
      />
      {error && <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-stone-800">
      {label}
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal focus:border-kin focus:outline-none"
      />
    </label>
  );
}
