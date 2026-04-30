import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Camera, Shield } from 'lucide-react';
import { getClub, updateClub } from '@/api/clubs';
import { uploadClubLogo } from '@/api/images';
import type { Club } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ClubPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [form, setForm] = useState({ nom: '', ville: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.clubId) return;
    getClub(user.clubId).then((c) => {
      setClub(c);
      setForm({ nom: c.nom, ville: c.ville, description: c.description ?? '' });
      setLoading(false);
    });
  }, [user?.clubId]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !club) return;
    setUploadingLogo(true);
    setError('');
    try {
      const { logoUrl } = await uploadClubLogo(club.id, file);
      setClub((prev) => prev ? { ...prev, logoUrl } : prev);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('club.uploadError'),
      );
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!club) return;
    if (!form.nom.trim() || !form.ville.trim()) {
      setError(t('club.nameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateClub(club.id, {
        nom: form.nom.trim(),
        ville: form.ville.trim(),
        description: form.description.trim() || undefined,
      });
      setClub(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('club.saveError'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Settings size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-0.5">
              {t('club.subtitle')}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('club.title')}</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="space-y-1">
            {club?._count && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Stat label={t('club.members')} value={club._count.users} />
                <Stat label={t('club.teams')} value={club._count.equipes} />
                <Stat label={t('club.players')} value={club._count.joueurs} />
                <Stat label={t('club.categories')} value={club._count.categories} />
              </div>
            )}

            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 mb-2 tracking-wide uppercase">
                {t('club.logo')}
              </p>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    {club?.logoUrl ? (
                      <img src={club.logoUrl} alt={t('club.logo')} className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={24} className="text-violet-400" />
                    )}
                  </div>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors disabled:opacity-50"
                  >
                    <Camera size={11} className="text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-slate-300">
                    {uploadingLogo ? t('club.uploading') : (club?.logoUrl ? t('club.logoSet') : t('club.noLogo'))}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('club.logoHint')}</p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            <Input
              label={t('club.nameLabel')}
              placeholder="AS FootPilot FC"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            />
            <Input
              label={t('club.cityLabel')}
              placeholder="Paris"
              value={form.ville}
              onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
            />
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">
                {t('club.descriptionLabel')}
              </label>
              <textarea
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                rows={3}
                placeholder={t('club.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {error && <p className="text-xs text-red-400 pt-1">{error}</p>}

            <div className="pt-4">
              <Button full onClick={handleSave} loading={saving}>
                <Save size={15} />
                {saved ? t('club.saved') : t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3">
      <p className="text-2xl font-extrabold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
