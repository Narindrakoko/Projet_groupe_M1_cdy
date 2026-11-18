/**
 * Données de démonstration (entièrement fictives).
 *   node prisma/seed.js          → n'insère que si la base est vide
 *   node prisma/seed.js --force  → vide les tables puis réinsère
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');
export const DEMO_PASSWORD = 'Demo2026!pass';

const now = new Date();
const daysAgo = (n, h = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d;
};

async function wipe() {
  // Ordre respectant les clés étrangères
  await prisma.historiqueAction.deleteMany();
  await prisma.infoTag.deleteMany();
  await prisma.infoEntite.deleteMany();
  await prisma.evenementEntite.deleteMany();
  await prisma.document.deleteMany();
  await prisma.evenement.deleteMany();
  await prisma.lienEntreEntites.deleteMany();
  await prisma.information.deleteMany();
  await prisma.collecte.deleteMany();
  await prisma.source.deleteMany();
  await prisma.entite.deleteMany();
  await prisma.localisation.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.utilisateur.deleteMany();
}

async function main() {
  const existing = await prisma.utilisateur.count();
  if (existing && !FORCE) {
    console.log('ℹ La base contient déjà des données — seed ignoré (utilisez --force pour réinitialiser).');
    return;
  }
  if (FORCE) {
    console.log('⚠ Réinitialisation des données…');
    await wipe();
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ── Utilisateurs ──
  const users = {};
  for (const u of [
    { key: 'admin', nom: 'Administrateur', prenom: 'Système', grade: 'Ingénieur SI', role: 'ADMIN', service: 'Direction des systèmes d\'information', niveauHabilitation: 4, email: 'admin@projet.local' },
    { key: 'resp', nom: 'Rakoto', prenom: 'Hery', grade: 'Commandant', role: 'RESPONSABLE', service: 'Cellule analyse', niveauHabilitation: 4, email: 'responsable@projet.local' },
    { key: 'ana', nom: 'Martin', prenom: 'Claire', grade: 'Lieutenant', role: 'ANALYSTE', service: 'Cellule analyse', niveauHabilitation: 3, email: 'analyste@projet.local' },
    { key: 'dec', nom: 'Rasoanaivo', prenom: 'Fara', grade: 'Colonel', role: 'DECIDEUR', service: 'État-major', niveauHabilitation: 3, email: 'decideur@projet.local' },
    { key: 'ope', nom: 'Dubois', prenom: 'Marc', grade: 'Adjudant', role: 'OPERATEUR', service: 'Unité terrain Nord', niveauHabilitation: 2, email: 'operateur@projet.local' },
  ]) {
    const { key, ...data } = u;
    users[key] = await prisma.utilisateur.create({ data: { ...data, motDePasseHash: hash } });
  }

  // ── Tags ──
  const tagDefs = [
    ['Trafic maritime', 'Thématique'], ['Finance', 'Thématique'], ['Cyber', 'Thématique'],
    ['Logistique', 'Thématique'], ['Urgent', 'Priorité'], ['À recouper', 'Priorité'],
    ['Océan Indien', 'Zone'], ['Europe', 'Zone'], ['Afrique de l\'Est', 'Zone'], ['Réseau', 'Analyse'],
  ];
  const tags = {};
  for (const [nomTag, categorie] of tagDefs) tags[nomTag] = await prisma.tag.create({ data: { nomTag, categorie } });

  // ── Localisations ──
  const locDefs = [
    ['Antananarivo', 'Ville', 'Madagascar', -18.8792, 47.5079],
    ['Port de Toamasina', 'Installation portuaire', 'Madagascar', -18.1492, 49.4023],
    ['Mahajanga', 'Ville', 'Madagascar', -15.7167, 46.3167],
    ['Port-Louis', 'Ville', 'Maurice', -20.1609, 57.5012],
    ['Port de Mombasa', 'Installation portuaire', 'Kenya', -4.0435, 39.6682],
    ['Nairobi', 'Ville', 'Kenya', -1.2921, 36.8219],
    ['Djibouti', 'Ville', 'Djibouti', 11.5721, 43.1456],
    ['Dubaï — zone franche', 'Site', 'Émirats arabes unis', 25.0118, 55.0610],
    ['Marseille — Grand Port', 'Installation portuaire', 'France', 43.3260, 5.3510],
    ['Paris', 'Ville', 'France', 48.8566, 2.3522],
  ];
  const loc = {};
  for (const [nomLieu, typeLieu, pays, latitude, longitude] of locDefs) {
    loc[nomLieu] = await prisma.localisation.create({ data: { nomLieu, typeLieu, pays, latitude, longitude } });
  }

  // ── Entités ──
  const entDefs = [
    ['orion', 'ORGANISATION', 'Groupe Orion', 'Orion Holding', 'Société écran présumée, active dans le fret maritime.', null, 'Mauricienne', 'Port-Louis'],
    ['kestrel', 'ORGANISATION', 'Kestrel Logistique', 'KLog', 'Transitaire basé à Toamasina.', null, 'Malgache', 'Port de Toamasina'],
    ['sirocco', 'ORGANISATION', 'Sirocco Trading FZE', null, 'Société de négoce en zone franche.', null, 'Émirienne', 'Dubaï — zone franche'],
    ['ndege', 'ORGANISATION', 'Ndege Shipping Ltd', null, 'Armateur exploitant deux caboteurs.', null, 'Kenyane', 'Port de Mombasa'],
    ['vega', 'ORGANISATION', 'Association Vega', null, 'Association culturelle utilisée comme relais de fonds.', null, 'Française', 'Marseille — Grand Port'],
    ['andry', 'PERSONNE', 'Andry Ramanantsoa', '« Le Banquier »', 'Gérant présumé du Groupe Orion.', '1978-04-12', 'Malgache', 'Antananarivo'],
    ['luc', 'PERSONNE', 'Luc Ferrand', null, 'Directeur administratif de Kestrel Logistique.', '1983-09-03', 'Française', 'Port de Toamasina'],
    ['amina', 'PERSONNE', 'Amina Yusuf', 'A.Y.', 'Intermédiaire financière.', '1986-01-27', 'Kenyane', 'Nairobi'],
    ['karim', 'PERSONNE', 'Karim Belkadi', null, 'Responsable des achats chez Sirocco Trading.', '1975-11-15', 'Française', 'Dubaï — zone franche'],
    ['joseph', 'PERSONNE', 'Joseph Otieno', 'Capitaine Jo', 'Capitaine du MV Ndege Star.', '1969-06-30', 'Kenyane', 'Port de Mombasa'],
    ['sophie', 'PERSONNE', 'Sophie Lambert', null, 'Trésorière de l\'association Vega.', '1990-02-08', 'Française', 'Marseille — Grand Port'],
    ['tiana', 'PERSONNE', 'Tiana Razafy', null, 'Douanière, source de signalements.', '1988-07-19', 'Malgache', 'Port de Toamasina'],
    ['navire', 'VEHICULE', 'MV Ndege Star', 'IMO 9xxxxx1', 'Caboteur de 4 200 tpl.', null, 'Pavillon kenyan', 'Port de Mombasa'],
    ['camion', 'VEHICULE', 'Camion 4521 TBA', null, 'Porteur immatriculé à Antananarivo.', null, null, 'Antananarivo'],
  ];
  const ent = {};
  for (const [key, typeEntite, nom, alias, description, naissance, nationalite, lieu] of entDefs) {
    ent[key] = await prisma.entite.create({
      data: {
        typeEntite, nom, alias, description, nationalite,
        dateNaissance: naissance ? new Date(naissance) : null,
        localisationId: loc[lieu]?.id ?? null,
        autresAttributs: typeEntite === 'VEHICULE' ? { categorie: key === 'navire' ? 'Navire' : 'Poids lourd' } : null,
      },
    });
  }

  // ── Liens entre entités ──
  const lienDefs = [
    ['andry', 'orion', 'dirige', 2, '2019-03-01'], ['luc', 'kestrel', 'travaille pour', 1, '2020-06-15'],
    ['orion', 'kestrel', 'actionnaire de', 3, '2021-01-10'], ['orion', 'sirocco', 'finance', 3, '2022-05-01'],
    ['karim', 'sirocco', 'travaille pour', 2, '2018-09-01'], ['joseph', 'ndege', 'travaille pour', 2, '2017-02-01'],
    ['ndege', 'navire', 'exploite', 1, '2017-02-01'], ['kestrel', 'ndege', 'client de', 3, '2022-11-20'],
    ['amina', 'orion', 'conseille', 4, '2023-04-01'], ['amina', 'andry', 'contact régulier', 3, '2023-04-01'],
    ['sirocco', 'vega', 'finance', 4, '2024-01-15'], ['sophie', 'vega', 'travaille pour', 2, '2021-09-01'],
    ['karim', 'sophie', 'contact régulier', 4, '2024-02-01'], ['luc', 'camion', 'utilise', 3, '2024-03-01'],
    ['tiana', 'luc', 'surveille', 2, '2024-05-10'], ['andry', 'karim', 'contact régulier', 3, '2022-07-01'],
    ['joseph', 'luc', 'contact régulier', 4, '2023-08-12'],
  ];
  for (const [s, c, typeLien, fiabilite, debut] of lienDefs) {
    await prisma.lienEntreEntites.create({
      data: { entiteSourceId: ent[s].id, entiteCibleId: ent[c].id, typeLien, fiabilite, debutRelation: new Date(debut) },
    });
  }

  // ── Sources & collectes ──
  const srcDefs = [
    ['presse', 'OSINT', 'Presse économique régionale', 'B', 'Veille des titres économiques de l\'océan Indien.'],
    ['registre', 'OSINT', 'Registres publics des sociétés', 'A', 'Extraits officiels des registres du commerce.'],
    ['reseaux', 'OSINT', 'Réseaux sociaux publics', 'D', 'Comptes publics et groupes ouverts.'],
    ['ais', 'OSINT', 'Données AIS de suivi maritime', 'B', 'Positions des navires.'],
    ['douane', 'HUMINT', 'Contact douane Toamasina', 'B', 'Source humaine régulière.'],
    ['port', 'HUMINT', 'Informateur portuaire Mombasa', 'C', 'Source humaine occasionnelle.'],
    ['ong', 'HUMINT', 'Partenaire ONG', 'C', 'Remontées terrain d\'une ONG partenaire.'],
    ['image', 'IMINT', 'Imagerie satellite commerciale', 'B', 'Images optiques haute résolution.'],
  ];
  const src = {};
  for (const [key, typeSource, nomSource, fiabiliteSource, description] of srcDefs) {
    src[key] = await prisma.source.create({ data: { typeSource, nomSource, fiabiliteSource, description, dateCreation: daysAgo(400) } });
  }

  const colDefs = [
    ['c1', 'registre', 'Recherche web', 330, 'ana'], ['c2', 'presse', 'Veille presse', 300, 'ana'],
    ['c3', 'douane', 'Entretien', 260, 'ope'], ['c4', 'ais', 'Extraction de données', 220, 'ana'],
    ['c5', 'port', 'Entretien', 180, 'ope'], ['c6', 'reseaux', 'Recherche web', 150, 'ana'],
    ['c7', 'image', 'Analyse d\'imagerie', 120, 'ana'], ['c8', 'douane', 'Entretien', 90, 'ope'],
    ['c9', 'ong', 'Rapport partenaire', 60, 'resp'], ['c10', 'presse', 'Veille presse', 30, 'ana'],
    ['c11', 'port', 'Entretien', 12, 'ope'], ['c12', 'reseaux', 'Recherche web', 4, 'ana'],
  ];
  const col = {};
  for (const [key, s, methode, j, u] of colDefs) {
    col[key] = await prisma.collecte.create({
      data: { sourceId: src[s].id, methode, dateCollecte: daysAgo(j), collecteParId: users[u].id, commentaire: null },
    });
  }

  // ── Informations ──
  const infoDefs = [
    ['Création de Kestrel Logistique : actionnariat Orion', 'Les statuts déposés indiquent une prise de participation de 60 % du Groupe Orion dans Kestrel Logistique.', 'DOCUMENT', 'c1', 1, 1, 'VALIDE', 330, ['Logistique', 'Océan Indien'], [['orion', 'Actionnaire'], ['kestrel', 'Société']]],
    ['Andry Ramanantsoa désigné gérant d\'Orion', 'Nomination publiée au registre de Port-Louis.', 'DOCUMENT', 'c1', 1, 1, 'VALIDE', 328, ['Finance'], [['andry', 'Gérant'], ['orion', 'Société']]],
    ['Article : expansion de Kestrel sur le port de Toamasina', 'Kestrel annonce l\'ouverture d\'un entrepôt sous douane de 3 000 m².', 'TEXTE', 'c2', 2, 1, 'VALIDE', 298, ['Logistique', 'Océan Indien'], [['kestrel', 'Sujet']]],
    ['Déclarations douanières incohérentes (conteneurs Kestrel)', 'Écarts récurrents entre poids déclaré et poids pesé sur 4 conteneurs.', 'TEXTE', 'c3', 2, 3, 'VALIDE', 258, ['Trafic maritime', 'À recouper'], [['kestrel', 'Déclarant'], ['luc', 'Signataire']]],
    ['Escales non déclarées du MV Ndege Star', 'Coupures AIS de 36 h au large de Mahajanga à deux reprises.', 'TEXTE', 'c4', 2, 2, 'VALIDE', 218, ['Trafic maritime', 'Océan Indien'], [['navire', 'Navire'], ['ndege', 'Armateur']]],
    ['Capitaine Jo : rencontres avec un transitaire', 'Le capitaine aurait rencontré à plusieurs reprises un représentant de Kestrel.', 'TEXTE', 'c5', 3, 3, 'VALIDE', 178, ['Trafic maritime', 'À recouper'], [['joseph', 'Capitaine'], ['luc', 'Contact']]],
    ['Publication de Karim Belkadi sur un salon à Dubaï', 'Photo publique montrant K. Belkadi et A. Ramanantsoa.', 'IMAGE', 'c6', 3, 1, 'VALIDE', 148, ['Réseau'], [['karim', 'Sur la photo'], ['andry', 'Sur la photo']]],
    ['Activité inhabituelle sur l\'entrepôt Kestrel', 'Images montrant une rotation nocturne de camions.', 'IMAGE', 'c7', 2, 2, 'VALIDE', 118, ['Logistique'], [['kestrel', 'Site']]],
    ['Virements Sirocco → Association Vega', 'Plusieurs virements de 9 500 € sous le seuil déclaratif.', 'DOCUMENT', 'c9', 3, 3, 'VALIDE', 58, ['Finance', 'Europe'], [['sirocco', 'Émetteur'], ['vega', 'Bénéficiaire']]],
    ['Conteneur bloqué à Toamasina', 'Un conteneur Kestrel est retenu pour contrôle approfondi.', 'TEXTE', 'c8', 2, 2, 'VALIDE', 88, ['Trafic maritime', 'Urgent'], [['kestrel', 'Propriétaire'], ['tiana', 'Contrôleuse']]],
    ['Amina Yusuf conseil financier d\'Orion', 'Mention dans un rapport partenaire du rôle de conseil de A. Yusuf.', 'TEXTE', 'c9', 4, 3, 'BRUT', 57, ['Finance', 'Afrique de l\'Est', 'À recouper'], [['amina', 'Conseillère'], ['orion', 'Client']]],
    ['Rapport de synthèse — réseau Orion', 'Synthèse des liens financiers entre Orion, Sirocco et Vega.', 'DOCUMENT', 'c9', 2, 4, 'VALIDE', 50, ['Réseau', 'Finance'], [['orion', 'Tête de réseau'], ['sirocco', 'Relais'], ['vega', 'Relais']]],
    ['Article : contrôle douanier renforcé dans les ports de l\'océan Indien', null, 'TEXTE', 'c10', 1, 1, 'ARCHIVE', 29, ['Océan Indien'], []],
    ['Arrivée prévue du MV Ndege Star à Toamasina', 'L\'informateur signale une arrivée sous 10 jours avec cargaison mixte.', 'TEXTE', 'c11', 3, 2, 'BRUT', 11, ['Trafic maritime', 'Urgent'], [['navire', 'Navire'], ['joseph', 'Capitaine']]],
    ['Camion 4521 TBA observé à l\'entrepôt', 'Observation à 3 h du matin du camion utilisé par L. Ferrand.', 'TEXTE', 'c11', 3, 2, 'BRUT', 10, ['Logistique'], [['camion', 'Véhicule'], ['luc', 'Utilisateur']]],
    ['Recrutement sur les réseaux pour « missions logistiques »', 'Annonces anonymes ciblant des chauffeurs à Antananarivo.', 'TEXTE', 'c12', 5, 1, 'BRUT', 3, ['Logistique', 'À recouper'], []],
    ['Message chiffré attribué à Karim Belkadi', 'Message intercepté évoquant un « transfert d\'avril ».', 'TEXTE', 'c12', 5, 3, 'BRUT', 2, ['Cyber', 'Urgent'], [['karim', 'Auteur présumé']]],
    ['Fuite d\'une liste de clients de Sirocco', 'Liste publiée sur un forum ; authenticité non vérifiée.', 'DOCUMENT', 'c6', 6, 2, 'BRUT', 140, ['Cyber', 'À recouper'], [['sirocco', 'Victime']]],
  ];
  const infos = [];
  for (const [titre, contenuTexte, typeInfo, c, fiab, classif, statut, j, tagNames, entList] of infoDefs) {
    infos.push(
      await prisma.information.create({
        data: {
          titre, contenuTexte, typeInfo, statut,
          collecteId: col[c].id,
          fiabiliteContenu: fiab,
          niveauClassification: classif,
          dateEvenement: daysAgo(j + 2),
          dateEnregistrement: daysAgo(j, 14),
          tags: { create: tagNames.map((n) => ({ tagId: tags[n].id })) },
          entites: { create: entList.map(([k, role]) => ({ entiteId: ent[k].id, role })) },
        },
      }),
    );
  }

  // ── Événements ──
  const evDefs = [
    ['Immatriculation de Kestrel Logistique', 335, null, 'Port de Toamasina', 'Administratif', 'FAIBLE', 0, ['kestrel', 'orion']],
    ['Ouverture de l\'entrepôt sous douane', 300, null, 'Port de Toamasina', 'Logistique', 'MOYEN', 2, ['kestrel']],
    ['Anomalies de pesée sur 4 conteneurs', 262, 255, 'Port de Toamasina', 'Contrôle douanier', 'MOYEN', 3, ['kestrel', 'luc']],
    ['Coupure AIS au large de Mahajanga', 222, 220, 'Mahajanga', 'Maritime', 'ELEVE', 4, ['navire', 'joseph']],
    ['Rencontre capitaine / transitaire', 182, null, 'Port de Mombasa', 'Rencontre', 'MOYEN', 5, ['joseph', 'luc']],
    ['Salon professionnel à Dubaï', 152, 150, 'Dubaï — zone franche', 'Rencontre', 'FAIBLE', 6, ['karim', 'andry']],
    ['Seconde coupure AIS', 128, 127, 'Mahajanga', 'Maritime', 'ELEVE', 4, ['navire']],
    ['Rotation nocturne de camions', 120, null, 'Port de Toamasina', 'Logistique', 'MOYEN', 7, ['kestrel', 'camion']],
    ['Rétention d\'un conteneur Kestrel', 90, 85, 'Port de Toamasina', 'Contrôle douanier', 'ELEVE', 9, ['kestrel', 'tiana']],
    ['Série de virements vers Vega', 65, 45, 'Marseille — Grand Port', 'Financier', 'ELEVE', 8, ['sirocco', 'vega', 'sophie']],
    ['Réunion à Nairobi', 55, null, 'Nairobi', 'Rencontre', 'MOYEN', 10, ['amina', 'andry']],
    ['Assemblée générale de Vega', 40, null, 'Paris', 'Administratif', 'FAIBLE', null, ['vega', 'sophie']],
    ['Publication d\'annonces de recrutement', 5, 3, 'Antananarivo', 'Cyber', 'MOYEN', 15, []],
    ['Observation du camion 4521 TBA', 10, null, 'Port de Toamasina', 'Surveillance', 'MOYEN', 14, ['camion', 'luc']],
    ['Escale annoncée du MV Ndege Star', -8, null, 'Port de Toamasina', 'Maritime', 'CRITIQUE', 13, ['navire', 'joseph', 'kestrel']],
    ['Transit à Djibouti', 200, 199, 'Djibouti', 'Maritime', 'FAIBLE', null, ['navire']],
  ];
  for (const [titre, debut, fin, lieu, typeEvenement, impact, infoIdx, entKeys] of evDefs) {
    await prisma.evenement.create({
      data: {
        titre, typeEvenement, impact,
        dateDebut: daysAgo(debut, 9),
        dateFin: fin !== null ? daysAgo(fin, 18) : null,
        localisationId: loc[lieu].id,
        infoId: infoIdx !== null ? infos[infoIdx].id : null,
        entites: { create: entKeys.map((k) => ({ entiteId: ent[k].id })) },
      },
    });
  }

  await prisma.historiqueAction.create({
    data: { userId: users.admin.id, action: 'CREATION', tableConcernee: 'base', details: 'Initialisation des données de démonstration' },
  });

  console.log('✔ Données de démonstration insérées.');
  console.log(`  Comptes (mot de passe : ${DEMO_PASSWORD}) :`);
  for (const u of Object.values(users)) console.log(`   - ${u.email.padEnd(28)} ${u.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
