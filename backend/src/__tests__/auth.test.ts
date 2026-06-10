import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app';
import { prisma } from '../lib/prisma';

// Mock Prisma pour ne pas toucher la vraie DB
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    club: { findUnique: jest.fn() },
  },
}));

const mockUser = prisma.user as unknown as { findUnique: jest.Mock };
const mockClub = prisma.club as unknown as { findUnique: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test_secret_ci';
});

describe('POST /api/auth/login — validation Zod', () => {
  it('retourne 400 si le body est vide', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Données invalides.');
  });

  it('retourne 400 si email invalide', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pas-un-email', password: 'secret123' });
    expect(res.status).toBe(400);
  });

  it('retourne 400 si mot de passe manquant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login — logique métier', () => {
  it('retourne 401 si utilisateur introuvable', async () => {
    mockUser.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@example.com', password: 'monPassword1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Email ou mot de passe incorrect.');
  });

  it('retourne 401 si utilisateur inactif', async () => {
    mockUser.findUnique.mockResolvedValue({ id: '1', isActive: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactif@example.com', password: 'monPassword1' });
    expect(res.status).toBe(401);
  });

  it('retourne 401 si mot de passe incorrect', async () => {
    const hashed = await bcrypt.hash('bonmotdepasse', 10);
    mockUser.findUnique.mockResolvedValue({
      id: '1',
      isActive: true,
      emailVerified: true,
      password: hashed,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'mauvaismdp' });
    expect(res.status).toBe(401);
  });

  it('retourne 401 si email non vérifié', async () => {
    const hashed = await bcrypt.hash('bonmdp123', 10);
    mockUser.findUnique.mockResolvedValue({
      id: '1',
      isActive: true,
      emailVerified: false,
      password: hashed,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonverifie@example.com', password: 'bonmdp123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('vérifier votre adresse e-mail');
  });

  it('retourne 200 avec token si credentials corrects', async () => {
    const hashed = await bcrypt.hash('bonmdp123', 10);
    mockUser.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@club.fr',
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'GESTIONNAIRE',
      clubId: 'club-1',
      profilePic: null,
      isActive: true,
      emailVerified: true,
      password: hashed,
    });
    mockClub.findUnique.mockResolvedValue({ idOwner: 'user-1' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@club.fr', password: 'bonmdp123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('admin@club.fr');
    expect(res.body.user.isOwner).toBe(true);
  });
});
