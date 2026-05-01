import { useI18n } from '@/contexts/I18nContext';
import EventListPage from './EventListPage';

export default function EntrainementsPage() {
  const { t } = useI18n();
  return <EventListPage typeFilter="ENTRAINEMENT" pageTitle={t('planning.entrainementsTitle')} pageSubtitle={t('planning.subtitle')} />;
}
