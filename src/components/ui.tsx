import Link from "next/link";
import type { Person } from "@/lib/types";

export function SectionHeading({
  kicker,
  title,
  lede,
}: {
  kicker?: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="mb-8">
      {kicker && <p className="text-xs font-bold uppercase tracking-widest text-kin">{kicker}</p>}
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
        {title}
      </h1>
      {lede && <p className="mt-3 max-w-3xl text-stone-600">{lede}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "stone",
}: {
  children: React.ReactNode;
  tone?: "stone" | "kin" | "amber" | "green" | "rose";
}) {
  const tones = {
    stone: "bg-stone-100 text-stone-700",
    kin: "bg-kin-light text-kin-dark",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-800",
  } as const;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function lifespan(p: Person): string {
  const b = p.birthDate ?? "?";
  const d = p.living ? "living" : (p.deathDate ?? "—");
  return b === "?" && d === "—" ? "dates unknown" : `${b} – ${d}`;
}

export function PersonChip({ person, href }: { person: Person; href?: string }) {
  const inner = (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-stone-800 shadow-sm hover:border-kin">
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${person.sex === "f" ? "bg-rose-400" : person.sex === "m" ? "bg-sky-400" : "bg-stone-400"}`}
      />
      {person.fullName}
      <span className="text-xs font-normal text-stone-500">{lifespan(person)}</span>
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-stone-500">{children}</p>;
}
