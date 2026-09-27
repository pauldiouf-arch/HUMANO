function validerCompetences(competences) {
  Valider.objet(competences, 'competences');
  Valider.liste(competences.hard, 'competences.hard');
  Valider.liste(competences.soft, 'competences.soft');
  Valider.liste(competences.libres, 'competences.libres');
  if (competences.soft.length < 1) {
    throw erreur('INVALIDE');
  }
  const idSofts = CONFIG.COMPETENCES.filter((c) => c.type === 'soft').map((c) => c.id);
  const idHards = CONFIG.COMPETENCES.filter((c) => c.type === 'hard').map((c) => c.id);
  competences.soft.forEach((s) => { Valider.parmi(s, idSofts, 'soft'); });
  competences.hard.forEach((h) => { Valider.parmi(h, idHards, 'hard'); });
  if (competences.hard.length > 3) {
    throw erreur('INVALIDE');
  }
  if (competences.libres.length > CONFIG.LONGUEUR.libresMax) {
    throw erreur('INVALIDE');
  }
  competences.libres.forEach((l) => { Valider.texte(l, 'libre', 1, CONFIG.LONGUEUR.libre); });
  if (competences.hard.length + competences.libres.length < 1) {
    throw erreur('INVALIDE');
  }
}

function validerEpreuves(epreuves) {
  Valider.objet(epreuves, 'epreuves');
  Valider.objet(epreuves.contexteQcm, 'contexteQcm');
  Valider.texte(epreuves.contexteQcm.titre, 'titreQcm', 1, CONFIG.LONGUEUR.enonce);
  Valider.liste(epreuves.contexteQcm.colonnes, 'colonnes');
  Valider.liste(epreuves.contexteQcm.lignes, 'lignes');
  epreuves.contexteQcm.colonnes.forEach((c) => { Valider.texte(c, 'colonne', 1, CONFIG.LONGUEUR.cellule); });
  epreuves.contexteQcm.lignes.forEach((lig) => {
    Valider.liste(lig, 'ligne');
    lig.forEach((cel) => { Valider.texte(String(cel), 'cellule', 0, CONFIG.LONGUEUR.cellule); });
  });

  Valider.liste(epreuves.qcm, 'qcm');
  if (epreuves.qcm.length < CONFIG.QCM_MIN || epreuves.qcm.length > CONFIG.QCM_MAX) {
    throw erreur('INVALIDE');
  }
  epreuves.qcm.forEach((q) => {
    Valider.identifiant(q.id, 'q.id');
    Valider.texte(q.enonce, 'q.enonce', 1, CONFIG.LONGUEUR.enonce);
    Valider.liste(q.choix, 'q.choix');
    if (q.choix.length !== 4) throw erreur('INVALIDE');
    const idsChoix = q.choix.map((c) => c.id);
    if (idsChoix.join('') !== 'abcd') throw erreur('INVALIDE');
    q.choix.forEach((c) => { Valider.texte(c.texte, 'c.texte', 1, CONFIG.LONGUEUR.choix); });
    Valider.parmi(q.bonne, ['a', 'b', 'c', 'd'], 'q.bonne');
    Valider.texte(q.explication, 'q.explication', 1, CONFIG.LONGUEUR.enonce);
  });

  Valider.liste(epreuves.questions, 'questions');
  if (epreuves.questions.length > CONFIG.QUESTIONS_MAX) {
    throw erreur('INVALIDE');
  }
  epreuves.questions.forEach((qu) => {
    Valider.identifiant(qu.id, 'qu.id');
    Valider.texte(qu.enonce, 'qu.enonce', 1, CONFIG.LONGUEUR.enonce);
    Valider.liste(qu.criteres, 'qu.criteres');
    if (qu.criteres.length < 1) throw erreur('INVALIDE');
    qu.criteres.forEach((cr) => { Valider.texte(cr, 'critere', 1, CONFIG.LONGUEUR.critere); });
  });

  Valider.objet(epreuves.simulation, 'simulation');
  Valider.texte(epreuves.simulation.persona, 'persona', 1, CONFIG.LONGUEUR.persona);
  Valider.texte(epreuves.simulation.nomCourt, 'nomCourt', 1, CONFIG.LONGUEUR.nom);
  Valider.texte(epreuves.simulation.role, 'role', 1, CONFIG.LONGUEUR.nom);
  Valider.parmi(epreuves.simulation.posture, ['interne', 'externe'], 'posture');
  Valider.texte(epreuves.simulation.ouverture, 'ouverture', 1, CONFIG.LONGUEUR.messageIA);
  Valider.texte(epreuves.simulation.faits, 'faits', 1, CONFIG.LONGUEUR.faits);
}

function nombreRepliques(poste) {
  const nb = (poste.competences.soft.length || 1) * 2;
  return Math.max(CONFIG.REPLIQUES_MIN, Math.min(CONFIG.REPLIQUES_MAX, nb));
}

const Postes = Object.freeze({
  modeles() {
    return MODELES.map((m) => ({ id: m.id, libelle: m.libelle, secteur: m.secteur }));
  },

  depuisModele(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.texte(donnees.modeleId, 'modeleId', 1, 60);
    const m = modeleParId(donnees.modeleId);
    return {
      contexteQcm: m.contexteQcm,
      qcm: m.qcm,
      questions: m.questions,
      simulation: m.simulation
    };
  },

  generer(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.texte(donnees.intitule, 'intitule', 1, CONFIG.LONGUEUR.intitule);
    Valider.parmi(donnees.secteur, Object.keys(CONFIG.SECTEURS), 'secteur');
    Valider.texte(donnees.profil, 'profil', 0, CONFIG.LONGUEUR.profil);
    validerCompetences(donnees.competences);

    const soft = donnees.competences.soft.map(libelleCompetence).join(', ');
    const hard = donnees.competences.hard.map(libelleCompetence).concat(donnees.competences.libres).join(', ');
    const contenuUtilisateur = [
      'POSTE : ' + donnees.intitule + ' — SECTEUR : ' + CONFIG.SECTEURS[donnees.secteur],
      'COMPÉTENCES TECHNIQUES : ' + hard,
      'COMPÉTENCES HUMAINES : ' + soft,
      'NOMBRE : 4 questions à choix multiples, 2 questions techniques ouvertes.',
      '<<<PROFIL',
      donnees.profil || 'Aucun profil fourni.',
      'PROFIL>>>'
    ].join('\n');

    const brut = IA.appeler(
      CONFIG.MODELE_GENERATION,
      PROMPT_GENERATION,
      [{ role: 'user', parts: [{ text: contenuUtilisateur }] }],
      SCHEMAS.generation,
      { temperature: 0.4, maxOutputTokens: 6000 }
    );

    if (!brut || !brut.contexte_qcm || !brut.qcm || !brut.questions || !brut.simulation) {
      throw erreur('IA_REPONSE');
    }

    const epreuves = {
      contexteQcm: {
        titre: String(brut.contexte_qcm.titre || '').slice(0, CONFIG.LONGUEUR.enonce),
        colonnes: (brut.contexte_qcm.colonnes || []).map((c) => String(c).slice(0, CONFIG.LONGUEUR.cellule)),
        lignes: (brut.contexte_qcm.lignes || []).map((l) => (Array.isArray(l) ? l : []).map((c) => String(c).slice(0, CONFIG.LONGUEUR.cellule)))
      },
      qcm: (brut.qcm || []).slice(0, CONFIG.QCM_MAX).map((q, i) => ({
        id: 'q' + (i + 1),
        enonce: String(q.enonce || '').slice(0, CONFIG.LONGUEUR.enonce),
        choix: (q.choix || []).slice(0, 4).map((c, j) => ({ id: 'abcd'[j], texte: String(c).slice(0, CONFIG.LONGUEUR.choix) })),
        bonne: q.bonne,
        explication: String(q.explication || '').slice(0, CONFIG.LONGUEUR.enonce)
      })),
      questions: (brut.questions || []).slice(0, CONFIG.QUESTIONS_MAX).map((q, i) => ({
        id: 't' + (i + 1),
        enonce: String(q.enonce || '').slice(0, CONFIG.LONGUEUR.enonce),
        criteres: (q.criteres || []).map((c) => String(c).slice(0, CONFIG.LONGUEUR.critere))
      })),
      simulation: {
        persona: String(brut.simulation.persona || '').slice(0, CONFIG.LONGUEUR.persona),
        nomCourt: String(brut.simulation.nom_court || '').slice(0, CONFIG.LONGUEUR.nom),
        role: String(brut.simulation.role || '').slice(0, CONFIG.LONGUEUR.nom),
        posture: brut.simulation.posture === 'interne' ? 'interne' : 'externe',
        ouverture: String(brut.simulation.ouverture || '').slice(0, CONFIG.LONGUEUR.messageIA),
        faits: String(brut.simulation.faits || '').slice(0, CONFIG.LONGUEUR.faits)
      }
    };

    validerEpreuves(epreuves);
    return epreuves;
  },

  enregistrer(donnees) {
    Valider.objet(donnees, 'donnees');
    if (donnees.id !== null) {
      Valider.identifiant(donnees.id, 'id');
    }
    Valider.texte(donnees.intitule, 'intitule', 1, CONFIG.LONGUEUR.intitule);
    Valider.texte(donnees.entreprise, 'entreprise', 1, CONFIG.LONGUEUR.entreprise);
    Valider.parmi(donnees.secteur, Object.keys(CONFIG.SECTEURS), 'secteur');
    Valider.texte(donnees.profil, 'profil', 0, CONFIG.LONGUEUR.profil);
    validerCompetences(donnees.competences);
    Valider.entier(donnees.dureeMinutes, 'dureeMinutes', CONFIG.DUREE_TEST_MIN, CONFIG.DUREE_TEST_MAX);
    Valider.booleen(donnees.sansChrono, 'sansChrono');
    validerEpreuves(donnees.epreuves);

    return Stockage.avecVerrou(() => {
      const dateIso = maintenantIso();
      let poste;
      let actionJournal;
      if (donnees.id) {
        poste = Stockage.trouver('postes', donnees.id);
        if (!poste) throw erreur('INTROUVABLE');
        if (poste.statut !== 'brouillon' && poste.statut !== 'ferme') {
          throw erreur('ETAT');
        }
        poste.majLe = dateIso;
        poste.intitule = donnees.intitule;
        poste.entreprise = donnees.entreprise;
        poste.secteur = donnees.secteur;
        poste.profil = donnees.profil;
        poste.competences = donnees.competences;
        poste.dureeMinutes = donnees.dureeMinutes;
        poste.sansChrono = donnees.sansChrono;
        poste.epreuves = donnees.epreuves;
        Stockage.remplacer('postes', poste.id, [poste.id, poste.statut, poste.creeLe, poste.majLe, JSON.stringify(poste)]);
        actionJournal = 'poste.modification';
      } else {
        const id = genererId('p_');
        poste = {
          id: id,
          statut: 'brouillon',
          jetonPoste: null,
          creeLe: dateIso,
          majLe: dateIso,
          intitule: donnees.intitule,
          entreprise: donnees.entreprise,
          secteur: donnees.secteur,
          profil: donnees.profil,
          competences: donnees.competences,
          dureeMinutes: donnees.dureeMinutes,
          sansChrono: donnees.sansChrono,
          epreuves: donnees.epreuves
        };
        Stockage.ajouter('postes', [poste.id, poste.statut, poste.creeLe, poste.majLe, JSON.stringify(poste)]);
        actionJournal = 'poste.creation';
      }
      Journal.ecrire('admin', actionJournal, poste.id, 'Poste ' + poste.intitule);
      return { id: poste.id };
    });
  },

  lister() {
    const lignesPostes = Stockage.lignes('postes');
    const lignesTests = Stockage.lignes('tests');
    return lignesPostes.map((l) => {
      const p = JSON.parse(l[4]);
      const testsPoste = lignesTests.filter((lt) => lt[1] === p.id);
      const nbTermines = testsPoste.filter((lt) => lt[2] === 'termine' || lt[2] === 'evalue').length;
      return {
        id: p.id,
        intitule: p.intitule,
        statut: p.statut,
        secteur: p.secteur,
        majLe: p.majLe,
        nbTests: testsPoste.length,
        nbTermines: nbTermines
      };
    });
  },

  obtenir(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.id, 'id');
    const poste = Stockage.trouver('postes', donnees.id);
    if (!poste) throw erreur('INTROUVABLE');
    const params = Rgpd.lireParametres();
    const lien = poste.jetonPoste && params.urlPublique ? params.urlPublique + '#/' + poste.jetonPoste : null;
    return Object.assign({}, poste, {
      lien: lien,
      repliques: nombreRepliques(poste)
    });
  },

  changerStatut(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.id, 'id');
    Valider.parmi(donnees.statut, ['brouillon', 'ouvert', 'ferme', 'archive'], 'statut');

    return Stockage.avecVerrou(() => {
      const poste = Stockage.trouver('postes', donnees.id);
      if (!poste) throw erreur('INTROUVABLE');
      if (donnees.statut === 'ouvert') {
        const params = Rgpd.lireParametres();
        if (!params.urlPublique) {
          throw erreur('INVALIDE');
        }
        if (!poste.jetonPoste) {
          poste.jetonPoste = jetonAleatoire();
        }
      }
      poste.statut = donnees.statut;
      poste.majLe = maintenantIso();
      Stockage.remplacer('postes', poste.id, [poste.id, poste.statut, poste.creeLe, poste.majLe, JSON.stringify(poste)]);
      Journal.ecrire('admin', 'poste.statut', poste.id, 'Nouveau statut : ' + poste.statut);
      return { statut: poste.statut };
    });
  },

  inviter(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.identifiant(donnees.id, 'id');
    Valider.email(donnees.email, 'email');
    const prenom = donnees.prenom ? Valider.texte(donnees.prenom, 'prenom', 1, CONFIG.LONGUEUR.nom) : '';

    const poste = Stockage.trouver('postes', donnees.id);
    if (!poste || poste.statut !== 'ouvert') {
      throw erreur('FERME');
    }
    const params = Rgpd.lireParametres();
    if (!params.urlPublique || !poste.jetonPoste) {
      throw erreur('INVALIDE');
    }
    const lien = params.urlPublique + '#/' + poste.jetonPoste;
    const salutation = prenom ? 'Bonjour ' + prenom + ',\n\n' : 'Bonjour,\n\n';
    const corps = salutation +
      'Vous êtes invité(e) à passer le test d\'évaluation pour le poste de ' + poste.intitule + ' chez ' + poste.entreprise + '.\n\n' +
      'Ce test dure ' + poste.dureeMinutes + ' minutes et s\'effectue en une seule fois depuis votre téléphone ou votre ordinateur.\n\n' +
      'Pour démarrer votre épreuve, cliquez sur le lien suivant :\n' + lien + '\n\n' +
      'HUMANO — Recrutement transparent';

    try {
      MailApp.sendEmail({
        to: donnees.email,
        subject: 'Invitation au test : ' + poste.intitule,
        body: corps
      });
    } catch (e) {
      throw erreur('MAIL_QUOTA');
    }

    Journal.ecrire('admin', 'poste.invitation', poste.id, 'Invitation envoyee a ' + masquerEmail(donnees.email));
    return { envoye: true };
  }
});
