function lireTest(id) {
  return Stockage.trouver('tests', id);
}

function scoreQcm(poste, test) {
  const e = poste.epreuves;
  const correctes = e.qcm.filter((q) => {
    const r = test.qcm.find((rep) => rep.questionId === q.id);
    return r && r.choix === q.bonne;
  }).length;
  return { correctes: correctes, total: e.qcm.length };
}

function cloturer(test, motifFin) {
  test.statut = 'termine';
  test.etape = 'fin';
  test.fin = maintenantIso();
  test.motifFin = motifFin;
}

const Tests = Object.freeze({
  lister(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.posteId, 'posteId');
    const lignes = Stockage.lignes('tests');
    return lignes
      .filter((l) => l[1] === donnees.posteId)
      .map((l) => {
        const t = JSON.parse(l[6]);
        return {
          id: t.id,
          prenom: t.candidat.prenom,
          nom: t.candidat.nom,
          statut: t.statut,
          debut: t.debut,
          fin: t.fin,
          noteFinale: t.evaluation ? t.evaluation.note_finale : null,
          sorties: t.infractions.sorties.length,
          motifFin: t.motifFin
        };
      });
  },

  obtenir(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.id, 'id');
    const test = lireTest(donnees.id);
    if (!test) throw erreur('INTROUVABLE');
    const poste = Stockage.trouver('postes', test.posteId);
    if (!poste) throw erreur('INTROUVABLE');
    return {
      test: test,
      poste: poste,
      qcm: scoreQcm(poste, test)
    };
  },

  evaluerInterne(poste, test) {
    const promptUtilisateur = donneesEvaluation(poste, test);
    const validateur = creerValidateurEvaluation(poste);
    const brut = IA.appeler(
      CONFIG.MODELE_EVALUATION,
      PROMPT_EVALUATION,
      [{ role: 'user', parts: [{ text: promptUtilisateur }] }],
      SCHEMAS.evaluation,
      { temperature: 0.3, maxOutputTokens: 4000 }
    );
    const evaluee = validateur(brut);
    if (!evaluee) {
      throw erreur('IA_REPONSE');
    }
    const sorties = test.infractions.sorties.length;
    const penalite = Math.min(CONFIG.PENALITE_MAX, CONFIG.PENALITE_PAR_SORTIE * sorties);
    evaluee.penalite = penalite;
    evaluee.note_finale = Math.max(0, evaluee.note_ia - penalite);
    evaluee.qcm = scoreQcm(poste, test);
    evaluee.modele = CONFIG.MODELE_EVALUATION;
    evaluee.genereeLe = maintenantIso();

    test.evaluation = evaluee;
    test.statut = 'evalue';

    Stockage.remplacer('tests', test.id, [
      test.id,
      test.posteId,
      test.statut,
      test.debut,
      test.finPrevue,
      Stockage.lignes('tests').find((l) => l[0] === test.id)[5],
      JSON.stringify(test)
    ]);

    Rgpd.notifier(
      'Nouveau test terminé : ' + poste.intitule,
      'Le test de ' + test.candidat.prenom + ' ' + test.candidat.nom + ' pour le poste ' + poste.intitule + ' a été évalué avec la note de ' + evaluee.note_finale + '/20.'
    );

    return evaluee;
  },

  evaluer(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.id, 'id');
    const test = lireTest(donnees.id);
    if (!test) throw erreur('INTROUVABLE');
    const poste = Stockage.trouver('postes', test.posteId);
    if (!poste) throw erreur('INTROUVABLE');
    if (test.statut !== 'termine' && test.statut !== 'evalue') {
      throw erreur('ETAT');
    }
    const evaluee = Tests.evaluerInterne(poste, test);
    Journal.ecrire('admin', 'test.evaluation', test.id, 'Note : ' + evaluee.note_finale + '/20');
    return evaluee;
  },

  supprimer(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.id, 'id');
    return Stockage.avecVerrou(() => {
      const test = lireTest(donnees.id);
      if (!test) throw erreur('INTROUVABLE');
      Stockage.supprimer('tests', donnees.id);
      Journal.ecrire('admin', 'test.suppression', test.id, 'Exercice droit effacement');
      return {};
    });
  },

  exporter(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.id, 'id');
    const test = lireTest(donnees.id);
    if (!test) throw erreur('INTROUVABLE');
    const poste = Stockage.trouver('postes', test.posteId);
    if (!poste) throw erreur('INTROUVABLE');
    Journal.ecrire('admin', 'test.export', test.id, 'Portabilite RGPD');
    return {
      format: 'humano-export-v1',
      exporteLe: maintenantIso(),
      test: test,
      poste: poste
    };
  }
});
