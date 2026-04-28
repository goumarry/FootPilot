export type Role = 'ADMIN' | 'GESTIONNAIRE' | 'ENTRAINEUR' | 'JOUEUR';
export type Poste = 'DEF' | 'MIL' | 'ATT' | 'GB';
export type StatutMatch = 'AVENIR' | 'TERMINE' | 'ANNULE';
export type TypeEvenement = 'MATCH' | 'ENTRAINEMENT';
export type StatutPresence = 'PRESENT' | 'ABSENT_JUSTIFIE' | 'ABSENT_NON_JUSTIFIE' | 'RETARD';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  clubId?: string | null;
  profilePic?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  createdAt?: string;
  isActive?: boolean;
}

export interface Club {
  id: string;
  nom: string;
  ville: string;
  logoUrl?: string | null;
  description?: string | null;
  createdAt: string;
  _count?: { categories: number; equipes: number; joueurs: number; users: number };
}

export interface Categorie {
  id: string;
  clubId: string;
  nom: string;
  _count?: { equipes: number };
}

export interface Equipe {
  id: string;
  clubId: string;
  categorieId: string;
  nomEquipe: string;
  niveauChampionnat?: string | null;
  categorie?: Categorie;
  _count?: { joueurs: number; entraineurs: number };
}

export interface Joueur {
  id: string;
  userId?: string | null;
  clubId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  poste?: Poste | null;
  numeroMaillot?: number | null;
  photoUrl?: string | null;
  equipes?: Array<{ equipe: Equipe; dateDebut: string; dateFin?: string | null }>;
}

export interface Entraineur {
  id: string;
  userId: string;
  clubId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  photoUrl?: string | null;
  equipes?: Array<{ equipe: Equipe }>;
}

export interface Evenement {
  id: string;
  type: TypeEvenement;
  equipeId: string;
  dateHeure: string;
  lieu?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  equipe?: Pick<Equipe, 'id' | 'nomEquipe'> & { categorie?: Pick<Categorie, 'nom'> };
  match?: Match;
  entrainement?: Entrainement;
}

export interface Match {
  id: string;
  equipesDomId: string;
  equipesExtId: string;
  scoreDom?: number | null;
  scoreExt?: number | null;
  statut: StatutMatch;
  placesCovoiturage?: number | null;
  equipeDom?: Pick<Equipe, 'id' | 'nomEquipe'>;
  equipeExt?: Pick<Equipe, 'id' | 'nomEquipe'>;
  buts?: But[];
  convocations?: ConvocationMatch[];
}

export interface Entrainement {
  id: string;
  categorieId?: string | null;
  presences?: PresenceEntrainement[];
}

export interface But {
  id: string;
  matchId: string;
  buteurId: string;
  passeurId?: string | null;
  minute?: number | null;
  zoneTir?: 'TETE' | 'PIED_GAUCHE' | 'PIED_DROIT' | null;
  circonstance?: 'JEU_OUVERT' | 'COUP_FRANC' | 'PENALTY' | null;
  estCSC: boolean;
  buteur?: Pick<Joueur, 'id' | 'firstName' | 'lastName'>;
  passeur?: Pick<Joueur, 'id' | 'firstName' | 'lastName'> | null;
}

export interface PresenceEntrainement {
  entrainementId: string;
  joueurId: string;
  statut: StatutPresence;
  commentaire?: string | null;
  joueur?: Pick<Joueur, 'id' | 'firstName' | 'lastName' | 'photoUrl'>;
}

export interface ConvocationMatch {
  matchId: string;
  joueurId: string;
  note?: number | null;
  commentaire?: string | null;
  estAccompagnateur: boolean;
  joueur?: Pick<Joueur, 'id' | 'firstName' | 'lastName' | 'photoUrl'>;
}

export interface Actualite {
  id: string;
  auteurId: string;
  clubId: string;
  equipeId?: string | null;
  titre: string;
  contenu: string;
  createdAt: string;
  auteur?: Pick<User, 'id' | 'firstName' | 'lastName' | 'profilePic'>;
  equipe?: Pick<Equipe, 'id' | 'nomEquipe'> | null;
}

export interface Invitation {
  id: string;
  token: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: Role;
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
  creator?: { firstName: string; lastName: string };
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
  ENTRAINEUR: 'Entraîneur',
  JOUEUR: 'Joueur',
};

export const POSTE_LABELS: Record<Poste, string> = {
  DEF: 'Défenseur',
  MIL: 'Milieu',
  ATT: 'Attaquant',
  GB: 'Gardien',
};

export const STATUT_PRESENCE_LABELS: Record<StatutPresence, string> = {
  PRESENT: 'Présent',
  ABSENT_JUSTIFIE: 'Absent justifié',
  ABSENT_NON_JUSTIFIE: 'Absent non justifié',
  RETARD: 'Retard',
};
