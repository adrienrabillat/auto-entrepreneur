# Templates de facturation par métier — Asthia

> Document de référence pour l'implémentation du système de templates,
> mentions légales auto-injectées, et champs profil par secteur.
>
> **Périmètre :** les 5 secteurs cibles de la slide « Cibles prioritaires »
> couvrant ~1,42 M d'auto-entrepreneurs.
>
> Pour chaque métier, on a :
> - **Templates de prestation** (lignes typiques avec unité)
> - **Mentions légales obligatoires** (à injecter auto sur facture/devis)
> - **Mentions recommandées** (rassurantes ou demandées par les clients/mutuelles)
> - **Champs profil dédiés** (à demander à l'onboarding ou en post-config)
> - **Spécificités de facturation** (acompte, forfait, abonnement, etc.)
> - **Documents annexes** (au-delà de facture/devis)
> - **Sujet de mail recommandé** (par défaut au lieu de « Facture F-2026-0042 »)

---

## Sommaire

1. [Tech & Digital](#1-tech--digital-650-000-ae)
2. [Santé & Bien-être](#2-santé--bien-être-105-000-ae)
3. [Sport & Fitness](#3-sport--fitness-66-000-ae)
4. [Conseil & Formation](#4-conseil--formation-200-000-ae)
5. [Artisanat & BTP](#5-artisanat--btp-400-000-ae)
6. [Synthèse transverse](#6-synthèse-transverse--features-prioritaires-à-implémenter)

---

## 1. Tech & Digital (~650 000 AE)

### 1.1 Développeur web/mobile

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Développement frontend | jour | 400-700 € |
| Développement backend | jour | 450-800 € |
| Développement full-stack | jour | 500-800 € |
| Setup infrastructure (CI/CD, hosting, DNS) | forfait | 800-2 500 € |
| Maintenance applicative mensuelle | mensuel | 300-1 500 € |
| Bug fix / hotfix | heure | 60-120 € |
| Code review | heure | 80-120 € |
| Audit technique de code | jour | 600-1 200 € |
| Migration / refactoring | jour | 500-800 € |
| Formation technique client | jour | 700-1 200 € |
| Réunion de spec / discovery | heure | 80-120 € |

**Spécificités de facturation**
- **Acomptes** très fréquents : 30/30/40 ou 50/50, à formaliser proprement
- **Retainers mensuels** (forfait maintenance) → facturation récurrente
- **TVA intracommunautaire** ultra fréquente (clients UE B2B)
- **Auto-liquidation** : clients UK / hors-UE (mention art. 196 directive 2006/112/CE)
- Beaucoup d'AE qui dépassent rapidement le seuil franchise (37 500 € services)

**Mentions à injecter**
- Standard franchise TVA (déjà fait)
- Si client UE B2B : « Autoliquidation - Article 196 directive 2006/112/CE »
- Si client hors-UE : « TVA non applicable - Exportation hors Union Européenne »

**Champs profil dédiés**
- Numéro TVA intra (si > seuil franchise)
- URL portfolio / GitHub
- Stack/spécialités (utilisé pour matching client)

**Documents annexes**
- Devis détaillé par lot (UI, API, infra…)
- Contrat de prestation simple
- NDA (souvent demandé)

**Sujet mail défaut :** `Facture projet [nom du projet] - [client]`

---

### 1.2 Designer UI/UX

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Audit UX existant | jour | 600-900 € |
| User research / interviews | jour | 700-1 000 € |
| Wireframes basse-fidélité | forfait | 800-2 500 € |
| Maquettes haute-fidélité | jour | 500-800 € |
| Design system (tokens + composants) | forfait | 3 000-12 000 € |
| Atelier UX collaboratif | jour | 800-1 500 € |
| Prototype interactif Figma | forfait | 1 500-4 500 € |
| Iteration design (post-feedback) | heure | 80-120 € |
| Handoff dev (specs + assets) | forfait | 500-1 500 € |
| Test utilisateurs (5 users) | forfait | 1 200-2 500 € |

**Spécificités**
- Facturation par phase : research → design → handoff (acomptes phase par phase)
- **Cession de droits d'auteur** sur les créations (mention art. L131-3 CPI obligatoire)

**Mentions**
- « Cession de droits d'auteur conformément à l'article L131-3 du Code de la propriété intellectuelle, pour [usage défini] et [territoire] »
- Précision : cession exclusive / non-exclusive

**Documents annexes**
- Contrat avec clause cession PI
- Devis détaillé par phase

---

### 1.3 Designer graphique

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Logo (3 propositions + déclinaisons) | forfait | 800-3 500 € |
| Charte graphique complète | forfait | 1 500-5 000 € |
| Carte de visite (création) | forfait | 150-400 € |
| Plaquette commerciale | jour | 500-800 € |
| Affiche publicitaire | forfait | 400-1 200 € |
| Mise en page magazine / brochure | jour | 500-700 € |
| Retouche photo | heure | 50-90 € |
| Identité visuelle complète (logo + charte + applications) | forfait | 3 500-15 000 € |
| Refonte identité existante | forfait | 2 000-8 000 € |

**Mentions**
- Cession de droits d'auteur (idem UI/UX)
- Mention de la durée et du territoire de cession

---

### 1.4 Marketing / SEO / SEA

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Audit SEO complet | forfait | 800-3 500 € |
| Audit SEA / Ads | forfait | 600-2 000 € |
| Stratégie marketing 360° | jour | 600-1 200 € |
| Gestion campagne Google Ads (hors budget pub) | mensuel | 400-2 500 € |
| Gestion campagne Meta Ads | mensuel | 400-2 500 € |
| Gestion campagne LinkedIn Ads | mensuel | 600-3 000 € |
| Création de contenu (article SEO 1500 mots) | unité | 150-450 € |
| Stratégie éditoriale | forfait | 1 500-5 000 € |
| Newsletter (création + envoi) | unité | 200-600 € |
| Setup tracking analytics (GA4 + GTM) | forfait | 600-2 000 € |
| Reporting mensuel | mensuel | 200-600 € |
| Optimisation SEO on-page (par page) | unité | 100-250 € |

**Spécificités**
- **Retainers mensuels** dominants
- **Frais publicitaires refacturés** (Google Ads, Meta, LinkedIn) → ligne séparée avec mention
- Souvent : mandat publicitaire (le client paye Asthia qui paye les régies)

**Mentions**
- « Frais publicitaires refacturés au coût (joindre justificatifs régies) »
- Si mandat publicitaire : « Asthia agit en qualité de mandataire publicitaire »

---

### 1.5 Rédacteur web / copywriter

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Article de blog SEO | mot | 0,10-0,25 € |
| Article de blog SEO | forfait (1500 mots) | 200-450 € |
| Page produit | forfait | 80-300 € |
| Page d'accueil (landing) | forfait | 400-1 500 € |
| Newsletter | forfait | 150-500 € |
| Livre blanc | forfait | 1 500-5 000 € |
| Storytelling marque | jour | 600-1 200 € |
| Optimisation SEO existant | forfait | 80-250 € |
| Ghostwriting LinkedIn (4 posts/mois) | mensuel | 400-1 500 € |
| Relecture / correction | mot | 0,03-0,06 € |

**Unités spécifiques :** mot (le standard), feuillet 1500 signes, forfait, mensuel

**Mentions**
- Cession de droits d'auteur (article L131-3 CPI) si réutilisation par client

---

### 1.6 Traducteur

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Traduction FR > EN | mot source | 0,08-0,18 € |
| Traduction EN > FR | mot source | 0,08-0,15 € |
| Traduction technique | mot source | 0,12-0,25 € |
| Traduction juridique / médicale | mot source | 0,15-0,35 € |
| Traduction assermentée | page | 35-80 € |
| Relecture (proofreading) | mot | 0,03-0,06 € |
| Localisation app / site | forfait | sur devis |
| Sous-titrage vidéo | minute | 4-15 € |
| Interprétariat consécutif | demi-journée | 250-600 € |

**Spécificités**
- Tarif au **mot source** (standard) ou mot cible
- Couple de langues à mentionner sur la facture
- Traduction assermentée : tampon obligatoire, statut spécifique

**Mentions**
- Préciser le couple de langues (FR > EN, etc.)
- Si assermenté : « Traducteur assermenté près la Cour d'appel de [ville] »

---

### 1.7 Consultant tech / data

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Mission de conseil | jour | 700-1 500 € |
| Audit technique | forfait | 2 500-15 000 € |
| Atelier équipe | jour | 1 200-2 500 € |
| Architecture logicielle | jour | 800-1 500 € |
| Accompagnement DPO externalisé | mensuel | 800-3 500 € |
| Coaching CTO / tech lead | mensuel | 1 500-5 000 € |
| Audit RGPD | forfait | 1 500-5 000 € |

**Spécificités**
- Souvent en TJM (Taux Journalier Moyen)
- Missions longues → dépassement fréquent du seuil franchise

---

### 1.8 Community manager

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Gestion réseaux sociaux (1 réseau) | mensuel | 300-800 € |
| Gestion réseaux sociaux (3 réseaux) | mensuel | 600-2 000 € |
| Création visuel | unité | 30-120 € |
| Animation Live / Stream | heure | 80-150 € |
| Audit présence digitale | forfait | 500-1 500 € |
| Stratégie éditoriale | forfait | 800-2 500 € |
| Modération de commentaires | heure | 30-60 € |
| Reporting mensuel | inclus / mensuel | inclus |

**Spécificités :** retainers mensuels dominants

---

### 1.9 Photographe pro

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Shooting portrait studio | heure | 150-400 € |
| Reportage événementiel | heure | 200-500 € |
| Shooting produit (par photo) | unité | 30-150 € |
| Photo immobilier (par bien) | forfait | 150-400 € |
| Mariage (formule complète) | forfait | 1 200-3 500 € |
| Retouche post-production | heure | 50-100 € |
| Tirage papier qualité pro | unité | selon format |
| Frais de déplacement | forfait | sur barème kilométrique |

**Spécificités**
- **Cession de droits photo** systématique (art. L131-3 CPI)
- Préciser : usage limité (web, print, durée X) ou illimité
- Nombre de photos livrées + retouchées explicite

**Mentions**
- « Les présentes photographies sont protégées par le Code de la propriété intellectuelle. Cession des droits d'exploitation pour [usage] sur [territoire] pendant [durée]. »
- Mention « Photographe affilié AGESSA » si applicable (sécu artistes-auteurs)

---

### 1.10 Vidéaste / motion designer

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Captation vidéo | jour | 600-1 500 € |
| Montage vidéo | heure | 60-120 € |
| Motion design (par seconde de rendu) | seconde | 30-150 € |
| Sound design | forfait | 200-1 500 € |
| Étalonnage colorimétrique | heure | 80-150 € |
| Voix off (location voix + studio) | forfait | 200-800 € |
| Drone (captation aérienne) | demi-journée | 400-900 € |
| Format de livraison supplémentaire | unité | 50-200 € |

**Mentions**
- Cession de droits audiovisuels
- Préciser format de livraison (4K, 1080p, formats sociaux 9:16, 1:1, etc.)
- Si musique : préciser l'origine (libre de droits, SACEM…)

---

## 2. Santé & Bien-être (~105 000 AE)

### 2.1 Sophrologue

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance individuelle adulte 1h | séance | 50-80 € |
| Séance découverte 30 min | séance | 25-40 € |
| Séance enfant 45 min | séance | 45-70 € |
| Forfait 5 séances | pack | 230-360 € |
| Forfait 10 séances | pack | 450-700 € |
| Atelier collectif (par participant) | participant | 15-40 € |
| Intervention entreprise (gestion stress) | heure | 80-150 € |
| Programme préparation accouchement (8 séances) | forfait | 400-600 € |
| Séance à domicile | séance + déplacement | +20-40 € |
| Séance visio | séance | 40-70 € |

**Mentions OBLIGATOIRES / RECOMMANDÉES**
- ✅ « Acte non remboursé par la Sécurité Sociale » — **critique** pour remboursement mutuelle
- « Sophrologue Caycédien » (titre protégé) ou « Sophrologue diplômé(e) RNCP »
- « Praticien non médical, ne se substitue à aucun avis ou traitement médical »

**Champs profil dédiés**
- Numéro ADELI (pas obligatoire pour sophro mais utile pour mutuelles)
- École de formation (Académie Internationale de Sophrologie Caycédienne, IFS, etc.)
- Syndicat (CSC, FFS, SFS)
- Numéro RNCP du diplôme si applicable

**Spécificités de facturation**
- **Facture acquittée** indispensable (pour mutuelle)
- **Pas de TVA** (article 261-4-1° CGI pour services à la personne)
- Forfaits multi-séances très courants

**Documents annexes**
- Attestation de présence (parfois demandée par employeur)

**Sujet mail défaut :** `Votre séance du [date] - [Prénom Nom AE]`

---

### 2.2 Ostéopathe

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Consultation ostéo 45 min | séance | 55-80 € |
| Première consultation 1h (anamnèse longue) | séance | 65-95 € |
| Consultation enfant / nourrisson | séance | 55-80 € |
| Consultation femme enceinte | séance | 60-85 € |
| Consultation à domicile | séance + déplacement | +30-50 € |
| Consultation sportive avant compétition | séance | 60-90 € |
| Bilan postural complet | forfait | 80-130 € |

**Mentions OBLIGATOIRES / RECOMMANDÉES**
- ✅ « Ostéopathe DO » ou « Ostéopathe diplômé(e) en ostéopathie »
- ✅ « Acte non remboursé par la Sécurité Sociale, remboursement possible par votre mutuelle »
- Mention numéro ADELI sur la facture (très demandé par mutuelles)

**Champs profil dédiés**
- ✅ **Numéro ADELI obligatoire** (titre protégé loi Kouchner 2002)
- École de diplôme (CIDO, ESO, IDHEO, etc.)
- RPPS si médecin-ostéo

⚠️ Attention : « Ostéopathe » est un **titre protégé**. Asthia ne devrait pas
permettre à quelqu'un sans diplôme de cocher cette case (vérification ADELI ?).

**Spécificités**
- Facture acquittée systématique
- Pas de TVA

**Sujet mail défaut :** `Votre consultation du [date] - [Prénom Nom DO]`

---

### 2.3 Naturopathe

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Consultation initiale 1h30 | séance | 70-120 € |
| Consultation suivi 1h | séance | 55-85 € |
| Bilan vitalité complet | forfait | 90-150 € |
| Programme cure 3 mois (4 consultations) | forfait | 280-500 € |
| Atelier cuisine santé (par participant) | participant | 30-80 € |
| Phytothérapie (consultation + plantes) | forfait | 90-150 € |
| Programme détox saisonnier | forfait | 150-350 € |
| Consultation à distance (visio) | séance | 50-90 € |

**Mentions**
- ✅ « Praticien de santé naturopathe non médecin »
- ✅ « Acte non remboursé par la Sécurité Sociale »
- « Ne se substitue pas à un avis ou traitement médical »

**Champs profil**
- École (Cenatho, Aesculape, ADNR, ISUPNAT…)
- Fédération (FENA, Synaa)

⚠️ Pas de titre protégé en France pour naturopathe, mais certaines mutuelles
ne remboursent que les naturopathes affiliés à la FENA ou Synaa.

---

### 2.4 Hypnothérapeute

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance d'hypnose 1h | séance | 80-150 € |
| Séance arrêt tabac (forfait 1-3 séances) | forfait | 200-400 € |
| Programme gestion poids (5 séances) | forfait | 400-700 € |
| Séance gestion anxiété / phobie | séance | 90-150 € |
| Séance enfant 45 min | séance | 70-110 € |
| Forfait accompagnement (10 séances) | forfait | 800-1 400 € |
| Hypnose à distance (visio) | séance | 70-130 € |

**Mentions**
- « Praticien en hypnose ericksonienne » (selon école)
- « Pratique non médicale, ne se substitue pas à un avis médical »
- « Acte non remboursé par la Sécurité Sociale »

**Champs profil**
- École (IFHE, ARCHE, AFNH, IRHYS)
- Spécialisations (PNL, EFT, etc.)

---

### 2.5 Magnétiseur / énergéticien

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance magnétisme 1h | séance | 50-100 € |
| Séance Reiki 1h | séance | 60-100 € |
| Séance à distance | séance | 40-80 € |
| Coupeur de feu (intervention urgence) | intervention | gratuit/don |
| Soin énergétique multi-techniques | séance | 70-120 € |

**Mentions**
- « Pratique énergétique non médicale »
- « Ne se substitue à aucun traitement médical »

**Spécificités**
- Profession non réglementée
- Certains travaillent au don (« libre participation »)

---

### 2.6 Réflexologue

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance réflexologie plantaire 1h | séance | 50-80 € |
| Séance palmaire 45 min | séance | 45-70 € |
| Séance faciale | séance | 50-80 € |
| Forfait 5 séances | pack | 220-360 € |
| Réflexologie en entreprise (chaise) | heure | 80-120 € |

**Mentions**
- « Acte non remboursé par la SS »
- « Praticien non médical »

**Champs profil :** école (FFR, FEFRA, IFR, CSCRP)

---

### 2.7 Praticien shiatsu

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance shiatsu traditionnel 1h | séance | 60-100 € |
| Shiatsu sur chaise en entreprise (par personne 20min) | personne | 20-40 € |
| Forfait entreprise (1 journée 15 personnes) | forfait | 600-1 200 € |
| Forfait 5 séances individuelles | pack | 280-450 € |

**Mentions**
- « Spécialiste en shiatsu certifié SPS » (Syndicat Pro Shiatsu) si certifié

---

### 2.8 Acupuncteur

⚠️ **ATTENTION RÉGLEMENTAIRE** : l'acupuncture est légalement réservée aux
**médecins, sages-femmes (cadre limité) et kinés (cadre limité)** en France.
Un AE non-professionnel de santé ne peut PAS pratiquer l'acupuncture.

Préférer les libellés :
- « Praticien en médecine traditionnelle chinoise (MTC) »
- « Praticien shiatsu » (cf. 2.7)

Asthia devrait probablement **ne pas proposer ce métier** dans la liste pour
éviter de faciliter l'exercice illégal.

---

### 2.9 Diététicien libéral

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Consultation diététique adulte | séance | 50-80 € |
| Première consultation 1h | séance | 60-90 € |
| Consultation pédiatrique | séance | 55-85 € |
| Bilan alimentaire complet | forfait | 80-150 € |
| Programme nutrition 3 mois | forfait | 300-600 € |
| Atelier collectif | participant | 25-60 € |
| Intervention en entreprise | heure | 80-150 € |
| Suivi sportif performance | séance | 70-120 € |

**Mentions OBLIGATOIRES / RECOMMANDÉES**
- ✅ « Diététicien diplômé » (titre protégé depuis 2007)
- « Acte non remboursé par la SS sauf prescription médicale »

**Champs profil**
- ✅ **Numéro ADELI obligatoire**
- Diplôme : BTS Diététique ou DUT Génie biologique option diététique

⚠️ Titre protégé — Asthia devrait demander vérification.

---

### 2.10 Coach en méditation

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance méditation guidée individuelle 1h | séance | 60-100 € |
| Atelier hebdomadaire (par participant) | participant | 12-30 € |
| Retraite week-end | forfait | 200-450 € |
| Programme MBSR 8 semaines | forfait | 350-650 € |
| Intervention entreprise | heure | 100-200 € |
| Séance enfant 30 min | séance | 30-60 € |

**Mentions :** pas de titre protégé. Préciser certification (MBSR, PSM, etc.)

---

## 3. Sport & Fitness (~66 000 AE)

### 3.1 Coach sportif personnel

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance individuelle 1h | séance | 50-100 € |
| Séance duo (binôme, prix par personne) | personne | 35-60 € |
| Séance trio | personne | 25-45 € |
| Pack 10 séances | pack | 450-900 € |
| Pack 20 séances | pack | 800-1 600 € |
| Bilan initial + programme | forfait | 80-180 € |
| Programme à distance + suivi | mensuel | 80-200 € |
| Visio coaching | séance | 30-70 € |
| Coaching nutrition (consultation) | séance | 40-80 € |
| Séance à domicile | séance + déplacement | +15-30 € |

**Mentions OBLIGATOIRES**
- ✅ **Carte professionnelle d'éducateur sportif n°XXXXXXXXXXXXXX** (article L212-1 Code du sport)
- ✅ Mention assurance RC Pro (assureur + n° contrat)

**Champs profil dédiés**
- ✅ **Numéro carte pro éducateur sportif** (14 caractères) — bloquant légalement
- Diplôme (BPJEPS AF/AGFF, CQP IF, DEUST, Licence STAPS)
- Spécialisation (musculation, prépa physique, perte de poids, post-natal…)
- Assureur RC Pro + n° contrat

**Spécificités**
- **Forfaits multi-séances** ultra fréquents (pack 10, pack 20)
- Validité du pack à mentionner (ex : « valable 6 mois »)
- Pas de TVA

⚠️ **Sans carte pro = exercice illégal**. Asthia devrait bloquer la facturation
si la carte pro n'est pas renseignée pour ce métier.

---

### 3.2 Prof de yoga

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Cours individuel 1h | séance | 50-90 € |
| Cours à domicile | séance + déplacement | +15-30 € |
| Cours collectif (par participant) | participant | 12-25 € |
| Atelier thématique (chakras, prana, etc.) | participant | 30-60 € |
| Stage week-end | forfait | 150-350 € |
| Yoga en entreprise (cours hebdo) | mensuel | 400-1 200 € |
| Cours pré/post-natal | séance | 55-90 € |
| Yoga thérapie (1h30) | séance | 70-120 € |

**Mentions / Champs**
- « Professeur diplômé » + école/lignée
- École : FFEY, Yoga Alliance (200h, 500h), Sivananda, Iyengar, Ashtanga
- Assurance RC Pro recommandée

⚠️ Le yoga **n'est PAS soumis à carte pro éducateur sportif** (jurisprudence)
sauf si présenté comme « activité physique et sportive » au sens strict.
Mais beaucoup le prennent par sécurité.

---

### 3.3 Prof de pilates

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Cours individuel Reformer 1h | séance | 60-100 € |
| Cours collectif Mat | participant | 15-30 € |
| Cours duo Reformer (par personne) | personne | 35-55 € |
| Pack 10 séances Reformer | pack | 550-900 € |
| Cours pré/post-natal | séance | 60-90 € |
| Stage week-end | forfait | 200-400 € |

**Mentions / Champs**
- « Instructeur certifié » + école (Polestar, Stott, Balanced Body, BASI)
- Carte pro éducateur sportif si présenté comme APS

---

### 3.4 Coach CrossFit

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Open gym (accès libre) | heure | 12-25 € |
| Coaching personnel CrossFit | séance | 60-100 € |
| Programme nutrition + entraînement | forfait | 200-450 € |
| Stage haltérophilie | jour | 80-150 € |
| Pass mensuel | mensuel | 80-180 € |

**Mentions**
- ✅ Carte pro éducateur sportif obligatoire
- Niveau CF-L1 / CF-L2 / CF-L3 (très important côté communauté CrossFit)

---

### 3.5 Préparateur physique

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance prépa physique individuelle | heure | 50-100 € |
| Programme saison sportive (athlète) | forfait | 1 200-5 000 € |
| Préparation compétition (3 mois) | mensuel | 400-1 200 € |
| Bilan condition physique complet | forfait | 80-180 € |
| Consulting club / équipe | jour | 600-1 500 € |
| Programme à distance avec visio | mensuel | 150-400 € |

**Mentions :** carte pro éducateur sportif

**Spécificités**
- Souvent contrats avec clubs (factures mensuelles)
- Athlètes individuels (forfait saison)

---

### 3.6 Coach running / triathlon

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Plan d'entraînement personnalisé | mensuel | 60-180 € |
| Séance VMA / fractionné | séance | 30-70 € |
| Préparation marathon (16 semaines) | forfait | 250-600 € |
| Préparation trail / ultra | forfait | 350-900 € |
| Coaching mental | séance | 60-120 € |
| Analyse de course (vidéo) | forfait | 80-200 € |

**Mentions :** carte pro éducateur sportif

---

### 3.7 Coach nutrition sportive

⚠️ **ATTENTION** : la « nutrition » est dans une zone grise. Le titre de
**diététicien** est protégé. Un coach sportif peut faire du « conseil en
hygiène de vie » mais pas se présenter comme diététicien sans diplôme.

Libellés sécurisés :
- « Conseil en nutrition sportive »
- « Conseil hygiène de vie sportive »
- ❌ NE PAS utiliser « Consultation diététique » sans diplôme

**Templates**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Bilan nutrition sportive | forfait | 80-180 € |
| Plan alimentaire compétition | forfait | 150-400 € |
| Suivi mensuel | mensuel | 80-200 € |
| Consultation perte de poids sportive | séance | 50-100 € |

---

### 3.8 Prof d'arts martiaux

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Cours individuel | séance | 50-100 € |
| Cours collectif (par participant) | participant | 12-25 € |
| Stage thématique (week-end) | forfait | 80-200 € |
| Préparation passage de grade | forfait | 200-600 € |
| Self-défense en entreprise | heure | 100-200 € |
| Cours enfant (par trimestre) | trimestriel | 100-200 € |

**Mentions :** carte pro éducateur sportif + diplôme fédéral (DAF, DIF, BEES, BPJEPS APT)

---

### 3.9 Maître-nageur libéral

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Cours individuel piscine 1h | séance | 35-70 € |
| Apprentissage natation enfant | séance | 30-50 € |
| Aquagym (par participant) | participant | 8-15 € |
| Surveillance baignade | heure | 25-45 € |
| Stage natation 5 jours | forfait | 120-300 € |
| Préparation BNSSA (formation) | forfait | 250-500 € |

**Mentions OBLIGATOIRES**
- ✅ BNSSA, BEESAN, ou MNS (Maître Nageur Sauveteur)
- ✅ Carte pro éducateur sportif
- ✅ Assurance RC Pro

---

## 4. Conseil & Formation (~200 000 AE)

### 4.1 Consultant stratégie / RH

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Mission de conseil | jour | 800-2 500 € |
| Atelier équipe (séminaire 1 jour) | jour | 1 500-4 000 € |
| Audit organisationnel | forfait | 3 000-15 000 € |
| Accompagnement transformation (mensuel) | mensuel | 2 000-8 000 € |
| Recrutement (forfait au poste) | poste | 3 000-15 000 € |
| Coaching dirigeant (cycle 6 mois) | forfait | 3 500-12 000 € |
| Réunion de cadrage / kick-off | demi-journée | 600-1 200 € |
| Restitution / présentation copil | demi-journée | 800-1 500 € |

**Spécificités**
- TJM dominant
- Retainers mensuels
- Missions longues → dépassement franchise très fréquent
- Acomptes courants (30/30/40)

---

### 4.2 Coach professionnel

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance coaching individuel 1h | séance | 80-200 € |
| Forfait 6 séances + bilan | forfait | 600-1 800 € |
| Coaching équipe (1 jour) | jour | 1 200-3 500 € |
| Coaching dirigeant (cycle 10 séances) | forfait | 1 500-5 000 € |
| Intervention codir | jour | 1 500-3 500 € |
| Bilan de compétences | forfait | 1 500-2 500 € |
| Coaching reconversion (3 mois) | forfait | 1 800-3 500 € |

**Mentions**
- « Coach certifié » + fédération (ICF, EMCC, SF Coach)
- Si certifié RNCP : numéro RNCP + niveau
- Bilan de compétences = peut être éligible CPF si Qualiopi → mentions spécifiques

---

### 4.3 Formateur CPF / Formation pro continue

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Journée de formation (intra) | jour | 1 200-3 000 € |
| Demi-journée de formation | demi-journée | 600-1 500 € |
| Module e-learning créé | forfait | 1 500-8 000 € |
| Suivi pédagogique post-formation | heure | 80-150 € |
| Évaluation finale (certification) | forfait | 200-500 € |
| Frais de déplacement | forfait | barème |
| Support pédagogique imprimé | unité | 15-50 € |
| Conception programme sur mesure | jour | 800-1 500 € |

**Mentions OBLIGATOIRES**
- ✅ **Numéro de Déclaration d'Activité (NDA)** : format `XX YY ZZZZZ ZZ`
- ✅ « Mention exonération TVA - article 261-4-4° du CGI » (si agréé)
- Si Qualiopi : « Organisme certifié Qualiopi - n° certificat XXXX » + organisme certificateur
- Si éligible CPF : « Cette action de formation est éligible au CPF »

**Champs profil dédiés**
- ✅ **NDA** (bloquant pour cette activité)
- Certification Qualiopi (n° + organisme + date validité)
- Référent pédagogique (parfois différent du gérant)

**Documents annexes (TRÈS importants pour ce métier)**
- **Convention de formation B2B** (obligatoire dès la 1ère heure facturée à une entreprise)
- **Contrat de formation B2C** (obligatoire pour particuliers)
- **Programme pédagogique** (à joindre au devis : objectifs, prérequis, durée, modalités, évaluation)
- **Feuille d'émargement** (à signer pendant la formation)
- **Attestation de présence** (en fin)
- **Certificat de réalisation** (pour BCE / OPCO)
- **Bilan pédagogique annuel (BPF)** (à transmettre à la DREETS)

⚠️ Le formateur est presque une **sous-app à part** dans Asthia. C'est le métier
le plus complexe en termes de documents annexes.

**Sujet mail défaut :** `[Nom de la formation] - [Date] - [Client]`

---

### 4.4 Conférencier / speaker

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Conférence 1h | forfait | 1 500-8 000 € |
| Conférence 2h | forfait | 2 500-12 000 € |
| Atelier interactif | heure | 800-2 500 € |
| Keynote événement | forfait | 3 000-15 000 € |
| Conférence en visio | forfait | 800-3 500 € |
| Frais de déplacement (déplacement + hébergement) | forfait | sur barème |
| Cession droits enregistrement | forfait | sur devis |

**Mentions**
- Cession de droits intellectuels (utilisation enregistrement, captation, diffusion)
- Préciser durée et territoire de cession

---

### 4.5 Recruteur freelance

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Recrutement au succès (% du salaire annuel brut) | % | 12-25 % |
| Forfait recrutement (par poste) | poste | 3 000-15 000 € |
| Sourcing pur (LinkedIn / DB) | heure | 60-120 € |
| Pré-qualification candidats | heure | 60-120 € |
| Aide à l'onboarding | forfait | 500-2 000 € |
| Audit fonction RH | forfait | 1 500-5 000 € |

**Spécificités**
- **Facturation au succès** (% salaire brut annuel) très répandue
- Souvent acompte à la signature + solde au placement effectif
- Garantie remplacement (3-6 mois) à mentionner sur devis

---

### 4.6 Consultant juridique light

⚠️ **ATTENTION RÉGLEMENTAIRE TRÈS IMPORTANT**

Le **conseil juridique** est réglementé par la loi du 31 décembre 1971 (art.
54). Un AE non-avocat ne peut PAS faire du « conseil juridique » général
rémunéré. Ce qu'il peut faire :

✅ **Autorisé**
- DPO externalisé / RGPD
- Conseil en droit social sur mission ponctuelle (si compétence justifiée)
- Rédaction de CGV/CGU « modèles » (sans personnalisation lourde)
- Mise en conformité (RGPD, accessibilité…)
- Conseil pour création d'entreprise (formalités, pas conseil juridique)

❌ **Interdit**
- Se présenter comme « consultant juridique »
- Rédiger des actes juridiques sur mesure
- Représenter / défendre devant un tribunal
- Donner des consultations juridiques générales

**Templates (si périmètre OK)**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Audit RGPD | forfait | 1 500-5 000 € |
| DPO externalisé | mensuel | 600-3 000 € |
| Mise en conformité RGPD | forfait | 2 500-15 000 € |
| Rédaction CGV/CGU modèle | forfait | 600-2 500 € |
| Atelier RGPD équipe | jour | 800-2 000 € |

---

### 4.7 Mentor business

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Séance mentorat individuel 1h | séance | 100-300 € |
| Forfait 6 séances | pack | 600-1 800 € |
| Mastermind groupé (mensuel) | mensuel | 200-800 € |
| Audit business / startup | forfait | 800-3 000 € |
| Programme accompagnement 3 mois | forfait | 1 500-6 000 € |
| Office hours (heures supplémentaires) | heure | 100-300 € |

---

### 4.8 Auditeur indépendant

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Audit qualité (ISO 9001) | jour | 800-1 500 € |
| Audit fournisseur | jour | 700-1 200 € |
| Pré-audit certification | jour | 600-1 200 € |
| Suivi annuel | forfait | 1 500-5 000 € |
| Audit énergétique | forfait | 2 500-8 000 € |
| Rapport d'audit (rédaction) | jour | 600-1 000 € |

**Spécificités**
- Souvent certifié IRCA, AFAQ, etc. — à mentionner

---

## 5. Artisanat & BTP (~400 000 AE)

### 5.1 Plombier

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Main d'œuvre | heure | 45-80 € |
| Déplacement | forfait | 30-60 € |
| Recherche de fuite | forfait | 80-200 € |
| Débouchage canalisation | forfait | 100-300 € |
| Installation chaudière gaz | forfait | 1 500-4 500 € |
| Installation chaudière à condensation | forfait | 3 000-7 000 € |
| Pompe à chaleur air-eau | forfait | 8 000-15 000 € |
| Entretien annuel chaudière | forfait | 100-180 € |
| Intervention urgence (nuit/dimanche) | forfait + majoration | +50-100% |
| Remplacement chauffe-eau | forfait | 600-1 500 € |
| Pose WC suspendu (avec bâti-support) | forfait | 400-1 200 € |
| Remplacement robinetterie | unité | 80-250 € |
| Fourniture (matériel) | unité | au coût + marge |

**Mentions OBLIGATOIRES**
- ✅ **Décennale** : nom assureur + n° contrat + zone géographique
- ✅ Médiateur consommation (B2C)
- ✅ Devis obligatoire dès **1500€ TTC**
- ✅ Date de début + durée estimée des travaux (sur devis)
- Mention sous-traitance si applicable (loi 1975)

**Champs profil dédiés**
- ✅ **Assureur décennale** (nom de la compagnie)
- ✅ **N° contrat décennale**
- ✅ **Zone géographique couverte**
- Médiateur consommation (déjà géré)
- Qualifications RGE (pour aides type MaPrimeRénov')
- QualiPAC (pompes à chaleur), QualiBois (chauffage bois)

**Spécificités**
- TVA 10% en rénovation logement >2 ans (si dépassé franchise)
- TVA 5,5% travaux énergétiques éligibles (si dépassé franchise)
- Acomptes : 30% à la signature très standard

**Documents annexes**
- Devis détaillé par poste
- Attestation TVA réduite (à faire signer par le client pour 10% / 5,5%)
- Procès-verbal de réception des travaux

**Sujet mail défaut :** `Devis - [Description courte] - [Adresse intervention]`

---

### 5.2 Électricien

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Main d'œuvre | heure | 45-80 € |
| Tableau électrique complet (mise aux normes) | forfait | 1 500-4 000 € |
| Installation prise courant | unité | 80-150 € |
| Installation interrupteur | unité | 60-120 € |
| Mise aux normes NF C 15-100 | forfait | 2 500-8 000 € |
| Diagnostic électrique complet | forfait | 200-500 € |
| Domotique (par pièce équipée) | forfait | 1 500-5 000 € |
| Borne de recharge VE 7kW | forfait | 1 200-2 500 € |
| Borne de recharge VE 22kW | forfait | 2 500-5 000 € |
| Installation luminaires (par point) | unité | 80-200 € |
| Recherche de panne | forfait | 80-200 € |
| Mise à la terre | forfait | 400-900 € |

**Mentions OBLIGATOIRES**
- ✅ Décennale
- ✅ Conformité NF C 15-100
- Pour bornes véhicules électriques : qualification IRVE
- Pour photovoltaïque : QualiPV

**Champs profil**
- Décennale (idem plombier)
- IRVE (Installation de Recharge de Véhicule Électrique) — niveau 1/2/3
- QualiPV, QualiSol (pour solaire)

---

### 5.3 Peintre en bâtiment

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Préparation murs (rebouchage, ponçage) | m² | 8-15 € |
| Peinture mate 2 couches | m² | 15-30 € |
| Peinture satinée 2 couches | m² | 18-35 € |
| Peinture velours / nettoyable | m² | 20-40 € |
| Peinture plafond 2 couches | m² | 18-32 € |
| Enduit de lissage | m² | 12-22 € |
| Pose papier peint / intissé | m² | 18-35 € |
| Vernis / lasure boiseries | ml | 10-25 € |
| Peinture porte (les 2 faces) | unité | 60-150 € |
| Peinture radiateur | unité | 50-120 € |
| Décollage ancien revêtement | m² | 6-12 € |
| Protection sols et meubles | forfait | 80-250 € |

**Unités principales :** m², ml (mètre linéaire), unité, forfait

**Mentions :** décennale, médiateur consommation

---

### 5.4 Menuisier / ébéniste

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Pose porte intérieure | unité | 200-500 € |
| Fenêtre PVC (fourniture + pose) | unité | 600-2 500 € |
| Fenêtre alu (fourniture + pose) | unité | 900-3 500 € |
| Parquet stratifié (pose) | m² | 18-35 € |
| Parquet massif (pose) | m² | 35-80 € |
| Plinthes (pose) | ml | 8-15 € |
| Meuble sur mesure (cuisine, dressing) | forfait | sur devis |
| Escalier sur mesure | forfait | 2 500-15 000 € |
| Verrière intérieure | m² | 400-900 € |
| Volet roulant (fourniture + pose) | unité | 500-1 500 € |
| Pergola bois | m² | 200-600 € |

**Mentions :** décennale (pour menuiserie extérieure surtout)

---

### 5.5 Maçon

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Mur parpaing | m² | 80-150 € |
| Mur pierre apparente | m² | 250-500 € |
| Dalle béton | m² | 60-120 € |
| Chape (béton ou anhydrite) | m² | 25-50 € |
| Carrelage extérieur | m² | 80-150 € |
| Démolition cloison | forfait/m² | 30-80 € |
| Terrassement | m³ | 40-80 € |
| Évacuation gravats | m³ | 50-150 € |
| Mur de soutènement | m² | 250-500 € |
| Création ouverture (porte/fenêtre dans mur porteur) | forfait | 1 500-4 500 € |

**Mentions :** ✅ **Décennale OBLIGATOIRE** (gros œuvre = sinistres décennale fréquents)

---

### 5.6 Carreleur

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Pose carrelage sol (droit) | m² | 35-65 € |
| Pose carrelage sol (en diagonale) | m² | 45-80 € |
| Pose carrelage mural | m² | 40-70 € |
| Pose mosaïque | m² | 80-150 € |
| Préparation support (ragréage) | m² | 15-35 € |
| Joints (rebouchage / réfection) | ml | 5-12 € |
| Plinthes carrelage | ml | 10-20 € |
| Dépose ancien carrelage | m² | 15-35 € |

**Mentions :** décennale

---

### 5.7 Couvreur

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Couverture tuiles (dépose + pose) | m² | 80-180 € |
| Couverture ardoise | m² | 120-250 € |
| Zinguerie (gouttières, descentes) | ml | 60-150 € |
| Démoussage toiture | m² | 8-15 € |
| Réparation fuite ponctuelle | forfait | 200-600 € |
| Pose Velux (avec habillage intérieur) | unité | 1 500-3 500 € |
| Isolation comble par soufflage | m² | 25-50 € |
| Isolation comble (rouleau) | m² | 35-65 € |
| Faîtage (réfection) | ml | 50-100 € |

**Mentions OBLIGATOIRES**
- ✅ **Décennale OBLIGATOIRE** (toiture = grand classique des sinistres)
- Qualifications QualiToit RGE (pour aides énergie)

---

### 5.8 Plaquiste

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Cloison BA13 (avec ossature) | m² | 35-65 € |
| Plafond suspendu | m² | 40-75 € |
| Doublage isolant (placo + isolant) | m² | 45-80 € |
| Faux plafond décoratif | m² | 60-130 € |
| Aménagement combles complet | m² | 80-200 € |
| Bandes et enduits (finition) | m² | 12-25 € |
| Cloison phonique | m² | 50-90 € |
| Coffrage gaines techniques | ml | 30-60 € |

**Mentions :** décennale (pour cloisons porteuses), recommandée pour le reste

---

### 5.9 Jardinier / paysagiste

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Tonte pelouse | m² ou forfait | 0,15-0,35 €/m² |
| Taille haie | ml ou forfait | 6-15 €/ml |
| Élagage arbre (selon hauteur) | unité | 80-500 € |
| Entretien mensuel jardin | mensuel | 80-300 € |
| Création massif (conception + plantation) | forfait | 200-1 500 € |
| Plantation arbre | unité | 80-300 € |
| Évacuation déchets verts | m³ | 30-80 € |
| Pose gazon en rouleau | m² | 8-18 € |
| Création terrasse bois | m² | 150-350 € |
| Pose clôture | ml | 60-180 € |
| Bassin / fontaine | forfait | sur devis |
| Arrosage automatique (par zone) | forfait | 800-3 500 € |

**Mentions / Spécificités**
- Pas de décennale obligatoire (sauf si conception jardin avec maçonnerie/bassin)
- ✅ **Service à la personne** possible : agrément SAP → mention « Services à la personne, agrément n°XXXX » → permet au client une **déduction fiscale 50%** !
- Très gros levier commercial pour les jardiniers : « Asthia génère votre attestation fiscale annuelle »

**Champs profil**
- Agrément SAP (numéro)
- CACES tronçonneuse / élagage si applicable

**Document annexe spécial :** **attestation fiscale annuelle** pour le client (pour sa déclaration de revenus, CERFA 11572)

---

### 5.10 Climaticien

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Installation clim mono-split | forfait | 1 500-3 000 € |
| Installation multi-split (par split supplémentaire) | forfait/unité | +800-1 500 € |
| Pompe à chaleur air-eau | forfait | 8 000-18 000 € |
| Pompe à chaleur air-air | forfait | 4 000-10 000 € |
| Entretien annuel | forfait | 100-200 € |
| Recharge fluide frigorigène | forfait | 80-250 € |
| Diagnostic dépannage | forfait | 80-180 € |
| Désinstallation | forfait | 200-500 € |

**Mentions OBLIGATOIRES**
- ✅ Décennale
- ✅ **Attestation de capacité fluides frigorigènes** (manipulation HFC)
- ✅ **QualiPAC** pour les PAC (obligatoire pour aides énergie)
- ✅ Qualifications RGE pour MaPrimeRénov'

**Champs profil**
- Attestation de capacité (catégorie I, II, III, IV)
- QualiPAC (n° + validité)

---

### 5.11 Serrurier

**Templates de prestation**

| Libellé | Unité | Prix indicatif |
|---|---|---|
| Ouverture porte (sans dégât) | forfait | 80-200 € |
| Ouverture porte blindée | forfait | 200-500 € |
| Changement serrure standard | forfait | 150-350 € |
| Changement serrure haute sécurité (A2P) | forfait | 350-800 € |
| Blindage porte | forfait | 800-2 500 € |
| Pose porte blindée | forfait | 1 500-4 500 € |
| Pose coffre fort | forfait | 200-800 € |
| Intervention urgence (nuit/we) | forfait + majoration | +50-100% |

**Mentions OBLIGATOIRES**
- ✅ Décennale (pour pose éléments fixés à demeure)
- ✅ **Information préalable du consommateur** sur les tarifs en cas d'urgence (loi anti-arnaque serruriers)
- Devis obligatoire dès 1500€ TTC

⚠️ Profession très encadrée contre les arnaques. Asthia devrait **forcer un
affichage tarifaire clair** pour les serruriers (pré-remplir un tableau de
tarifs en grille).

---

## 6. Synthèse transverse — features prioritaires à implémenter

### 6.1 Features bloquantes pour TOUS les secteurs

1. **Lignes multiples sur facture/devis** — refacto DB obligatoire (table `invoice_items`).
   Sans ça, BTP, Tech et Conseil ne sont pas vraiment utilisables.

2. **Acomptes** — Tech, BTP, Formation, Conseil. Système de facture d'acompte
   liée à une facture finale, avec déduction auto sur la facture de solde.

3. **Catégorisation à l'onboarding** (champ libre + Mistral classifier).
   Profil avec `secteurs: text[]` (multi-secteurs possible).

4. **Templates de prestation seedés par secteur** — table
   `prestation_templates` pré-remplie selon `secteurs[]`.

5. **Mentions légales auto par secteur** — `lib/sector-rules.ts` qui injecte
   automatiquement les mentions critiques (décennale BTP, "non remboursé SS"
   santé, NDA formation, etc.).

6. **Alerte seuil franchise TVA** — dashboard qui prévient à 80% / 100% du
   seuil et propose la bascule.

### 6.2 Champs profil à demander selon le secteur

| Métier | Champ obligatoire | Champ recommandé |
|---|---|---|
| Ostéopathe | ADELI | École, RPPS |
| Diététicien | ADELI | École |
| Sophrologue | — | ADELI, école, RNCP |
| Coach sportif (tous) | Carte pro éducateur sportif | Diplôme, RC pro |
| Maître-nageur | BNSSA/MNS, Carte pro | RC pro |
| Formateur CPF | NDA | Qualiopi (n° + organisme) |
| Tous BTP | Décennale (assureur+contrat+zone) | RGE, qualifications spécifiques |
| Plombier | Décennale | QualiPAC, QualiBois |
| Électricien | Décennale | IRVE, QualiPV |
| Climaticien | Décennale, attestation fluides | QualiPAC |
| Couvreur | Décennale | QualiToit |
| Jardinier | — | Agrément SAP (très important commercialement) |
| Tech (>seuil) | Numéro TVA intra | — |

### 6.3 Documents annexes par secteur

| Secteur | Documents à générer (au-delà facture/devis) |
|---|---|
| Tech | Contrat de prestation, NDA, cession PI |
| Santé | Attestation de présence (parfois), facture acquittée (déjà géré) |
| Sport | Attestation séances effectuées, facture acquittée pour CE |
| Formation | Convention de formation B2B, contrat B2C, programme pédago, feuille d'émargement, attestation de présence, certificat de réalisation, BPF annuel |
| BTP | Devis détaillé, attestation TVA réduite, PV de réception, attestation décennale (déjà fournie par assureur) |
| Jardinier (SAP) | Attestation fiscale annuelle (CERFA 11572) |

### 6.4 Sujets de mail par défaut

| Secteur | Sujet par défaut suggéré |
|---|---|
| Tech | `Facture projet [nom du projet] - [client]` |
| Santé | `Votre séance/consultation du [date]` |
| Sport | `Votre séance du [date] - [Coach]` |
| Formation | `[Nom de la formation] - [Date] - [Client]` |
| BTP | `Devis - [Description courte] - [Adresse intervention]` |

### 6.5 Spécificités de facturation par secteur

| Spécificité | Secteurs concernés | Priorité |
|---|---|---|
| Lignes multiples détaillées | TOUS | 🔴 Bloquant |
| Acomptes (30/30/40 ou 50/50) | Tech, BTP, Formation, Conseil | 🔴 Bloquant |
| Forfaits multi-séances (pack 10, 20…) | Sport, Santé | 🟠 Important |
| Retainers mensuels (récurrence) | Tech, Marketing, Conseil | 🟠 Important |
| Facture acquittée (mutuelle) | Santé | ✅ Déjà fait |
| TVA 5,5% / 10% / 20% | BTP (>seuil) | 🟡 Phase 2 |
| TVA intracommunautaire (autoliquidation) | Tech (>seuil) | 🟡 Phase 2 |
| Cession droits PI / auteur | Designer, photographe, vidéaste, rédacteur | 🟠 Important |
| Facturation au % succès | Recruteur freelance | 🟢 Niche |
| Service à la personne (50% déduction) | Jardinier (SAP), aide à dom. | 🟠 Important pour jardinier |
| Situations de travaux (% avancement) | BTP gros chantiers | 🟢 Niche (10-15%) |

### 6.6 Roadmap suggérée

**Sprint 1 (fondations) — 2 semaines**
- Refacto DB : table `invoice_items` + migration
- UI : éditeur de lignes multiples sur facture et devis
- Backend : calcul des totaux, génération PDF avec table multi-lignes
- PDF : refonte du layout pour gérer N lignes

**Sprint 2 (catégorisation) — 1 semaine**
- Champ libre activité à l'onboarding
- Endpoint `/api/ai/classify-activity` (Mistral)
- Profil : `secteurs text[]`, `metiers_precis text[]`, `activity_description text`
- UI : chips éditables après classification

**Sprint 3 (templates) — 1 semaine**
- Table `prestation_templates`
- Seed par secteur (les 5)
- UI : « + Ajouter une ligne » avec dropdown templates triés par usage récent
- Stats : `usage_count` mis à jour à chaque utilisation

**Sprint 4 (mentions légales auto) — 1 semaine**
- `lib/sector-rules.ts` avec config par secteur
- Injection auto sur PDF facture + devis selon `secteurs[]` du profil
- Champs profil dédiés par secteur (UI conditionnelle)

**Sprint 5 (acomptes) — 2 semaines**
- Modèle : facture d'acompte liée à une facture finale
- Numérotation spécifique acompte
- Déduction auto sur facture finale
- PDF acompte vs facture finale

**Sprint 6 (alertes franchise + spécifiques) — 1 semaine**
- Suivi CA temps réel (déjà partiellement fait)
- Alerte 80% / 100% du seuil
- Onboarding bascule TVA réelle (UI + assistance)

**Sprint 7+ (long tail métier-spécifique)**
- Module formation (convention, programme, émargement)
- Module SAP jardinier (attestation fiscale annuelle)
- Cession PI auto pour designers/photographes
- Forfaits multi-séances pour sport/santé

---

*Document maintenu par Asthia — dernière mise à jour : 2026-05*
