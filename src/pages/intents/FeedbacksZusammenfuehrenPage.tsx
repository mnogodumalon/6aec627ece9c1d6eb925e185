/**
 * Feedbacks zusammenführen — 2-Schritt-Wizard.
 * Steps: 1) Interaktion wählen → 2) Prüfen & zusammenführen (Vorprompt, Feedbacks mit Kürzel, Endprompt → gesamttext).
 * Reads: interaktionen, feedbacks, teilnehmende (via flow.port). Writes: interaktionen.gesamttext (update).
 * Composes: IntentWizardShell, EntitySelectStep, SummaryStep, SuccessStep.
 */
import { useEffect, useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StepNav } from '@/components/blocks/StepNav';
import { fieldText, fieldRef, refFilter } from '@/lib/journey';
import { useFeedbacksZusammenfuehrenFlow } from '@/lib/journey/flows/FeedbacksZusammenfuehren';
import { tx } from '@/i18n';

interface FeedbackLine {
  id: string;
  kuerzel: string;
  text: string;
}

function joinText(vor: string, lines: FeedbackLine[], end: string): string {
  const body = lines.map(l => (l.kuerzel ? `${l.kuerzel}: ${l.text}` : l.text).replace(/\s*\n\s*/g, ' ').trim());
  return [vor.trim(), ...body, end.trim()].filter(Boolean).join('\n');
}

export default function FeedbacksZusammenfuehrenPage() {
  const [step, setStep] = useState(1);
  const [lines, setLines] = useState<FeedbackLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const flow = useFeedbacksZusammenfuehrenFlow({
    steps: { interaktionen: 1 },
    items: {
      interaktionen: r => ({ id: r.id, title: fieldText(r, 'titel'), subtitle: fieldText(r, 'frage') }),
    },
    compute: {
      gesamttext: f => joinText(
        String(f.interaktionen.get('vorprompt') ?? ''),
        lines,
        String(f.interaktionen.get('endprompt') ?? ''),
      ),
    },
  });

  const pickedId = flow.pick('interaktionen').selectedId ?? null;
  const port = flow.port;

  useEffect(() => {
    if (!pickedId) { setLines([]); return; }
    let cancelled = false;
    setLoadingLines(true);
    setLoadError(false);
    (async () => {
      try {
        const recs = await port.list('feedbacks', { filter: refFilter('interaktion', pickedId), orderby: ['r.v_gesendet_am asc'] });
        const ids = Array.from(new Set(recs.map(r => fieldRef(r, 'teilnehmer')).filter((x): x is string => !!x)));
        const names = new Map<string, string>();
        await Promise.all(ids.map(async id => {
          const t = await port.get('teilnehmende', id);
          if (t) names.set(id, fieldText(t, 'kuerzel'));
        }));
        if (cancelled) return;
        setLines(recs.map(r => {
          const tid = fieldRef(r, 'teilnehmer');
          return { id: r.id, kuerzel: tid ? names.get(tid) ?? '' : '', text: fieldText(r, 'feedbacktext') };
        }));
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoadingLines(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pickedId, port]);

  const rec = flow.targets.interaktionen?.record;
  const vorprompt = rec ? fieldText(rec, 'vorprompt') : '';
  const endprompt = rec ? fieldText(rec, 'endprompt') : '';
  const preview = joinText(vorprompt, lines, endprompt);

  return (
    <IntentWizardShell
      title={tx('Feedbacks zusammenführen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Alle Feedbacks einer Interaktion werden zu einem Text für die KI.'),
        needs: [tx('Die Interaktion, deren Feedbacks du zusammenführen willst')],
      }}
    >
      <WizardStep label={tx('Interaktion')} description={tx('Wähle die Interaktion, deren Feedbacks zusammengeführt werden sollen.')}>
        <EntitySelectStep
          {...flow.picks.interaktionen.select}
          {...flow.pick('interaktionen')}
          searchPlaceholder={tx('Titel der Interaktion …')}
        />
      </WizardStep>
      <WizardStep label={tx('Prüfen')} description={tx('Vorprompt, Feedbacks mit Kürzel und Endprompt ergeben einen Text.')} needs={['interaktionen']}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            confirmLabel={tx('Zusammenführen')}
            items={[{ key: 'anzahl', label: tx('Feedbacks'), value: loadingLines ? '…' : String(lines.length) }]}
            whatHappensNext={tx('Der Gesamttext wird in der Interaktion gespeichert. Ein vorhandener Gesamttext wird ersetzt.')}
          >
            <div className="space-y-2">
              {loadError && <p className="text-sm text-destructive">{tx('Die Feedbacks konnten nicht geladen werden.')}</p>}
              {!loadError && !loadingLines && lines.length === 0 && (
                <p className="text-sm text-muted-foreground">{tx('Zu dieser Interaktion gibt es noch keine Feedbacks.')}</p>
              )}
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-secondary p-4 text-sm text-foreground">{preview}</pre>
            </div>
          </SummaryStep>
        )}
        {flow.submit.done && <StepNav hideBack onBack={() => setStep(1)} />}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          title={tx('Feedbacks zusammengeführt')}
          facts={[{ label: tx('Zusammengeführter Text'), value: fieldText(flow.submit.result.primary, 'gesamttext') }]}
          whatHappensNext={tx('Den Text kannst du jetzt an die KI geben und ihre Antwort anschließend einfügen.')}
          next={[
            { label: tx('KI-Antwort einfügen'), href: '#/intents/ki-antwort-einfuegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
