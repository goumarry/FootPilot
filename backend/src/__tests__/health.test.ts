import request from 'supertest';
import app from '../app';

describe('GET /api/health', () => {
  it('retourne 200 avec status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('retourne 404 pour une route inconnue', async () => {
    const res = await request(app).get('/api/route-inexistante');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Route introuvable.');
  });
});
