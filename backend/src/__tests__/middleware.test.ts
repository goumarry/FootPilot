import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/auth';

const SECRET = 'test_secret_middleware';

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

describe('verifyToken', () => {
  it('retourne 401 si aucun header Authorization', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('retourne 401 si le header ne commence pas par Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retourne 401 si le token est invalide', () => {
    const req = { headers: { authorization: 'Bearer token.invalide' } } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('appelle next() et attache req.user si token valide', () => {
    const payload = { userId: 'u-1', role: 'GESTIONNAIRE', clubId: 'c-1' };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });

    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as Request & { user?: typeof payload }).user?.userId).toBe('u-1');
  });
});
