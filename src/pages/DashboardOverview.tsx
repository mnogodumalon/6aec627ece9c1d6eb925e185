import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconQrcode, IconArrowMerge, IconFileText, IconPlayerPlay, IconCircleCheck, IconPlus } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor, countOf } from '@/config/plan';
import { extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { Button } from '@/components/ui/button';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { interaktionen, veranstaltungen, teilnehmende, feedbacks } = data;
  const clock = useClock();
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'interaktionen') return undefined;
      const go = flowActionFor('interaktionen', 'gesamttext', top.record.record_id);
      return go ? { label: tx('Feedbacks zusammenführen'), onClick: go } : undefined;
    },
  });
  const enrichedFeedbacks = crud.enriched.feedbacks;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sortedEvents = useMemo(
    () => [...veranstaltungen].sort((a, b) => (b.fields.datum ?? '').localeCompare(a.fields.datum ?? '')),
    [veranstaltungen],
  );
  const event = sortedEvents.find(v => v.record_id === selectedId) ?? sortedEvents[0] ?? null;
  const sortedInteraktionen = useMemo(
    () => [...interaktionen].sort((a, b) => (a.fields.reihenfolge ?? 9999) - (b.fields.reihenfolge ?? 9999)),
    [interaktionen],
  );
  const activeId = event ? extractRecordId(event.fields.aktive_interaktion) : null;
  const active = sortedInteraktionen.find(i => i.record_id === activeId) ?? null;

  const activeFeedbacks = useMemo(
    () => enrichedFeedbacks
      .filter(f => activeId && extractRecordId(f.fields.interaktion) === activeId)
      .sort((a, b) => (b.fields.gesendet_am ?? '').localeCompare(a.fields.gesendet_am ?? '')),
    [enrichedFeedbacks, activeId],
  );
  const eventTeilnehmende = teilnehmende.filter(t => event && extractRecordId(t.fields.veranstaltung) === event.record_id);
  const awaitingAnswer = sortedInteraktionen.filter(i => (i.fields.gesamttext ?? '').trim() && !(i.fields.ki_antwort ?? '').trim());
  const merged = !!(active?.fields.gesamttext ?? '').trim();

  const openView = (path: string, id: string) => window.open(tx`#/ansicht/${path}?record=${id}`, '_blank');
  const feedbackCount = (id: string) => feedbacks.filter(f => extractRecordId(f.fields.interaktion) === id).length;

  const contextLine = !event
    ? tx('Lege deine erste Veranstaltung an, um loszulegen.')
    : !active
      ? tx`Bei „${event.fields.titel ?? ''}“ ist noch keine Interaktion aktiv — wähle unten eine aus.`
      : activeFeedbacks.length > 0
        ? tx`„${active.fields.titel ?? ''}“ läuft — zuletzt hat ${namen(activeFeedbacks.map(f => f.teilnehmerName), 2)} Feedback gegeben.`
        : tx`„${active.fields.titel ?? ''}“ läuft — noch wartet ihr auf das erste Feedback.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{contextLine}</p>
          <p className="text-xs text-muted-foreground">{format(clock, 'EEEE, d. MMMM', { locale: dateFnsLocale() })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crud.veranstaltungen.canWrite && (
            <Button variant="outline" onClick={() => crud.veranstaltungen.openCreate({})}>
              <IconPlus size={16} className="shrink-0" />{tx('Veranstaltung')}
            </Button>
          )}
          {crud.interaktionen.canWrite && (
            <Button onClick={() => crud.interaktionen.openCreate({})}>
              <IconPlus size={16} className="shrink-0" />{appLabel('interaktionen')}
            </Button>
          )}
        </div>
      </div>

      <DashboardGrid
        variant="split"
        kpis={event && (
          <StatStrip>
            <StatStripItem title={tx('Feedbacks (aktiv)')} value={active ? activeFeedbacks.length : '–'} tone={activeFeedbacks.length > 0 ? 'primary' : 'default'} />
            <StatStripItem title={tx('Teilnehmende mit Kürzel')} value={eventTeilnehmende.length} />
            <StatStripItem title={tx('Text zusammengeführt')} value={merged ? tx('Ja') : tx('Nein')} tone={merged ? 'success' : 'default'} />
          </StatStrip>
        )}
        primary={
          <div className="space-y-4 overflow-hidden rounded-xl border bg-card p-4">
            {sortedEvents.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {sortedEvents.map(v => (
                  <Button key={v.record_id} size="sm" variant={v.record_id === event?.record_id ? 'default' : 'outline'} onClick={() => setSelectedId(v.record_id)} className="max-w-full">
                    <span className="truncate">{v.fields.titel}</span>
                  </Button>
                ))}
              </div>
            )}
            {event ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => crud.veranstaltungen.openDetail(event)}>
                    <h2 className="truncate text-lg font-semibold">{event.fields.titel}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {[event.fields.datum ? formatDate(event.fields.datum) : null, event.fields.ort].filter(Boolean).join(' · ')}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openView('qr-code', event.record_id)}>
                      <IconQrcode size={16} className="shrink-0" />{tx('QR-Code groß')}
                    </Button>
                    <Button variant="outline" size="sm" disabled={!active} onClick={() => openView('gesamttext', event.record_id)}>
                      <IconFileText size={16} className="shrink-0" />{tx('Gesamttext öffnen')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {sortedInteraktionen.length === 0 && (
                    <p className="text-sm text-muted-foreground">{tx('Noch keine Interaktion vorbereitet.')}</p>
                  )}
                  {sortedInteraktionen.map(i => {
                    const isActive = i.record_id === activeId;
                    const setActive = flowActionFor('veranstaltungen', 'aktive_interaktion', event.record_id, i.record_id);
                    const merge = flowActionFor('interaktionen', 'gesamttext', i.record_id);
                    const n = feedbackCount(i.record_id);
                    return (
                      <div key={i.record_id} className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 ${isActive ? 'border-primary bg-primary/5' : ''}`}>
                        <button type="button" className="min-w-0 flex-1 basis-48 text-left" onClick={() => crud.interaktionen.openDetail(i)}>
                          <p className="truncate font-medium">{i.fields.titel}</p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">{i.fields.frage}</p>
                          <p className="text-xs text-muted-foreground">{countOf('feedbacks', n, appLabel('feedbacks'))}</p>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {isActive ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                                <IconCircleCheck size={16} className="shrink-0" />{tx('Aktiv')}
                              </span>
                              {merge && (
                                <Button size="sm" onClick={merge}>
                                  <IconArrowMerge size={16} className="shrink-0" />{tx('Feedbacks zusammenführen')}
                                </Button>
                              )}
                            </>
                          ) : setActive && (
                            <Button size="sm" variant="outline" onClick={setActive}>
                              <IconPlayerPlay size={16} className="shrink-0" />{tx('Aktiv setzen')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="mb-3 text-muted-foreground">{tx('Noch keine Veranstaltung angelegt.')}</p>
                {crud.veranstaltungen.canWrite && (
                  <Button onClick={() => crud.veranstaltungen.openCreate({})}>{tx('Erste Veranstaltung anlegen')}</Button>
                )}
              </div>
            )}
          </div>
        }
        aside={
          <>
            <WorkList
              title={tx('Eingegangene Feedbacks')}
              items={activeFeedbacks.map(f => ({
                id: f.record_id,
                title: f.teilnehmerName || tx('Unbekannt'),
                secondLine: <span className="line-clamp-2 text-muted-foreground">{f.fields.feedbacktext}</span>,
              }))}
              onItemClick={id => { const f = feedbacks.find(x => x.record_id === id); if (f) crud.feedbacks.openDetail(f); }}
              empty={{ text: active ? tx('Noch kein Feedback — zeig den QR-Code.') : tx('Setze zuerst eine Interaktion aktiv.') }}
            />
            <WorkList
              title={tx('Wartet auf KI-Antwort')}
              items={awaitingAnswer.map(i => {
                const go = flowActionFor('interaktionen', 'ki_antwort', i.record_id);
                return {
                  id: i.record_id,
                  title: i.fields.titel ?? '',
                  secondLine: <span className="text-muted-foreground">{tx('Text zusammengeführt, Antwort fehlt')}</span>,
                  action: { label: tx('Antwort einfügen'), onClick: go ?? (() => crud.interaktionen.openEdit(i)) },
                };
              })}
              onItemClick={id => { const i = interaktionen.find(x => x.record_id === id); if (i) crud.interaktionen.openDetail(i); }}
              empty={{ text: tx('Keine offenen KI-Antworten.') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
