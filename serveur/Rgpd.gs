const Rgpd = Object.freeze({
  lireParametres() {
    const p = Stockage.lireProprieteJson('PARAMETRES') || {};
    return {
      conservationJours: Number(p.conservationJours || CONFIG.CONSERVATION_DEFAUT_JOURS),
      emailNotification: String(p.emailNotification || ''),
      urlPublique: String(p.urlPublique || '')
    };
  },

  parametres() {
    const p = Rgpd.lireParametres();
    const cleIa = PropertiesService.getScriptProperties().getProperty('CLE_GEMINI');
    return {
      conservationJours: p.conservationJours,
      emailNotification: p.emailNotification,
      urlPublique: p.urlPublique,
      cleIaConfiguree: Boolean(cleIa && cleIa.length > 5)
    };
  },

  enregistrerParametres(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.entier(donnees.conservationJours, 'conservationJours', CONFIG.CONSERVATION_MIN_JOURS, CONFIG.CONSERVATION_MAX_JOURS);
    if (donnees.emailNotification) {
      Valider.email(donnees.emailNotification, 'emailNotification');
    }
    Valider.texte(donnees.urlPublique, 'urlPublique', 0, 300);
    let url = donnees.urlPublique.trim();
    if (url && !url.endsWith('/')) {
      url += '/';
    }

    Stockage.ecrireProprieteJson('PARAMETRES', {
      conservationJours: donnees.conservationJours,
      emailNotification: donnees.emailNotification ? donnees.emailNotification.trim() : '',
      urlPublique: url
    });

    if (typeof donnees.cleIa === 'string' && donnees.cleIa.trim()) {
      PropertiesService.getScriptProperties().setProperty('CLE_GEMINI', donnees.cleIa.trim());
    }

    Journal.ecrire('admin', 'admin.parametres', 'systeme', 'Mise a jour configuration');
    return Rgpd.parametres();
  },

  notifier(sujet, message) {
    const params = Rgpd.lireParametres();
    if (!params.emailNotification) return;
    try {
      MailApp.sendEmail({
        to: params.emailNotification,
        subject: '[HUMANO] ' + sujet,
        body: message + '\n\nConsultez le rapport sur la console HUMANO.'
      });
    } catch (e) {
    }
  },

  purger() {
    return Stockage.avecVerrou(() => {
      const params = Rgpd.lireParametres();
      const limiteMs = Date.now() - (params.conservationJours * 24 * 3600 * 1000);
      const lignes = Stockage.lignes('tests');
      let supprimes = 0;

      lignes.forEach((l) => {
        const t = JSON.parse(l[6]);
        const dateRef = t.fin ? new Date(t.fin).getTime() : new Date(t.debut).getTime();
        if (dateRef < limiteMs) {
          Stockage.supprimer('tests', t.id);
          supprimes += 1;
        }
      });

      if (supprimes > 0) {
        Journal.ecrire('systeme', 'rgpd.purge', 'tests', supprimes + ' tests purges');
      }
      return { supprimes: supprimes };
    });
  },

  purgerMaintenant() {
    return Rgpd.purger();
  },

  registre() {
    const params = Rgpd.lireParametres();
    return {
      responsable: 'Recruteur / Administrateur de l\'application HUMANO',
      finalite: 'Évaluation des compétences professionnelles et humaines des candidats dans le cadre de recrutements.',
      baseLegale: 'Consentement explicite du candidat (RGPD art. 6.1.a et loi sénégalaise n° 2008-12).',
      donnees: 'Prénom, nom, réponses aux épreuves, indicateurs d\'intégrité (sorties, collages), horodatages.',
      destinataires: 'Recruteur autorisé ; sous-traitant technique Google (hébergement Apps Script, Google Sheets, API Gemini).',
      conservation: params.conservationJours + ' jours après la fin du test, puis purge automatique irréversible.',
      droits: 'Droit d\'accès, de rectification, d\'effacement (suppression immédiate) et de portabilité (export JSON).',
      securite: 'Journal d\'audit chaîné SHA-256, pseudonymisation lors des évaluations par l\'IA, second facteur TOTP admin, clé IA protégée côté serveur.'
    };
  }
});

function tacheReguliere() {
  const maintenantMs = Date.now();
  const lignesTests = Stockage.lignes('tests');

  lignesTests.forEach((l) => {
    const t = JSON.parse(l[6]);
    if (t.statut === 'en_cours') {
      const finMax = new Date(t.finPrevue).getTime() + (CONFIG.TOLERANCE_FIN_S * 1000);
      if (maintenantMs > finMax) {
        Stockage.avecVerrou(() => {
          const frais = Stockage.trouver('tests', t.id);
          if (frais && frais.statut === 'en_cours') {
            cloturer(frais, 'temps');
            Stockage.remplacer('tests', frais.id, [
              frais.id,
              frais.posteId,
              frais.statut,
              frais.debut,
              frais.finPrevue,
              l[5],
              JSON.stringify(frais)
            ]);
            Journal.ecrire('systeme', 'test.expiration', frais.id, 'Fermeture par depassement temps');
          }
        });
      }
    }
  });

  const aEvaluer = Stockage.lignes('tests')
    .map((l) => JSON.parse(l[6]))
    .filter((t) => t.statut === 'termine' && !t.evaluation)
    .slice(0, 3);

  aEvaluer.forEach((t) => {
    try {
      const poste = Stockage.trouver('postes', t.posteId);
      if (poste) {
        Tests.evaluerInterne(poste, t);
      }
    } catch (e) {
    }
  });
}

function tacheQuotidienne() {
  Rgpd.purger();
}
