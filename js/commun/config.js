(function () {
  'use strict';

  window.HUMANO = window.HUMANO || {};

  function niveauStress(v) {
    if (v < 40) return 'calme';
    if (v < 70) return 'tendu';
    return 'rupture';
  }

  function libelleStress(v) {
    if (v < 40) return 'Calme';
    if (v < 70) return 'Tendu';
    if (v < 90) return 'Au bord de la rupture';
    return 'Rupture';
  }

  window.HUMANO.config = Object.freeze({
    URL_API: 'https://script.google.com/macros/s/<ID_DEPLOIEMENT>/exec',
    DELAI_MS: 30000,
    DELAI_LONG_MS: 90000,
    ACTIONS_LONGUES: Object.freeze(['candidat.terminer', 'tests.evaluer', 'postes.generer']),
    ACTIONS_LECTURE: Object.freeze([
      'systeme.etat',
      'auth.prelogin',
      'postes.modeles',
      'postes.lister',
      'postes.obtenir',
      'tests.lister',
      'tests.obtenir',
      'admin.journal',
      'admin.journalVerifier',
      'admin.parametres',
      'admin.registre',
      'auth.sessions',
      'candidat.ouvrir'
    ]),
    VERSION_NOTICE: '2026-09-27',
    ITERATIONS_PBKDF2: 600000,
    MOT_DE_PASSE_MIN: 12,
    SEUIL_INSERTION_SUSPECTE: 40,
    DELAI_CONFIRMATION_BLUR_MS: 1500,
    ANNONCES_CHRONO_S: Object.freeze([300, 60, 10]),
    LONGUEUR_MAX: Object.freeze({
      intitule: 80,
      entreprise: 60,
      profil: 2000,
      libre: 40,
      nom: 60,
      reponseCourte: 600,
      reponseLongue: 5000,
      email: 120
    }),
    SECTEURS: Object.freeze({
      fintech: 'Fintech (mobile money)',
      agro: 'Agroalimentaire',
      ong: 'Humanitaire (ONG)',
      autre: 'Autre secteur'
    }),
    COMPETENCES: Object.freeze([
      { id: 'empathie', libelle: 'Empathie et écoute active', type: 'soft' },
      { id: 'gestion_crise', libelle: 'Gestion de crise', type: 'soft' },
      { id: 'communication', libelle: 'Communication claire et structurée', type: 'soft' },
      { id: 'negociation', libelle: 'Négociation et recherche de solution', type: 'soft' },
      { id: 'management', libelle: 'Management et leadership d\'équipe', type: 'soft' },
      { id: 'analyse_chiffres', libelle: 'Analyse de données chiffrées', type: 'hard' },
      { id: 'procedures', libelle: 'Respect des procédures et de la conformité', type: 'hard' },
      { id: 'resolution', libelle: 'Résolution de problème opérationnel', type: 'hard' }
    ]),
    niveauStress: niveauStress,
    libelleStress: libelleStress
  });
})();
