/**
 * src/pages/views/QrCodeView.tsx — the view „QR-Code“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/qr-code — generated in App.tsx, OUTSIDE the dashboard chrome
 *         (no header, drawer or assistant: a beamer / kiosk / print surface). Never wire a route for it yourself.
 * LIVE    static — loads once.
 * READS   veranstaltungen (titel, teilnahme_link) — plan: teilnahme_link not_empty None * FILTER  veranstaltungen: r.v_teilnahme_link is not None  ← already vSQL, already in the call below: keep `query.filter`
 *         EXACTLY. The plan's words above are NOT vSQL — never send them (a 400 leaves the view empty).
 * ERRORS  a read that fails sets `error` (`unauthorized` when nobody is signed in: ask to sign in, never „connection lost“);
 *         with no rows AND an error the view says so on screen (keep the `data-live-error` block).
 * JOIN    a QR or link to the public page is BUILT: <PublicPageQr entity="veranstaltungen" recordId={…} />
 * PURPOSE Den QR-Code der Veranstaltung bildschirmfüllend zeigen, damit Teilnehmende ihn scannen
 *
 * CONTRACT
 *   - Zeigt den QR-Code zum Link der Veranstaltung, die der Moderator auf der Übersicht zum Zeigen gewählt hat, so groß wie möglich.
 *   - Hat die Veranstaltung keinen Link, erscheint der Hinweis „Kein Link hinterlegt“.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx } from '@/i18n';
import { PublicPageQr } from '@/components/widgets/PublicPageQr';

export default function QrCodeView() {
  // opened for ONE record (`#/ansicht/qr-code?record=<id>`) → that one; else the first event
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const veranstaltungen = useLiveRecords('veranstaltungen', { intervalMs: 0, query: pinned
    ? { filter: `r.id == "${pinned}"`, limit: 1 }
    : { filter: "r.v_teilnahme_link is not None" } });
  const v = veranstaltungen.records[0];
  const fields = (v?.fields ?? {}) as Record<string, unknown>;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-10 text-center text-foreground">
      {v && (
        <>
          <h1 className="font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{String(fields['titel'] ?? '')}</h1>
          <PublicPageQr entity="veranstaltungen" recordId={v.record_id} size="60vh" linkClassName="text-muted-foreground text-[clamp(1rem,2vh,2rem)]" />
        </>
      )}
      {!v && !veranstaltungen.loading && !veranstaltungen.error && (
        <p style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{tx('Kein Link hinterlegt')}</p>
      )}
      {veranstaltungen.error && veranstaltungen.records.length === 0 && (
        <p role="alert" data-live-error className="text-destructive" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>
          {veranstaltungen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
