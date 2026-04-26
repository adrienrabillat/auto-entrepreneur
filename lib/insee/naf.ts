/**
 * Référentiel NAF rév. 2 (Nomenclature d'Activités Française).
 *
 * Source officielle : https://www.insee.fr/fr/information/2120875
 * En vigueur depuis 2008. NAF 2025 (rév. 2.1) sera progressivement adoptée
 * mais pendant une période de transition les deux coexistent.
 *
 * On embarque :
 *  - Les 21 SECTIONS (lettres A-U) — couverture 100%
 *  - Les 88 DIVISIONS (codes NN) — couverture 100%
 *  - Les SOUS-CLASSES les plus fréquentes (codes NN.NNL) pour les
 *    activités habituelles d'auto-entrepreneurs (services, BTP,
 *    commerce, conseil)
 *
 * Stratégie de lookup avec fallback :
 *  1. Sous-classe exacte (ex "62.01Z") → libellé spécifique
 *  2. Division (2 premiers chiffres) → libellé large
 *  3. Section (lettre) → libellé général
 */

// ─── SECTIONS (couverture exhaustive) ─────────────────────────────────────
const SECTIONS: Record<string, string> = {
  A: "Agriculture, sylviculture et pêche",
  B: "Industries extractives",
  C: "Industrie manufacturière",
  D: "Production et distribution d'électricité, de gaz, de vapeur",
  E: "Production et distribution d'eau, assainissement, déchets",
  F: "Construction",
  G: "Commerce, réparation d'automobiles et de motocycles",
  H: "Transports et entreposage",
  I: "Hébergement et restauration",
  J: "Information et communication",
  K: "Activités financières et d'assurance",
  L: "Activités immobilières",
  M: "Activités spécialisées, scientifiques et techniques",
  N: "Activités de services administratifs et de soutien",
  O: "Administration publique",
  P: "Enseignement",
  Q: "Santé humaine et action sociale",
  R: "Arts, spectacles et activités récréatives",
  S: "Autres activités de services",
  T: "Activités des ménages en tant qu'employeurs",
  U: "Activités extra-territoriales",
};

// ─── DIVISIONS (couverture exhaustive) ────────────────────────────────────
const DIVISIONS: Record<string, string> = {
  "01": "Culture et production animale, chasse",
  "02": "Sylviculture et exploitation forestière",
  "03": "Pêche et aquaculture",
  "05": "Extraction de houille et de lignite",
  "06": "Extraction d'hydrocarbures",
  "07": "Extraction de minerais métalliques",
  "08": "Autres industries extractives",
  "09": "Services de soutien aux industries extractives",
  "10": "Industries alimentaires",
  "11": "Fabrication de boissons",
  "12": "Fabrication de produits à base de tabac",
  "13": "Fabrication de textiles",
  "14": "Industrie de l'habillement",
  "15": "Industrie du cuir et de la chaussure",
  "16": "Travail du bois",
  "17": "Industrie du papier et du carton",
  "18": "Imprimerie et reproduction d'enregistrements",
  "19": "Cokéfaction et raffinage",
  "20": "Industrie chimique",
  "21": "Industrie pharmaceutique",
  "22": "Fabrication de produits en caoutchouc et plastique",
  "23": "Fabrication d'autres produits minéraux non métalliques",
  "24": "Métallurgie",
  "25": "Fabrication de produits métalliques",
  "26": "Fabrication de produits informatiques, électroniques",
  "27": "Fabrication d'équipements électriques",
  "28": "Fabrication de machines et équipements",
  "29": "Industrie automobile",
  "30": "Fabrication d'autres matériels de transport",
  "31": "Fabrication de meubles",
  "32": "Autres industries manufacturières",
  "33": "Réparation et installation de machines",
  "35": "Production et distribution d'électricité, de gaz",
  "36": "Captage, traitement et distribution d'eau",
  "37": "Collecte et traitement des eaux usées",
  "38": "Collecte, traitement et élimination des déchets",
  "39": "Dépollution et autres services de gestion des déchets",
  "41": "Construction de bâtiments",
  "42": "Génie civil",
  "43": "Travaux de construction spécialisés",
  "45": "Commerce et réparation d'automobiles et de motocycles",
  "46": "Commerce de gros (hors automobiles)",
  "47": "Commerce de détail (hors automobiles)",
  "49": "Transports terrestres et par conduites",
  "50": "Transports par eau",
  "51": "Transports aériens",
  "52": "Entreposage et services auxiliaires des transports",
  "53": "Activités de poste et de courrier",
  "55": "Hébergement",
  "56": "Restauration",
  "58": "Édition",
  "59": "Production de films, vidéo, programmes de télévision",
  "60": "Programmation et diffusion",
  "61": "Télécommunications",
  "62": "Programmation, conseil et autres activités informatiques",
  "63": "Services d'information",
  "64": "Activités des services financiers (hors assurance)",
  "65": "Assurance, réassurance et caisses de retraite",
  "66": "Activités auxiliaires de services financiers et d'assurance",
  "68": "Activités immobilières",
  "69": "Activités juridiques et comptables",
  "70": "Activités des sièges sociaux ; conseil de gestion",
  "71": "Activités d'architecture et d'ingénierie ; contrôle technique",
  "72": "Recherche-développement scientifique",
  "73": "Publicité et études de marché",
  "74": "Autres activités spécialisées, scientifiques et techniques",
  "75": "Activités vétérinaires",
  "77": "Activités de location et location-bail",
  "78": "Activités liées à l'emploi",
  "79": "Agences de voyage, voyagistes",
  "80": "Enquêtes et sécurité",
  "81": "Services relatifs aux bâtiments et aménagement paysager",
  "82": "Activités administratives et autres activités de soutien",
  "84": "Administration publique et défense",
  "85": "Enseignement",
  "86": "Activités pour la santé humaine",
  "87": "Hébergement médico-social et action sociale avec hébergement",
  "88": "Action sociale sans hébergement",
  "90": "Activités créatives, artistiques et de spectacle",
  "91": "Bibliothèques, archives, musées",
  "92": "Organisation de jeux de hasard et d'argent",
  "93": "Activités sportives, récréatives et de loisirs",
  "94": "Activités des organisations associatives",
  "95": "Réparation d'ordinateurs et de biens personnels",
  "96": "Autres services personnels",
  "97": "Activités des ménages en tant qu'employeurs",
  "99": "Activités des organisations et organismes extra-territoriaux",
};

// ─── SOUS-CLASSES les plus fréquentes pour micros / TPE ────────────────────
// Format : code complet sans le point ("4322B" au lieu de "43.22B")
const SUBCLASSES: Record<string, string> = {
  // Construction & BTP (43.xx — très commun en micro)
  "4120A": "Construction de maisons individuelles",
  "4120B": "Construction d'autres bâtiments",
  "4221Z": "Construction de réseaux pour fluides",
  "4321A": "Travaux d'installation électrique dans tous locaux",
  "4321B": "Travaux d'installation électrique sur la voie publique",
  "4322A": "Travaux d'installation d'eau et de gaz",
  "4322B": "Travaux d'installation d'équipements thermiques et de climatisation",
  "4329A": "Travaux d'isolation",
  "4329B": "Autres travaux d'installation",
  "4331Z": "Travaux de plâtrerie",
  "4332A": "Travaux de menuiserie bois et PVC",
  "4332B": "Travaux de menuiserie métallique et serrurerie",
  "4332C": "Agencement de lieux de vente",
  "4333Z": "Travaux de revêtement des sols et des murs",
  "4334Z": "Travaux de peinture et vitrerie",
  "4339Z": "Autres travaux de finition",
  "4391A": "Travaux de charpente",
  "4391B": "Travaux de couverture par éléments",
  "4399A": "Travaux d'étanchéification",
  "4399B": "Travaux de montage de structures métalliques",
  "4399C": "Travaux de maçonnerie générale",
  "4399D": "Autres travaux spécialisés de construction",
  "4399E": "Location avec opérateur de matériel de construction",

  // Informatique & numérique (62.xx — très commun en presta intellectuelle)
  "6201Z": "Programmation informatique",
  "6202A": "Conseil en systèmes et logiciels informatiques",
  "6202B": "Tierce maintenance de systèmes et d'applications",
  "6203Z": "Gestion d'installations informatiques",
  "6209Z": "Autres activités informatiques",
  "6311Z": "Traitement de données, hébergement",
  "6312Z": "Portails internet",
  "6391Z": "Activités des agences de presse",
  "6399Z": "Autres services d'information",

  // Conseil / management (70.xx)
  "7010Z": "Activités des sièges sociaux",
  "7021Z": "Conseil en relations publiques et communication",
  "7022Z": "Conseil pour les affaires et autres conseils de gestion",

  // Architecture, ingénierie (71.xx)
  "7111Z": "Activités d'architecture",
  "7112A": "Activité des géomètres",
  "7112B": "Ingénierie, études techniques",
  "7120A": "Contrôle technique automobile",
  "7120B": "Analyses, essais et inspections techniques",

  // Publicité & marketing (73.xx)
  "7311Z": "Activités des agences de publicité",
  "7312Z": "Régie publicitaire de médias",
  "7320Z": "Études de marché et sondages",

  // Design, photo, traduction (74.xx — créatifs)
  "7410Z": "Activités spécialisées de design",
  "7420Z": "Activités photographiques",
  "7430Z": "Traduction et interprétation",
  "7490A": "Activités des économistes de la construction",
  "7490B": "Activités spécialisées, scientifiques et techniques diverses",

  // Activités administratives & soutien (82.xx)
  "8211Z": "Services administratifs combinés de bureau",
  "8219Z": "Photocopie, préparation de documents",
  "8220Z": "Activités de centres d'appels",
  "8230Z": "Organisation de salons professionnels et congrès",
  "8291Z": "Activités des agences de recouvrement",
  "8292Z": "Activités de conditionnement",
  "8299Z": "Autres activités de soutien aux entreprises",

  // Comptabilité, juridique (69.xx)
  "6910Z": "Activités juridiques",
  "6920Z": "Activités comptables",

  // Enseignement (85.xx — formation, coaching)
  "8551Z": "Enseignement de disciplines sportives et d'activités de loisirs",
  "8552Z": "Enseignement culturel",
  "8553Z": "Enseignement de la conduite",
  "8559A": "Formation continue d'adultes",
  "8559B": "Autres enseignements",
  "8560Z": "Activités de soutien à l'enseignement",

  // Santé (86.xx — médecins, paramédicaux libéraux)
  "8610Z": "Activités hospitalières",
  "8621Z": "Activité des médecins généralistes",
  "8622A": "Activités de radiodiagnostic et de radiothérapie",
  "8622B": "Activités chirurgicales",
  "8622C": "Autres activités des médecins spécialistes",
  "8623Z": "Pratique dentaire",
  "8690A": "Ambulances",
  "8690B": "Laboratoires d'analyses médicales",
  "8690C": "Centres de collecte et banques d'organes",
  "8690D": "Activités des infirmiers et des sages-femmes",
  "8690E": "Activités des professionnels de la rééducation, appareillage",
  "8690F": "Activités de santé humaine non classées ailleurs",

  // Bien-être / psy (96.xx & 88.xx)
  "8810A": "Aide à domicile",
  "8810B": "Accueil ou accompagnement sans hébergement",
  "8891A": "Accueil de jeunes enfants",
  "8891B": "Accueil ou accompagnement de personnes handicapées",
  "9602A": "Coiffure",
  "9602B": "Soins de beauté",
  "9603Z": "Services funéraires",
  "9604Z": "Entretien corporel",
  "9609Z": "Autres services personnels n.c.a.",

  // Arts (90.xx)
  "9001Z": "Arts du spectacle vivant",
  "9002Z": "Activités de soutien au spectacle vivant",
  "9003A": "Création artistique relevant des arts plastiques",
  "9003B": "Autre création artistique",

  // Réparation (95.xx)
  "9511Z": "Réparation d'ordinateurs et d'équipements périphériques",
  "9512Z": "Réparation d'équipements de communication",
  "9521Z": "Réparation de produits électroniques grand public",
  "9522Z": "Réparation d'appareils électroménagers et d'équipements pour la maison et le jardin",
  "9523Z": "Réparation de chaussures et d'articles en cuir",
  "9524Z": "Réparation de meubles et d'équipements du foyer",
  "9525Z": "Réparation d'articles d'horlogerie et de bijouterie",
  "9529Z": "Réparation d'autres biens personnels et domestiques",
  "4520A": "Entretien et réparation de véhicules automobiles légers",
  "4520B": "Entretien et réparation d'autres véhicules automobiles",

  // Commerce de détail (47.xx)
  "4711A": "Commerce de détail de produits surgelés",
  "4711B": "Commerce d'alimentation générale",
  "4711C": "Supérettes",
  "4711D": "Supermarchés",
  "4711E": "Magasins multi-commerces",
  "4711F": "Hypermarchés",
  "4719A": "Grands magasins",
  "4719B": "Autres commerces de détail en magasin non spécialisé",
  "4791A": "Vente à distance sur catalogue général",
  "4791B": "Vente à distance sur catalogue spécialisé (e-commerce)",

  // Transports (49.xx)
  "4931Z": "Transports urbains et suburbains de voyageurs",
  "4932Z": "Transports de voyageurs par taxis",
  "4939A": "Transports routiers réguliers de voyageurs",
  "4939B": "Autres transports routiers de voyageurs",
  "4941A": "Transports routiers de fret interurbains",
  "4941B": "Transports routiers de fret de proximité",
  "5320Z": "Autres activités de poste et de courrier (livraison)",

  // Restauration (56.xx)
  "5610A": "Restauration traditionnelle",
  "5610B": "Cafétérias et autres libres-services",
  "5610C": "Restauration de type rapide",
  "5621Z": "Services des traiteurs",
  "5629A": "Restauration collective sous contrat",
  "5629B": "Autres services de restauration n.c.a.",
  "5630Z": "Débits de boissons",

  // Hébergement (55.xx)
  "5510Z": "Hôtels et hébergement similaire",
  "5520Z": "Hébergement touristique et autre hébergement de courte durée",
  "5530Z": "Terrains de camping",
  "5590Z": "Autres hébergements",

  // Activités sportives (93.xx)
  "9311Z": "Gestion d'installations sportives",
  "9312Z": "Activités de clubs de sport",
  "9313Z": "Activités des centres de culture physique",
  "9319Z": "Autres activités liées au sport (coaching sportif)",
  "9329Z": "Autres activités récréatives et de loisirs",

  // Immobilier (68.xx)
  "6810Z": "Activités des marchands de biens immobiliers",
  "6820A": "Location de logements",
  "6820B": "Location de terrains et d'autres biens immobiliers",
  "6831Z": "Agences immobilières",
  "6832A": "Administration d'immeubles et autres biens immobiliers",

  // Coiffure / esthétique fait double, déjà ci-dessus

  // Vétérinaires
  "7500Z": "Activités vétérinaires",

  // Édition / création de contenu
  "5811Z": "Édition de livres",
  "5812Z": "Édition de répertoires et de fichiers d'adresses",
  "5813Z": "Édition de journaux",
  "5814Z": "Édition de revues et périodiques",
  "5819Z": "Autres activités d'édition",
  "5821Z": "Édition de jeux électroniques",
  "5829A": "Édition de logiciels système et de réseau",
  "5829B": "Édition de logiciels outils de développement",
  "5829C": "Édition de logiciels applicatifs",

  // Production audiovisuelle
  "5911A": "Production de films et de programmes pour la télévision",
  "5911B": "Production de films institutionnels et publicitaires",
  "5911C": "Production de films pour le cinéma",
  "5912Z": "Post-production",
  "5913A": "Distribution de films cinématographiques",
  "5913B": "Édition et distribution vidéo",
  "5914Z": "Projection de films cinématographiques",
  "5920Z": "Enregistrement sonore et édition musicale",
};

/**
 * Retourne le libellé d'activité pour un code APE/NAF.
 * Tente d'abord la sous-classe exacte, puis la division, puis la section.
 */
export function nafLabel(code: string | null | undefined): string {
  const c = (code ?? "").trim().toUpperCase().replace(/\./g, "");
  if (!c) return "Activité non précisée";

  // Sous-classe complète (5 caractères : 4 chiffres + 1 lettre)
  if (SUBCLASSES[c]) return SUBCLASSES[c];

  // Division (2 premiers chiffres)
  const div = c.slice(0, 2);
  if (DIVISIONS[div]) return DIVISIONS[div];

  // Sinon on essaye la section via la première lettre des codes habituels
  // (heuristique : on reconnaît la lettre par la division)
  const letter = sectionFromDivision(div);
  if (letter && SECTIONS[letter]) return SECTIONS[letter];

  return `Activité ${code ?? ""}`.trim();
}

/**
 * Mapping division NAF → section (lettre A-U).
 * Source : https://www.insee.fr/fr/information/2120875
 */
function sectionFromDivision(div: string): string | null {
  const n = parseInt(div, 10);
  if (isNaN(n)) return null;
  if (n >= 1 && n <= 3) return "A";
  if (n >= 5 && n <= 9) return "B";
  if (n >= 10 && n <= 33) return "C";
  if (n === 35) return "D";
  if (n >= 36 && n <= 39) return "E";
  if (n >= 41 && n <= 43) return "F";
  if (n >= 45 && n <= 47) return "G";
  if (n >= 49 && n <= 53) return "H";
  if (n >= 55 && n <= 56) return "I";
  if (n >= 58 && n <= 63) return "J";
  if (n >= 64 && n <= 66) return "K";
  if (n === 68) return "L";
  if (n >= 69 && n <= 75) return "M";
  if (n >= 77 && n <= 82) return "N";
  if (n === 84) return "O";
  if (n === 85) return "P";
  if (n >= 86 && n <= 88) return "Q";
  if (n >= 90 && n <= 93) return "R";
  if (n >= 94 && n <= 96) return "S";
  if (n === 97 || n === 98) return "T";
  if (n === 99) return "U";
  return null;
}
