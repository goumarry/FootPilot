import type { Evenement, Equipe, StatutEvenement } from '@/types';

export function getStatut(ev: Evenement): StatutEvenement {
  if (ev.annule) return 'ANNULE';
  const start = new Date(ev.dateHeure).getTime();
  const end = start + (ev.duree ?? 120) * 60000;
  const now = Date.now();
  if (now < start) return 'AVENIR';
  if (now < end) return 'EN_COURS';
  return 'TERMINE';
}

export function formatDate(d: string, locale: string): string {
  return new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function formatDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return (
    [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') +
    'T' +
    [String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0')].join(':')
  );
}

export function nowDatetimeLocal(): string {
  return toDatetimeLocal(new Date().toISOString());
}

export function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function osmEmbed(lat: number, lng: number): string {
  const delta = 0.008;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;
}

export function teamLabel(eq: Equipe): string {
  return eq.categorie?.nom ? `${eq.nomEquipe} · ${eq.categorie.nom}` : eq.nomEquipe;
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + n);
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const DUREE_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 210, 240];

export const DAY_LABELS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DAY_LETTERS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
