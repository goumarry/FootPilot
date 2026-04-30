import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { getCategories, createCategorie, updateCategorie, deleteCategorie } from '@/api/categories';
import type { Categorie } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

export default function CategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Categorie | null>(null);
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setNom('');
    setError('');
    setShowModal(true);
  }

  function openEdit(cat: Categorie) {
    setEditing(cat);
    setNom(cat.nom);
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!nom.trim()) { setError(t('categories.nameRequired')); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await updateCategorie(editing.id, nom.trim());
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await createCategorie(nom.trim());
        setCategories((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('common.saveError')
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Categorie) {
    if (!confirm(t('categories.deleteConfirm').replace('{name}', cat.nom))) return;
    try {
      await deleteCategorie(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('categories.deleteError')
      );
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('categories.subtitle')}</p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('categories.title')}</h1>
          </div>
          <Button onClick={openCreate}>
            <Plus size={15} />
            <span>{t('common.add')}</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={22} />}
            title={t('categories.noCategories')}
            description={t('categories.noCategoriesDesc')}
            action={
              <Button onClick={openCreate} variant="secondary">
                <Plus size={15} /> {t('categories.createCategory')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={16} className="text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">{cat.nom}</p>
                  {cat._count && (
                    <p className="text-xs text-slate-500">
                      {cat._count.equipes === 1
                        ? t('categories.teamCount').replace('{n}', String(cat._count.equipes))
                        : t('categories.teamCountPlural').replace('{n}', String(cat._count.equipes))}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(cat)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t('categories.editTitle') : t('categories.createTitle')}
        size="sm"
      >
        <Input
          label={t('categories.nameLabel')}
          placeholder={t('categories.namePlaceholder')}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        {error && (
          <div className="flex items-center gap-2 mb-3 text-xs text-red-400">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button full onClick={handleSave} loading={saving}>
            {editing ? t('common.edit') : t('common.create')}
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
