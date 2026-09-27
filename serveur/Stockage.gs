const FEUILLES = Object.freeze({
  postes: 'postes',
  tests: 'tests',
  journal: 'journal'
});

function celluleSure(valeur) {
  const s = String(valeur === null || valeur === undefined ? '' : valeur);
  if (s.startsWith('=') || s.startsWith('+') || s.startsWith('@')) {
    throw erreur('INVALIDE');
  }
  return s;
}

let verrouDetenu = false;
let classeurMemo = null;
const feuillesMemo = {};

const Stockage = Object.freeze({
  classeur() {
    if (classeurMemo) return classeurMemo;
    const id = PropertiesService.getScriptProperties().getProperty('CLASSEUR_ID');
    if (!id) throw erreur('INTERNE');
    classeurMemo = SpreadsheetApp.openById(id);
    return classeurMemo;
  },
  feuille(nom) {
    if (feuillesMemo[nom]) return feuillesMemo[nom];
    const c = Stockage.classeur();
    const f = c.getSheetByName(nom);
    if (!f) throw erreur('INTERNE');
    feuillesMemo[nom] = f;
    return f;
  },
  lignes(nom) {
    const f = Stockage.feuille(nom);
    const n = f.getLastRow();
    if (n <= 1) return [];
    const col = f.getLastColumn();
    return f.getRange(2, 1, n - 1, col).getValues();
  },
  trouver(nom, id) {
    const f = Stockage.feuille(nom);
    const n = f.getLastRow();
    if (n <= 1) return null;
    const col = f.getLastColumn();
    const valeurs = f.getRange(2, 1, n - 1, col).getValues();
    for (let i = 0; i < valeurs.length; i++) {
      if (String(valeurs[i][0]) === String(id)) {
        const indexLigne = i + 2;
        const ligneValeurs = valeurs[i];
        if (nom === FEUILLES.postes || nom === FEUILLES.tests || nom === 'postes' || nom === 'tests') {
          const brute = ligneValeurs[ligneValeurs.length - 1];
          try {
            const obj = JSON.parse(brute);
            if (obj && typeof obj === 'object') {
              Object.defineProperty(obj, 'indexLigne', {
                value: indexLigne,
                writable: true,
                enumerable: false,
                configurable: true
              });
              Object.defineProperty(obj, 'valeurs', {
                value: ligneValeurs,
                writable: true,
                enumerable: false,
                configurable: true
              });
              return obj;
            }
          } catch (e) {
          }
        }
        return { indexLigne: indexLigne, valeurs: ligneValeurs };
      }
    }
    return null;
  },
  ajouter(nom, valeurs) {
    const f = Stockage.feuille(nom);
    const sures = valeurs.map(celluleSure);
    f.appendRow(sures);
  },
  remplacer(nom, id, nouvellesValeurs) {
    const f = Stockage.feuille(nom);
    const trouve = Stockage.trouver(nom, id);
    if (!trouve) throw erreur('INTROUVABLE');
    const sures = nouvellesValeurs.map(celluleSure);
    f.getRange(trouve.indexLigne, 1, 1, sures.length).setValues([sures]);
  },
  supprimer(nom, id) {
    const f = Stockage.feuille(nom);
    const trouve = Stockage.trouver(nom, id);
    if (!trouve) throw erreur('INTROUVABLE');
    f.deleteRow(trouve.indexLigne);
  },
  avecVerrou(fonction) {
    if (verrouDetenu) {
      return fonction();
    }
    const verrou = LockService.getScriptLock();
    verrou.waitLock(30000);
    verrouDetenu = true;
    try {
      return fonction();
    } finally {
      verrouDetenu = false;
      verrou.releaseLock();
    }
  },
  mettreAJour(nom, id, fonctionValeurs) {
    return Stockage.avecVerrou(() => {
      const trouve = Stockage.trouver(nom, id);
      if (!trouve) throw erreur('INTROUVABLE');
      const maj = fonctionValeurs(trouve.valeurs);
      Stockage.remplacer(nom, id, maj);
      return maj;
    });
  },
  lireProprieteJson(cle) {
    const v = PropertiesService.getScriptProperties().getProperty(cle);
    return v ? JSON.parse(v) : null;
  },
  ecrireProprieteJson(cle, valeur) {
    PropertiesService.getScriptProperties().setProperty(cle, JSON.stringify(valeur));
  }
});

const Journal = Object.freeze({
  empreinte(precedente, horodatage, acteur, action, cible, detail) {
    const chaine = [precedente, horodatage, acteur, action, cible, detail].join('|');
    return sha256Hex(chaine);
  },
  ecrire(acteur, action, cible, detail) {
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      const precedente = props.getProperty('JOURNAL_DERNIERE_EMPREINTE') || 'origine';
      const horodatage = maintenantIso();
      const act = String(acteur || '');
      const actn = String(action || '');
      const cib = String(cible || '');
      const det = String(detail || '');
      const empreinte = Journal.empreinte(precedente, horodatage, act, actn, cib, det);
      Stockage.ajouter(FEUILLES.journal, [horodatage, act, actn, cib, det, empreinte]);
      props.setProperty('JOURNAL_DERNIERE_EMPREINTE', empreinte);
      return empreinte;
    });
  },
  ecrireSousVerrou(acteur, action, cible, detail) {
    return Journal.ecrire(acteur, action, cible, detail);
  },
  lister(prefixeAction) {
    const lignes = Stockage.lignes(FEUILLES.journal);
    const resultat = [];
    const p = prefixeAction ? String(prefixeAction) : '';
    for (let i = lignes.length - 1; i >= 0; i--) {
      const lig = lignes[i];
      const actn = String(lig[2] || '');
      if (!p || actn.startsWith(p)) {
        resultat.push({
          horodatage: String(lig[0]),
          acteur: String(lig[1]),
          action: actn,
          cible: String(lig[3]),
          detail: String(lig[4])
        });
        if (resultat.length >= 500) break;
      }
    }
    return resultat;
  },
  verifier() {
    const lignes = Stockage.lignes(FEUILLES.journal);
    let precedente = 'origine';
    for (let i = 0; i < lignes.length; i++) {
      const lig = lignes[i];
      const horodatage = String(lig[0]);
      const acteur = String(lig[1]);
      const action = String(lig[2]);
      const cible = String(lig[3]);
      const detail = String(lig[4]);
      const empreinteLue = String(lig[5]);
      const calculee = Journal.empreinte(precedente, horodatage, acteur, action, cible, detail);
      if (!egaliteConstante(calculee, empreinteLue)) {
        return { integre: false, lignes: lignes.length, premiereAnomalie: i + 2 };
      }
      precedente = calculee;
    }
    return { integre: true, lignes: lignes.length, premiereAnomalie: null };
  },
  exporterCsv() {
    const lignes = Stockage.lignes(FEUILLES.journal);
    const entete = ['horodatage', 'acteur', 'action', 'cible', 'detail', 'empreinte'];
    const neutraliser = (val) => {
      let s = String(val === null || val === undefined ? '' : val);
      if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) {
        s = '\'' + s;
      }
      return '"' + s.split('"').join('""') + '"';
    };
    const sortie = [entete.join(',')];
    for (let i = 0; i < lignes.length; i++) {
      sortie.push(lignes[i].map(neutraliser).join(','));
    }
    return sortie.join('\r\n');
  }
});
