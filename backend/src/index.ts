import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import gestionnaireRouter from './routes/gestionnaire';
import clubsRouter from './routes/clubs';
import categoriesRouter from './routes/categories';
import equipesRouter from './routes/equipes';
import joueursRouter from './routes/joueurs';
import entraineursRouter from './routes/entraineurs';
import evenementsRouter from './routes/evenements';
import statistiquesRouter from './routes/statistiques';
import actualitesRouter from './routes/actualites';
import imagesRouter from './routes/images';
import joinCodesRouter from './routes/join-codes';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/gestionnaire', gestionnaireRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/equipes', equipesRouter);
app.use('/api/joueurs', joueursRouter);
app.use('/api/entraineurs', entraineursRouter);
app.use('/api/evenements', evenementsRouter);
app.use('/api/statistiques', statistiquesRouter);
app.use('/api/actualites', actualitesRouter);
app.use('/api/images', imagesRouter);
app.use('/api/join-codes', joinCodesRouter);

app.use((_req, res) => res.status(404).json({ message: 'Route introuvable.' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur interne.' });
});

app.listen(PORT, () => {
  console.log(`🚀 FootPilot backend → http://localhost:${PORT}`);
});
