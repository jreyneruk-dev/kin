/**
 * Seed data transcribed from michael's Ancestry screenshot ("Siblings.jpg",
 * shared by John, Sep 2026). Every record carries its source so the family
 * can verify and upgrade confidence later.
 */

import type { Person } from "./types";
import { henryEvidence } from "./person-evidence";

export const SEED_SOURCE = "Ancestry tree screenshot (michael), Sep 2026";

/** Seed people may declare aliases; the rest default to none. These are the
 * family tree (cluster defaults to 'family' in the database). */
type SeedPerson = Omit<Person, "id" | "createdAt" | "aliases" | "cluster"> & {
  aliases?: string[];
};

/** Original siblings: Eileen 1897, Richard 1898, Mabel 1900, Charles 1902, Ruby 1905. Henry is a separate, unlinked research record. */
export function seedPeople(): SeedPerson[] {
  return [
    {
      fullName: "William H Macartney",
      nameNote: null,
      aliases: ["William H McCartney"],
      sex: "m",
      birthDate: "1871",
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: "Ancestry shows a hint (green leaf) — unreviewed.",
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Edith Maude Grainger",
      nameNote: null,
      sex: "f",
      birthDate: "1874",
      birthPlace: null,
      deathDate: "1924",
      deathPlace: null,
      notes: "Ancestry shows a hint (green leaf) — unreviewed.",
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Eileen McCartney",
      nameNote: "Recorded as “McCartney” on the Ancestry tree — spelling variant to resolve.",
      aliases: ["Eileen Macartney", "Eileen MacCartney"],
      sex: "f",
      birthDate: "1897",
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: null,
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Richard H Macartney",
      nameNote: null,
      sex: "m",
      birthDate: "1898",
      birthPlace: null,
      deathDate: "1980",
      deathPlace: null,
      notes: "Ancestry shows a hint (green leaf) — unreviewed.",
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Mary E Reynolds",
      nameNote: null,
      sex: "f",
      birthDate: "1890",
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: "Ancestry shows a hint (green leaf) — unreviewed.",
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Mabel C Macartney",
      nameNote: null,
      sex: "f",
      birthDate: "1900",
      birthPlace: null,
      deathDate: "1984",
      deathPlace: null,
      notes: "michael's grandmother.",
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Joseph Fahey",
      nameNote: null,
      sex: "m",
      birthDate: "1898",
      birthPlace: null,
      deathDate: "1977",
      deathPlace: null,
      notes: "michael's grandfather.",
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Kathleen S Macartney",
      nameNote: "John's maternal grandmother. What does the “S” stand for?",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: null,
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Aylwin P Davies",
      nameNote: null,
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: null,
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "Charles E McCartney",
      nameNote: "Recorded as “McCartney” on the Ancestry tree — spelling variant to resolve.",
      aliases: ["Charles E Macartney", "Charles Macartney"],
      sex: "m",
      birthDate: "1902",
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: null,
      createdBy: "seed",
      living: false,
    },
    {
      fullName: "Ruby Macartney",
      nameNote: null,
      sex: "f",
      birthDate: "1905",
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: "Ancestry shows a hint (green leaf) — unreviewed.",
      living: false,
      createdBy: "seed",
    },
    {
      fullName: "William J Cumming",
      nameNote: null,
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: null,
      living: false,
      createdBy: "seed",
    },
    {
      // The only surviving reference to Henry is his name and occupation in
      // Richard Henry's 1870 marriage record. Keep every date/place unknown;
      // evidence is attached to this person, but no parent or tree edge is.
      fullName: "Henry Macartney",
      nameNote: null,
      aliases: [],
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: null,
      living: false,
      createdBy: "seed",
      researchEvidence: henryEvidence(),
    },
  ];
}

/** Indexes into seedPeople(). */
export const SEED_INDEX = {
  williamH: 0,
  edith: 1,
  eileen: 2,
  richard: 3,
  maryReynolds: 4,
  mabel: 5,
  joseph: 6,
  kathleen: 7,
  aylwin: 8,
  charles: 9,
  ruby: 10,
  williamCumming: 11,
  henry: 12,
} as const;

/** Unions as (partnerA index, partnerB index, note). */
export function seedUnions(): { a: number; b: number }[] {
  return [
    { a: SEED_INDEX.williamH, b: SEED_INDEX.edith }, // William H + Edith Maude
    { a: SEED_INDEX.richard, b: SEED_INDEX.maryReynolds }, // Richard + Mary E
    { a: SEED_INDEX.mabel, b: SEED_INDEX.joseph }, // Mabel + Joseph (michael's grandparents)
    { a: SEED_INDEX.kathleen, b: SEED_INDEX.aylwin }, // Kathleen + Aylwin (John's grandparents)
    { a: SEED_INDEX.ruby, b: SEED_INDEX.williamCumming }, // Ruby + William J
  ];
}

/** Children per union, by seed index. */
export function seedChildren(): { union: number; children: number[] }[] {
  return [
    {
      union: 0, // William H + Edith Maude
      children: [
        SEED_INDEX.eileen,
        SEED_INDEX.richard,
        SEED_INDEX.mabel,
        SEED_INDEX.kathleen,
        SEED_INDEX.charles,
        SEED_INDEX.ruby,
      ],
    },
  ];
}

/** Open questions to seed the research hub. */
export function seedQuestions(): { person: number | null; title: string; detail: string }[] {
  return [
    {
      person: SEED_INDEX.kathleen,
      title: "What does the “S” in Kathleen S Macartney stand for?",
      detail:
        "Middle initial from michael's Ancestry tree. UK birth registrations after 1911 include the mother's maiden name — the GRO index (free to search) should give her full middle name and confirm her mother as Edith Maude Grainger.",
    },
    {
      person: null,
      title: "Macartney or McCartney — which spelling is on the records?",
      detail:
        "The Ancestry tree records Eileen and Charles as “McCartney” but their parents and siblings as “Macartney”. Both spellings appear in English and Irish records; clerks indexed names phonetically. Search both spellings (plus McCartney/M'Cartney) in every index.",
    },
    {
      person: SEED_INDEX.williamH,
      title: "Where and when were William H Macartney and Edith Maude Grainger married?",
      detail:
        "Ancestry shows unreviewed hints on both profiles. The marriage certificate will name both fathers — the key step to reach the next generation back.",
    },
    {
      person: SEED_INDEX.kathleen,
      title: "Where and when was Kathleen born, and whom did she and Aylwin marry?",
      detail:
        "The screenshot shows no dates for Kathleen or Aylwin P Davies. John: dates/places for Kathleen's birth and the Macartney–Davies marriage are the fastest wins for this branch.",
    },
    {
      person: null,
      title: "Did the family stay in England, or did any siblings emigrate (Australia link)?",
      detail:
        "michael lives in Australia; Joseph Fahey's surname is Irish. Check UK outward passenger lists (1890–1960) and Australian BDM indexes for any of the six siblings.",
    },
  ];
}
