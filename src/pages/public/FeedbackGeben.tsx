import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import { tx } from '@/i18n';
import {
  loadPublicPagesConfig,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm,
  useJourneySubmit,
  useLiveList,
  useVisitorKey,
  rememberOwnRecord,
  fieldText,
  fieldRef,
  type PlanStep,
} from '@/lib/journey';

const SLUG = 'feedback-geben';
const KUERZEL_LENGTH = 5;

interface StoredParticipant {
  id: string;
  kuerzel: string;
}

function newSubmitKey(): string {
  const a = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${a}`;
}

function readParticipant(storageKey: string): StoredParticipant | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredParticipant;
    return v && v.id && v.kuerzel ? v : null;
  } catch {
    return null;
  }
}

export default function FeedbackGeben() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return <FeedbackInner cfg={cfg} page={page} />;
}

function FeedbackInner({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [params] = useSearchParams();
  const vid = params.get('veranstaltung') ?? '';
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);

  const events = useLiveList(port, 'veranstaltungen', { intervalMs: 15000, enabled: !!vid });
  const questions = useLiveList(port, 'interaktionen', { intervalMs: 15000, enabled: !!vid });

  const visitorKey = useVisitorKey({ length: KUERZEL_LENGTH });
  const storageKey = `feedback-geben-tn-${vid}`;
  const [participant, setParticipant] = useState<StoredParticipant | null>(() => readParticipant(storageKey));
  const [sentCount, setSentCount] = useState(0);
  const [mailDone, setMailDone] = useState(false);
  const [mailDismissed, setMailDismissed] = useState(false);
  const submitKey = useRef(newSubmitKey());

  const fbForm = useStepForm('feedbacks', {
    fields: ['feedbacktext'],
    required: { feedbacktext: true },
    autoComplete: true,
  });
  const mailForm = useStepForm('teilnehmende', {
    fields: ['email', 'einwilligung'],
    required: { email: true, einwilligung: false },
    autoComplete: true,
  });

  const event = events.records.find(r => r.id === vid) ?? null;
  const activeId = event ? fieldRef(event, 'aktive_interaktion') : null;
  const active = activeId ? questions.records.find(r => r.id === activeId) ?? null : null;
  const kuerzel = participant?.kuerzel ?? visitorKey;

  const fbPlan: PlanStep[] = [];
  if (!participant) {
    fbPlan.push({ key: 'tn', entity: 'teilnehmende', values: { veranstaltung: vid, kuerzel: kuerzel } });
  }
  fbPlan.push({
    key: 'fb',
    entity: 'feedbacks',
    form: fbForm,
    primary: true,
    ...(participant ? {} : { needs: ['tn'], link: { teilnehmer: 'tn' } }),
    values: {
      interaktion: activeId ?? '',
      absende_schluessel: submitKey.current,
      ...(participant ? { teilnehmer: participant.id } : {}),
    },
  });
  const fbSubmit = useJourneySubmit(port, fbPlan, {
    draftKey: `feedback-${vid}`,
    onSuccess: result => {
      const tn = result.records.tn;
      if (tn) {
        rememberOwnRecord('teilnehmende', tn.id);
        const stored = { id: tn.id, kuerzel };
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(stored));
        } catch {
          /* storage unavailable — the code still shows for this session */
        }
        setParticipant(stored);
      }
      setSentCount(n => n + 1);
    },
  });

  const mailSubmit = useJourneySubmit(
    port,
    [
      {
        key: 'mail',
        entity: 'teilnehmende',
        form: mailForm,
        primary: true,
        values: { veranstaltung: vid, kuerzel: kuerzel },
      },
    ],
    {
      draftKey: `feedback-mail-${vid}`,
      onSuccess: result => {
        const tn = result.records.mail;
        if (tn && !participant) {
          rememberOwnRecord('teilnehmende', tn.id);
          const stored = { id: tn.id, kuerzel };
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(stored));
          } catch {
            /* storage unavailable — the code still shows for this session */
          }
          setParticipant(stored);
        }
        setMailDone(true);
      },
    },
  );

  if (!vid) {
    return (
      <PublicShell title={page.title} description={page.description}>
        <p className="text-sm text-muted-foreground">
          {tx('Scanne bitte den QR-Code der Veranstaltung, um Feedback zu geben.')}
        </p>
      </PublicShell>
    );
  }
  if (!events.loaded && events.error) {
    return (
      <PublicShell title={page.title}>
        <LoadProblem onRetry={events.reload} />
      </PublicShell>
    );
  }
  if (!events.loaded) {
    return <PublicShell loading />;
  }
  if (!event) {
    return (
      <PublicShell title={page.title}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
        </p>
      </PublicShell>
    );
  }

  const sendFeedback = async () => {
    if (fbSubmit.submitting || !active) return;
    if (!fbForm.validate()) return;
    await fbSubmit.run();
  };

  const another = () => {
    fbSubmit.reset();
    fbForm.reset();
    submitKey.current = newSubmitKey();
  };

  const sendMail = async () => {
    if (mailSubmit.submitting) return;
    if (!mailForm.validate()) return;
    if (!mailForm.get('einwilligung')) return;
    await mailSubmit.run();
  };

  const consentMissing = !!mailForm.get('email') && !mailForm.get('einwilligung');
  const showMailOffer = !mailDone && !mailDismissed;

  return (
    <PublicShell title={fieldText(event, 'titel')} description={page.description}>
      <div className="space-y-6">
        {fbSubmit.result ? (
          <div className="space-y-4 rounded-xl border bg-muted/30 p-4 text-center">
            <p className="font-medium">{tx('Danke für dein Feedback!')}</p>
            <p className="text-sm text-muted-foreground">{tx('Dein Kürzel für heute Abend:')}</p>
            <p className="font-mono text-3xl font-semibold tracking-widest">{kuerzel}</p>
            <Button type="button" onClick={another} className="w-full sm:w-auto">
              {tx('Noch ein Feedback geben')}
            </Button>
          </div>
        ) : !active ? (
          <p className="text-sm text-muted-foreground">
            {tx('Gerade ist keine Frage geöffnet. Diese Seite aktualisiert sich von selbst.')}
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              void sendFeedback();
            }}
          >
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium">{fieldText(active, 'titel')}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{fieldText(active, 'frage')}</p>
            </div>
            <Bound form={fbForm} name="feedbacktext" rows={5} />
            <FieldErrorSummary forms={[fbForm]} />
            {fbSubmit.offline && (
              <p className="text-sm text-muted-foreground">
                {tx('Keine Verbindung — deine Eingaben sind gesichert.')}
              </p>
            )}
            {fbSubmit.error && !fbSubmit.offline && (
              <p className="text-sm text-destructive">
                {tx('Das Senden hat nicht geklappt. Bitte versuche es noch einmal.')}
              </p>
            )}
            <Button type="submit" disabled={fbSubmit.submitting} className="w-full sm:w-auto">
              {fbSubmit.submitting ? tx('Wird gesendet …') : tx('Feedback senden')}
            </Button>
          </form>
        )}

        {sentCount > 0 && !fbSubmit.result && (
          <p className="text-sm text-muted-foreground">
            {tx('Dein Kürzel:')} <span className="font-mono font-semibold tracking-widest">{kuerzel}</span>
          </p>
        )}

        {mailDone && (
          <p className="rounded-xl border bg-muted/30 p-4 text-sm">
            {tx('Danke! Deine E-Mail-Adresse ist zu deinem Kürzel gespeichert.')}
          </p>
        )}

        {showMailOffer && (
          <div className="space-y-4 rounded-xl border p-4">
            <p className="text-sm font-medium">
              {tx('Möchtest du mehr hören? Hinterlege freiwillig deine E-Mail-Adresse zu deinem Kürzel.')}
            </p>
            <Bound form={mailForm} name="email" />
            <Bound form={mailForm} name="einwilligung" />
            {consentMissing && (
              <p className="text-sm text-destructive">
                {tx('Bitte stimme der Speicherung zu, sonst können wir die Adresse nicht speichern.')}
              </p>
            )}
            {mailSubmit.error && (
              <p className="text-sm text-destructive">
                {tx('Das Speichern hat nicht geklappt. Bitte versuche es noch einmal.')}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void sendMail()} disabled={mailSubmit.submitting}>
                {tx('E-Mail speichern')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMailDismissed(true)}>
                {tx('Nein, danke')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
