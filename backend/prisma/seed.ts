import { PrismaClient, Role, Poste } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FootPilot database...');

  const clubExists = await prisma.club.findFirst({ where: { nom: 'AS FootPilot FC' } });
  if (clubExists) {
    console.log('ℹ️  Club test déjà présent, skip.');
    return;
  }

  const club = await prisma.club.create({
    data: {
      nom: 'AS FootPilot FC',
      ville: 'Lyon',
      description: 'Club de démonstration FootPilot',
    },
  });

  const gestionnaire = await prisma.user.create({
    data: {
      email: 'gestionnaire@footpilot.fr',
      password: await bcrypt.hash('Gestionnaire123!', 12),
      firstName: 'Marc',
      lastName: 'Dupont',
      role: Role.GESTIONNAIRE,
      clubId: club.id,
    },
  });

  const [catSeniors, catU17] = await Promise.all([
    prisma.categorie.create({ data: { clubId: club.id, nom: 'Seniors' } }),
    prisma.categorie.create({ data: { clubId: club.id, nom: 'U17' } }),
  ]);

  const equipeA = await prisma.equipe.create({
    data: {
      clubId: club.id,
      categorieId: catSeniors.id,
      nomEquipe: 'Équipe A',
      niveauChampionnat: 'Régional 2',
    },
  });

  await prisma.equipe.create({
    data: {
      clubId: club.id,
      categorieId: catU17.id,
      nomEquipe: 'U17 A',
      niveauChampionnat: 'Départemental 1',
    },
  });

  const entraineurUser = await prisma.user.create({
    data: {
      email: 'entraineur@footpilot.fr',
      password: await bcrypt.hash('Entraineur123!', 12),
      firstName: 'Karim',
      lastName: 'Benzara',
      role: Role.ENTRAINEUR,
      clubId: club.id,
    },
  });

  const entraineur = await prisma.entraineur.create({
    data: { userId: entraineurUser.id, clubId: club.id, phone: '0600000001' },
  });

  await prisma.entraineurEquipe.create({
    data: { entraineurId: entraineur.id, equipeId: equipeA.id },
  });

  const joueursData = [
    { firstName: 'Lucas', lastName: 'Martin', poste: Poste.ATT, numero: 9 },
    { firstName: 'Thomas', lastName: 'Petit', poste: Poste.MIL, numero: 8 },
    { firstName: 'Romain', lastName: 'Dubois', poste: Poste.DEF, numero: 4 },
    { firstName: 'Pierre', lastName: 'Moreau', poste: Poste.GB, numero: 1 },
  ];

  const joueurs = await Promise.all(
    joueursData.map(async (j, i) => {
      const userJoueur = await prisma.user.create({
        data: {
          email: `joueur${i + 1}@footpilot.fr`,
          password: await bcrypt.hash('Joueur123!', 12),
          firstName: j.firstName,
          lastName: j.lastName,
          role: Role.JOUEUR,
          clubId: club.id,
          birthDate: new Date(`200${i}-06-15`),
        },
      });

      return prisma.joueur.create({
        data: {
          userId: userJoueur.id,
          clubId: club.id,
          birthDate: new Date(`200${i}-06-15`),
          poste: j.poste,
          numeroMaillot: j.numero,
        },
      });
    })
  );

  await Promise.all(
    joueurs.map((j) =>
      prisma.joueurEquipe.create({ data: { joueurId: j.id, equipeId: equipeA.id } })
    )
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  tomorrow.setHours(15, 0, 0, 0);

  await prisma.evenement.create({
    data: {
      type: 'MATCH',
      equipeId: equipeA.id,
      dateHeure: tomorrow,
      lieu: 'Stade Gerland, Lyon',
      description: 'Championnat Régional 2 — Journée 12',
      adversaire: 'AS Bron FC',
      statutMatch: 'AVENIR',
      placesCovoiturage: 5,
    },
  });

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 3);
  lastWeek.setHours(19, 0, 0, 0);

  await prisma.evenement.create({
    data: {
      type: 'ENTRAINEMENT',
      equipeId: equipeA.id,
      dateHeure: lastWeek,
      lieu: 'Terrain annexe',
      description: 'Entraînement technique',
    },
  });

  await prisma.actualite.create({
    data: {
      auteurId: gestionnaire.id,
      clubId: club.id,
      titre: 'Bienvenue sur FootPilot !',
      contenu:
        "Bienvenue à tous les membres de l'AS FootPilot FC. Cette plateforme centralisera toute la vie de notre club : planning, résultats, statistiques et actualités. Bonne saison à tous !",
    },
  });

  console.log(`
✅ Seed terminé !

Club test : AS FootPilot FC (Lyon)

Comptes de test :
  gestionnaire@footpilot.fr / Gestionnaire123!   (GESTIONNAIRE)
  entraineur@footpilot.fr   / Entraineur123!     (ENTRAINEUR)
  joueur1@footpilot.fr      / Joueur123!         (JOUEUR)
  joueur2@footpilot.fr      / Joueur123!         (JOUEUR)
  joueur3@footpilot.fr      / Joueur123!         (JOUEUR)
  joueur4@footpilot.fr      / Joueur123!         (JOUEUR)
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
