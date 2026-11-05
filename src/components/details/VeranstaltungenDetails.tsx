import type { Veranstaltungen, Interaktionen, Teilnehmende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface VeranstaltungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Veranstaltungen;
  /** N:1-Ziel „Interaktionen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  interaktionenList: Interaktionen[];
  /** Klick auf die Interaktionen-Relation → overlay.push auf dessen Detail. */
  onOpenInteraktionen?: (record: Interaktionen) => void;
  /** 1:N „Teilnehmende" (veranstaltung): VOLLE Liste — der Block filtert auf diesen Record. */
  teilnehmendeList: Teilnehmende[];
  /** Zeilen-Klick → overlay.push auf das Teilnehmende-Detail (nie der Edit-Dialog). */
  onOpenTeilnehmende: (record: Teilnehmende) => void;
  /** Kontextuelles „+": öffnet den Teilnehmende-Dialog mit diesem Record vorgesetzt. */
  onAddTeilnehmende?: () => void;
}

export function VeranstaltungenDetails({
  record,
  interaktionenList,
  onOpenInteraktionen,
  teilnehmendeList,
  onOpenTeilnehmende,
  onAddTeilnehmende,
}: VeranstaltungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const aktive_interaktionTarget = interaktionenList.find(r => r.record_id === extractRecordId(record.fields.aktive_interaktion));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('veranstaltungen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('veranstaltungen', 'datum')} value={record.fields.datum} format="datetime" />
        <RecordField label={fieldLabel('veranstaltungen', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('veranstaltungen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('veranstaltungen', 'teilnahme_link')} value={record.fields.teilnahme_link} format="url" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('veranstaltungen', 'aktive_interaktion')}
          name={aktive_interaktionTarget?.fields.titel ?? '—'}
          meta={undefined}
          onClick={aktive_interaktionTarget && onOpenInteraktionen ? () => onOpenInteraktionen!(aktive_interaktionTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('teilnehmende')}
        items={teilnehmendeList.filter(r => extractRecordId(r.fields.veranstaltung) === record.record_id)}
        map={r => ({ name: r.fields.kuerzel ?? appLabel('teilnehmende'), meta: r.fields.einwilligung_zeitpunkt })}
        onOpen={onOpenTeilnehmende}
        onAdd={onAddTeilnehmende}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.VERANSTALTUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('veranstaltungen')} />
    </>
  );
}
