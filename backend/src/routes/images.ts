import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/images/:id — public, sert les octets de l'image
router.get('/:id', async (req, res) => {
  const image = await prisma.image.findUnique({ where: { id: req.params.id } });
  if (!image) return res.status(404).end();

  res.setHeader('Content-Type', image.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.send(image.data);
});

export default router;
