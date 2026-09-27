function testDepuisJeton(jetonTest) {
  Valider.jeton(jetonTest, 'jetonTest');
  const jetonHash = sha256Hex(jetonTest);
  const lignes = Stockage.lignes('tests');
  const ligne = lignes.find((l) => l[5] === jetonHash);
  if (!ligne) throw erreur('FERME');
  return JSON.parse(ligne[6]);
}

function sauverTestCandidat(test, jetonHash) {
  Stockage.remplacer('tests', test.id, [
    test.id,
    test.posteId,
    test.statut,
    test.debut,
    test.finPrevue,
    jetonHash,
    JSON.stringify(test)
  ]);
}

function construireEtat(test, poste) {
  const repliquesTotal = nombreRepliques(poste);
  const repliquesCandidat = test.echanges.filter((e) => e.role === 'candidat').length;
  const restantes = Math.max(0, repliquesTotal - repliquesCandidat);
  const flashActif = test.flash.etat === 'en_cours';
  let finLe = null;
  if (flashActif && test.flash.debut) {
    finLe = new Date(new Date(test.flash.debut).getTime() + (CONFIG.DUREE_FLASH_S * 1000)).toISOString();
  }
  return {
    etape: test.etape,
    finPrevue: test.finPrevue,
    stress: test.stress,
    repliquesRestantes: restantes,
    flash: {
      actif: flashActif,
      finLe: finLe
    }
  };
}

function verifierChrono(test) {
  const maintenant = new Date().getTime();
  const finMax = new Date(test.finPrevue).getTime() + (CONFIG.TOLERANCE_FIN_S * 1000);
  if (maintenant > finMax) {
    cloturer(test, 'temps');
    const jetonHash = Stockage.lignes('tests').find((l) => l[0] === test.id)[5];
    sauverTestCandidat(test, jetonHash);
    throw erreur('FERME');
  }
}

const Candidat = Object.freeze({
  ouvrir(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.jeton(donnees.jetonPoste, 'jetonPoste');
    const lignes = Stockage.lignes('postes');
    const ligne = lignes.find((l) => {
      const p = JSON.parse(l[4]);
      return p.jetonPoste === donnees.jetonPoste && p.statut === 'ouvert';
    });
    if (!ligne) throw erreur('FERME');
    const poste = JSON.parse(ligne[4]);
    const params = Rgpd.lireParametres();
    return {
      intitule: poste.intitule,
      entreprise: poste.entreprise,
      dureeMinutes: poste.dureeMinutes,
      sansChrono: poste.sansChrono,
      nbQcm: poste.epreuves.qcm.length,
      nbQuestions: poste.epreuves.questions.length,
      repliques: nombreRepliques(poste),
      versionNotice: CONFIG.VERSION_NOTICE,
      conservationJours: params.conservationJours
    };
  },

  demarrer(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.jeton(donnees.jetonPoste, 'jetonPoste');
    Valider.texte(donnees.prenom, 'prenom', 1, CONFIG.LONGUEUR.nom);
    Valider.texte(donnees.nom, 'nom', 1, CONFIG.LONGUEUR.nom);
    Valider.objet(donnees.consentement, 'consentement');
    Valider.parmi(donnees.consentement.version, [CONFIG.VERSION_NOTICE], 'consentement.version');
    if (donnees.consentement.accepte !== true) throw erreur('INVALIDE');

    return Stockage.avecVerrou(() => {
      const lignesPostes = Stockage.lignes('postes');
      const lignePoste = lignesPostes.find((l) => {
        const p = JSON.parse(l[4]);
        return p.jetonPoste === donnees.jetonPoste && p.statut === 'ouvert';
      });
      if (!lignePoste) throw erreur('FERME');
      const poste = JSON.parse(lignePoste[4]);

      const uneHeureAvant = new Date(Date.now() - (3600 * 1000)).toISOString();
      const lignesTests = Stockage.lignes('tests');
      const recents = lignesTests.filter((lt) => lt[1] === poste.id && lt[3] >= uneHeureAvant).length;
      if (recents >= CONFIG.DEMARRAGES_MAX_PAR_HEURE) {
        throw erreur('LIMITE');
      }

      const maintenant = maintenantIso();
      const finPrevue = new Date(Date.now() + (poste.dureeMinutes * 60 * 1000)).toISOString();
      const jetonTest = jetonAleatoire();
      const jetonHash = sha256Hex(jetonTest);
      const testId = genererId('c_');

      const premierEchange = {
        role: 'interlocuteur',
        texte: poste.epreuves.simulation.ouverture,
        horodatage: maintenant,
        variation: 0,
        motif: 'Ouverture',
        stressApres: CONFIG.STRESS_INITIAL
      };

      const test = {
        id: testId,
        posteId: poste.id,
        statut: 'en_cours',
        etape: 'qcm',
        candidat: { prenom: donnees.prenom, nom: donnees.nom },
        consentement: { version: donnees.consentement.version, le: maintenant },
        debut: maintenant,
        finPrevue: finPrevue,
        fin: null,
        motifFin: null,
        qcm: [],
        questions: [],
        echanges: [premierEchange],
        stress: CONFIG.STRESS_INITIAL,
        infractions: {
          sorties: [],
          collagesBloques: 0,
          insertionsSuspectes: 0
        },
        flash: {
          etat: 'inactif',
          debut: null
        },
        appels: 0,
        evaluation: null
      };

      Stockage.ajouter('tests', [
        test.id,
        test.posteId,
        test.statut,
        test.debut,
        test.finPrevue,
        jetonHash,
        JSON.stringify(test)
      ]);

      Journal.ecrire('candidat', 'test.demarrage', test.id, 'Demarrage poste ' + poste.id);

      const epreuvesPubliques = {
        contexteQcm: poste.epreuves.contexteQcm,
        qcm: poste.epreuves.qcm.map((q) => ({
          id: q.id,
          enonce: q.enonce,
          choix: q.choix.map((c) => ({ id: c.id, texte: c.texte }))
        })),
        questions: poste.epreuves.questions.map((q) => ({ id: q.id, enonce: q.enonce })),
        simulation: {
          nomCourt: poste.epreuves.simulation.nomCourt,
          role: poste.epreuves.simulation.role
        }
      };

      return {
        jetonTest: jetonTest,
        etat: construireEtat(test, poste),
        epreuves: epreuvesPubliques,
        echanges: [{ role: 'interlocuteur', texte: premierEchange.texte }]
      };
    });
  },

  reprendre(donnees) {
    Valider.objet(donnees, 'donnees');
    return Stockage.avecVerrou(() => {
      const test = testDepuisJeton(donnees.jetonTest);
      if (test.statut !== 'en_cours') throw erreur('FERME');
      verifierChrono(test);

      const poste = Stockage.trouver('postes', test.posteId);
      if (!poste || poste.statut !== 'ouvert') throw erreur('FERME');

      test.stress = Math.min(100, test.stress + CONFIG.STRESS_INFRACTION);
      test.infractions.sorties.push({ type: 'rechargement', horodatage: maintenantIso() });

      const jetonHash = sha256Hex(donnees.jetonTest);
      sauverTestCandidat(test, jetonHash);

      const epreuvesPubliques = {
        contexteQcm: poste.epreuves.contexteQcm,
        qcm: poste.epreuves.qcm.map((q) => ({
          id: q.id,
          enonce: q.enonce,
          choix: q.choix.map((c) => ({ id: c.id, texte: c.texte }))
        })),
        questions: poste.epreuves.questions.map((q) => ({ id: q.id, enonce: q.enonce })),
        simulation: {
          nomCourt: poste.epreuves.simulation.nomCourt,
          role: poste.epreuves.simulation.role
        }
      };

      const echangesPubliques = test.echanges.map((e) => ({ role: e.role, texte: e.texte }));

      return {
        etat: construireEtat(test, poste),
        epreuves: epreuvesPubliques,
        echanges: echangesPubliques,
        candidat: { prenom: test.candidat.prenom },
        intitule: poste.intitule,
        entreprise: poste.entreprise,
        sansChrono: poste.sansChrono
      };
    });
  },

  reponsesQcm(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.liste(donnees.reponses, 'reponses');
    return Stockage.avecVerrou(() => {
      const test = testDepuisJeton(donnees.jetonTest);
      if (test.statut !== 'en_cours' || test.etape !== 'qcm') throw erreur('ETAT');
      verifierChrono(test);

      const poste = Stockage.trouver('postes', test.posteId);
      if (!poste) throw erreur('FERME');

      donnees.reponses.forEach((r) => {
        Valider.identifiant(r.questionId, 'questionId');
        Valider.parmi(r.choix, ['a', 'b', 'c', 'd'], 'choix');
      });

      test.qcm = donnees.reponses;
      test.etape = poste.epreuves.questions.length > 0 ? 'questions' : 'simulation';

      const jetonHash = sha256Hex(donnees.jetonTest);
      sauverTestCandidat(test, jetonHash);

      return construireEtat(test, poste);
    });
  },

  reponsesQuestions(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.liste(donnees.reponses, 'reponses');
    return Stockage.avecVerrou(() => {
      const test = testDepuisJeton(donnees.jetonTest);
      if (test.statut !== 'en_cours' || test.etape !== 'questions') throw erreur('ETAT');
      verifierChrono(test);

      const poste = Stockage.trouver('postes', test.posteId);
      if (!poste) throw erreur('FERME');

      donnees.reponses.forEach((r) => {
        Valider.identifiant(r.questionId, 'questionId');
        Valider.texte(r.texte, 'texte', 0, CONFIG.LONGUEUR.reponseLongue);
      });

      test.questions = donnees.reponses;
      test.etape = 'simulation';

      const jetonHash = sha256Hex(donnees.jetonTest);
      sauverTestCandidat(test, jetonHash);

      return construireEtat(test, poste);
    });
  },

  repliquer(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.texte(donnees.texte, 'texte', 0, CONFIG.LONGUEUR.reponseCourte);

    const jetonHash = sha256Hex(donnees.jetonTest);
    let poste;
    let test;
    let tour;
    let promptSys;
    let contenus;

    Stockage.avecVerrou(() => {
      test = testDepuisJeton(donnees.jetonTest);
      if (test.statut !== 'en_cours' || test.etape !== 'simulation') throw erreur('ETAT');
      verifierChrono(test);

      poste = Stockage.trouver('postes', test.posteId);
      if (!poste) throw erreur('FERME');

      const maxRepliques = nombreRepliques(poste);
      const candidatRepliques = test.echanges.filter((e) => e.role === 'candidat').length;
      if (candidatRepliques >= maxRepliques) {
        throw erreur('PLAFOND');
      }

      const dernierEchange = test.echanges[test.echanges.length - 1];
      const maintenant = maintenantIso();

      if (dernierEchange.role !== 'candidat') {
        let sousChrono = false;
        let horsDelai = false;
        if (test.flash.etat === 'en_cours') {
          sousChrono = true;
          const debutFlash = new Date(test.flash.debut).getTime();
          const ecouleS = (Date.now() - debutFlash) / 1000;
          if (ecouleS > CONFIG.DUREE_FLASH_S + CONFIG.TOLERANCE_FLASH_S) {
            horsDelai = true;
            test.flash.etat = 'expire';
            test.stress = Math.min(100, test.stress + CONFIG.STRESS_INFRACTION);
          } else {
            test.flash.etat = 'repondu';
          }
        }

        test.echanges.push({
          role: 'candidat',
          texte: donnees.texte,
          horodatage: maintenant,
          sousChrono: sousChrono,
          horsDelai: horsDelai
        });
        test.appels += 1;
        sauverTestCandidat(test, jetonHash);
      }

      const totalApres = test.echanges.filter((e) => e.role === 'candidat').length;
      if (totalApres >= maxRepliques) {
        tour = 'dernier';
      } else if (test.flash.etat === 'en_cours') {
        tour = 'chrono';
      } else {
        tour = 'ordinaire';
      }

      promptSys = promptSimulation(poste, test, tour);
      contenus = contenusSimulation(test);
    });

    const brutIa = IA.appeler(
      CONFIG.MODELE_SIMULATION,
      promptSys,
      contenus,
      SCHEMAS.simulation,
      { temperature: 0.8, maxOutputTokens: 600 }
    );
    const valide = IA.validerSimulation(brutIa);
    if (!valide) {
      throw erreur('IA_REPONSE');
    }

    return Stockage.avecVerrou(() => {
      test = testDepuisJeton(donnees.jetonTest);
      poste = Stockage.trouver('postes', test.posteId);

      const nouveauStress = Math.max(0, Math.min(100, test.stress + valide.variation_stress));
      test.stress = nouveauStress;

      test.echanges.push({
        role: 'interlocuteur',
        texte: valide.message_interlocuteur,
        horodatage: maintenantIso(),
        variation: valide.variation_stress,
        motif: valide.motif_variation,
        stressApres: nouveauStress
      });

      const nbInterlocuteur = test.echanges.filter((e) => e.role === 'interlocuteur').length;
      if (nbInterlocuteur === CONFIG.MESSAGE_FLASH_DECLENCHEUR &&
          poste.competences.soft.includes('gestion_crise') &&
          !poste.sansChrono &&
          test.flash.etat === 'inactif') {
        test.flash.etat = 'en_cours';
        test.flash.debut = maintenantIso();
      }

      const maxRepliques = nombreRepliques(poste);
      const totalCandidat = test.echanges.filter((e) => e.role === 'candidat').length;
      if (totalCandidat >= maxRepliques) {
        test.etape = 'fin';
      }

      sauverTestCandidat(test, jetonHash);

      return {
        message: valide.message_interlocuteur,
        etat: construireEtat(test, poste)
      };
    });
  },

  signaler(donnees) {
    Valider.objet(donnees, 'donnees');
    Valider.parmi(donnees.type, ['sortie', 'collage', 'insertion'], 'type');
    return Stockage.avecVerrou(() => {
      const test = testDepuisJeton(donnees.jetonTest);
      if (test.statut !== 'en_cours') throw erreur('FERME');
      verifierChrono(test);

      const poste = Stockage.trouver('postes', test.posteId);
      if (!poste) throw erreur('FERME');

      const maintenant = maintenantIso();
      if (donnees.type === 'sortie') {
        test.stress = Math.min(100, test.stress + CONFIG.STRESS_INFRACTION);
        test.infractions.sorties.push({ type: 'onglet', horodatage: maintenant });
      } else if (donnees.type === 'collage') {
        test.infractions.collagesBloques += 1;
      } else if (donnees.type === 'insertion') {
        test.infractions.insertionsSuspectes += 1;
      }

      const jetonHash = sha256Hex(donnees.jetonTest);
      sauverTestCandidat(test, jetonHash);

      return construireEtat(test, poste);
    });
  },

  terminer(donnees) {
    Valider.objet(donnees, 'donnees');
    return Stockage.avecVerrou(() => {
      let test;
      try {
        test = testDepuisJeton(donnees.jetonTest);
      } catch (e) {
        return { termine: true };
      }
      if (test.statut === 'termine' || test.statut === 'evalue') {
        return { termine: true };
      }
      const poste = Stockage.trouver('postes', test.posteId);
      if (!poste) throw erreur('FERME');

      cloturer(test, 'candidat');
      const jetonHash = sha256Hex(donnees.jetonTest);
      sauverTestCandidat(test, jetonHash);
      Journal.ecrire('candidat', 'test.fin', test.id, 'Cloture par le candidat');

      try {
        Tests.evaluerInterne(poste, test);
      } catch (err) {
      }

      return { termine: true };
    });
  }
});
