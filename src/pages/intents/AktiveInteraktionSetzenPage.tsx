/**
 * Aktive Interaktion setzen — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Interaktion wählen, die jetzt aktiv sein soll → 3) Bestätigen.
 * Reads: veranstaltungen, interaktionen. Writes: veranstaltungen.aktive_interaktion (update, via useAktiveInteraktionSetzenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldNumber, formatFieldValue } from '@/lib/journey';
import { useAktiveInteraktionSetzenFlow } from '@/lib/journey/flows/AktiveInteraktionSetzen';
import { tx } from '@/i18n';

export default function AktiveInteraktionSetzenPage() {
  const [step, setStep] = useState(1);
  const flow = useAktiveInteraktionSetzenFlow({
    steps: { veranstaltungen: 1, aktive_interaktion: 2 },
    items: {
      veranstaltungen: (v, ctx) => {
        const datum = fieldDate(v, 'datum');
        const aktiv = ctx.ref('aktive_interaktion');
        const parts = [
          datum ? formatFieldValue('veranstaltungen', 'datum', datum) : '',
          aktiv ? tx`Aktiv: ${aktiv}` : tx('Keine Interaktion aktiv'),
        ].filter(Boolean);
        return { id: v.id, title: fieldText(v, 'titel'), subtitle: parts.join(' · ') };
      },
      aktive_interaktion: i => {
        const nr = fieldNumber(i, 'reihenfolge');
        return {
          id: i.id,
          title: fieldText(i, 'titel'),
          subtitle: fieldText(i, 'frage'),
          stats: nr !== null ? [{ label: tx('Reihenfolge'), value: nr }] : undefined,
        };
      },
    },
  });

  const hasEvent = Boolean(flow.targets.veranstaltungen.record);

  return (
    <IntentWizardShell
      title={tx('Aktive Interaktion setzen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Lege fest, zu welcher Interaktion die Teilnehmenden gerade Feedback geben.'),
        needs: [tx('Die Veranstaltung'), tx('Die Interaktion, die jetzt dran ist')],
      }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung soll die Interaktion gelten?')}>
        <EntitySelectStep
          {...flow.picks.veranstaltungen.select}
          {...flow.pick('veranstaltungen')}
          searchPlaceholder={tx('Titel der Veranstaltung …')}
        />
      </WizardStep>
      <WizardStep label={tx('Interaktion')} description={tx('Mit einem Klick wird diese Interaktion für die Teilnehmenden aktiv.')}>
        {hasEvent ? (
          <EntitySelectStep
            {...flow.picks.aktive_interaktion.select}
            {...flow.pick('aktive_interaktion')}
            searchPlaceholder={tx('Titel der Interaktion …')}
          />
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Bestätigen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Teilnehmenden geben ab sofort Feedback zur gewählten Interaktion.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          whatHappensNext={tx('Neues Feedback wird jetzt dieser Interaktion zugeordnet.')}
          next={[
            { label: tx('Feedbacks zusammenführen'), href: '#/intents/feedbacks-zusammenfuehren' },
            { label: tx('KI-Antwort einfügen'), href: '#/intents/ki-antwort-einfuegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
