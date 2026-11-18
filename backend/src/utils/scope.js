/**
 * Filtrage par niveau d'habilitation :
 * un utilisateur ne voit que les informations dont la classification
 * est inférieure ou égale à son habilitation.
 */
export const infoScope = (user) => ({ niveauClassification: { lte: user.niveauHabilitation } });

export const evenementScope = (user) => ({
  OR: [{ infoId: null }, { information: infoScope(user) }],
});

export const documentScope = (user) => ({ information: infoScope(user) });
