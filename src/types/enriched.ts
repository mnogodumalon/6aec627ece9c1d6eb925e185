import type { Feedbacks, Teilnehmende, Veranstaltungen } from './app';

export type EnrichedVeranstaltungen = Veranstaltungen & {
  aktive_interaktionName: string;
};

export type EnrichedTeilnehmende = Teilnehmende & {
  veranstaltungName: string;
};

export type EnrichedFeedbacks = Feedbacks & {
  interaktionName: string;
  teilnehmerName: string;
};
