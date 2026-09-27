(function () {
  'use strict';

  if (window.top !== window.self) {
    while (document.body.firstChild) {
      document.body.firstChild.remove();
    }
    const message = document.createElement('p');
    message.textContent = 'Cette page ne peut pas être affichée dans un cadre. Ouvrez-la directement.';
    document.body.appendChild(message);
    return;
  }

  window.HUMANO = window.HUMANO || {};

  let jetonPosteActuel = '';
  let jetonTestActuel = '';
  let donneesPoste = null;
  let donneesEpreuves = null;
  let etatTest = null;
  let minuterieChronoGlobal = null;
  let minuterieFlash = null;
  let annoncesChronoPassees = {};
  let conversationFil = null;
  let jaugeBloc = null;
  let elementChrono = null;
  let elementFlash = null;
  let elementAlertes = null;
  let elementEtapeLibelle = null;
  let bandeauElement = null;

  function cleStockageTest(jetonPoste) {
    return 'humano.test.' + jetonPoste;
  }

  function extraireJetonPoste() {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (/^[0-9a-f]{64}$/i.test(hash)) {
      return hash;
    }
    return '';
  }

  function arreterMinuteries() {
    if (minuterieChronoGlobal) {
      clearInterval(minuterieChronoGlobal);
      minuterieChronoGlobal = null;
    }
    if (minuterieFlash) {
      clearInterval(minuterieFlash);
      minuterieFlash = null;
    }
  }

  function gererErreurGenerique(erreur) {
    if (erreur && erreur.code === 'FERME') {
      arreterMinuteries();
      window.HUMANO.anticheat.desactiver();
      window.HUMANO.ui.libererBandeau();
      sessionStorage.removeItem(cleStockageTest(jetonPosteActuel));
      afficherFin('Ce test est terminé ou n\'est plus accessible.');
      return;
    }
    window.HUMANO.ui.afficherMessage(erreur.message || 'Une erreur est survenue.', 'erreur');
  }

  function majBandeau(etat) {
    etatTest = etat;
    if (etat && etat.finPrevue && elementChrono && etat.finPrevue !== finPrevueAffichee) {
      demarrerChronoGlobal(etat.finPrevue);
    }
    if (jaugeBloc && etat && typeof etat.stress === 'number') {
      const nomPersona = (donneesEpreuves && donneesEpreuves.simulation && donneesEpreuves.simulation.nomCourt)
        ? donneesEpreuves.simulation.nomCourt
        : 'Interlocuteur';
      window.HUMANO.ui.majJauge(jaugeBloc, etat.stress, 'Stress de ' + nomPersona);
    }
    if (elementFlash) {
      if (etat && etat.flash && etat.flash.actif && etat.flash.finLe) {
        elementFlash.hidden = false;
        gererDecompteFlash(etat.flash.finLe);
      } else {
        elementFlash.hidden = true;
        if (minuterieFlash) {
          clearInterval(minuterieFlash);
          minuterieFlash = null;
        }
      }
    }
  }

  function gererDecompteFlash(finLeIso) {
    if (minuterieFlash) {
      clearInterval(minuterieFlash);
      minuterieFlash = null;
    }
    const finTemps = new Date(finLeIso).getTime();

    function tick() {
      const restantMs = finTemps - Date.now();
      const restantS = Math.max(0, Math.ceil(restantMs / 1000));
      if (elementFlash) {
        elementFlash.textContent = 'Événement urgent : répondez avant la fin du compte à rebours. Il reste ' + restantS + ' s.';
      }
      if (restantS <= 0) {
        clearInterval(minuterieFlash);
        minuterieFlash = null;
        const saisieTexte = document.getElementById('simulation-reponse');
        const boutonEnvoyer = document.getElementById('simulation-envoyer');
        if (boutonEnvoyer && !boutonEnvoyer.disabled) {
          envoyerReplique(saisieTexte ? saisieTexte.value : '');
        }
      }
    }

    tick();
    minuterieFlash = setInterval(tick, 1000);
  }

  let finPrevueAffichee = null;

  function demarrerChronoGlobal(finPrevueIso) {
    if (minuterieChronoGlobal) {
      clearInterval(minuterieChronoGlobal);
      minuterieChronoGlobal = null;
    }
    annoncesChronoPassees = {};
    finPrevueAffichee = finPrevueIso;
    const finTemps = new Date(finPrevueIso).getTime();

    function tick() {
      const restantMs = finTemps - Date.now();
      if (!elementChrono) {
        return;
      }
      if (restantMs <= 0) {
        elementChrono.textContent = 'Temps restant : 00:00';
        elementChrono.style.color = 'var(--rouge)';
        clearInterval(minuterieChronoGlobal);
        minuterieChronoGlobal = null;
        terminerTest('Temps écoulé');
        return;
      }
      const restantS = Math.floor(restantMs / 1000);
      elementChrono.textContent = 'Temps restant : ' + window.HUMANO.ui.formaterDuree(restantMs);

      if (restantS < 60) {
        elementChrono.style.color = 'var(--rouge)';
      } else if (restantS < 300) {
        elementChrono.style.color = 'var(--orange)';
      } else {
        elementChrono.style.color = 'inherit';
      }

      window.HUMANO.config.ANNONCES_CHRONO_S.forEach(function (seuil) {
        if (restantS <= seuil && !annoncesChronoPassees[seuil]) {
          annoncesChronoPassees[seuil] = true;
          if (seuil === 10) {
            window.HUMANO.ui.annoncer('Attention, il reste 10 secondes.', true);
          } else {
            const min = Math.floor(seuil / 60);
            window.HUMANO.ui.annoncer('Il reste ' + min + ' minute' + (min > 1 ? 's' : '') + '.');
          }
        }
      });
    }

    tick();
    minuterieChronoGlobal = setInterval(tick, 1000);
  }

  function construireBandeau(etapeNumero, etapeNom) {
    if (bandeauElement) {
      window.HUMANO.ui.libererBandeau();
      bandeauElement.remove();
      bandeauElement = null;
    }

    const bandeau = window.HUMANO.ui.creer('div', { classe: 'bandeau-simulation ne-pas-imprimer' });
    bandeauElement = bandeau;

    elementEtapeLibelle = window.HUMANO.ui.creer('p', {
      classe: 'etape-libelle',
      texte: 'Étape ' + etapeNumero + ' sur 3 : ' + etapeNom
    });
    bandeau.appendChild(elementEtapeLibelle);

    if (donneesPoste && !donneesPoste.sansChrono) {
      elementChrono = window.HUMANO.ui.creer('p', {
        classe: 'chrono-global',
        role: 'timer',
        'aria-live': 'off',
        texte: 'Temps restant : --:--'
      });
      bandeau.appendChild(elementChrono);
    }

    elementAlertes = window.HUMANO.ui.creer('div', { id: 'zone-alertes', classe: 'zone-alertes' });
    bandeau.appendChild(elementAlertes);

    elementFlash = window.HUMANO.ui.creer('div', { id: 'zone-flash', classe: 'zone-flash' });
    elementFlash.hidden = true;
    bandeau.appendChild(elementFlash);

    if (etapeNumero === 3) {
      const nomPersona = (donneesEpreuves && donneesEpreuves.simulation && donneesEpreuves.simulation.nomCourt)
        ? donneesEpreuves.simulation.nomCourt
        : 'Interlocuteur';
      jaugeBloc = window.HUMANO.ui.creerJauge('jauge-candidat', 'Stress de ' + nomPersona);
      bandeau.appendChild(jaugeBloc);
    }

    const conteneurBouton = window.HUMANO.ui.creer('div', { classe: 'actions' });
    const boutonTerminer = window.HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton-danger',
      texte: 'Terminer le test'
    });
    boutonTerminer.addEventListener('click', function () {
      window.HUMANO.ui.confirmer(
        'Terminer maintenant ? Les épreuves non faites resteront vides.',
        'Terminer',
        'Continuer le test'
      ).then(function (confirme) {
        if (confirme) {
          terminerTest('candidat');
        }
      });
    });
    conteneurBouton.appendChild(boutonTerminer);
    bandeau.appendChild(conteneurBouton);

    const contenu = document.getElementById('candidat-contenu');
    contenu.parentNode.insertBefore(bandeau, contenu);
    window.HUMANO.ui.suivreBandeau(bandeau);

    if (etatTest && etatTest.finPrevue) {
      demarrerChronoGlobal(etatTest.finPrevue);
    }
    if (etatTest) {
      majBandeau(etatTest);
    }
  }

  function afficherAccueil(infos) {
    donneesPoste = infos;
    window.HUMANO.ui.afficherEcran('ecran-candidat', infos.intitule);
    const conteneur = document.getElementById('candidat-contenu');
    window.HUMANO.ui.vider(conteneur);

    const titreH1 = document.getElementById('titre-candidat');
    titreH1.textContent = infos.intitule;

    const carteDetails = window.HUMANO.ui.creer('div', { classe: 'carte' }, [
      window.HUMANO.ui.creer('p', { texte: 'Entreprise : ' + infos.entreprise }),
      window.HUMANO.ui.creer('p', {
        texte: 'Durée : ' + infos.dureeMinutes + ' minutes en une seule fois. ' +
          'Épreuves : questionnaire (' + infos.nbQcm + ' questions), ' +
          'questions techniques (' + infos.nbQuestions + '), ' +
          'mise en situation (' + infos.repliques + ' répliques).'
      })
    ]);
    conteneur.appendChild(carteDetails);

    const carteNotice = window.HUMANO.ui.creer('div', { classe: 'charte' }, [
      window.HUMANO.ui.creer('h2', { texte: 'Notice d\'information et de consentement' }),
      window.HUMANO.ui.creer('p', { texte: 'Finalité : évaluer vos compétences pour le poste indiqué.' }),
      window.HUMANO.ui.creer('p', {
        texte: 'Données collectées : prénom, nom, réponses, horodatages et signaux d\'intégrité.'
      }),
      window.HUMANO.ui.creer('p', {
        texte: 'Destinataires : le recruteur et nos sous-traitants techniques (hébergement et intelligence ' +
          'artificielle), détaillés dans la politique de confidentialité. N\'inscrivez aucune donnée sensible.'
      }),
      window.HUMANO.ui.creer('p', {
        texte: 'Durée de conservation : ' + infos.conservationJours + ' jours, puis suppression automatique.'
      }),
      window.HUMANO.ui.creer('p', {
        texte: 'Vos droits : accès, rectification, effacement et portabilité auprès du recruteur.'
      }),
      window.HUMANO.ui.creer('p', {
        texte: 'Évaluation : indicative, relue par un humain, sans décision automatique. Vous ne verrez pas votre note.'
      }),
      window.HUMANO.ui.creer('p', {
        texte: 'Règles du test : collage désactivé, sorties de page détectées (+20 de stress), ' +
          'chrono global et, sauf aménagement, un événement de 30 s. Le temps de réponse de l\'IA ' +
          'n\'est pas décompté de votre temps.'
      }),
      window.HUMANO.ui.creer('p', {}, [
        window.HUMANO.ui.creer('a', {
          href: 'confidentialite.html',
          target: '_blank',
          rel: 'noopener',
          texte: 'Lire la politique de confidentialité et les conditions d\'utilisation (nouvel onglet)'
        })
      ])
    ]);
    conteneur.appendChild(carteNotice);

    const formulaire = window.HUMANO.ui.creer('form', { classe: 'carte' });

    const champPrenom = window.HUMANO.ui.creer('div', { classe: 'champ' }, [
      window.HUMANO.ui.creer('label', { for: 'candidat-prenom', texte: 'Prénom' }),
      window.HUMANO.ui.creer('input', {
        type: 'text',
        id: 'candidat-prenom',
        name: 'prenom',
        required: true,
        maxlength: window.HUMANO.config.LONGUEUR_MAX.nom,
        autocomplete: 'given-name'
      })
    ]);
    formulaire.appendChild(champPrenom);

    const champNom = window.HUMANO.ui.creer('div', { classe: 'champ' }, [
      window.HUMANO.ui.creer('label', { for: 'candidat-nom', texte: 'Nom' }),
      window.HUMANO.ui.creer('input', {
        type: 'text',
        id: 'candidat-nom',
        name: 'nom',
        required: true,
        maxlength: window.HUMANO.config.LONGUEUR_MAX.nom,
        autocomplete: 'family-name'
      })
    ]);
    formulaire.appendChild(champNom);

    const caseConsentement = window.HUMANO.ui.creer('label', { classe: 'option-choix' }, [
      window.HUMANO.ui.creer('input', {
        type: 'checkbox',
        id: 'candidat-consentement',
        name: 'consentement',
        required: true
      }),
      window.HUMANO.ui.creer('span', {
        texte: 'J\'ai lu la notice et j\'accepte que mes réponses soient traitées pour ce test'
      })
    ]);
    formulaire.appendChild(caseConsentement);

    const zoneActions = window.HUMANO.ui.creer('div', { classe: 'actions' });
    const boutonDemarrer = window.HUMANO.ui.creer('button', {
      type: 'submit',
      classe: 'bouton-principal',
      texte: 'Démarrer le test'
    });
    zoneActions.appendChild(boutonDemarrer);
    formulaire.appendChild(zoneActions);

    formulaire.addEventListener('submit', function (evenement) {
      evenement.preventDefault();
      const inputPrenom = document.getElementById('candidat-prenom');
      const inputNom = document.getElementById('candidat-nom');
      const inputConsentement = document.getElementById('candidat-consentement');

      window.HUMANO.ui.lierErreur(inputPrenom, null);
      window.HUMANO.ui.lierErreur(inputNom, null);

      let erreurs = 0;
      if (!inputPrenom.value.trim()) {
        window.HUMANO.ui.lierErreur(inputPrenom, 'Ce champ est obligatoire.');
        erreurs++;
      }
      if (!inputNom.value.trim()) {
        window.HUMANO.ui.lierErreur(inputNom, 'Ce champ est obligatoire.');
        erreurs++;
      }
      if (!inputConsentement.checked) {
        erreurs++;
      }
      if (erreurs > 0) {
        window.HUMANO.ui.annoncer(erreurs + ' champs à corriger.', true);
        if (!inputPrenom.value.trim()) {
          inputPrenom.focus();
        } else if (!inputNom.value.trim()) {
          inputNom.focus();
        } else {
          inputConsentement.focus();
        }
        return;
      }

      boutonDemarrer.disabled = true;
      window.HUMANO.api.appeler('candidat.demarrer', {
        jetonPoste: jetonPosteActuel,
        prenom: inputPrenom.value.trim(),
        nom: inputNom.value.trim(),
        consentement: {
          version: window.HUMANO.config.VERSION_NOTICE,
          accepte: true
        }
      }).then(function (reponse) {
        jetonTestActuel = reponse.jetonTest;
        etatTest = reponse.etat;
        donneesEpreuves = reponse.epreuves;
        sessionStorage.setItem(cleStockageTest(jetonPosteActuel), jetonTestActuel);

        window.HUMANO.anticheat.activer({
          jetonTest: jetonTestActuel,
          surEtat: majBandeau,
          surFerme: function () {
            gererErreurGenerique({ code: 'FERME' });
          }
        });

        orienterVersEtape(etatTest.etape, reponse.echanges);
      }).catch(function (erreur) {
        boutonDemarrer.disabled = false;
        gererErreurGenerique(erreur);
      });
    });

    conteneur.appendChild(formulaire);
  }

  function orienterVersEtape(etape, echanges) {
    if (etape === 'qcm') {
      afficherQcm();
    } else if (etape === 'questions') {
      if (donneesEpreuves && donneesEpreuves.questions && donneesEpreuves.questions.length > 0) {
        afficherQuestionsTechniques();
      } else {
        afficherSimulation(echanges);
      }
    } else if (etape === 'simulation') {
      afficherSimulation(echanges);
    } else {
      terminerTest('candidat');
    }
  }

  function afficherQcm() {
    construireBandeau(1, 'questionnaire');
    const conteneur = document.getElementById('candidat-contenu');
    window.HUMANO.ui.vider(conteneur);

    const titreH1 = document.getElementById('titre-candidat');
    titreH1.textContent = 'Questionnaire d\'analyse';

    if (donneesEpreuves && donneesEpreuves.contexteQcm) {
      const c = donneesEpreuves.contexteQcm;
      const blocTableau = window.HUMANO.ui.creer('div', {
        classe: 'tableau-defilant',
        tabindex: '0',
        role: 'region',
        'aria-label': c.titre
      });
      const table = window.HUMANO.ui.creer('table', { classe: 'tableau' });
      table.appendChild(window.HUMANO.ui.creer('caption', { texte: c.titre }));

      const thead = window.HUMANO.ui.creer('thead');
      const trHead = window.HUMANO.ui.creer('tr');
      c.colonnes.forEach(function (col) {
        trHead.appendChild(window.HUMANO.ui.creer('th', { scope: 'col', texte: col }));
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = window.HUMANO.ui.creer('tbody');
      c.lignes.forEach(function (ligne) {
        const trLigne = window.HUMANO.ui.creer('tr');
        ligne.forEach(function (cellule) {
          trLigne.appendChild(window.HUMANO.ui.creer('td', { texte: cellule }));
        });
        tbody.appendChild(trLigne);
      });
      table.appendChild(tbody);
      blocTableau.appendChild(table);
      conteneur.appendChild(blocTableau);
    }

    const formulaire = window.HUMANO.ui.creer('form', { classe: 'carte' });
    const listeQcm = (donneesEpreuves && donneesEpreuves.qcm) ? donneesEpreuves.qcm : [];
    const reponses = {};

    const boutonValider = window.HUMANO.ui.creer('button', {
      type: 'submit',
      classe: 'bouton-principal',
      texte: 'Valider mes réponses',
      disabled: true
    });

    function verifierComplet() {
      const complet = listeQcm.every(function (q) {
        return Boolean(reponses[q.id]);
      });
      boutonValider.disabled = !complet;
    }

    listeQcm.forEach(function (question, index) {
      const fieldset = window.HUMANO.ui.creer('fieldset');
      fieldset.appendChild(window.HUMANO.ui.creer('legend', {
        texte: 'Question ' + (index + 1) + ' : ' + question.enonce
      }));

      question.choix.forEach(function (choixItem) {
        const radioId = 'qcm_' + question.id + '_' + choixItem.id;
        const option = window.HUMANO.ui.creer('label', { classe: 'option-choix' });
        const radio = window.HUMANO.ui.creer('input', {
          type: 'radio',
          id: radioId,
          name: 'question_' + question.id,
          value: choixItem.id
        });
        radio.addEventListener('change', function () {
          reponses[question.id] = choixItem.id;
          verifierComplet();
        });
        option.appendChild(radio);
        option.appendChild(window.HUMANO.ui.creer('span', { texte: choixItem.texte }));
        fieldset.appendChild(option);
      });

      formulaire.appendChild(fieldset);
    });

    const zoneActions = window.HUMANO.ui.creer('div', { classe: 'actions' });
    zoneActions.appendChild(boutonValider);
    formulaire.appendChild(zoneActions);

    formulaire.addEventListener('submit', function (evenement) {
      evenement.preventDefault();
      boutonValider.disabled = true;
      const listeReponses = Object.keys(reponses).map(function (qId) {
        return { questionId: qId, choix: reponses[qId] };
      });

      window.HUMANO.api.appeler('candidat.qcm', {
        jetonTest: jetonTestActuel,
        reponses: listeReponses
      }).then(function (etat) {
        etatTest = etat;
        majBandeau(etat);
        if (donneesEpreuves && donneesEpreuves.questions && donneesEpreuves.questions.length > 0) {
          afficherQuestionsTechniques();
        } else {
          afficherSimulation([]);
        }
      }).catch(function (erreur) {
        boutonValider.disabled = false;
        gererErreurGenerique(erreur);
      });
    });

    conteneur.appendChild(formulaire);
  }

  function afficherQuestionsTechniques() {
    construireBandeau(2, 'questions techniques');
    const conteneur = document.getElementById('candidat-contenu');
    window.HUMANO.ui.vider(conteneur);

    const titreH1 = document.getElementById('titre-candidat');
    titreH1.textContent = 'Questions techniques';

    const formulaire = window.HUMANO.ui.creer('form', { classe: 'carte' });
    const listeQuestions = (donneesEpreuves && donneesEpreuves.questions) ? donneesEpreuves.questions : [];
    const champsTexte = {};

    listeQuestions.forEach(function (question, index) {
      const blocChamp = window.HUMANO.ui.creer('div', { classe: 'champ' });
      const labelId = 'reponse_q_' + question.id;
      blocChamp.appendChild(window.HUMANO.ui.creer('label', {
        for: labelId,
        texte: 'Question ' + (index + 1) + ' : ' + question.enonce
      }));

      const textarea = window.HUMANO.ui.creer('textarea', {
        id: labelId,
        maxlength: window.HUMANO.config.LONGUEUR_MAX.reponseLongue
      });
      blocChamp.appendChild(textarea);

      const compteur = window.HUMANO.ui.creer('p', {
        classe: 'compteur',
        texte: '0 / ' + window.HUMANO.config.LONGUEUR_MAX.reponseLongue + ' caractères'
      });
      blocChamp.appendChild(compteur);

      let annonceFaite = false;
      textarea.addEventListener('input', function () {
        const longueur = textarea.value.length;
        const total = window.HUMANO.config.LONGUEUR_MAX.reponseLongue;
        compteur.textContent = longueur + ' / ' + total + ' caractères';
        const restant = total - longueur;
        if (restant <= 50 && !annonceFaite) {
          annonceFaite = true;
          window.HUMANO.ui.annoncer('Il reste ' + restant + ' caractères.');
        } else if (restant > 50) {
          annonceFaite = false;
        }
      });

      champsTexte[question.id] = textarea;
      formulaire.appendChild(blocChamp);
    });

    const zoneActions = window.HUMANO.ui.creer('div', { classe: 'actions' });
    const boutonValider = window.HUMANO.ui.creer('button', {
      type: 'submit',
      classe: 'bouton-principal',
      texte: 'Valider mes réponses'
    });
    zoneActions.appendChild(boutonValider);
    formulaire.appendChild(zoneActions);

    formulaire.addEventListener('submit', function (evenement) {
      evenement.preventDefault();
      boutonValider.disabled = true;
      const listeReponses = Object.keys(champsTexte).map(function (qId) {
        return {
          questionId: qId,
          texte: champsTexte[qId].value.trim()
        };
      });

      window.HUMANO.api.appeler('candidat.questions', {
        jetonTest: jetonTestActuel,
        reponses: listeReponses
      }).then(function (etat) {
        etatTest = etat;
        majBandeau(etat);
        afficherSimulation([]);
      }).catch(function (erreur) {
        boutonValider.disabled = false;
        gererErreurGenerique(erreur);
      });
    });

    conteneur.appendChild(formulaire);
  }

  function ajouterBulle(role, texte) {
    if (!conversationFil) {
      return;
    }
    const nomPersona = (donneesEpreuves && donneesEpreuves.simulation && donneesEpreuves.simulation.nomCourt)
      ? donneesEpreuves.simulation.nomCourt
      : 'Interlocuteur';
    const estInterlocuteur = (role === 'interlocuteur');
    const classeBulle = estInterlocuteur ? 'bulle bulle-interlocuteur' : 'bulle bulle-candidat';
    const auteurTexte = estInterlocuteur ? (nomPersona + ' :') : 'Vous :';

    const bulle = window.HUMANO.ui.creer('div', { classe: classeBulle }, [
      window.HUMANO.ui.creer('p', { classe: 'bulle-auteur', texte: auteurTexte }),
      window.HUMANO.ui.creer('p', { texte: texte })
    ]);
    conversationFil.appendChild(bulle);
    bulle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function envoyerReplique(texte) {
    const boutonEnvoyer = document.getElementById('simulation-envoyer');
    const champTexte = document.getElementById('simulation-reponse');
    const zoneErreurSimulation = document.getElementById('simulation-erreur-zone');

    if (boutonEnvoyer) {
      boutonEnvoyer.disabled = true;
    }
    window.HUMANO.ui.vider(zoneErreurSimulation);

    ajouterBulle('candidat', texte);
    if (champTexte) {
      champTexte.value = '';
      const compteur = document.getElementById('simulation-compteur');
      if (compteur) {
        compteur.textContent = '0 / ' + window.HUMANO.config.LONGUEUR_MAX.reponseCourte + ' caractères';
      }
    }

    window.HUMANO.api.appeler('candidat.repliquer', {
      jetonTest: jetonTestActuel,
      texte: texte
    }).then(function (reponse) {
      if (boutonEnvoyer) {
        boutonEnvoyer.disabled = false;
      }
      if (reponse.message) {
        ajouterBulle('interlocuteur', reponse.message);
      }
      majBandeau(reponse.etat);

      if (reponse.etat && reponse.etat.etape === 'fin') {
        const zoneSaisie = document.getElementById('simulation-saisie-zone');
        if (zoneSaisie) {
          window.HUMANO.ui.vider(zoneSaisie);
          zoneSaisie.appendChild(window.HUMANO.ui.creer('p', {
            classe: 'aide',
            texte: 'Mise en situation terminée.'
          }));
          const btnFin = window.HUMANO.ui.creer('button', {
            type: 'button',
            classe: 'bouton-principal',
            texte: 'Terminer le test'
          });
          btnFin.addEventListener('click', function () {
            terminerTest('candidat');
          });
          zoneSaisie.appendChild(btnFin);
        }
      }
    }).catch(function (erreur) {
      if (boutonEnvoyer) {
        boutonEnvoyer.disabled = false;
      }
      if (erreur && erreur.code === 'FERME') {
        gererErreurGenerique(erreur);
        return;
      }
      const msgErreur = window.HUMANO.ui.creer('p', {
        classe: 'erreur-champ',
        texte: 'Erreur : ' + (erreur.message || 'Impossible d\'envoyer votre réponse.')
      });
      const btnReessayer = window.HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton',
        texte: 'Réessayer'
      });
      btnReessayer.addEventListener('click', function () {
        envoyerReplique(texte);
      });
      zoneErreurSimulation.appendChild(msgErreur);
      zoneErreurSimulation.appendChild(btnReessayer);
    });
  }

  function afficherSimulation(echangesInitiaux) {
    construireBandeau(3, 'mise en situation');
    const conteneur = document.getElementById('candidat-contenu');
    window.HUMANO.ui.vider(conteneur);

    const titreH1 = document.getElementById('titre-candidat');
    titreH1.textContent = 'Mise en situation';

    const sim = (donneesEpreuves && donneesEpreuves.simulation) ? donneesEpreuves.simulation : {};
    const carteContexte = window.HUMANO.ui.creer('div', { classe: 'carte' }, [
      window.HUMANO.ui.creer('p', { texte: 'Interlocuteur : ' + (sim.nomCourt || '') + ' (' + (sim.role || '') + ')' })
    ]);
    conteneur.appendChild(carteContexte);

    conversationFil = window.HUMANO.ui.creer('div', { classe: 'fil', role: 'log' });
    conteneur.appendChild(conversationFil);

    if (echangesInitiaux && echangesInitiaux.length > 0) {
      echangesInitiaux.forEach(function (e) {
        ajouterBulle(e.role, e.texte);
      });
    }

    const zoneSaisie = window.HUMANO.ui.creer('div', { id: 'simulation-saisie-zone', classe: 'saisie' });
    const textarea = window.HUMANO.ui.creer('textarea', {
      id: 'simulation-reponse',
      maxlength: window.HUMANO.config.LONGUEUR_MAX.reponseCourte,
      'aria-label': 'Votre réponse'
    });
    zoneSaisie.appendChild(textarea);

    const compteur = window.HUMANO.ui.creer('p', {
      id: 'simulation-compteur',
      classe: 'compteur',
      texte: '0 / ' + window.HUMANO.config.LONGUEUR_MAX.reponseCourte + ' caractères'
    });
    zoneSaisie.appendChild(compteur);

    let annonceFaite = false;
    textarea.addEventListener('input', function () {
      const longueur = textarea.value.length;
      const total = window.HUMANO.config.LONGUEUR_MAX.reponseCourte;
      compteur.textContent = longueur + ' / ' + total + ' caractères';
      const restant = total - longueur;
      if (restant <= 50 && !annonceFaite) {
        annonceFaite = true;
        window.HUMANO.ui.annoncer('Il reste ' + restant + ' caractères.');
      } else if (restant > 50) {
        annonceFaite = false;
      }
    });

    const zoneErreur = window.HUMANO.ui.creer('div', { id: 'simulation-erreur-zone' });
    zoneSaisie.appendChild(zoneErreur);

    const zoneActions = window.HUMANO.ui.creer('div', { classe: 'actions' });
    const boutonEnvoyer = window.HUMANO.ui.creer('button', {
      type: 'button',
      id: 'simulation-envoyer',
      classe: 'bouton-principal',
      texte: 'Envoyer'
    });
    boutonEnvoyer.addEventListener('click', function () {
      const reponse = textarea.value.trim();
      if (!reponse) {
        return;
      }
      envoyerReplique(reponse);
    });
    zoneActions.appendChild(boutonEnvoyer);
    zoneSaisie.appendChild(zoneActions);

    conteneur.appendChild(zoneSaisie);
  }

  function terminerTest(motif) {
    arreterMinuteries();
    window.HUMANO.anticheat.desactiver();
    window.HUMANO.ui.libererBandeau();
    if (bandeauElement) {
      bandeauElement.remove();
      bandeauElement = null;
    }

    const messageAttente = document.getElementById('attente-message');
    messageAttente.textContent = 'Envoi de vos réponses au recruteur…';
    window.HUMANO.ui.afficherEcran('ecran-attente', 'Envoi en cours');

    window.HUMANO.api.appeler('candidat.terminer', {
      jetonTest: jetonTestActuel
    }).then(function () {
      sessionStorage.removeItem(cleStockageTest(jetonPosteActuel));
      afficherFin('Merci, vos réponses ont été transmises au recruteur. Vous pouvez fermer cette page.', motif);
    }).catch(function (erreur) {
      sessionStorage.removeItem(cleStockageTest(jetonPosteActuel));
      if (erreur && erreur.code === 'FERME') {
        afficherFin('Merci, vos réponses ont été transmises au recruteur. Vous pouvez fermer cette page.', motif);
      } else {
        afficherFin('Merci, vos réponses ont été transmises au recruteur. Vous pouvez fermer cette page.', motif);
      }
    });
  }

  function afficherFin(messageTexte, motif) {
    arreterMinuteries();
    window.HUMANO.anticheat.desactiver();
    window.HUMANO.ui.libererBandeau();
    if (bandeauElement) {
      bandeauElement.remove();
      bandeauElement = null;
    }

    const titre = (motif === 'Temps écoulé') ? 'Temps écoulé' : 'Test terminé';
    window.HUMANO.ui.afficherEcran('ecran-candidat', titre);

    const titreH1 = document.getElementById('titre-candidat');
    titreH1.textContent = titre;

    const conteneur = document.getElementById('candidat-contenu');
    window.HUMANO.ui.vider(conteneur);

    const carte = window.HUMANO.ui.creer('div', { classe: 'carte' }, [
      window.HUMANO.ui.creer('p', { texte: messageTexte })
    ]);
    conteneur.appendChild(carte);
  }

  function initialiser() {
    jetonPosteActuel = extraireJetonPoste();
    if (!jetonPosteActuel) {
      window.HUMANO.ui.afficherEcran('ecran-candidat', 'Lien invalide');
      const titreH1 = document.getElementById('titre-candidat');
      titreH1.textContent = 'Lien de test invalide';
      const conteneur = document.getElementById('candidat-contenu');
      window.HUMANO.ui.vider(conteneur);
      conteneur.appendChild(window.HUMANO.ui.creer('div', { classe: 'carte' }, [
        window.HUMANO.ui.creer('p', {
          classe: 'erreur-champ',
          texte: 'Lien de test invalide. Demandez un nouveau lien au recruteur.'
        })
      ]));
      return;
    }

    const jetonTestEnregistre = sessionStorage.getItem(cleStockageTest(jetonPosteActuel));
    if (jetonTestEnregistre) {
      jetonTestActuel = jetonTestEnregistre;
      window.HUMANO.ui.afficherEcran('ecran-attente', 'Reprise du test');
      const messageAttente = document.getElementById('attente-message');
      messageAttente.textContent = 'Reprise de votre test en cours…';

      window.HUMANO.api.appeler('candidat.reprendre', {
        jetonTest: jetonTestActuel
      }).then(function (reponse) {
        etatTest = reponse.etat;
        donneesEpreuves = reponse.epreuves;
        donneesPoste = {
          intitule: reponse.intitule,
          entreprise: reponse.entreprise,
          sansChrono: reponse.sansChrono
        };

        window.HUMANO.anticheat.activer({
          jetonTest: jetonTestActuel,
          surEtat: majBandeau,
          surFerme: function () {
            gererErreurGenerique({ code: 'FERME' });
          }
        });

        orienterVersEtape(etatTest.etape, reponse.echanges);
      }).catch(function (erreur) {
        sessionStorage.removeItem(cleStockageTest(jetonPosteActuel));
        gererErreurGenerique(erreur);
      });
    } else {
      window.HUMANO.ui.afficherEcran('ecran-attente', 'Chargement');
      const messageAttente = document.getElementById('attente-message');
      messageAttente.textContent = 'Chargement du test…';

      window.HUMANO.api.appeler('candidat.ouvrir', {
        jetonPoste: jetonPosteActuel
      }).then(function (infos) {
        afficherAccueil(infos);
      }).catch(function (erreur) {
        gererErreurGenerique(erreur);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiser);
  } else {
    initialiser();
  }
})();
