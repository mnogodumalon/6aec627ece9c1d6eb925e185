/**
 * src/pages/views/GesamttextView.tsx — the view „Gesamttext“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/gesamttext — generated in App.tsx, OUTSIDE the dashboard chrome
 *         (no header, drawer or assistant: a beamer / kiosk / print surface). Never wire a route for it yourself.
 * LIVE    static — loads once.
 * READS   interaktionen (titel, frage, gesamttext) * SHOWS   the interaktionen record that veranstaltungen.aktive_interaktion points at — the control
 *         record the OVERVIEW set last (`veranstaltungenControl` below reads exactly that one; the id to show is the
 *         reference in its `aktive_interaktion`). Read THAT record — never `records[0]` of a list, never „the
 *         newest open one“; no reference set → the view says „Nichts ausgewählt“.
 * EDITS   interaktionen.gesamttext is edited ON this view, in front of the room: keep the
 *         <ViewTextEditor field="gesamttext" …> below (big field, saves by itself with
 *         „Gespeichert“ / „Speichert …“ / „Nicht gespeichert — erneut versuchen“, „Text kopieren“) on
 *         the record the view SHOWS — never a read-only text with an „Bearbeiten“ dialog
 *         (check-dashboard refuses a view without it).
 * ERRORS  a read that fails sets `error` (`unauthorized` when nobody is signed in: ask to sign in, never „connection lost“);
 *         a write the view makes by itself (autosave) shows „Nicht gespeichert — erneut versuchen“ on an error, never „Speichert …“ for good (the rows stay the last good state). With no rows AND an
 *         error the view says so on screen (keep the `data-live-error` block) — never the empty state.
 * JOIN    a QR or link to the public page is BUILT: <PublicPageQr entity="veranstaltungen" recordId={…} />
 *         (or usePublicPageLink) from '@/components/widgets/PublicPageQr' — never a record's link field.
 * PURPOSE Den zusammengeführten Text der aktiven Interaktion bildschirmfüllend zeigen, bearbeiten und mit einem Klick kopieren
 *
 * CONTRACT — what the overview (or a flow) and this view agree on. The overview
 * agent reads the same sentences; build EXACTLY this, never negotiate:
 *   - Zeigt den Gesamttext der Interaktion, die bei der Veranstaltung als aktive Interaktion gesetzt ist, in einem großen Textfeld.
 *   - Änderungen im Textfeld werden automatisch gespeichert; ein Knopf kopiert den ganzen Text in die Zwischenablage.
 *   - Ist noch keine Interaktion aktiv oder der Text leer, erscheint der Hinweis „Noch kein Text zusammengeführt“.
 *
 * This file is a PLACEHOLDER (KLAR_VIEW_PLACEHOLDER): replace its body with the real
 * view and drop that token. Rules: reads through useLiveRecords / useLiveRecord
 * (silent, stale on error, pauses hidden) — no own setInterval; `tx()` for every
 * visible string; big type, high contrast — this is read from across a room.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx } from '@/i18n';
import { LivingAppsService } from '@/services/livingAppsService';
import { ViewTextEditor } from '@/components/blocks/ViewTextEditor';

export default function GesamttextView() {
  // opened for ONE record (`#/ansicht/gesamttext?record=<id>`, the overview's „Vollbild“/„QR“ link) → that one;
  // else the control record set LAST (several may each carry a mark — the latest choice wins)
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const veranstaltungenControl = useLiveRecords('veranstaltungen', { intervalMs: 0, query: pinned
    ? { filter: `r.id == "${pinned}"`, limit: 1 }
    : { filter: "r.v_aktive_interaktion is not None", orderby: ['r.updatedat desc', 'r.id desc'], limit: 1 } });
  const interaktionen = useLiveRecords('interaktionen', { intervalMs: 0 });
  // the record whose gesamttext this view edits — the one the control record points at
  const interaktionenEditId = String((veranstaltungenControl.records[0]?.fields as Record<string, unknown> | undefined)?.['aktive_interaktion'] ?? '').split('/').pop() ?? '';
  const interaktionenEdit = interaktionen.records.find(r => r.record_id === interaktionenEditId) ?? null;
  return (
    <main className="min-h-dvh bg-background p-10 text-foreground">
      <h1 className="mb-6 font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>
        {interaktionenEdit ? String((interaktionenEdit.fields as Record<string, unknown>)['titel'] ?? tx('Gesamttext')) : tx('Gesamttext')}
      </h1>
      {interaktionenEdit && !String((interaktionenEdit.fields as Record<string, unknown>)['gesamttext'] ?? '').trim() && (
        <p className="mb-4 text-muted-foreground" style={{ fontSize: 'clamp(1.25rem, 2.2vh, 2.25rem)' }}>{tx('Noch kein Text zusammengeführt')}</p>
      )}
      {!veranstaltungenControl.loading && !veranstaltungenControl.error && !veranstaltungenControl.records.some(c => (c.fields as Record<string, unknown>)['aktive_interaktion']) && (
        <p className="mt-4" data-nothing-marked style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{tx('Nichts ausgewählt.')}</p>
      )}
      {interaktionenEdit && (
        <ViewTextEditor
          field="gesamttext"
          recordId={interaktionenEdit.record_id}
          value={String((interaktionenEdit.fields as Record<string, unknown>)['gesamttext'] ?? '')}
          save={async text => {
            await LivingAppsService.updateInteraktionenEntry(interaktionenEdit.record_id, { gesamttext: text });
interaktionen.apply(interaktionenEdit.record_id, { gesamttext: text });
          }}
        />
      )}
      {interaktionen.error && interaktionen.records.length === 0 && (
        <p role="alert" data-live-error className="mt-4 text-destructive" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>
          {interaktionen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
