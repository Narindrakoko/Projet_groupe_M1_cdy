import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { authorize } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';
import { crudRouter } from '../utils/crud.js';
import { badRequest, forbidden, notFound, toInt, toStr } from '../utils/http.js';
import { documentScope, infoScope } from '../utils/scope.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
});

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (d) => hash.update(d)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
  });
}

const absolute = (doc) => path.join(config.uploadDir, path.basename(doc.cheminFichier));

const infoSelect = { select: { id: true, titre: true, niveauClassification: true } };

export const documentOptions = {
  resource: 'documents',
  model: 'document',
  table: 'document',
  scope: documentScope,
  include: { information: infoSelect },
  searchFields: ['nomOriginal', 'description', 'typeFichier', 'hash'],
  sortable: ['nomOriginal', 'typeFichier', 'taille', 'dateAjout'],
  defaultOrder: { dateAjout: 'desc' },
  filters: {
    infoId: (v) => ({ infoId: toInt(v) }),
  },
  // Seule la description est modifiable ; le fichier est immuable (intégrité de la preuve)
  buildData: (b) => ({ description: toStr(b.description) }),
  afterDelete: async (doc) => {
    fs.promises.unlink(absolute(doc)).catch(() => {});
  },
  extend: (router, { findScoped }) => {
    router.post('/', authorize('documents', 'create'), upload.single('fichier'), async (req, res) => {
      if (!req.file) throw badRequest('Aucun fichier reçu (champ « fichier »)');
      try {
        const infoId = toInt(req.body.infoId);
        if (!infoId) throw badRequest('L\'information de rattachement est obligatoire');
        const visible = await prisma.information.count({ where: { AND: [{ id: infoId }, infoScope(req.user)] } });
        if (!visible) throw forbidden('Information inaccessible');

        const doc = await prisma.document.create({
          data: {
            infoId,
            cheminFichier: req.file.filename,
            nomOriginal: Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 255),
            typeFichier: req.file.mimetype || 'application/octet-stream',
            taille: req.file.size,
            hash: await sha256(req.file.path),
            description: toStr(req.body.description),
          },
          include: { information: infoSelect },
        });
        await audit(req, 'CREATION', 'document', doc.id, doc.nomOriginal);
        res.status(201).json(doc);
      } catch (err) {
        fs.promises.unlink(req.file.path).catch(() => {});
        throw err;
      }
    });

    router.get('/:id/fichier', authorize('documents', 'read'), async (req, res) => {
      const doc = await findScoped(toInt(req.params.id), req.user);
      if (!doc) throw notFound();
      const file = absolute(doc);
      if (!fs.existsSync(file)) throw notFound('Fichier absent du stockage');
      await audit(req, 'TELECHARGEMENT', 'document', doc.id, doc.nomOriginal);
      res.download(file, doc.nomOriginal);
    });
  },
};

export default crudRouter(documentOptions);
