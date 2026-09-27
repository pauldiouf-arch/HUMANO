function choix(textes) {
  return textes.map((texte, i) => ({ id: 'abcd'[i], texte }));
}

const MODELES = Object.freeze([
  {
    id: 'fintech-comptoir',
    libelle: 'Fintech — double débit contesté au comptoir',
    secteur: 'fintech',
    simulation: {
      persona: 'Mme Coumba Faye, cliente d\'un service de mobile money, au comptoir d\'une agence sur la VDN. Elle doit payer le traiteur du mariage de sa sœur ce soir.',
      nomCourt: 'Mme Coumba Faye',
      role: 'Cliente',
      posture: 'externe',
      ouverture: 'Bonjour ! Votre application m\'a débitée deux fois 125 000 francs pour le traiteur du mariage de ma sœur. La cérémonie c\'est ce soir, je veux mon argent maintenant !',
      faits: 'Le premier paiement a échoué et n\'a pas été débité ; un seul paiement de 125 000 a réussi ; le solde réel est de 124 500. La cliente croit avoir été débitée deux fois parce qu\'elle a reçu deux notifications.'
    },
    contexteQcm: {
      titre: 'Historique du compte client (solde initial : 300 000 FCFA)',
      colonnes: ['Heure', 'Opération', 'Bénéficiaire', 'Montant (FCFA)', 'Frais', 'Statut'],
      lignes: [
        ['14:02', 'Paiement marchand', 'Traiteur Keur Diarra', '125 000', '0', 'Échoué'],
        ['14:03', 'Paiement marchand', 'Traiteur Keur Diarra', '125 000', '0', 'Réussi'],
        ['14:05', 'Retrait agent', 'Agence VDN', '50 000', '500', 'Réussi']
      ]
    },
    qcm: [
      {
        id: 'q1',
        enonce: 'Combien la cliente a-t-elle réellement payé au traiteur ?',
        choix: choix(['250 000 FCFA', '125 000 FCFA', '0 FCFA', '175 000 FCFA']),
        bonne: 'b',
        explication: 'Le paiement de 14:02 a échoué ; seul celui de 14:03 a été débité.'
      },
      {
        id: 'q2',
        enonce: 'Quel est le solde actuel du compte ?',
        choix: choix(['125 000 FCFA', '175 000 FCFA', '124 500 FCFA', '74 500 FCFA']),
        bonne: 'c',
        explication: '300 000 − 125 000 − 50 000 − 500 = 124 500.'
      }
    ],
    questions: [
      {
        id: 't1',
        enonce: 'Expliquez comment vous vérifiez, dans l\'historique, qu\'un paiement signalé en double n\'a été débité qu\'une fois, et ce que vous dites à la cliente.',
        criteres: [
          'Identifie le statut Échoué ou Réussi de chaque opération',
          'Vérifie le montant réellement débité ou le solde',
          'Explique la double notification sans accuser la cliente',
          'Propose une preuve ou un suivi daté'
        ]
      }
    ]
  },
  {
    id: 'agro-facture',
    libelle: 'Agroalimentaire — facture contestée par un grossiste',
    secteur: 'agro',
    simulation: {
      persona: 'El Hadji Mbaye, grossiste au marché Sandaga, pressé, client important.',
      nomCourt: 'El Hadji Mbaye',
      role: 'Grossiste, marché Sandaga',
      posture: 'externe',
      ouverture: 'Votre facture F-0917 est fausse, je ne paierai pas 1 570 000 francs ! Mes clients attendent à Sandaga et vous me faites perdre ma matinée.',
      faits: 'La ligne huile devrait faire 25 × 22 000 = 550 000 ; le total correct est 1 560 000, soit une surfacturation de 10 000. Le grossiste a raison sur le principe mais exagère sa colère.'
    },
    contexteQcm: {
      titre: 'Facture F-0917',
      colonnes: ['Article', 'Quantité', 'Prix unitaire (FCFA)', 'Total ligne (FCFA)'],
      lignes: [
        ['Sac de riz 50 kg', '40', '17 500', '700 000'],
        ['Bidon d\'huile 20 L', '25', '22 000', '560 000'],
        ['Carton de lait en poudre', '10', '31 000', '310 000'],
        ['Total facturé', '', '', '1 570 000']
      ]
    },
    qcm: [
      {
        id: 'q1',
        enonce: 'Quelle ligne contient une erreur de calcul ?',
        choix: choix(['Riz', 'Huile', 'Lait en poudre', 'Aucune']),
        bonne: 'b',
        explication: '25 × 22 000 = 550 000, pas 560 000.'
      },
      {
        id: 'q2',
        enonce: 'Quel est le montant total correct ?',
        choix: choix(['1 570 000 FCFA', '1 560 000 FCFA', '1 550 000 FCFA', '1 580 000 FCFA']),
        bonne: 'b',
        explication: '700 000 + 550 000 + 310 000 = 1 560 000.'
      }
    ],
    questions: [
      {
        id: 't1',
        enonce: 'Décrivez la procédure pour corriger une facture erronée déjà émise.',
        criteres: [
          'Recalcule la ligne fautive',
          'Émet un avoir ou une facture rectificative sans modifier l\'original',
          'Communique le nouveau montant au client',
          'Trace la correction pour la comptabilité'
        ]
      }
    ]
  },
  {
    id: 'agro-froid',
    libelle: 'Agroalimentaire — rupture de la chaîne du froid',
    secteur: 'agro',
    simulation: {
      persona: 'Moussa Sow, chauffeur de l\'entreprise. Son camion frigorifique est bloqué dans les embouteillages sur la route de Rufisque, avec un groupe froid en panne depuis le matin.',
      nomCourt: 'Moussa Sow',
      role: 'Chauffeur, route de Rufisque',
      posture: 'interne',
      ouverture: 'Chef, le groupe froid a lâché ce matin et je suis coincé à Rufisque. Les clients appellent sans arrêt. Qu\'est-ce que je fais de la marchandise ?',
      faits: 'L2 et L3 sont perdus, soit 980 000 ; L1 et L4 sont récupérables s\'ils retrouvent le froid rapidement. Le chauffeur est inquiet d\'être tenu pour responsable.'
    },
    contexteQcm: {
      titre: 'Lots transportés — procédure : un lot resté plus de 2 h hors froid est déclaré perdu',
      colonnes: ['Lot', 'Produit', 'Valeur (FCFA)', 'Durée hors froid'],
      lignes: [
        ['L1', 'Yaourts', '450 000', '1 h 30'],
        ['L2', 'Lait frais', '600 000', '2 h 45'],
        ['L3', 'Fromage', '380 000', '3 h 10'],
        ['L4', 'Beurre', '250 000', '0 h 50']
      ]
    },
    qcm: [
      {
        id: 'q1',
        enonce: 'Combien de lots doivent être déclarés perdus ?',
        choix: choix(['1', '2', '3', '4']),
        bonne: 'b',
        explication: 'L2 (2 h 45) et L3 (3 h 10) dépassent 2 h.'
      },
      {
        id: 'q2',
        enonce: 'Quelle est la valeur totale des pertes ?',
        choix: choix(['600 000 FCFA', '1 230 000 FCFA', '980 000 FCFA', '1 680 000 FCFA']),
        bonne: 'c',
        explication: '600 000 + 380 000 = 980 000.'
      }
    ],
    questions: [
      {
        id: 't1',
        enonce: 'Quelles actions menez-vous dans l\'heure pour limiter les pertes sur le camion en panne ?',
        criteres: [
          'Isole et déclare les lots perdus',
          'Organise le transfert des lots récupérables vers le froid',
          'Prévient les clients et la hiérarchie',
          'Documente l\'incident (heures, relevés)'
        ]
      }
    ]
  },
  {
    id: 'ong-vaccins',
    libelle: 'Humanitaire — vaccins hors chaîne du froid',
    secteur: 'ong',
    simulation: {
      persona: 'Dr Aïssatou Ba, cheffe de projet terrain d\'une ONG médicale. Le camion de vaccins est bloqué à l\'entrée de Saint-Louis ; la campagne de vaccination commence demain matin.',
      nomCourt: 'Dr Aïssatou Ba',
      role: 'Cheffe de projet terrain, Saint-Louis',
      posture: 'interne',
      ouverture: 'Le camion est bloqué à l\'entrée de Saint-Louis depuis deux heures et les relevés de température sont mauvais. La campagne démarre demain à 8 h, les familles sont déjà mobilisées. On fait quoi ?',
      faits: 'V-02 et V-04 sont en quarantaine (1 400 doses) ; 2 700 doses (V-01 et V-03) restent utilisables. Le bailleur exige un rapport d\'incident. La cheffe de projet subit la pression des communautés et envisage de « faire une exception ».'
    },
    contexteQcm: {
      titre: 'Lots de vaccins — procédure bailleur : quarantaine obligatoire si l\'excursion hors 2–8 °C dépasse 60 minutes cumulées',
      colonnes: ['Lot', 'Doses', 'Excursion cumulée'],
      lignes: [
        ['V-01', '1 200', '25 min'],
        ['V-02', '800', '75 min'],
        ['V-03', '1 500', '0 min'],
        ['V-04', '600', '110 min']
      ]
    },
    qcm: [
      {
        id: 'q1',
        enonce: 'Combien de doses doivent être mises en quarantaine ?',
        choix: choix(['800', '1 400', '2 000', '600']),
        bonne: 'b',
        explication: 'V-02 (800) et V-04 (600) dépassent 60 minutes.'
      },
      {
        id: 'q2',
        enonce: 'Quelle est la première action conforme ?',
        choix: choix([
          'Distribuer V-02 en priorité avant qu\'il ne se dégrade',
          'Isoler et étiqueter V-02 et V-04, puis prévenir le référent pharmacie avant toute distribution',
          'Détruire immédiatement les quatre lots',
          'Reporter la décision après la campagne'
        ]),
        bonne: 'b',
        explication: 'La procédure impose la quarantaine et une décision du référent.'
      }
    ],
    questions: [
      {
        id: 't1',
        enonce: 'Décrivez la procédure de gestion d\'une excursion de température sur des vaccins.',
        criteres: [
          'Met en quarantaine sans détruire',
          'Conserve les relevés de température',
          'Saisit le référent pharmacie ou le fabricant pour décision',
          'Rédige le rapport d\'incident du bailleur'
        ]
      }
    ]
  },
  {
    id: 'rh-panier',
    libelle: 'RH — indemnités de panier erronées',
    secteur: 'autre',
    simulation: {
      persona: 'Mamadou Diagne, délégué du personnel.',
      nomCourt: 'Mamadou Diagne',
      role: 'Délégué du personnel',
      posture: 'interne',
      ouverture: 'Les indemnités de panier de ce mois sont fausses. Si ce n\'est pas corrigé aujourd\'hui, l\'équipe arrête le travail demain matin.',
      faits: 'Ibrahima Sarr aurait dû toucher 30 000 (écart de 5 000) et Awa Diallo 27 000 (écart de 3 000), soit un rappel total de 8 000. L\'erreur vient d\'un mauvais taux appliqué dans le fichier de paie. Le délégué veut un engagement écrit et une date de régularisation.'
    },
    contexteQcm: {
      titre: 'Indemnités de panier du mois — taux : 1 500 FCFA par jour travaillé',
      colonnes: ['Agent', 'Jours travaillés', 'Montant versé (FCFA)'],
      lignes: [
        ['Fatou Ndiaye', '22', '33 000'],
        ['Ibrahima Sarr', '20', '25 000'],
        ['Awa Diallo', '18', '24 000']
      ]
    },
    qcm: [
      {
        id: 'q1',
        enonce: 'Quel agent a été payé correctement ?',
        choix: choix(['Fatou Ndiaye', 'Ibrahima Sarr', 'Awa Diallo', 'Aucun']),
        bonne: 'a',
        explication: '22 × 1 500 = 33 000.'
      },
      {
        id: 'q2',
        enonce: 'Quel rappel total faut-il verser ?',
        choix: choix(['5 000 FCFA', '3 000 FCFA', '8 000 FCFA', '12 000 FCFA']),
        bonne: 'c',
        explication: '5 000 + 3 000 = 8 000.'
      }
    ],
    questions: [
      {
        id: 't1',
        enonce: 'Comment calculez-vous et régularisez-vous une indemnité de panier erronée ?',
        criteres: [
          'Applique le bon taux aux jours travaillés',
          'Calcule l\'écart par agent et le rappel total',
          'Prévoit la régularisation sur la paie suivante ou un paiement exceptionnel',
          'Confirme par écrit aux représentants du personnel'
        ]
      }
    ]
  },
  {
    id: 'management-charge',
    libelle: 'Management — collaboratrice épuisée par les heures supplémentaires',
    secteur: 'autre',
    simulation: {
      persona: 'Khady Sarr, agente expérimentée de votre équipe, épuisée par les heures supplémentaires, qui se sent moins reconnue que ses collègues.',
      nomCourt: 'Khady Sarr',
      role: 'Membre de votre équipe',
      posture: 'interne',
      ouverture: 'Chef, je suis à bout. Ce mois-ci j\'ai fait 28 heures supplémentaires pendant que d\'autres partent à 17 h. Si rien ne change, je pose ma démission.',
      faits: 'Khady Sarr a 28 h, soit 8 h au-dessus du plafond ; Awa Diop est au plafond ; Modou Fall (12 h) et Pape Ndiaye (6 h) ont de la marge. La règle interne impose la récupération des heures au-delà de 20 h. Khady veut de la reconnaissance et une répartition équitable.'
    },
    contexteQcm: {
      titre: 'Heures supplémentaires du mois — règle interne : plafond de 20 h par agent, au-delà récupération obligatoire',
      colonnes: ['Agent', 'Heures supplémentaires'],
      lignes: [
        ['Khady Sarr', '28 h'],
        ['Modou Fall', '12 h'],
        ['Awa Diop', '20 h'],
        ['Pape Ndiaye', '6 h']
      ]
    },
    qcm: [
      {
        id: 'q1',
        enonce: 'Combien d\'agents dépassent le plafond ?',
        choix: choix(['0', '1', '2', '3']),
        bonne: 'b',
        explication: 'Seule Khady Sarr dépasse 20 h ; Awa Diop est exactement au plafond.'
      },
      {
        id: 'q2',
        enonce: 'Combien d\'heures faut-il retirer à Khady Sarr pour la ramener au plafond ?',
        choix: choix(['6', '8', '10', '28']),
        bonne: 'b',
        explication: '28 − 20 = 8.'
      }
    ],
    questions: [
      {
        id: 't1',
        enonce: 'Comment répartissez-vous la charge pour ramener chaque agent sous le plafond sans dégrader le service ?',
        criteres: [
          'Identifie le dépassement de 8 h',
          'Répartit sur les agents qui ont de la marge',
          'Prévoit la récupération des heures excédentaires',
          'Explique la décision à l\'équipe de façon équitable'
        ]
      }
    ]
  },
  {
    id: 'ong-budget',
    libelle: 'Humanitaire — suivi budgétaire et formules Excel',
    secteur: 'ong',
    simulation: {
      persona: 'M. Ousmane Kane, chargé de programme du bailleur, en visioconférence depuis Dakar. Il prépare la revue semestrielle et a repéré des écarts dans le rapport financier du projet.',
      nomCourt: 'M. Ousmane Kane',
      role: 'Chargé de programme du bailleur',
      posture: 'externe',
      ouverture: 'Bonjour. Votre rapport financier montre 115 % d\'exécution sur le carburant et seulement 30 % sur les formations. Je dois justifier ça demain devant mon comité : expliquez-moi, sinon je bloque la prochaine tranche.',
      faits: 'Le carburant dépasse son budget de 450 000 FCFA (115 %) à cause de la hausse des prix et des déplacements supplémentaires vers les sites isolés ; les formations ont été reportées pendant la saison des pluies (30 %) ; le taux d\'exécution global est de 69,9 %. Une réallocation entre lignes est possible jusqu\'à 10 % du budget total (4 000 000 FCFA) avec l\'accord écrit du bailleur. Le chargé de programme veut une demande de réallocation écrite et un plan de rattrapage daté pour les formations.'
    },
    contexteQcm: {
      titre: 'Suivi budgétaire du projet Nutrition Kolda au 30 septembre — feuille Excel (taux d\'exécution = dépenses ÷ budget)',
      colonnes: ['Ligne', 'A — Ligne budgétaire', 'B — Budget (FCFA)', 'C — Dépenses réalisées (FCFA)'],
      lignes: [
        ['2', 'Salaires', '12 000 000', '9 000 000'],
        ['3', 'Carburant', '3 000 000', '3 450 000'],
        ['4', 'Intrants nutritionnels', '20 000 000', '14 000 000'],
        ['5', 'Formations', '5 000 000', '1 500 000'],
        ['6', 'Total', '40 000 000', '27 950 000']
      ]
    },
    qcm: [
      {
        id: 'q1',
        enonce: 'Quelle ligne est en dépassement budgétaire ?',
        choix: choix(['Salaires', 'Carburant', 'Intrants nutritionnels', 'Formations']),
        bonne: 'b',
        explication: '3 450 000 > 3 000 000 : 115 % d\'exécution.'
      },
      {
        id: 'q2',
        enonce: 'Quel est le taux d\'exécution global du projet (arrondi) ?',
        choix: choix(['69,9 %', '72,5 %', '75,0 %', '30,1 %']),
        bonne: 'a',
        explication: '27 950 000 ÷ 40 000 000 = 69,875 %.'
      },
      {
        id: 'q3',
        enonce: 'Quelle formule, en D2, calcule le taux d\'exécution des salaires ?',
        choix: choix(['=B2/C2', '=C2/B2', '=C2-B2', '=SOMME(B2:C2)']),
        bonne: 'b',
        explication: 'Dépenses (C2) divisées par le budget (B2) : 9 000 000 ÷ 12 000 000 = 75 %.'
      },
      {
        id: 'q4',
        enonce: 'Quelle formule, en C6, calcule le total des dépenses ?',
        choix: choix(['=SOMME(C2:C5)', '=C2+C5', '=MOYENNE(C2:C5)', '=SOMME(B2:B5)']),
        bonne: 'a',
        explication: 'SOMME de C2 à C5 = 27 950 000.'
      }
    ],
    questions: [
      {
        id: 't1',
        enonce: 'Écrivez la formule à placer en E2, puis à recopier vers le bas, pour afficher « Dépassement » si les dépenses dépassent le budget et « OK » sinon. Expliquez-la en une phrase.',
        criteres: [
          'Utilise la fonction SI (ou IF), séparateur ; ou , accepté',
          'Compare les dépenses (colonne C) au budget (colonne B) dans le bon sens, par exemple =SI(C2>B2;"Dépassement";"OK")',
          'Utilise des références relatives qui se recopient correctement ligne par ligne',
          'Explique clairement la formule'
        ]
      },
      {
        id: 't2',
        enonce: 'Le carburant dépasse son budget. Décrivez comment vous traitez ce dépassement vis-à-vis du bailleur.',
        criteres: [
          'Chiffre le dépassement : 450 000 FCFA, soit 15 %',
          'Vérifie les règles du bailleur sur la flexibilité entre lignes budgétaires',
          'Propose une réallocation documentée, par exemple depuis la ligne Formations sous-exécutée, ou une demande d\'avenant',
          'Informe la hiérarchie et documente la décision'
        ]
      }
    ]
  }
]);

function modeleParId(id) {
  const modele = MODELES.find((m) => m.id === id);
  if (!modele) throw erreur('INTROUVABLE');
  return JSON.parse(JSON.stringify(modele));
}
