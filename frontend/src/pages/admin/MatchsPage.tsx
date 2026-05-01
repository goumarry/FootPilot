import { useI18n } from '@/contexts/I18nContext';
import EventListPage from './EventListPage';

export default function MatchsPage() {
  const { t } = useI18n();
  return <EventListPage typeFilter="MATCH" pageTitle={t('planning.matchsTitle')} pageSubtitle={t('planning.subtitle')} />;
}
