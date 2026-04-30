import { useRef, useState } from 'react';
import { Camera, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { uploadProfilePic } from '@/api/images';
import AppLayout from '@/layouts/AppLayout';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { profilePic } = await uploadProfilePic(file);
      updateUser({ profilePic });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('common.saveError'),
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="p-6 max-w-sm">
        <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">
          {t('profile.subtitle')}
        </p>
        <h1 className="text-2xl font-extrabold text-slate-50 mb-8">{t('profile.title')}</h1>

        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-violet-600/20 border-2 border-violet-500/30 flex items-center justify-center">
              {user.profilePic ? (
                <img
                  src={user.profilePic}
                  alt={t('profile.profilePic')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={36} className="text-violet-300" />
              )}
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors disabled:opacity-50 shadow-lg"
            >
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
          {uploading && (
            <p className="text-xs text-slate-400">{t('profile.processing')}</p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="space-y-3">
          <InfoRow label={t('profile.firstName')} value={user.firstName} />
          <InfoRow label={t('profile.lastName')} value={user.lastName} />
          <InfoRow label={t('profile.email')} value={user.email} />
          <InfoRow label={t('profile.role')} value={t(`roles.${user.role}`)} />
        </div>
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}
