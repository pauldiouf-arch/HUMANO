const ENTETES = Object.freeze({
  postes: ['id', 'statut', 'creeLe', 'majLe', 'donnees'],
  tests: ['id', 'posteId', 'statut', 'debut', 'finPrevue', 'jetonHash', 'donnees'],
  journal: ['horodatage', 'acteur', 'action', 'cible', 'detail', 'empreinte']
});

const ACTIONS = Object.freeze({
  'systeme.etat': { acces: 'public', fn: (d) => Auth.etat() },
  'auth.initialiser': { acces: 'public', fn: (d) => Auth.initialiser(d) },
  'auth.prelogin': { acces: 'public', fn: (d) => Auth.prelogin() },
  'auth.connexion': { acces: 'public', fn: (d) => Auth.connexion(d) },
  'auth.deconnexion': { acces: 'admin', fn: (d, s) => Auth.deconnexion(s.jeton) },
  'auth.sessions': { acces: 'admin', fn: (d, s) => Auth.listerSessions(s.jeton) },
  'auth.revoquer': { acces: 'admin', fn: (d, s) => Auth.revoquer(d, s.jeton) },
  'auth.motDePasse': { acces: 'admin', fn: (d, s) => Auth.changerMotDePasse(d, s.jeton) },
  'auth.totpPreparer': { acces: 'admin', fn: (d, s) => Auth.totpPreparer() },
  'auth.totpActiver': { acces: 'admin', fn: (d, s) => Auth.totpActiver(d) },
  'auth.totpDesactiver': { acces: 'admin', fn: (d, s) => Auth.totpDesactiver(d) },

  'postes.modeles': { acces: 'admin', fn: (d) => Postes.modeles() },
  'postes.depuisModele': { acces: 'admin', fn: (d) => Postes.depuisModele(d) },
  'postes.generer': { acces: 'admin', fn: (d) => Postes.generer(d) },
  'postes.enregistrer': { acces: 'admin', fn: (d) => Postes.enregistrer(d) },
  'postes.lister': { acces: 'admin', fn: (d) => Postes.lister() },
  'postes.obtenir': { acces: 'admin', fn: (d) => Postes.obtenir(d) },
  'postes.statut': { acces: 'admin', fn: (d) => Postes.changerStatut(d) },
  'postes.inviter': { acces: 'admin', fn: (d) => Postes.inviter(d) },

  'tests.lister': { acces: 'admin', fn: (d) => Tests.lister(d) },
  'tests.obtenir': { acces: 'admin', fn: (d) => Tests.obtenir(d) },
  'tests.evaluer': { acces: 'admin', fn: (d) => Tests.evaluer(d) },
  'tests.supprimer': { acces: 'admin', fn: (d) => Tests.supprimer(d) },
  'tests.exporter': { acces: 'admin', fn: (d) => Tests.exporter(d) },

  'admin.journal': { acces: 'admin', fn: (d) => Journal.lister(d ? d.action : '') },
  'admin.journalVerifier': { acces: 'admin', fn: (d) => Journal.verifier() },
  'admin.journalCsv': { acces: 'admin', fn: (d) => Journal.exporterCsv() },
  'admin.parametres': { acces: 'admin', fn: (d) => Rgpd.parametres() },
  'admin.parametresEnregistrer': { acces: 'admin', fn: (d) => Rgpd.enregistrerParametres(d) },
  'admin.purger': { acces: 'admin', fn: (d) => Rgpd.purgerMaintenant() },
  'admin.registre': { acces: 'admin', fn: (d) => Rgpd.registre() },

  'candidat.ouvrir': { acces: 'public', fn: (d) => Candidat.ouvrir(d) },
  'candidat.demarrer': { acces: 'public', fn: (d) => Candidat.demarrer(d) },
  'candidat.reprendre': { acces: 'public', fn: (d) => Candidat.reprendre(d) },
  'candidat.qcm': { acces: 'public', fn: (d) => Candidat.reponsesQcm(d) },
  'candidat.questions': { acces: 'public', fn: (d) => Candidat.reponsesQuestions(d) },
  'candidat.repliquer': { acces: 'public', fn: (d) => Candidat.repliquer(d) },
  'candidat.signaler': { acces: 'public', fn: (d) => Candidat.signaler(d) },
  'candidat.terminer': { acces: 'public', fn: (d) => Candidat.terminer(d) }
});

function reponseJson(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function traiterRequete(texteCorps) {
  try {
    if (typeof texteCorps !== 'string' || texteCorps.length > CONFIG.TAILLE_MAX_REQUETE) {
      throw erreur('INVALIDE');
    }
    let requete;
    try {
      requete = JSON.parse(texteCorps);
    } catch (e) {
      throw erreur('INVALIDE');
    }
    if (!requete || typeof requete !== 'object' || Array.isArray(requete)) {
      throw erreur('INVALIDE');
    }
    const cles = Object.keys(requete).sort();
    if (cles.length !== 3 || cles[0] !== 'action' || cles[1] !== 'donnees' || cles[2] !== 'jeton') {
      throw erreur('INVALIDE');
    }
    const desc = ACTIONS[requete.action];
    if (!desc) {
      throw erreur('INVALIDE');
    }

    let session = null;
    if (desc.acces === 'admin') {
      if (!requete.jeton) {
        throw erreur('NON_AUTORISE');
      }
      session = Auth.verifierSession(requete.jeton);
      if (!session) {
        throw erreur('NON_AUTORISE');
      }
    }

    const resultat = desc.fn(requete.donnees, { jeton: requete.jeton, session: session });
    return { ok: true, donnees: resultat === undefined ? {} : resultat };
  } catch (err) {
    if (err instanceof ErreurHumano) {
      return { ok: false, erreur: { code: err.code, message: err.message } };
    }
    return { ok: false, erreur: { code: 'INTERNE', message: MESSAGES_ERREUR.INTERNE } };
  }
}

function doPost(e) {
  const corps = e && e.postData && e.postData.contents ? e.postData.contents : '';
  const resultat = traiterRequete(corps);
  return reponseJson(resultat);
}

function doGet(e) {
  return reponseJson({
    ok: true,
    donnees: {
      service: 'HUMANO',
      version: CONFIG.VERSION,
      initialise: Auth.etat().initialise
    }
  });
}

function installer() {
  const props = PropertiesService.getScriptProperties();

  if (!props.getProperty('POIVRE')) {
    props.setProperty('POIVRE', jetonAleatoire());
  }

  let classeurId = props.getProperty('CLASSEUR_ID');
  let classeur;
  if (classeurId) {
    try {
      classeur = SpreadsheetApp.openById(classeurId);
    } catch (e) {
      classeur = null;
    }
  }

  if (!classeur) {
    classeur = SpreadsheetApp.create('HUMANO — données');
    props.setProperty('CLASSEUR_ID', classeur.getId());
  }

  Object.keys(ENTETES).forEach((nom) => {
    let feuille = classeur.getSheetByName(nom);
    if (!feuille) {
      feuille = classeur.insertSheet(nom);
    }
    const nbColonnes = ENTETES[nom].length;
    const maxLignes = feuille.getMaxRows();
    feuille.getRange(1, 1, maxLignes, nbColonnes).setNumberFormat('@');
    feuille.setFrozenRows(1);
    if (feuille.getLastRow() === 0) {
      feuille.appendRow(ENTETES[nom]);
    }
  });

  const nomsAutorises = Object.keys(ENTETES);
  classeur.getSheets().forEach((f) => {
    if (!nomsAutorises.includes(f.getName())) {
      try {
        classeur.deleteSheet(f);
      } catch (e) {
      }
    }
  });

  const declencheurs = ScriptApp.getProjectTriggers();
  declencheurs.forEach((d) => { ScriptApp.deleteTrigger(d); });

  ScriptApp.newTrigger('tacheReguliere')
    .timeBased()
    .everyMinutes(10)
    .create();

  ScriptApp.newTrigger('tacheQuotidienne')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();

  Journal.ecrire('systeme', 'systeme.installation', 'systeme', 'Installation et initialisation terminees');
}
