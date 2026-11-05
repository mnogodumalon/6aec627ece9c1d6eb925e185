// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Interaktionen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    reihenfolge?: number;
    frage?: string;
    vorprompt?: string;
    endprompt?: string;
    gesamttext?: string;
    ki_antwort?: string;
  };
}

export interface Veranstaltungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    beschreibung?: string;
    teilnahme_link?: string;
    aktive_interaktion?: RecordUrl; // applookup -> URL zu 'Interaktionen' Record
  };
}

export interface Teilnehmende {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
    kuerzel?: string;
    email?: string;
    einwilligung?: boolean;
    einwilligung_zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Feedbacks {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    interaktion?: RecordUrl; // applookup -> URL zu 'Interaktionen' Record
    teilnehmer?: RecordUrl; // applookup -> URL zu 'Teilnehmende' Record
    feedbacktext?: string;
    absende_schluessel?: string;
    gesendet_am?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  INTERAKTIONEN: '6aec626687578ea7ed708d4f',
  VERANSTALTUNGEN: '6aec626a18535d6b8513a1a0',
  TEILNEHMENDE: '6aec626bca85c9b89c277c12',
  FEEDBACKS: '6aec626c45b6add3842ac887',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'interaktionen': {
    'titel': 'string/text',
    'reihenfolge': 'number',
    'frage': 'string/textarea',
    'vorprompt': 'string/textarea',
    'endprompt': 'string/textarea',
    'gesamttext': 'string/textarea',
    'ki_antwort': 'string/textarea',
  },
  'veranstaltungen': {
    'titel': 'string/text',
    'datum': 'date/datetimeminute',
    'ort': 'string/text',
    'beschreibung': 'string/textarea',
    'teilnahme_link': 'string/url',
    'aktive_interaktion': 'applookup/select',
  },
  'teilnehmende': {
    'veranstaltung': 'applookup/select',
    'kuerzel': 'string/text',
    'email': 'string/email',
    'einwilligung': 'bool',
    'einwilligung_zeitpunkt': 'date/datetimeminute',
  },
  'feedbacks': {
    'interaktion': 'applookup/select',
    'teilnehmer': 'applookup/select',
    'feedbacktext': 'string/textarea',
    'absende_schluessel': 'string/text',
    'gesendet_am': 'date/datetimeminute',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateInteraktionen = StripLookup<Interaktionen['fields']>;
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateTeilnehmende = StripLookup<Teilnehmende['fields']>;
export type CreateFeedbacks = StripLookup<Feedbacks['fields']>;