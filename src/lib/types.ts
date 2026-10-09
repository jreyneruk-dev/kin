/** Shared types for kin. */

export type Sex = "f" | "m" | "x";
export type Confidence = "documented" | "likely" | "guess";
/** Coarse provenance of a fact's source (Phase 1). */
export type SourceKind = "primary" | "secondary" | "family-lore" | "negative" | "unspecified";
export type FactKind =
  | "birth"
  | "baptism"
  | "marriage"
  | "death"
  | "burial"
  | "residence"
  | "emigration"
  | "occupation"
  | "census"
  | "military"
  | "note";
export interface Person {
  id: number;
  fullName: string;
  /** Which research cluster this person belongs to ('family' = the real tree). */
  cluster: string;
  nameNote: string | null;
  /** Alternative spellings/surnames this person is recorded under. */
  aliases: string[];
  sex: Sex | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  notes: string | null;
  living: boolean;
  createdBy: string;
  createdAt: number;
}

export interface Union {
  id: number;
  /** Which research cluster this couple belongs to ('family' = the real tree). */
  cluster: string;
  partnerA: number;
  partnerB: number | null;
  marriageDate: string | null;
  marriagePlace: string | null;
  createdBy: string;
  createdAt: number;
}

export interface Fact {
  id: number;
  personId: number;
  kind: FactKind;
  detail: string;
  source: string | null;
  /** Link to the record itself (catalogue entry, index transcription, image). */
  sourceUrl: string | null;
  sourceKind: SourceKind;
  confidence: Confidence;
  createdBy: string;
  createdAt: number;
}

/** A photo or document image attached to a person (Phase 3). */
export interface PersonImage {
  id: number;
  personId: number;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  caption: string;
  source: string;
  addedBy: string;
  createdAt: number;
}

export interface Comment {
  id: number;
  personId: number | null;
  unionId: number | null;
  author: string;
  body: string;
  createdAt: number;
}

export interface Question {
  id: number;
  personId: number | null;
  title: string;
  detail: string | null;
  status: "open" | "answered";
  raisedBy: string;
  createdAt: number;
  answeredAt: number | null;
}

export interface SessionUser {
  email: string;
  name: string;
  role: "owner" | "member";
}

/** A branch label used by the tree filter (surname line of interest). */
export interface Branch {
  key: string;
  label: string;
  /** Root person of the branch (marriage surname carried). */
  rootSurname: string;
}
