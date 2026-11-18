import { prisma } from '../prisma.js';

/**
 * Trace une action dans HISTORIQUE_ACTION. Ne bloque jamais la requête.
 */
export async function audit(req, action, tableConcernee = null, idEnregistrement = null, details = null) {
  try {
    await prisma.historiqueAction.create({
      data: {
        userId: req.user?.id ?? null,
        action,
        tableConcernee,
        idEnregistrement: idEnregistrement ?? null,
        details: details ? String(details).slice(0, 2000) : null,
        adresseIp: req.ip?.slice(0, 64) ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] échec de journalisation :', err.message);
  }
}
