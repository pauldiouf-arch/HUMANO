(function () {
  'use strict';

  window.HUMANO = window.HUMANO || {};

  function libelleFlash(etat) {
    if (etat === 'repondu') return 'Répondu à temps';
    if (etat === 'expire') return 'Expiré';
    if (etat === 'en_cours') return 'En cours';
    return 'Inactif';
  }

  function libelleMotifFin(motif) {
    if (motif === 'candidat') return 'Terminé par le candidat';
    if (motif === 'temps') return 'Temps écoulé';
    return 'En cours';
  }

  async function afficherRapport(testId) {
    window.HUMANO.ui.afficherEcran('ecran-attente', 'Chargement du rapport');
    const messageAttente = document.getElementById('attente-message');
    if (messageAttente) messageAttente.textContent = 'Chargement du rapport de test…';

    let reponse;
    try {
      reponse = await window.HUMANO.api.appeler('tests.obtenir', { id: testId });
    } catch (err) {
      window.HUMANO.ui.afficherMessage(err.message || 'Impossible de charger le rapport.', 'erreur');
      window.location.hash = '#/postes';
      return;
    }

    const test = reponse.test;
    const poste = reponse.poste;
    const qcmStats = reponse.qcm || { correctes: 0, total: 0 };

    window.HUMANO.ui.afficherEcran('ecran-rapport', 'Rapport de test');

    const titreH1 = document.getElementById('titre-rapport');
    titreH1.textContent = 'Test de ' + test.candidat.prenom + ' ' + test.candidat.nom;

    const conteneur = document.getElementById('conteneur-rapport');
    window.HUMANO.ui.vider(conteneur);

    const conteneurNavigation = window.HUMANO.ui.creer('div', { classe: 'actions ne-pas-imprimer' });
    const lienRetour = window.HUMANO.ui.creer('a', {
      classe: 'bouton',
      href: '#/postes/' + test.posteId,
      texte: 'Retour au poste'
    });
    conteneurNavigation.appendChild(lienRetour);
    conteneur.appendChild(conteneurNavigation);

    const enteteImpression = window.HUMANO.ui.creer('p', {
      classe: 'entete-impression',
      texte: 'HUMANO — Rapport confidentiel'
    });
    conteneur.appendChild(enteteImpression);

    const carteEnTete = window.HUMANO.ui.creer('div', { classe: 'carte' });
    const dlEnTete = window.HUMANO.ui.creer('dl', { classe: 'definitions' });

    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Poste' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', { texte: poste.intitule + ' (' + poste.entreprise + ')' }));

    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Candidat' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', { texte: test.candidat.prenom + ' ' + test.candidat.nom }));

    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Début' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', { texte: window.HUMANO.ui.formaterDate(test.debut) }));

    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Fin' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', {
      texte: test.fin ? window.HUMANO.ui.formaterDate(test.fin) : 'En cours'
    }));

    let dureeMs = 0;
    if (test.debut && test.fin) {
      dureeMs = Math.max(0, new Date(test.fin).getTime() - new Date(test.debut).getTime());
    } else if (test.debut) {
      dureeMs = Math.max(0, Date.now() - new Date(test.debut).getTime());
    }
    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Durée effective' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', { texte: window.HUMANO.ui.formaterDuree(dureeMs) }));

    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Motif de fin' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', { texte: libelleMotifFin(test.motifFin) }));

    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Aménagement' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', {
      texte: poste.sansChrono ? 'Sans événement chronométré' : 'Aucun'
    }));

    const texteConsentement = test.consentement
      ? 'Version ' + test.consentement.version + ', le ' + window.HUMANO.ui.formaterDate(test.consentement.le)
      : '—';
    dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Consentement' }));
    dlEnTete.appendChild(window.HUMANO.ui.creer('dd', { texte: texteConsentement }));

    if (Number.isFinite(test.attenteIaCompenseeMs) && test.attenteIaCompenseeMs > 0) {
      const secondesCompensees = Math.round(test.attenteIaCompenseeMs / 1000);
      dlEnTete.appendChild(window.HUMANO.ui.creer('dt', { texte: 'Temps d\'attente de l\'IA compensé' }));
      dlEnTete.appendChild(window.HUMANO.ui.creer('dd', { texte: secondesCompensees + ' s' }));
    }

    carteEnTete.appendChild(dlEnTete);
    conteneur.appendChild(carteEnTete);

    const carteEvaluation = window.HUMANO.ui.creer('div', { classe: 'carte' });
    carteEvaluation.appendChild(window.HUMANO.ui.creer('h2', { texte: 'Évaluation' }));

    if (!test.evaluation) {
      carteEvaluation.appendChild(window.HUMANO.ui.creer('p', { texte: 'Pas encore évalué.' }));

      const zoneActionsEval = window.HUMANO.ui.creer('div', { classe: 'actions ne-pas-imprimer' });
      const boutonEvaluer = window.HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton-principal',
        texte: 'Évaluer'
      });

      boutonEvaluer.addEventListener('click', async function () {
        boutonEvaluer.disabled = true;
        window.HUMANO.ui.afficherMessage('Évaluation en cours, jusqu\'à 90 secondes…', 'info');
        try {
          await window.HUMANO.api.appeler('tests.evaluer', { id: test.id });
          window.HUMANO.ui.afficherMessage('Évaluation terminée avec succès.', 'succes');
          await afficherRapport(test.id);
        } catch (err) {
          boutonEvaluer.disabled = false;
          window.HUMANO.ui.afficherMessage(err.message || 'Erreur lors de l\'évaluation.', 'erreur');
        }
      });

      zoneActionsEval.appendChild(boutonEvaluer);
      carteEvaluation.appendChild(zoneActionsEval);
    } else {
      const ev = test.evaluation;
      carteEvaluation.appendChild(window.HUMANO.ui.creer('p', {
        classe: 'note-finale',
        texte: ev.note_finale + '/20'
      }));

      const nbSorties = (test.infractions && test.infractions.sorties) ? test.infractions.sorties.length : 0;
      const textePluriel = nbSorties > 1 ? 's' : '';
      const calculDetail = 'Note de l\'IA ' + ev.note_ia + '/20 − pénalité ' + ev.penalite +
        ' (' + nbSorties + ' sortie' + textePluriel + ' de page) = ' + ev.note_finale + '/20';
      carteEvaluation.appendChild(window.HUMANO.ui.creer('p', { texte: calculDetail }));

      carteEvaluation.appendChild(window.HUMANO.ui.creer('p', {
        classe: 'aide',
        texte: 'Note indicative, à confirmer en entretien. Aucune décision automatique.'
      }));

      const rubriques = [
        { titre: 'Compétences techniques', valeur: ev.competences_techniques },
        { titre: 'Compétences humaines', valeur: ev.competences_humaines },
        { titre: 'Points forts', valeur: ev.points_forts },
        { titre: 'Points de vigilance', valeur: ev.points_vigilance },
        { titre: 'Synthèse', valeur: ev.synthese }
      ];

      rubriques.forEach(function (r) {
        carteEvaluation.appendChild(window.HUMANO.ui.creer('h3', { texte: r.titre }));
        carteEvaluation.appendChild(window.HUMANO.ui.creer('p', { texte: r.valeur || '—' }));
      });

      if (Array.isArray(ev.par_competence) && ev.par_competence.length > 0) {
        const blocTableauComp = window.HUMANO.ui.creer('div', {
          classe: 'tableau-defilant',
          tabindex: '0',
          role: 'region',
          'aria-label': 'Évaluation par compétence'
        });
        const tableComp = window.HUMANO.ui.creer('table', { classe: 'tableau' });
        tableComp.appendChild(window.HUMANO.ui.creer('caption', { texte: 'Par compétence' }));

        const theadComp = window.HUMANO.ui.creer('thead');
        const trHeadComp = window.HUMANO.ui.creer('tr');
        ['Compétence', 'Niveau', 'Justification'].forEach(function (h) {
          trHeadComp.appendChild(window.HUMANO.ui.creer('th', { scope: 'col', texte: h }));
        });
        theadComp.appendChild(trHeadComp);
        tableComp.appendChild(theadComp);

        const tbodyComp = window.HUMANO.ui.creer('tbody');
        ev.par_competence.forEach(function (pc) {
          const tr = window.HUMANO.ui.creer('tr');
          tr.appendChild(window.HUMANO.ui.creer('td', { texte: pc.competence }));
          tr.appendChild(window.HUMANO.ui.creer('td', { texte: pc.niveau }));
          tr.appendChild(window.HUMANO.ui.creer('td', { texte: pc.justification }));
          tbodyComp.appendChild(tr);
        });
        tableComp.appendChild(tbodyComp);
        blocTableauComp.appendChild(tableComp);
        carteEvaluation.appendChild(blocTableauComp);
      }

      if (Array.isArray(ev.par_question) && ev.par_question.length > 0) {
        const blocTableauQuest = window.HUMANO.ui.creer('div', {
          classe: 'tableau-defilant',
          tabindex: '0',
          role: 'region',
          'aria-label': 'Évaluation par question technique'
        });
        const tableQuest = window.HUMANO.ui.creer('table', { classe: 'tableau' });
        tableQuest.appendChild(window.HUMANO.ui.creer('caption', { texte: 'Par question technique' }));

        const theadQuest = window.HUMANO.ui.creer('thead');
        const trHeadQuest = window.HUMANO.ui.creer('tr');
        ['Question', 'Note sur 5', 'Commentaire'].forEach(function (h) {
          trHeadQuest.appendChild(window.HUMANO.ui.creer('th', { scope: 'col', texte: h }));
        });
        theadQuest.appendChild(trHeadQuest);
        tableQuest.appendChild(theadQuest);

        const tbodyQuest = window.HUMANO.ui.creer('tbody');
        ev.par_question.forEach(function (pq) {
          const tr = window.HUMANO.ui.creer('tr');
          tr.appendChild(window.HUMANO.ui.creer('td', { texte: pq.question }));
          tr.appendChild(window.HUMANO.ui.creer('td', { texte: pq.note_sur_5 + '/5' }));
          tr.appendChild(window.HUMANO.ui.creer('td', { texte: pq.commentaire }));
          tbodyQuest.appendChild(tr);
        });
        tableQuest.appendChild(tbodyQuest);
        blocTableauQuest.appendChild(tableQuest);
        carteEvaluation.appendChild(blocTableauQuest);
      }

      const totalCorrectes = (ev.qcm && typeof ev.qcm.correctes === 'number')
        ? ev.qcm.correctes
        : qcmStats.correctes;
      const totalQcm = (ev.qcm && typeof ev.qcm.total === 'number')
        ? ev.qcm.total
        : qcmStats.total;
      carteEvaluation.appendChild(window.HUMANO.ui.creer('p', {
        texte: 'QCM : ' + totalCorrectes + '/' + totalQcm + ' bonnes réponses'
      }));

      const modeleTexte = ev.modele ? (' avec ' + ev.modele) : '';
      carteEvaluation.appendChild(window.HUMANO.ui.creer('p', {
        classe: 'aide',
        texte: 'Évalué le ' + window.HUMANO.ui.formaterDate(ev.genereeLe) + modeleTexte + '.'
      }));

      const zoneActionsReeval = window.HUMANO.ui.creer('div', { classe: 'actions ne-pas-imprimer' });
      const boutonReevaluer = window.HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton',
        texte: 'Réévaluer'
      });

      boutonReevaluer.addEventListener('click', async function () {
        const confirme = await window.HUMANO.ui.confirmer(
          'Remplacer l\'évaluation actuelle ?',
          'Réévaluer',
          'Annuler'
        );
        if (!confirme) return;
        boutonReevaluer.disabled = true;
        window.HUMANO.ui.afficherMessage('Évaluation en cours, jusqu\'à 90 secondes…', 'info');
        try {
          await window.HUMANO.api.appeler('tests.evaluer', { id: test.id });
          window.HUMANO.ui.afficherMessage('Évaluation actualisée.', 'succes');
          await afficherRapport(test.id);
        } catch (err) {
          boutonReevaluer.disabled = false;
          window.HUMANO.ui.afficherMessage(err.message || 'Erreur lors de la réévaluation.', 'erreur');
        }
      });

      zoneActionsReeval.appendChild(boutonReevaluer);
      carteEvaluation.appendChild(zoneActionsReeval);
    }

    conteneur.appendChild(carteEvaluation);

    const carteQcm = window.HUMANO.ui.creer('div', { classe: 'carte' });
    carteQcm.appendChild(window.HUMANO.ui.creer('h2', { texte: 'Questionnaire' }));

    const contexteQcm = poste.epreuves && poste.epreuves.contexteQcm;
    if (contexteQcm && Array.isArray(contexteQcm.colonnes) && contexteQcm.colonnes.length > 0) {
      const blocContexte = window.HUMANO.ui.creer('div', {
        classe: 'tableau-defilant',
        tabindex: '0',
        role: 'region',
        'aria-label': contexteQcm.titre || 'Données du questionnaire'
      });
      const tableContexte = window.HUMANO.ui.creer('table', { classe: 'tableau' });
      if (contexteQcm.titre) {
        tableContexte.appendChild(window.HUMANO.ui.creer('caption', { texte: contexteQcm.titre }));
      }
      const theadC = window.HUMANO.ui.creer('thead');
      const trHeadC = window.HUMANO.ui.creer('tr');
      contexteQcm.colonnes.forEach(function (col) {
        trHeadC.appendChild(window.HUMANO.ui.creer('th', { scope: 'col', texte: col }));
      });
      theadC.appendChild(trHeadC);
      tableContexte.appendChild(theadC);

      const tbodyC = window.HUMANO.ui.creer('tbody');
      (contexteQcm.lignes || []).forEach(function (ligne) {
        const tr = window.HUMANO.ui.creer('tr');
        ligne.forEach(function (cel) {
          tr.appendChild(window.HUMANO.ui.creer('td', { texte: cel }));
        });
        tbodyC.appendChild(tr);
      });
      tableContexte.appendChild(tbodyC);
      blocContexte.appendChild(tableContexte);
      carteQcm.appendChild(blocContexte);
    }

    const listeQcm = (poste.epreuves && poste.epreuves.qcm) ? poste.epreuves.qcm : [];
    listeQcm.forEach(function (q, index) {
      const rep = (test.qcm || []).find(function (r) { return r.questionId === q.id; });
      const choixCandidat = rep ? rep.choix : null;

      const objChoixCandidat = (q.choix || []).find(function (c) { return c.id === choixCandidat; });
      const objBonneReponse = (q.choix || []).find(function (c) { return c.id === q.bonne; });

      const texteChoisi = objChoixCandidat ? objChoixCandidat.texte : 'Sans réponse';
      const texteBonne = objBonneReponse ? objBonneReponse.texte : q.bonne;

      let statutTexte = 'Sans réponse';
      let classeStatut = '';
      if (choixCandidat) {
        if (choixCandidat === q.bonne) {
          statutTexte = 'Correct';
          classeStatut = 'statut-correct';
        } else {
          statutTexte = 'Incorrect';
          classeStatut = 'statut-incorrect';
        }
      }

      carteQcm.appendChild(window.HUMANO.ui.creer('h3', { texte: 'Question ' + (index + 1) + ' : ' + q.enonce }));

      const pStatut = window.HUMANO.ui.creer('p', {}, [
        window.HUMANO.ui.creer('strong', { texte: 'Statut : ' }),
        window.HUMANO.ui.creer('span', { classe: classeStatut, texte: statutTexte })
      ]);
      carteQcm.appendChild(pStatut);

      carteQcm.appendChild(window.HUMANO.ui.creer('p', { texte: 'Réponse choisie : ' + texteChoisi }));
      carteQcm.appendChild(window.HUMANO.ui.creer('p', { texte: 'Bonne réponse : ' + texteBonne }));
      carteQcm.appendChild(window.HUMANO.ui.creer('p', { classe: 'aide', texte: 'Explication : ' + q.explication }));
    });

    conteneur.appendChild(carteQcm);

    const carteQuestions = window.HUMANO.ui.creer('div', { classe: 'carte' });
    carteQuestions.appendChild(window.HUMANO.ui.creer('h2', { texte: 'Questions techniques' }));

    const listeQuestions = (poste.epreuves && poste.epreuves.questions) ? poste.epreuves.questions : [];
    if (listeQuestions.length === 0) {
      carteQuestions.appendChild(window.HUMANO.ui.creer('p', {
        classe: 'aide',
        texte: 'Aucune question technique pour ce poste.'
      }));
    } else {
      listeQuestions.forEach(function (q, index) {
        carteQuestions.appendChild(window.HUMANO.ui.creer('h3', {
          texte: 'Question ' + (index + 1) + ' : ' + q.enonce
        }));

        carteQuestions.appendChild(window.HUMANO.ui.creer('p', {}, [
          window.HUMANO.ui.creer('strong', { texte: 'Critères attendus :' })
        ]));

        const ulCriteres = window.HUMANO.ui.creer('ul');
        (q.criteres || []).forEach(function (crit) {
          ulCriteres.appendChild(window.HUMANO.ui.creer('li', { texte: crit }));
        });
        carteQuestions.appendChild(ulCriteres);

        const rep = (test.questions || []).find(function (r) { return r.questionId === q.id; });
        if (rep && rep.texte && rep.texte.trim()) {
          carteQuestions.appendChild(window.HUMANO.ui.creer('p', {
            classe: 'texte-libre',
            texte: rep.texte
          }));
        } else {
          carteQuestions.appendChild(window.HUMANO.ui.creer('p', {
            classe: 'aide',
            texte: 'Sans réponse'
          }));
        }
      });
    }

    conteneur.appendChild(carteQuestions);

    const carteSimulation = window.HUMANO.ui.creer('div', { classe: 'carte' });
    carteSimulation.appendChild(window.HUMANO.ui.creer('h2', { texte: 'Mise en situation' }));

    const sim = (poste.epreuves && poste.epreuves.simulation) ? poste.epreuves.simulation : {};
    carteSimulation.appendChild(window.HUMANO.ui.creer('p', {
      texte: 'Interlocuteur : ' + (sim.nomCourt || 'Interlocuteur') + ', ' + (sim.role || '')
    }));

    const fil = window.HUMANO.ui.creer('div', { classe: 'fil', role: 'log' });
    const echanges = test.echanges || [];
    const parcoursStress = [window.HUMANO.config.STRESS_INITIAL];

    echanges.forEach(function (e) {
      if (e.role === 'interlocuteur') {
        if (typeof e.stressApres === 'number') {
          parcoursStress.push(e.stressApres);
        }
        const bulle = window.HUMANO.ui.creer('div', { classe: 'bulle bulle-interlocuteur' });
        bulle.appendChild(window.HUMANO.ui.creer('p', {
          classe: 'bulle-auteur',
          texte: (sim.nomCourt || 'Interlocuteur') + ' :'
        }));
        bulle.appendChild(window.HUMANO.ui.creer('p', { texte: e.texte }));

        const varTexte = e.variation > 0 ? ('+' + e.variation) : String(e.variation);
        const ligneAide = window.HUMANO.ui.formaterDate(e.horodatage) + ' — stress après : ' +
          e.stressApres + ' (variation ' + varTexte + ' : ' + e.motif + ')';
        bulle.appendChild(window.HUMANO.ui.creer('p', { classe: 'aide', texte: ligneAide }));
        fil.appendChild(bulle);
      } else {
        const bulle = window.HUMANO.ui.creer('div', { classe: 'bulle bulle-candidat' });
        bulle.appendChild(window.HUMANO.ui.creer('p', { classe: 'bulle-auteur', texte: 'Candidat :' }));
        bulle.appendChild(window.HUMANO.ui.creer('p', { texte: e.texte }));

        let mentions = window.HUMANO.ui.formaterDate(e.horodatage);
        if (e.sousChrono) mentions += ' — sous chrono';
        if (e.horsDelai) mentions += ' — hors délai (+20)';
        bulle.appendChild(window.HUMANO.ui.creer('p', { classe: 'aide', texte: mentions }));
        fil.appendChild(bulle);
      }
    });

    carteSimulation.appendChild(fil);

    carteSimulation.appendChild(window.HUMANO.ui.creer('p', {
      texte: 'Évolution du stress : ' + parcoursStress.join(' → ')
    }));

    const flashEtat = (test.flash && test.flash.etat) ? test.flash.etat : 'inactif';
    carteSimulation.appendChild(window.HUMANO.ui.creer('p', {
      texte: 'Événement flash : ' + libelleFlash(flashEtat)
    }));

    conteneur.appendChild(carteSimulation);

    const carteIntegrite = window.HUMANO.ui.creer('div', { classe: 'carte' });
    carteIntegrite.appendChild(window.HUMANO.ui.creer('h2', { texte: 'Intégrité' }));

    const sorties = (test.infractions && test.infractions.sorties) ? test.infractions.sorties : [];
    carteIntegrite.appendChild(window.HUMANO.ui.creer('p', {
      texte: 'Sorties de page : ' + sorties.length
    }));

    if (sorties.length > 0) {
      const ulSorties = window.HUMANO.ui.creer('ul');
      sorties.forEach(function (s) {
        const typeLibelle = s.type === 'rechargement'
          ? 'Rechargement de la page'
          : 'Changement d\'onglet ou d\'application';
        ulSorties.appendChild(window.HUMANO.ui.creer('li', {
          texte: typeLibelle + ' le ' + window.HUMANO.ui.formaterDate(s.horodatage)
        }));
      });
      carteIntegrite.appendChild(ulSorties);
    }

    const collages = (test.infractions && typeof test.infractions.collagesBloques === 'number')
      ? test.infractions.collagesBloques
      : 0;
    carteIntegrite.appendChild(window.HUMANO.ui.creer('p', {
      texte: 'Collages bloqués : ' + collages
    }));

    const insertions = (test.infractions && typeof test.infractions.insertionsSuspectes === 'number')
      ? test.infractions.insertionsSuspectes
      : 0;
    carteIntegrite.appendChild(window.HUMANO.ui.creer('p', {
      texte: 'Insertions suspectes : ' + insertions
    }));

    carteIntegrite.appendChild(window.HUMANO.ui.creer('p', {
      texte: 'Appels à l\'IA : ' + (test.appels || 0)
    }));

    conteneur.appendChild(carteIntegrite);

    const carteActions = window.HUMANO.ui.creer('div', { classe: 'carte ne-pas-imprimer' });
    const zoneBoutons = window.HUMANO.ui.creer('div', { classe: 'actions' });

    const boutonPdf = window.HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Exporter en PDF'
    });
    boutonPdf.addEventListener('click', function () {
      const net = function (str) {
        return (str || '').replace(/\s+/g, '_');
      };
      const titreOriginal = document.title;
      document.title = 'HUMANO_' + net(poste.intitule) + '_' + net(test.candidat.nom) + '_' + net(test.candidat.prenom);
      window.print();
      document.title = titreOriginal;
    });
    zoneBoutons.appendChild(boutonPdf);

    const boutonExportJson = window.HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Exporter les données (RGPD)'
    });
    boutonExportJson.addEventListener('click', async function () {
      try {
        const donneesExport = await window.HUMANO.api.appeler('tests.exporter', { id: test.id });
        const contenuJson = JSON.stringify(donneesExport, null, 2);
        window.HUMANO.ui.telecharger('humano-export-' + test.id + '.json', contenuJson, 'application/json');
      } catch (err) {
        window.HUMANO.ui.afficherMessage(err.message || 'Erreur lors de l\'export.', 'erreur');
      }
    });
    zoneBoutons.appendChild(boutonExportJson);

    const boutonSupprimer = window.HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton-danger',
      texte: 'Supprimer ce test'
    });
    boutonSupprimer.addEventListener('click', async function () {
      const confirme = await window.HUMANO.ui.confirmer(
        'Suppression définitive (droit à l\'effacement). Continuer ?',
        'Supprimer définitivement',
        'Annuler'
      );
      if (!confirme) return;

      try {
        await window.HUMANO.api.appeler('tests.supprimer', { id: test.id });
        window.HUMANO.ui.afficherMessage('Test supprimé.', 'succes');
        window.location.hash = '#/postes/' + test.posteId;
      } catch (err) {
        window.HUMANO.ui.afficherMessage(err.message || 'Erreur lors de la suppression.', 'erreur');
      }
    });
    zoneBoutons.appendChild(boutonSupprimer);

    carteActions.appendChild(zoneBoutons);
    conteneur.appendChild(carteActions);
  }

  window.HUMANO.tests = Object.freeze({
    afficherRapport: afficherRapport
  });
})();
