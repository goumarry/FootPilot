export type Role = 'GESTIONNAIRE' | 'ENTRAINEUR' | 'JOUEUR';
export type Poste = 'DEF' | 'MIL' | 'ATT' | 'GB';
export type StatutMatch = 'AVENIR' | 'TERMINE' | 'ANNULE';
export type TypeEvenement = 'MATCH' | 'ENTRAINEMENT';
export type StatutPresence = 'PRESENT' | 'ABSENT_JUSTIFIE' | 'ABSENT_NON_JUSTIFIE' | 'RETARD' | 'BLESSE';
export type StatutEvenement = 'AVENIR' | 'EN_COURS' | 'TERMINE' | 'ANNULE';

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
  isOwner?: boolean;
}

export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled';

export interface Club {
  id: string;
  nom: string;
  ville: string;
  logoUrl?: string | null;
  description?: string | null;
  createdAt: string;
  subscriptionStatus?: SubscriptionStatus;
  hasUnlockedLimits?: boolean;
  isFounder?: boolean;
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
  entraineurs?: Array<{ entraineur: { userId: string } }>;
}

export interface EquipeDetail extends Omit<Equipe, '_count' | 'entraineurs'> {
  joueurs: Array<{
    joueurId: string;
    equipeId: string;
    dateDebut: string;
    dateFin?: string | null;
    joueur: {
      id: string;
      firstName: string;
      lastName: string;
      poste?: Poste | null;
      numeroMaillot?: number | null;
      photoUrl?: string | null;
    };
  }>;
  entraineurs: Array<{
    entraineurId: string;
    equipeId: string;
    entraineur: {
      id: string;
      userId: string;
      firstName: string;
      lastName: string;
      photoUrl?: string | null;
    };
  }>;
}

// firstName/lastName sont toujours présents dans les réponses API (normalisés depuis User ou champs directs).
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

// firstName/lastName proviennent de user.firstName/lastName dans les réponses API.
export interface Entraineur {
  id: string;
  userId: string;
  clubId: string;
  phone?: string | null;
  photoUrl?: string | null;
  user?: { firstName: string; lastName: string; email: string };
  equipes?: Array<{ equipe: Equipe }>;
}

export interface Evenement {
  id: string;
  type: TypeEvenement;
  equipeId: string;
  dateHeure: string;
  duree: number;
  annule: boolean;
  lieu?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  equipe?: Pick<Equipe, 'id' | 'nomEquipe'> & { categorie?: Pick<Categorie, 'nom'> };
  // Champs match
  adversaire?: string | null;
  scoreDom?: number | null;
  scoreExt?: number | null;
  statutMatch?: StatutMatch | null;
  placesCovoiturage?: number | null;
  // Champs entraînement
  categorieId?: string | null;
  // Snapshot : true une fois la liste d'appel figée
  snapshotPris?: boolean;
  // Relations
  buts?: But[];
  presences?: Presence[];
}

export interface Presence {
  evenementId: string;
  joueurId: string;
  statut: StatutPresence;
  note?: number | null;
  buts?: number | null;
  commentaire?: string | null;
  joueur?: Pick<Joueur, 'id' | 'firstName' | 'lastName' | 'photoUrl'>;
}

export interface But {
  id: string;
  evenementId: string;
  buteurId: string;
  passeurId?: string | null;
  minute?: number | null;
  zoneTir?: 'TETE' | 'PIED_GAUCHE' | 'PIED_DROIT' | null;
  circonstance?: 'JEU_OUVERT' | 'COUP_FRANC' | 'PENALTY' | null;
  estCSC: boolean;
  buteur?: Pick<Joueur, 'id' | 'firstName' | 'lastName'>;
  passeur?: Pick<Joueur, 'id' | 'firstName' | 'lastName'> | null;
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

export interface JoinCode {
  id: string;
  code: string;
  role: 'ENTRAINEUR' | 'JOUEUR';
  clubId: string;
  createdBy: string;
  expiresAt: string;
  usedCount: number;
  createdAt: string;
  creator?: { firstName: string; lastName: string };
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

export type ChatRoomType = 'EQUIPE' | 'STAFF' | 'DIRECTION';

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  nom: string;
  unreadCount: number;
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderPic?: string | null;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
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
  ABSENT_JUSTIFIE: 'Absence justifiée',
  ABSENT_NON_JUSTIFIE: 'Absent',
  RETARD: 'En retard',
  BLESSE: 'Blessé',
};
