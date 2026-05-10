// Génère un deck 4-slides : analyse concurrentielle + coût infra + prospects.
const PptxGenJS = require("pptxgenjs");

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 inches

// Palette Ocean Gradient
const COLORS = {
  primary: "065A82",
  primaryLight: "1C7293",
  accent: "21295C",
  text: "1F2937",
  textMuted: "6B7280",
  border: "E2E8F0",
  bg: "FFFFFF",
  rowAlt: "F8FAFC",
  asthiaHighlight: "EFF6FB",
  good: "059669",
  bad: "DC2626",
  // Couleurs sectorielles pour les cards Prospects
  sectorTech: "065A82",
  sectorSante: "0F766E",
  sectorSport: "B45309",
  sectorConseil: "5B21B6",
  sectorArtisan: "A16207",
  sectorBeaute: "BE185D",
  sectorCrea: "C2410C",
  sectorEducation: "1E40AF",
  sectorAnimaux: "78350F",
};

const FONT_HEADER = "Calibri";
const FONT_BODY = "Calibri";

// ───────────────────────────────────────────────────────────────────────
// SLIDE 1 — Comparaison fonctionnelle Asthia vs concurrents
// ───────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bg };

  slide.addText("Asthia vs concurrents", {
    x: 0.5, y: 0.35, w: 12.3, h: 0.6,
    fontSize: 32, bold: true, fontFace: FONT_HEADER, color: COLORS.accent,
  });
  slide.addText("Comparaison fonctionnelle — facturation + déclaration URSSAF pour auto-entrepreneurs", {
    x: 0.5, y: 0.95, w: 12.3, h: 0.35,
    fontSize: 14, italic: true, fontFace: FONT_BODY, color: COLORS.textMuted,
  });

  const headerCell = (text, bg = COLORS.primary, color = "FFFFFF") => ({
    text,
    options: {
      bold: true, align: "center", valign: "middle", color,
      fill: { color: bg }, fontFace: FONT_HEADER, fontSize: 12,
    },
  });

  const cell = (text, opts = {}) => ({
    text,
    options: {
      align: opts.align || "center", valign: "middle",
      color: opts.color || COLORS.text,
      fill: opts.fill ? { color: opts.fill } : undefined,
      fontFace: FONT_BODY, fontSize: opts.fontSize || 11,
      bold: opts.bold || false,
    },
  });

  const yes = (highlight = false) =>
    cell("✓", { color: COLORS.good, bold: true, fontSize: 14, fill: highlight ? COLORS.asthiaHighlight : undefined });
  const no = () => cell("—", { color: COLORS.textMuted, bold: false, fontSize: 14 });
  const yesH = () => yes(true);

  const rows = [
    [
      headerCell("Fonctionnalité", COLORS.accent),
      headerCell("Asthia", COLORS.primary),
      headerCell("Abby"),
      headerCell("Indy"),
      headerCell("Henrri"),
      headerCell("Freebe"),
      headerCell("Tiime"),
    ],
    [cell("Facturation Factur-X / PDF/A-3", { align: "left", bold: true }), yesH(), yes(), yes(), yes(), yes(), yes()],
    [cell("Déclaration URSSAF (API TDAE)", { align: "left", bold: true }), yesH(), yes(), yes(), no(), yes(), yes()],
    [cell("Devis & avoirs", { align: "left", bold: true }), yesH(), yes(), yes(), yes(), yes(), yes()],
    [cell("Logo personnalisé", { align: "left", bold: true }), yesH(), yes(), yes(), yes(), yes(), yes()],
    [cell("Adresse mail dédiée @asthia.fr", { align: "left", bold: true, color: COLORS.primary }), yesH(), no(), no(), no(), no(), no()],
    [cell("Messagerie in-app", { align: "left", bold: true, color: COLORS.primary }), yesH(), no(), no(), no(), no(), no()],
    [cell("Suivi paiements", { align: "left", bold: true }), yesH(), yes(), yes(), yes(), yes(), yes()],
    [cell("Banque pro intégrée", { align: "left", bold: true }), no(), yes(), no(), no(), no(), yes()],
    [cell("App mobile", { align: "left", bold: true }), no(), yes(), yes(), no(), yes(), yes()],
    [cell("Récup auto factures fournisseurs", { align: "left", bold: true }), no(), yes(), yes(), no(), no(), yes()],
    [
      cell("Prix d'entrée /mois", { align: "left", bold: true, color: COLORS.accent }),
      cell("À définir\n(2 à 5 €)", { color: COLORS.primary, bold: true, fill: COLORS.asthiaHighlight, fontSize: 10 }),
      cell("11,99 €", { fontSize: 11 }),
      cell("12 €", { fontSize: 11 }),
      cell("Gratuit", { color: COLORS.good, fontSize: 11 }),
      cell("9,90 €", { fontSize: 11 }),
      cell("9,99 €", { fontSize: 11 }),
    ],
  ];

  slide.addTable(rows, {
    x: 0.5, y: 1.45, w: 12.3,
    colW: [3.6, 1.5, 1.45, 1.45, 1.45, 1.45, 1.45],
    rowH: 0.42,
    border: { type: "solid", pt: 0.5, color: COLORS.border },
  });

  slide.addText(
    "💡 Différenciateurs uniques d'Asthia : adresse mail @asthia.fr personnelle pour chaque utilisateur + messagerie in-app intégrée — aucun concurrent ne propose ces fonctionnalités.",
    { x: 0.5, y: 6.85, w: 12.3, h: 0.4, fontSize: 11, italic: true, fontFace: FONT_BODY, color: COLORS.primaryLight },
  );
}

// ───────────────────────────────────────────────────────────────────────
// SLIDE 2 — Coût infra annuel par tier de users
// ───────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bg };

  slide.addText("Coût infrastructure annuel", {
    x: 0.5, y: 0.35, w: 12.3, h: 0.6,
    fontSize: 32, bold: true, fontFace: FONT_HEADER, color: COLORS.accent,
  });
  slide.addText(
    "Vercel + Supabase + Resend + Mistral + OVH — selon le nombre d'utilisateurs actifs (hors frais SAS et marketing)",
    { x: 0.5, y: 0.95, w: 12.3, h: 0.35, fontSize: 14, italic: true, fontFace: FONT_BODY, color: COLORS.textMuted },
  );

  const headerCell = (text) => ({
    text,
    options: {
      bold: true, align: "center", valign: "middle", color: "FFFFFF",
      fill: { color: COLORS.accent }, fontFace: FONT_HEADER, fontSize: 13,
    },
  });

  const cell = (text, opts = {}) => ({
    text,
    options: {
      align: opts.align || "right", valign: "middle",
      color: opts.color || COLORS.text,
      fill: opts.fill ? { color: opts.fill } : undefined,
      fontFace: FONT_BODY, fontSize: opts.fontSize || 12, bold: opts.bold || false,
    },
  });

  const usersCell = (text) =>
    cell(text, { align: "center", bold: true, color: COLORS.primary, fontSize: 13 });
  const totalCell = (text, alt = false) =>
    cell(text, { align: "right", bold: true, color: COLORS.accent, fontSize: 13, fill: alt ? COLORS.rowAlt : undefined });

  const tiers = [
    { users: "500", v: "220 €", s: "280 €", r: "220 €", m: "55 €", o: "10 €", t: "~785 €" },
    { users: "1 000", v: "220 €", s: "290 €", r: "990 €", m: "110 €", o: "10 €", t: "~1 620 €" },
    { users: "2 000", v: "330 €", s: "310 €", r: "1 430 €", m: "220 €", o: "10 €", t: "~2 300 €" },
    { users: "5 000", v: "880 €", s: "550 €", r: "3 850 €", m: "550 €", o: "10 €", t: "~5 840 €" },
    { users: "10 000", v: "1 650 €", s: "880 €", r: "6 600 €", m: "1 100 €", o: "10 €", t: "~10 240 €" },
    { users: "25 000", v: "3 300 €", s: "1 650 €", r: "16 500 €", m: "2 750 €", o: "10 €", t: "~24 210 €" },
    { users: "50 000", v: "6 600 €", s: "2 750 €", r: "30 800 €", m: "5 500 €", o: "10 €", t: "~45 660 €" },
    { users: "100 000", v: "13 200 €", s: "4 400 €", r: "60 500 €", m: "11 000 €", o: "10 €", t: "~89 110 €" },
  ];

  const rows = [
    [
      headerCell("Utilisateurs"), headerCell("Vercel"), headerCell("Supabase"),
      headerCell("Resend"), headerCell("Mistral"), headerCell("OVH"), headerCell("Total annuel"),
    ],
    ...tiers.map((t, i) => {
      const alt = i % 2 === 1;
      const fill = alt ? COLORS.rowAlt : undefined;
      return [
        usersCell(t.users),
        cell(t.v, { fill }), cell(t.s, { fill }), cell(t.r, { fill }),
        cell(t.m, { fill }), cell(t.o, { fill }),
        totalCell(t.t, alt),
      ];
    }),
  ];

  slide.addTable(rows, {
    x: 0.5, y: 1.45, w: 12.3,
    colW: [1.7, 1.6, 1.7, 1.7, 1.6, 1.4, 2.6],
    rowH: 0.42,
    border: { type: "solid", pt: 0.5, color: COLORS.border },
  });

  slide.addText(
    "📊 Coût marginal moyen : ~0,90 € par utilisateur et par an. Resend est le poste dominant (envoi d'emails facturé au volume).",
    { x: 0.5, y: 6.85, w: 12.3, h: 0.4, fontSize: 11, italic: true, fontFace: FONT_BODY, color: COLORS.primaryLight },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Helpers pour les slides Prospects (cards par secteur)
// ───────────────────────────────────────────────────────────────────────

function renderSectorCard(slide, card, x, y, w, h) {
  // Fond de la card
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: COLORS.rowAlt },
    line: { color: COLORS.border, width: 0.5 },
  });
  // Bande verticale colorée à gauche (4 px d'accent)
  slide.addShape("rect", {
    x, y, w: 0.08, h,
    fill: { color: card.color },
    line: { type: "none" },
  });
  // Nom du secteur (header)
  slide.addText(card.sector, {
    x: x + 0.25, y: y + 0.12, w: w - 1.85, h: 0.35,
    fontSize: 16, bold: true, fontFace: FONT_HEADER, color: COLORS.accent,
  });
  // Volume adressable (à droite du header)
  slide.addText(card.volume, {
    x: x + w - 1.75, y: y + 0.12, w: 1.6, h: 0.35,
    fontSize: 11, bold: true, fontFace: FONT_BODY, color: card.color, align: "right",
  });
  // Liste des métiers (corps)
  slide.addText(card.jobs, {
    x: x + 0.25, y: y + 0.55, w: w - 0.4, h: h - 0.65,
    fontSize: 10.5, fontFace: FONT_BODY, color: COLORS.text,
    valign: "top", paraSpaceAfter: 2,
  });
}

// ───────────────────────────────────────────────────────────────────────
// SLIDE 3 — Prospects prioritaires (5 secteurs)
// ───────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bg };

  slide.addText("Cibles prioritaires", {
    x: 0.5, y: 0.35, w: 12.3, h: 0.6,
    fontSize: 32, bold: true, fontFace: FONT_HEADER, color: COLORS.accent,
  });
  slide.addText(
    "5 secteurs adressables au lancement — environ 1,4 million d'auto-entrepreneurs en France",
    { x: 0.5, y: 0.95, w: 12.3, h: 0.35, fontSize: 14, italic: true, fontFace: FONT_BODY, color: COLORS.textMuted },
  );

  const cards = [
    {
      sector: "Tech & Digital",
      volume: "~650 000 AE",
      color: COLORS.sectorTech,
      jobs:
        "Développeurs web/mobile  ·  Designers UI/UX  ·  Designers graphiques  ·  Marketing/SEO/SEA  ·  " +
        "Rédacteurs web & copywriters  ·  Traducteurs  ·  Consultants tech & data  ·  Community managers  ·  " +
        "Photographes pro  ·  Vidéastes & motion designers",
    },
    {
      sector: "Santé & Bien-être",
      volume: "~105 000 AE",
      color: COLORS.sectorSante,
      jobs:
        "Sophrologues  ·  Ostéopathes  ·  Naturopathes  ·  Hypnothérapeutes  ·  " +
        "Magnétiseurs & énergéticiens  ·  Réflexologues  ·  Praticiens shiatsu  ·  " +
        "Acupuncteurs  ·  Diététiciens libéraux  ·  Coachs en méditation",
    },
    {
      sector: "Sport & Fitness",
      volume: "~66 000 AE",
      color: COLORS.sectorSport,
      jobs:
        "Coachs sportifs personnels  ·  Profs de yoga  ·  Profs de pilates  ·  Coachs CrossFit  ·  " +
        "Préparateurs physiques  ·  Coachs running & triathlon  ·  Coachs nutrition sportive  ·  " +
        "Profs d'arts martiaux  ·  Maîtres-nageurs en libéral",
    },
    {
      sector: "Conseil & Formation",
      volume: "~200 000 AE",
      color: COLORS.sectorConseil,
      jobs:
        "Consultants stratégie & RH  ·  Coachs professionnels  ·  Formateurs CPF  ·  " +
        "Conférenciers & speakers  ·  Recruteurs freelance  ·  Consultants juridiques light  ·  " +
        "Mentors business  ·  Auditeurs indépendants",
    },
    {
      sector: "Artisanat & BTP",
      volume: "~400 000 AE",
      color: COLORS.sectorArtisan,
      jobs:
        "Plombiers  ·  Électriciens  ·  Peintres en bâtiment  ·  Menuisiers & ébénistes  ·  " +
        "Maçons  ·  Carreleurs  ·  Couvreurs  ·  Plaquistes  ·  " +
        "Jardiniers & paysagistes  ·  Climaticiens  ·  Serruriers",
    },
  ];

  // Layout 2 colonnes × 3 lignes (5 cards, dernière cellule vide remplacée par un tag récap)
  const CARD_W = 6.0;
  const CARD_H = 1.65;
  const X_LEFT = 0.5;
  const X_RIGHT = 6.83;
  const Y_START = 1.4;
  const Y_GAP = 0.12;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? X_LEFT : X_RIGHT;
    const y = Y_START + row * (CARD_H + Y_GAP);
    renderSectorCard(slide, card, x, y, CARD_W, CARD_H);
  });

  // Cellule "récap" en bas à droite (la 6e position vide dans le grid 2×3)
  {
    const x = X_RIGHT;
    const y = Y_START + 2 * (CARD_H + Y_GAP);
    slide.addShape("rect", {
      x, y, w: CARD_W, h: CARD_H,
      fill: { color: COLORS.accent },
      line: { type: "none" },
    });
    slide.addText("Total adressable phase 1", {
      x: x + 0.25, y: y + 0.2, w: CARD_W - 0.4, h: 0.35,
      fontSize: 13, bold: true, fontFace: FONT_HEADER, color: "FFFFFF",
    });
    slide.addText("~1 420 000\nauto-entrepreneurs", {
      x: x + 0.25, y: y + 0.6, w: CARD_W - 0.4, h: 0.6,
      fontSize: 22, bold: true, fontFace: FONT_HEADER, color: "FFFFFF",
    });
    slide.addText("Soit ~70 % du marché total AE en France", {
      x: x + 0.25, y: y + 1.25, w: CARD_W - 0.4, h: 0.3,
      fontSize: 10, italic: true, fontFace: FONT_BODY, color: "CADCFC",
    });
  }

  slide.addText(
    "🎯 Stratégie : commencer par Tech & Digital + Sport & Fitness (audiences digitales captives), puis Santé & Bien-être, puis BTP avec l'app mobile.",
    { x: 0.5, y: 6.85, w: 12.3, h: 0.4, fontSize: 11, italic: true, fontFace: FONT_BODY, color: COLORS.primaryLight },
  );
}

// ───────────────────────────────────────────────────────────────────────
// SLIDE 4 — Cibles d'expansion (4 secteurs)
// ───────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bg };

  slide.addText("Cibles d'expansion", {
    x: 0.5, y: 0.35, w: 12.3, h: 0.6,
    fontSize: 32, bold: true, fontFace: FONT_HEADER, color: COLORS.accent,
  });
  slide.addText(
    "4 secteurs complémentaires à ouvrir en phase 2-3 — environ 215 000 AE adressables supplémentaires",
    { x: 0.5, y: 0.95, w: 12.3, h: 0.35, fontSize: 14, italic: true, fontFace: FONT_BODY, color: COLORS.textMuted },
  );

  const cards = [
    {
      sector: "Beauté & Soins à la personne",
      volume: "~40 000 AE",
      color: COLORS.sectorBeaute,
      jobs:
        "Coiffeuses à domicile  ·  Esthéticiennes à domicile  ·  Maquilleuses pro (mariages, événements)  ·  " +
        "Manucures à domicile  ·  Masseuses bien-être  ·  Coachs en image  ·  Conseillères en image",
    },
    {
      sector: "Création & Communication",
      volume: "~50 000 AE",
      color: COLORS.sectorCrea,
      jobs:
        "Photographes mariage / événement  ·  Vidéastes événement  ·  Wedding planners  ·  " +
        "Décorateurs d'intérieur  ·  Illustrateurs  ·  Auteurs & écrivains  ·  Musiciens  ·  " +
        "DJs  ·  Régisseurs son & lumière",
    },
    {
      sector: "Éducation & Formation",
      volume: "~80 000 AE",
      color: COLORS.sectorEducation,
      jobs:
        "Profs particuliers (maths, langues, sciences)  ·  Coachs scolaires  ·  Profs de musique & chant  ·  " +
        "Profs de langues étrangères  ·  Animateurs ateliers créatifs  ·  Coachs vocaux  ·  " +
        "Profs de danse  ·  Animateurs périscolaires",
    },
    {
      sector: "Services aux animaux & food",
      volume: "~45 000 AE",
      color: COLORS.sectorAnimaux,
      jobs:
        "Toiletteurs animaliers  ·  Comportementalistes canins  ·  Promeneurs & pet sitters  ·  " +
        "Éducateurs canins  ·  Naturopathes animaliers  ·  Traiteurs événementiels  ·  " +
        "Chefs à domicile  ·  Animateurs ateliers cuisine",
    },
  ];

  const CARD_W = 6.0;
  const CARD_H = 2.4;
  const X_LEFT = 0.5;
  const X_RIGHT = 6.83;
  const Y_START = 1.4;
  const Y_GAP = 0.2;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? X_LEFT : X_RIGHT;
    const y = Y_START + row * (CARD_H + Y_GAP);
    renderSectorCard(slide, card, x, y, CARD_W, CARD_H);
  });

  slide.addText(
    "🚀 Quand ouvrir : ces secteurs deviennent prioritaires une fois l'app mobile mature et la marque Asthia établie sur les cibles principales.",
    { x: 0.5, y: 6.85, w: 12.3, h: 0.4, fontSize: 11, italic: true, fontFace: FONT_BODY, color: COLORS.primaryLight },
  );
}

pres.writeFile({ fileName: "asthia-analyse.pptx" }).then((f) => {
  console.log("Created:", f);
});
