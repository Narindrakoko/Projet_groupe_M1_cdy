-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RESPONSABLE', 'ANALYSTE', 'DECIDEUR', 'OPERATEUR');

-- CreateEnum
CREATE TYPE "StatutUtilisateur" AS ENUM ('ACTIF', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "TypeSource" AS ENUM ('OSINT', 'HUMINT', 'SIGINT', 'IMINT', 'AUTRE');

-- CreateEnum
CREATE TYPE "FiabiliteSource" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');

-- CreateEnum
CREATE TYPE "TypeInfo" AS ENUM ('TEXTE', 'DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutInfo" AS ENUM ('BRUT', 'VALIDE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "TypeEntite" AS ENUM ('PERSONNE', 'ORGANISATION', 'LIEU', 'VEHICULE', 'AUTRE');

-- CreateEnum
CREATE TYPE "Impact" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id_user" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100),
    "grade" VARCHAR(100),
    "role" "Role" NOT NULL DEFAULT 'ANALYSTE',
    "service" VARCHAR(150),
    "niveau_habilitation" INTEGER NOT NULL DEFAULT 1,
    "email" VARCHAR(200) NOT NULL,
    "mot_de_passe_hash" TEXT NOT NULL,
    "statut" "StatutUtilisateur" NOT NULL DEFAULT 'ACTIF',
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_connexion" TIMESTAMP(3),

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "source" (
    "id_source" SERIAL NOT NULL,
    "type_source" "TypeSource" NOT NULL,
    "nom_source" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "fiabilite_source" "FiabiliteSource" NOT NULL DEFAULT 'F',
    "lien_contact" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id_source")
);

-- CreateTable
CREATE TABLE "collecte" (
    "id_collecte" SERIAL NOT NULL,
    "id_source" INTEGER NOT NULL,
    "methode" VARCHAR(100) NOT NULL,
    "date_collecte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collecte_par" INTEGER,
    "commentaire" TEXT,

    CONSTRAINT "collecte_pkey" PRIMARY KEY ("id_collecte")
);

-- CreateTable
CREATE TABLE "information" (
    "id_info" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "contenu_texte" TEXT,
    "type_info" "TypeInfo" NOT NULL DEFAULT 'TEXTE',
    "date_evenement" TIMESTAMP(3),
    "date_enregistrement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_collecte" INTEGER,
    "fiabilite_contenu" INTEGER NOT NULL DEFAULT 6,
    "niveau_classification" INTEGER NOT NULL DEFAULT 1,
    "statut" "StatutInfo" NOT NULL DEFAULT 'BRUT',

    CONSTRAINT "information_pkey" PRIMARY KEY ("id_info")
);

-- CreateTable
CREATE TABLE "entite" (
    "id_entite" SERIAL NOT NULL,
    "type_entite" "TypeEntite" NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "alias" VARCHAR(200),
    "description" TEXT,
    "date_naissance" DATE,
    "nationalite" VARCHAR(100),
    "autres_attributs" JSONB,
    "id_localisation" INTEGER,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entite_pkey" PRIMARY KEY ("id_entite")
);

-- CreateTable
CREATE TABLE "info_entite" (
    "id_info" INTEGER NOT NULL,
    "id_entite" INTEGER NOT NULL,
    "role" VARCHAR(100),

    CONSTRAINT "info_entite_pkey" PRIMARY KEY ("id_info","id_entite")
);

-- CreateTable
CREATE TABLE "lien_entre_entites" (
    "id_lien" SERIAL NOT NULL,
    "id_entite_source" INTEGER NOT NULL,
    "id_entite_cible" INTEGER NOT NULL,
    "type_lien" VARCHAR(100) NOT NULL,
    "debut_relation" DATE,
    "fin_relation" DATE,
    "contexte" TEXT,
    "fiabilite" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "lien_entre_entites_pkey" PRIMARY KEY ("id_lien")
);

-- CreateTable
CREATE TABLE "localisation" (
    "id_localisation" SERIAL NOT NULL,
    "nom_lieu" VARCHAR(200) NOT NULL,
    "type_lieu" VARCHAR(100),
    "pays" VARCHAR(100),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,

    CONSTRAINT "localisation_pkey" PRIMARY KEY ("id_localisation")
);

-- CreateTable
CREATE TABLE "evenement" (
    "id_evenement" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),
    "description" TEXT,
    "id_localisation" INTEGER,
    "type_evenement" VARCHAR(100),
    "impact" "Impact",
    "id_info" INTEGER,

    CONSTRAINT "evenement_pkey" PRIMARY KEY ("id_evenement")
);

-- CreateTable
CREATE TABLE "evenement_entite" (
    "id_evenement" INTEGER NOT NULL,
    "id_entite" INTEGER NOT NULL,

    CONSTRAINT "evenement_entite_pkey" PRIMARY KEY ("id_evenement","id_entite")
);

-- CreateTable
CREATE TABLE "document" (
    "id_document" SERIAL NOT NULL,
    "id_info" INTEGER NOT NULL,
    "chemin_fichier" TEXT NOT NULL,
    "nom_original" VARCHAR(255) NOT NULL,
    "type_fichier" VARCHAR(150) NOT NULL,
    "taille" INTEGER NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "date_ajout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id_document")
);

-- CreateTable
CREATE TABLE "tag" (
    "id_tag" SERIAL NOT NULL,
    "nom_tag" VARCHAR(100) NOT NULL,
    "categorie" VARCHAR(100),

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id_tag")
);

-- CreateTable
CREATE TABLE "info_tag" (
    "id_info" INTEGER NOT NULL,
    "id_tag" INTEGER NOT NULL,

    CONSTRAINT "info_tag_pkey" PRIMARY KEY ("id_info","id_tag")
);

-- CreateTable
CREATE TABLE "historique_action" (
    "id_action" SERIAL NOT NULL,
    "id_user" INTEGER,
    "action" VARCHAR(50) NOT NULL,
    "table_concernee" VARCHAR(100),
    "id_enregistrement" INTEGER,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,
    "adresse_ip" VARCHAR(64),

    CONSTRAINT "historique_action_pkey" PRIMARY KEY ("id_action")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "source_type_source_idx" ON "source"("type_source");

-- CreateIndex
CREATE INDEX "collecte_id_source_idx" ON "collecte"("id_source");

-- CreateIndex
CREATE INDEX "information_statut_idx" ON "information"("statut");

-- CreateIndex
CREATE INDEX "information_niveau_classification_idx" ON "information"("niveau_classification");

-- CreateIndex
CREATE INDEX "information_id_collecte_idx" ON "information"("id_collecte");

-- CreateIndex
CREATE INDEX "entite_type_entite_idx" ON "entite"("type_entite");

-- CreateIndex
CREATE INDEX "entite_nom_idx" ON "entite"("nom");

-- CreateIndex
CREATE INDEX "lien_entre_entites_id_entite_source_idx" ON "lien_entre_entites"("id_entite_source");

-- CreateIndex
CREATE INDEX "lien_entre_entites_id_entite_cible_idx" ON "lien_entre_entites"("id_entite_cible");

-- CreateIndex
CREATE INDEX "evenement_date_debut_idx" ON "evenement"("date_debut");

-- CreateIndex
CREATE INDEX "document_id_info_idx" ON "document"("id_info");

-- CreateIndex
CREATE UNIQUE INDEX "tag_nom_tag_key" ON "tag"("nom_tag");

-- CreateIndex
CREATE INDEX "historique_action_id_user_idx" ON "historique_action"("id_user");

-- CreateIndex
CREATE INDEX "historique_action_date_action_idx" ON "historique_action"("date_action");

-- AddForeignKey
ALTER TABLE "collecte" ADD CONSTRAINT "collecte_id_source_fkey" FOREIGN KEY ("id_source") REFERENCES "source"("id_source") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collecte" ADD CONSTRAINT "collecte_collecte_par_fkey" FOREIGN KEY ("collecte_par") REFERENCES "utilisateur"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "information" ADD CONSTRAINT "information_id_collecte_fkey" FOREIGN KEY ("id_collecte") REFERENCES "collecte"("id_collecte") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entite" ADD CONSTRAINT "entite_id_localisation_fkey" FOREIGN KEY ("id_localisation") REFERENCES "localisation"("id_localisation") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_entite" ADD CONSTRAINT "info_entite_id_info_fkey" FOREIGN KEY ("id_info") REFERENCES "information"("id_info") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_entite" ADD CONSTRAINT "info_entite_id_entite_fkey" FOREIGN KEY ("id_entite") REFERENCES "entite"("id_entite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lien_entre_entites" ADD CONSTRAINT "lien_entre_entites_id_entite_source_fkey" FOREIGN KEY ("id_entite_source") REFERENCES "entite"("id_entite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lien_entre_entites" ADD CONSTRAINT "lien_entre_entites_id_entite_cible_fkey" FOREIGN KEY ("id_entite_cible") REFERENCES "entite"("id_entite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement" ADD CONSTRAINT "evenement_id_localisation_fkey" FOREIGN KEY ("id_localisation") REFERENCES "localisation"("id_localisation") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement" ADD CONSTRAINT "evenement_id_info_fkey" FOREIGN KEY ("id_info") REFERENCES "information"("id_info") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_entite" ADD CONSTRAINT "evenement_entite_id_evenement_fkey" FOREIGN KEY ("id_evenement") REFERENCES "evenement"("id_evenement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_entite" ADD CONSTRAINT "evenement_entite_id_entite_fkey" FOREIGN KEY ("id_entite") REFERENCES "entite"("id_entite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_id_info_fkey" FOREIGN KEY ("id_info") REFERENCES "information"("id_info") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_tag" ADD CONSTRAINT "info_tag_id_info_fkey" FOREIGN KEY ("id_info") REFERENCES "information"("id_info") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_tag" ADD CONSTRAINT "info_tag_id_tag_fkey" FOREIGN KEY ("id_tag") REFERENCES "tag"("id_tag") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_action" ADD CONSTRAINT "historique_action_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
