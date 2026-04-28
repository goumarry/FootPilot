import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Copy, Check, Mail, UserCheck, UserX } from 'lucide-react';
import { getUsers, getInvitations, createInvitation, deleteInvitation, toggleUserActive } from '@/api/admin';
import type { User, Invitation, Role } from '@/types';
import { ROLE_LABELS } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { RoleBadge, StatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

type Tab = 'membres' | 'invitations';

export default function MembresPage() {
  const [tab, setTab] = useState<Tab>('membres');
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'JOUEUR' as Role });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, i] = await Promise.all([getUsers(), getInvitations()]);
      setUsers(u);
      setInvitations(i);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/register/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleInvite() {
    if (!form.email || !form.firstName || !form.lastName) {
      setFormError('Tous les champs sont requis.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const inv = await createInvitation({ ...form, expiresInDays: 7 });
      setInvitations((prev) => [inv, ...prev]);
      setShowModal(false);
      setForm({ email: '', firstName: '', lastName: '', role: 'JOUEUR' });
      setTab('invitations');
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la création.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteInvitation(id: string) {
    if (!confirm('Supprimer cette invitation ?')) return;
    await deleteInvitation(id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleToggleActive(userId: string, current: boolean) {
    const updated = await toggleUserActive(userId, !current);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: updated.isActive } : u)));
  }

  const now = new Date();

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Gestion</p>
            <h1 className="text-2xl font-extrabold text-slate-50">Membres & invitations</h1>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} />
            <span>Inviter</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-6 w-fit">
          {(['membres', 'invitations'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'membres' ? `Membres (${users.length})` : `Invitations (${invitations.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Chargement…</div>
        ) : tab === 'membres' ? (
          <div className="space-y-2">
            {users.length === 0 ? (
              <EmptyState icon={<Users size={22} />} title="Aucun membre" description="Invitez des membres via le bouton ci-dessus." />
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <RoleBadge role={u.role} />
                  <button
                    onClick={() => handleToggleActive(u.id, u.isActive ?? true)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title={u.isActive ? 'Désactiver' : 'Réactiver'}
                  >
                    {u.isActive ? <UserCheck size={16} /> : <UserX size={16} className="text-red-400" />}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.length === 0 ? (
              <EmptyState icon={<Mail size={22} />} title="Aucune invitation" description="Créez une invitation pour ajouter un membre." />
            ) : (
              invitations.map((inv) => {
                const expired = new Date(inv.expiresAt) < now;
                const used = !!inv.usedAt;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                      <Mail size={16} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">
                        {inv.firstName} {inv.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{inv.email}</p>
                    </div>
                    <RoleBadge role={inv.role} />
                    {used ? (
                      <StatusBadge label="Utilisée" variant="success" />
                    ) : expired ? (
                      <StatusBadge label="Expirée" variant="error" />
                    ) : (
                      <StatusBadge label="Active" variant="warning" />
                    )}
                    {!used && !expired && (
                      <button
                        onClick={() => copyLink(inv.token, inv.id)}
                        className="text-slate-500 hover:text-violet-400 transition-colors"
                        title="Copier le lien"
                      >
                        {copiedId === inv.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInvitation(inv.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal invitation */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Inviter un membre">
        <div className="space-y-0">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              placeholder="Jean"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
            <Input
              label="Nom"
              placeholder="Dupont"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="membre@email.fr"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Select
            label="Rôle"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
          >
            <option value="GESTIONNAIRE">{ROLE_LABELS.GESTIONNAIRE}</option>
            <option value="ENTRAINEUR">{ROLE_LABELS.ENTRAINEUR}</option>
            <option value="JOUEUR">{ROLE_LABELS.JOUEUR}</option>
          </Select>

          {formError && (
            <p className="text-xs text-red-400 mb-3">{formError}</p>
          )}

          <p className="text-xs text-slate-500 mb-4">
            Un email d'invitation sera envoyé avec un lien valable 7 jours.
            Vous pourrez aussi copier le lien manuellement.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" full onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button full onClick={handleInvite} loading={saving}>
              Envoyer l'invitation
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
