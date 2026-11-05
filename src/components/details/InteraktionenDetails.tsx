import type { Interaktionen, Veranstaltungen, Feedbacks } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface InteraktionenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Interaktionen;
  /** 1:N „Veranstaltungen" (aktive_interaktion): VOLLE Liste — der Block filtert auf diesen Record. */
  veranstaltungenList: Veranstaltungen[];
  /** Zeilen-Klick → overlay.push auf das Veranstaltungen-Detail (nie der Edit-Dialog). */
  onOpenVeranstaltungen: (record: Veranstaltungen) => void;
  /** Kontextuelles „+": öffnet den Veranstaltungen-Dialog mit diesem Record vorgesetzt. */
  onAddVeranstaltungen?: () => void;
  /** 1:N „Feedbacks" (interaktion): VOLLE Liste — der Block filtert auf diesen Record. */
  feedbacksList: Feedbacks[];
  /** Zeilen-Klick → overlay.push auf das Feedbacks-Detail (nie der Edit-Dialog). */
  onOpenFeedbacks: (record: Feedbacks) => void;
  /** Kontextuelles „+": öffnet den Feedbacks-Dialog mit diesem Record vorgesetzt. */
  onAddFeedbacks?: () => void;
}

export function InteraktionenDetails({
  record,
  veranstaltungenList,
  onOpenVeranstaltungen,
  onAddVeranstaltungen,
  feedbacksList,
  onOpenFeedbacks,
  onAddFeedbacks,
}: InteraktionenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('interaktionen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('interaktionen', 'reihenfolge')} value={record.fields.reihenfolge} format="text" />
        <RecordField label={fieldLabel('interaktionen', 'frage')} value={record.fields.frage} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'vorprompt')} value={record.fields.vorprompt} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'endprompt')} value={record.fields.endprompt} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'gesamttext')} value={record.fields.gesamttext} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'ki_antwort')} value={record.fields.ki_antwort} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('veranstaltungen')}
        items={veranstaltungenList.filter(r => extractRecordId(r.fields.aktive_interaktion) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('veranstaltungen'), meta: r.fields.datum })}
        onOpen={onOpenVeranstaltungen}
        onAdd={onAddVeranstaltungen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('feedbacks')}
        items={feedbacksList.filter(r => extractRecordId(r.fields.interaktion) === record.record_id)}
        map={r => ({ name: r.fields.absende_schluessel ?? appLabel('feedbacks'), meta: r.fields.gesendet_am })}
        onOpen={onOpenFeedbacks}
        onAdd={onAddFeedbacks}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.INTERAKTIONEN} recordId={record.record_id} readOnly={!perms.canWrite('interaktionen')} />
    </>
  );
}
