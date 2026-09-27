'use strict';

(function () {
  function echapperLien(texte) {
    return encodeURIComponent(texte || '');
  }

  function creerEtiquetteStatut(statut) {
    const libelles = {
      brouillon: 'Brouillon',
      ouvert: 'Ouvert',
      ferme: 'Fermé',
      archive: 'Archivé'
    };
    const libelle = libelles[statut] || statut;
    return HUMANO.ui.creer('span', {
      classe: 'etiquette-statut statut-' + statut,
      texte: libelle
    });
  }

  async function afficherListe() {
    HUMANO.ui.afficherEcran('ecran-postes', 'Postes');
    const conteneur = document.getElementById('conteneur-postes');
    if (!conteneur) return;
    HUMANO.ui.vider(conteneur);

    const barreActions = HUMANO.ui.creer('div', { classe: 'actions' });
    const boutonNouveau = HUMANO.ui.creer('a', {
      classe: 'bouton-principal',
      href: '#/postes/nouveau',
      texte: 'Nouveau poste'
    });
    barreActions.appendChild(boutonNouveau);
    conteneur.appendChild(barreActions);

    let postes = [];
    try {
      postes = await HUMANO.api.appeler('postes.lister', null);
    } catch (err) {
      HUMANO.ui.afficherMessage(err.message || 'Impossible de charger la liste des postes.', 'erreur');
      return;
    }

    if (!Array.isArray(postes) || postes.length === 0) {
      const pVide = HUMANO.ui.creer('p', {
        classe: 'aide',
        texte: 'Aucun poste. Créez votre premier poste pour administrer des tests.'
      });
      conteneur.appendChild(pVide);
      return;
    }

    const divDefilant = HUMANO.ui.creer('div', {
      classe: 'tableau-defilant',
      tabindex: '0',
      role: 'region',
      'aria-label': 'Liste des postes de recrutement'
    });
    const tableau = HUMANO.ui.creer('table', { classe: 'tableau' });
    const caption = HUMANO.ui.creer('caption', { texte: 'Postes enregistrés' });
    tableau.appendChild(caption);

    const thead = HUMANO.ui.creer('thead');
    const trHead = HUMANO.ui.creer('tr');
    trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Intitulé' }));
    trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Statut' }));
    trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Tests reçus' }));
    trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Tests terminés' }));
    trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Dernière mise à jour' }));
    thead.appendChild(trHead);
    tableau.appendChild(thead);

    const tbody = HUMANO.ui.creer('tbody');
    postes.forEach(function (poste) {
      const tr = HUMANO.ui.creer('tr');

      const tdIntitule = HUMANO.ui.creer('td');
      const lien = HUMANO.ui.creer('a', {
        href: '#/postes/' + poste.id,
        texte: poste.intitule || 'Sans titre'
      });
      tdIntitule.appendChild(lien);
      tr.appendChild(tdIntitule);

      const tdStatut = HUMANO.ui.creer('td');
      tdStatut.appendChild(creerEtiquetteStatut(poste.statut));
      tr.appendChild(tdStatut);

      const tdRecus = HUMANO.ui.creer('td', { texte: String(poste.nbTests || 0) });
      const tdTermines = HUMANO.ui.creer('td', { texte: String(poste.nbTermines || 0) });
      const tdMaj = HUMANO.ui.creer('td', { texte: HUMANO.ui.formaterDate(poste.majLe) });

      tr.appendChild(tdRecus);
      tr.appendChild(tdTermines);
      tr.appendChild(tdMaj);

      tbody.appendChild(tr);
    });
    tableau.appendChild(tbody);
    divDefilant.appendChild(tableau);
    conteneur.appendChild(divDefilant);
  }

  function serialiserLignesTableau(lignes) {
    if (!Array.isArray(lignes)) return '';
    return lignes.map(function (rang) {
      return Array.isArray(rang) ? rang.join(' | ') : '';
    }).join('\n');
  }

  function deserialiserLignesTableau(texte) {
    if (!texte) return [];
    return texte.split('\n').map(function (ligne) {
      return ligne.split('|').map(function (cel) { return cel.trim(); });
    }).filter(function (rang) {
      return rang.length > 0 && rang.some(function (c) { return c.length > 0; });
    });
  }

  async function afficherEditeur(posteId) {
    HUMANO.ui.afficherEcran('ecran-editeur', posteId ? 'Modifier le poste' : 'Nouveau poste');
    const conteneur = document.getElementById('conteneur-editeur');
    if (!conteneur) return;
    HUMANO.ui.vider(conteneur);

    let donneesPoste = {
      id: null,
      intitule: '',
      entreprise: '',
      secteur: 'fintech',
      profil: '',
      competences: { hard: [], soft: ['empathie'], libres: [] },
      dureeMinutes: 20,
      sansChrono: false,
      epreuves: {
        contexteQcm: { titre: '', colonnes: [], lignes: [] },
        qcm: [
          { id: 'q1', enonce: '', choix: [{ id: 'a', texte: '' }, { id: 'b', texte: '' }, { id: 'c', texte: '' }, { id: 'd', texte: '' }], bonne: 'a', explication: '' },
          { id: 'q2', enonce: '', choix: [{ id: 'a', texte: '' }, { id: 'b', texte: '' }, { id: 'c', texte: '' }, { id: 'd', texte: '' }], bonne: 'a', explication: '' }
        ],
        questions: [
          { id: 't1', enonce: '', criteres: [''] }
        ],
        simulation: {
          persona: '',
          nomCourt: '',
          role: '',
          posture: 'externe',
          ouverture: '',
          faits: ''
        }
      }
    };

    if (posteId) {
      try {
        const posteComplet = await HUMANO.api.appeler('postes.obtenir', { id: posteId });
        if (posteComplet.statut !== 'brouillon' && posteComplet.statut !== 'ferme') {
          HUMANO.ui.afficherMessage('Ce poste ne peut être modifié que lorsqu\'il est brouillon ou fermé.', 'erreur');
          window.location.hash = '#/postes/' + posteId;
          return;
        }
        donneesPoste = JSON.parse(JSON.stringify(posteComplet));
      } catch (err) {
        HUMANO.ui.afficherMessage(err.message || 'Impossible de charger le poste.', 'erreur');
        return;
      }
    }

    const carteGenerale = HUMANO.ui.creer('div', { classe: 'carte' });

    // Intitulé
    const divIntitule = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblIntitule = HUMANO.ui.creer('label', { for: 'poste-intitule', texte: 'Intitulé du poste' });
    const inpIntitule = HUMANO.ui.creer('input', {
      id: 'poste-intitule',
      type: 'text',
      maxlength: String(HUMANO.config.LONGUEUR_MAX.intitule),
      value: donneesPoste.intitule || ''
    });
    divIntitule.appendChild(lblIntitule);
    divIntitule.appendChild(inpIntitule);
    carteGenerale.appendChild(divIntitule);

    // Entreprise
    const divEntreprise = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblEntreprise = HUMANO.ui.creer('label', { for: 'poste-entreprise', texte: 'Entreprise' });
    const inpEntreprise = HUMANO.ui.creer('input', {
      id: 'poste-entreprise',
      type: 'text',
      maxlength: String(HUMANO.config.LONGUEUR_MAX.entreprise),
      value: donneesPoste.entreprise || ''
    });
    divEntreprise.appendChild(lblEntreprise);
    divEntreprise.appendChild(inpEntreprise);
    carteGenerale.appendChild(divEntreprise);

    // Secteur
    const divSecteur = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblSecteur = HUMANO.ui.creer('label', { for: 'poste-secteur', texte: 'Secteur d\'activité' });
    const selSecteur = HUMANO.ui.creer('select', { id: 'poste-secteur' });
    Object.keys(HUMANO.config.SECTEURS).forEach(function (cle) {
      const opt = HUMANO.ui.creer('option', { value: cle, texte: HUMANO.config.SECTEURS[cle] });
      if (donneesPoste.secteur === cle) opt.selected = true;
      selSecteur.appendChild(opt);
    });
    divSecteur.appendChild(lblSecteur);
    divSecteur.appendChild(selSecteur);
    carteGenerale.appendChild(divSecteur);

    // Profil de poste
    const divProfil = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblProfil = HUMANO.ui.creer('label', { for: 'poste-profil', texte: 'Profil de poste' });
    const txtProfil = HUMANO.ui.creer('textarea', {
      id: 'poste-profil',
      maxlength: String(HUMANO.config.LONGUEUR_MAX.profil)
    });
    txtProfil.value = donneesPoste.profil || '';
    const aideProfil = HUMANO.ui.creer('p', {
      classe: 'aide',
      texte: 'Décrivez les missions, les outils et logiciels utilisés, les normes et procédures à maîtriser (par exemple Excel, SYSCOHADA, règles du bailleur, conformité bancaire). L\'IA s\'en sert pour adapter les épreuves au poste.'
    });
    const compteurProfil = HUMANO.ui.creer('p', {
      classe: 'compteur',
      texte: (txtProfil.value.length) + ' / ' + HUMANO.config.LONGUEUR_MAX.profil + ' caractères'
    });
    txtProfil.addEventListener('input', function () {
      compteurProfil.textContent = txtProfil.value.length + ' / ' + HUMANO.config.LONGUEUR_MAX.profil + ' caractères';
    });
    divProfil.appendChild(lblProfil);
    divProfil.appendChild(txtProfil);
    divProfil.appendChild(aideProfil);
    divProfil.appendChild(compteurProfil);
    carteGenerale.appendChild(divProfil);

    // Compétences humaines (soft)
    const fsSoft = HUMANO.ui.creer('fieldset');
    const legSoft = HUMANO.ui.creer('legend', { texte: 'Compétences humaines (au moins une)' });
    fsSoft.appendChild(legSoft);
    const softDispos = HUMANO.config.COMPETENCES.filter(function (c) { return c.type === 'soft'; });
    const casesSoft = {};
    softDispos.forEach(function (c) {
      const lblCase = HUMANO.ui.creer('label', { classe: 'option-choix' });
      const chk = HUMANO.ui.creer('input', { type: 'checkbox', value: c.id });
      if (donneesPoste.competences && donneesPoste.competences.soft && donneesPoste.competences.soft.indexOf(c.id) !== -1) {
        chk.checked = true;
      }
      casesSoft[c.id] = chk;
      lblCase.appendChild(chk);
      lblCase.appendChild(document.createTextNode(c.libelle));
      fsSoft.appendChild(lblCase);
    });
    carteGenerale.appendChild(fsSoft);

    // Compétences techniques (hard)
    const fsHard = HUMANO.ui.creer('fieldset');
    const legHard = HUMANO.ui.creer('legend', { texte: 'Compétences techniques standard (0 à 3)' });
    fsHard.appendChild(legHard);
    const hardDispos = HUMANO.config.COMPETENCES.filter(function (c) { return c.type === 'hard'; });
    const casesHard = {};
    hardDispos.forEach(function (c) {
      const lblCase = HUMANO.ui.creer('label', { classe: 'option-choix' });
      const chk = HUMANO.ui.creer('input', { type: 'checkbox', value: c.id });
      if (donneesPoste.competences && donneesPoste.competences.hard && donneesPoste.competences.hard.indexOf(c.id) !== -1) {
        chk.checked = true;
      }
      casesHard[c.id] = chk;
      lblCase.appendChild(chk);
      lblCase.appendChild(document.createTextNode(c.libelle));
      fsHard.appendChild(lblCase);
    });
    carteGenerale.appendChild(fsHard);

    // Compétences libres
    const divLibres = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblLibres = HUMANO.ui.creer('label', { for: 'poste-libre-input', texte: 'Compétences libres (jusqu\'à 5)' });
    const aideLibres = HUMANO.ui.creer('p', {
      classe: 'aide',
      texte: 'Outils, logiciels, normes ou savoir-faire propres au poste, par exemple Excel, Sage, SQL, SYSCOHADA.'
    });
    const zoneAjoutLibre = HUMANO.ui.creer('div', { classe: 'actions' });
    const inpLibre = HUMANO.ui.creer('input', {
      id: 'poste-libre-input',
      type: 'text',
      maxlength: String(HUMANO.config.LONGUEUR_MAX.libre)
    });
    const btnAjouterLibre = HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Ajouter'
    });
    zoneAjoutLibre.appendChild(inpLibre);
    zoneAjoutLibre.appendChild(btnAjouterLibre);

    const listeLibres = HUMANO.ui.creer('ul', { classe: 'liste-etiquettes' });
    let competencesLibres = (donneesPoste.competences && donneesPoste.competences.libres) ? donneesPoste.competences.libres.slice() : [];

    function majAffichageLibres() {
      HUMANO.ui.vider(listeLibres);
      competencesLibres.forEach(function (nom, idx) {
        const li = HUMANO.ui.creer('li', { texte: nom + ' ' });
        const btnSuppr = HUMANO.ui.creer('button', {
          type: 'button',
          classe: 'bouton',
          texte: 'Retirer',
          'aria-label': 'Retirer ' + nom
        });
        btnSuppr.addEventListener('click', function () {
          competencesLibres.splice(idx, 1);
          majAffichageLibres();
        });
        li.appendChild(btnSuppr);
        listeLibres.appendChild(li);
      });
      btnAjouterLibre.disabled = competencesLibres.length >= 5;
    }

    btnAjouterLibre.addEventListener('click', function () {
      const val = inpLibre.value.trim();
      if (!val) return;
      if (competencesLibres.indexOf(val) !== -1) {
        HUMANO.ui.lierErreur(inpLibre, 'Compétence déjà présente.');
        return;
      }
      HUMANO.ui.lierErreur(inpLibre, null);
      competencesLibres.push(val);
      inpLibre.value = '';
      majAffichageLibres();
    });

    majAffichageLibres();
    divLibres.appendChild(lblLibres);
    divLibres.appendChild(aideLibres);
    divLibres.appendChild(zoneAjoutLibre);
    divLibres.appendChild(listeLibres);
    carteGenerale.appendChild(divLibres);

    // Durée
    const divDuree = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblDuree = HUMANO.ui.creer('label', { for: 'poste-duree', texte: 'Durée totale du test' });
    const selDuree = HUMANO.ui.creer('select', { id: 'poste-duree' });
    [10, 15, 20, 30, 45, 60, 90, 120, 150, 180].forEach(function (d) {
      const opt = HUMANO.ui.creer('option', { value: String(d), texte: d + ' minutes' });
      if (donneesPoste.dureeMinutes === d) opt.selected = true;
      selDuree.appendChild(opt);
    });
    divDuree.appendChild(lblDuree);
    divDuree.appendChild(selDuree);
    carteGenerale.appendChild(divDuree);

    // Aménagement
    const lblChrono = HUMANO.ui.creer('label', { classe: 'option-choix' });
    const chkChrono = HUMANO.ui.creer('input', { type: 'checkbox', id: 'poste-sans-chrono' });
    chkChrono.checked = Boolean(donneesPoste.sansChrono);
    lblChrono.appendChild(chkChrono);
    lblChrono.appendChild(document.createTextNode('Aménagement : désactiver l\'événement chronométré'));
    carteGenerale.appendChild(lblChrono);

    conteneur.appendChild(carteGenerale);

    // CARTE ÉPREUVES
    const carteEpreuves = HUMANO.ui.creer('div', { classe: 'carte' });
    const h2Epreuves = HUMANO.ui.creer('h2', { texte: 'Épreuves' });
    carteEpreuves.appendChild(h2Epreuves);

    const barreGenerateurs = HUMANO.ui.creer('div', { classe: 'actions' });
    const btnModeles = HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Partir d\'un modèle'
    });
    const btnGenererIa = HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Générer avec l\'IA'
    });
    const pAideIa = HUMANO.ui.creer('p', {
      classe: 'aide',
      texte: 'Épreuves proposées par l\'IA : relisez et corrigez avant d\'ouvrir le poste.'
    });
    barreGenerateurs.appendChild(btnModeles);
    barreGenerateurs.appendChild(btnGenererIa);
    carteEpreuves.appendChild(barreGenerateurs);
    carteEpreuves.appendChild(pAideIa);

    // Contexte QCM
    const divQcmContexte = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblTitreTableau = HUMANO.ui.creer('label', {
      for: 'contexte-qcm-titre',
      texte: 'Titre du tableau de données (contexte du QCM)'
    });
    const inpTitreTableau = HUMANO.ui.creer('input', {
      id: 'contexte-qcm-titre',
      type: 'text',
      value: (donneesPoste.epreuves.contexteQcm && donneesPoste.epreuves.contexteQcm.titre) || ''
    });
    const lblColonnes = HUMANO.ui.creer('label', {
      for: 'contexte-qcm-colonnes',
      texte: 'Colonnes du tableau (séparées par |)'
    });
    const inpColonnes = HUMANO.ui.creer('input', {
      id: 'contexte-qcm-colonnes',
      type: 'text',
      value: (donneesPoste.epreuves.contexteQcm && donneesPoste.epreuves.contexteQcm.colonnes) ? donneesPoste.epreuves.contexteQcm.colonnes.join(' | ') : ''
    });
    const lblLignes = HUMANO.ui.creer('label', {
      for: 'contexte-qcm-lignes',
      texte: 'Lignes du tableau (une par rangée, cellules séparées par |)'
    });
    const txtLignes = HUMANO.ui.creer('textarea', { id: 'contexte-qcm-lignes' });
    txtLignes.value = serialiserLignesTableau((donneesPoste.epreuves.contexteQcm && donneesPoste.epreuves.contexteQcm.lignes) || []);

    divQcmContexte.appendChild(lblTitreTableau);
    divQcmContexte.appendChild(inpTitreTableau);
    divQcmContexte.appendChild(lblColonnes);
    divQcmContexte.appendChild(inpColonnes);
    divQcmContexte.appendChild(lblLignes);
    divQcmContexte.appendChild(txtLignes);
    carteEpreuves.appendChild(divQcmContexte);

    // Questions QCM
    let qcmQuestions = (donneesPoste.epreuves.qcm && donneesPoste.epreuves.qcm.length) ? JSON.parse(JSON.stringify(donneesPoste.epreuves.qcm)) : [];
    const divQuestionsQcm = HUMANO.ui.creer('div');
    const h3Qcm = HUMANO.ui.creer('h3', { texte: 'Questions du QCM (2 à 6 questions)' });
    carteEpreuves.appendChild(h3Qcm);
    carteEpreuves.appendChild(divQuestionsQcm);

    function majAffichageQcm() {
      HUMANO.ui.vider(divQuestionsQcm);
      qcmQuestions.forEach(function (q, qIndex) {
        const fsQ = HUMANO.ui.creer('fieldset', { classe: 'editeur-question' });
        const leg = HUMANO.ui.creer('legend', { texte: 'Question ' + (qIndex + 1) });
        fsQ.appendChild(leg);

        const divEnonce = HUMANO.ui.creer('div', { classe: 'champ' });
        const lblEnonce = HUMANO.ui.creer('label', { texte: 'Énoncé de la question' });
        const inpEnonce = HUMANO.ui.creer('input', { type: 'text', value: q.enonce || '' });
        inpEnonce.addEventListener('input', function () { q.enonce = inpEnonce.value; });
        divEnonce.appendChild(lblEnonce);
        divEnonce.appendChild(inpEnonce);
        fsQ.appendChild(divEnonce);

        ['a', 'b', 'c', 'd'].forEach(function (lettre, cIndex) {
          const divChoix = HUMANO.ui.creer('div', { classe: 'champ' });
          const lblChoix = HUMANO.ui.creer('label', { texte: 'Choix ' + lettre.toUpperCase() });
          const inpChoix = HUMANO.ui.creer('input', {
            type: 'text',
            value: (q.choix && q.choix[cIndex] && q.choix[cIndex].texte) || ''
          });
          inpChoix.addEventListener('input', function () {
            if (!q.choix[cIndex]) q.choix[cIndex] = { id: lettre, texte: '' };
            q.choix[cIndex].texte = inpChoix.value;
          });

          const lblRadio = HUMANO.ui.creer('label', { classe: 'option-choix' });
          const radio = HUMANO.ui.creer('input', {
            type: 'radio',
            name: 'bonne-reponse-' + qIndex,
            value: lettre
          });
          if (q.bonne === lettre) radio.checked = true;
          radio.addEventListener('change', function () { q.bonne = lettre; });
          lblRadio.appendChild(radio);
          lblRadio.appendChild(document.createTextNode('Bonne réponse'));

          divChoix.appendChild(lblChoix);
          divChoix.appendChild(inpChoix);
          divChoix.appendChild(lblRadio);
          fsQ.appendChild(divChoix);
        });

        const divExp = HUMANO.ui.creer('div', { classe: 'champ' });
        const lblExp = HUMANO.ui.creer('label', { texte: 'Explication pour le recruteur' });
        const inpExp = HUMANO.ui.creer('input', { type: 'text', value: q.explication || '' });
        inpExp.addEventListener('input', function () { q.explication = inpExp.value; });
        divExp.appendChild(lblExp);
        divExp.appendChild(inpExp);
        fsQ.appendChild(divExp);

        if (qcmQuestions.length > 2) {
          const btnSuppr = HUMANO.ui.creer('button', {
            type: 'button',
            classe: 'bouton-danger',
            texte: 'Retirer cette question'
          });
          btnSuppr.addEventListener('click', function () {
            qcmQuestions.splice(qIndex, 1);
            majAffichageQcm();
          });
          fsQ.appendChild(btnSuppr);
        }

        divQuestionsQcm.appendChild(fsQ);
      });
    }

    const btnAjouterQcm = HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Ajouter une question QCM'
    });
    btnAjouterQcm.addEventListener('click', function () {
      if (qcmQuestions.length >= 6) return;
      qcmQuestions.push({
        id: 'q' + (qcmQuestions.length + 1),
        enonce: '',
        choix: [{ id: 'a', texte: '' }, { id: 'b', texte: '' }, { id: 'c', texte: '' }, { id: 'd', texte: '' }],
        bonne: 'a',
        explication: ''
      });
      majAffichageQcm();
    });
    carteEpreuves.appendChild(btnAjouterQcm);
    majAffichageQcm();

    // Questions ouvertes
    let techQuestions = (donneesPoste.epreuves.questions && donneesPoste.epreuves.questions.length) ? JSON.parse(JSON.stringify(donneesPoste.epreuves.questions)) : [];
    const divQuestionsTech = HUMANO.ui.creer('div');
    const h3Tech = HUMANO.ui.creer('h3', { texte: 'Questions techniques ouvertes (0 à 3)' });
    carteEpreuves.appendChild(h3Tech);
    carteEpreuves.appendChild(divQuestionsTech);

    function majAffichageTech() {
      HUMANO.ui.vider(divQuestionsTech);
      techQuestions.forEach(function (tq, tIndex) {
        const fsT = HUMANO.ui.creer('fieldset', { classe: 'editeur-question' });
        const leg = HUMANO.ui.creer('legend', { texte: 'Question technique ' + (tIndex + 1) });
        fsT.appendChild(leg);

        const divEnonce = HUMANO.ui.creer('div', { classe: 'champ' });
        const lblEnonce = HUMANO.ui.creer('label', { texte: 'Énoncé' });
        const inpEnonce = HUMANO.ui.creer('input', { type: 'text', value: tq.enonce || '' });
        inpEnonce.addEventListener('input', function () { tq.enonce = inpEnonce.value; });
        divEnonce.appendChild(lblEnonce);
        divEnonce.appendChild(inpEnonce);
        fsT.appendChild(divEnonce);

        const divCrit = HUMANO.ui.creer('div', { classe: 'champ' });
        const lblCrit = HUMANO.ui.creer('label', { texte: 'Critères attendus pour la correction (un par ligne)' });
        const txtCrit = HUMANO.ui.creer('textarea');
        txtCrit.value = (tq.criteres || []).join('\n');
        txtCrit.addEventListener('input', function () {
          tq.criteres = txtCrit.value.split('\n').map(function (c) { return c.trim(); }).filter(Boolean);
        });
        divCrit.appendChild(lblCrit);
        divCrit.appendChild(txtCrit);
        fsT.appendChild(divCrit);

        const btnSuppr = HUMANO.ui.creer('button', {
          type: 'button',
          classe: 'bouton-danger',
          texte: 'Retirer cette question technique'
        });
        btnSuppr.addEventListener('click', function () {
          techQuestions.splice(tIndex, 1);
          majAffichageTech();
        });
        fsT.appendChild(btnSuppr);
        divQuestionsTech.appendChild(fsT);
      });
    }

    const btnAjouterTech = HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Ajouter une question technique'
    });
    btnAjouterTech.addEventListener('click', function () {
      if (techQuestions.length >= 3) return;
      techQuestions.push({
        id: 't' + (techQuestions.length + 1),
        enonce: '',
        criteres: ['']
      });
      majAffichageTech();
    });
    carteEpreuves.appendChild(btnAjouterTech);
    majAffichageTech();

    // Simulation
    const h3Sim = HUMANO.ui.creer('h3', { texte: 'Mise en situation' });
    carteEpreuves.appendChild(h3Sim);

    const divSimPersona = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblSimPersona = HUMANO.ui.creer('label', { texte: 'Persona (description de l\'interlocuteur)' });
    const inpSimPersona = HUMANO.ui.creer('input', {
      type: 'text',
      value: (donneesPoste.epreuves.simulation && donneesPoste.epreuves.simulation.persona) || ''
    });
    divSimPersona.appendChild(lblSimPersona);
    divSimPersona.appendChild(inpSimPersona);
    carteEpreuves.appendChild(divSimPersona);

    const divSimNom = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblSimNom = HUMANO.ui.creer('label', { texte: 'Nom affiché au candidat' });
    const inpSimNom = HUMANO.ui.creer('input', {
      type: 'text',
      value: (donneesPoste.epreuves.simulation && donneesPoste.epreuves.simulation.nomCourt) || ''
    });
    divSimNom.appendChild(lblSimNom);
    divSimNom.appendChild(inpSimNom);
    carteEpreuves.appendChild(divSimNom);

    const divSimRole = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblSimRole = HUMANO.ui.creer('label', { texte: 'Rôle de l\'interlocuteur' });
    const inpSimRole = HUMANO.ui.creer('input', {
      type: 'text',
      value: (donneesPoste.epreuves.simulation && donneesPoste.epreuves.simulation.role) || ''
    });
    divSimRole.appendChild(lblSimRole);
    divSimRole.appendChild(inpSimRole);
    carteEpreuves.appendChild(divSimRole);

    const divSimPosture = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblSimPosture = HUMANO.ui.creer('label', { texte: 'Posture' });
    const selSimPosture = HUMANO.ui.creer('select');
    const optExterne = HUMANO.ui.creer('option', { value: 'externe', texte: 'Externe à l\'entreprise' });
    const optInterne = HUMANO.ui.creer('option', { value: 'interne', texte: 'Interne à l\'entreprise' });
    if (donneesPoste.epreuves.simulation && donneesPoste.epreuves.simulation.posture === 'interne') {
      optInterne.selected = true;
    } else {
      optExterne.selected = true;
    }
    selSimPosture.appendChild(optExterne);
    selSimPosture.appendChild(optInterne);
    divSimPosture.appendChild(lblSimPosture);
    divSimPosture.appendChild(selSimPosture);
    carteEpreuves.appendChild(divSimPosture);

    const divSimOuv = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblSimOuv = HUMANO.ui.creer('label', { texte: 'Message d\'ouverture (première réplique)' });
    const txtSimOuv = HUMANO.ui.creer('textarea');
    txtSimOuv.value = (donneesPoste.epreuves.simulation && donneesPoste.epreuves.simulation.ouverture) || '';
    divSimOuv.appendChild(lblSimOuv);
    divSimOuv.appendChild(txtSimOuv);
    carteEpreuves.appendChild(divSimOuv);

    const divSimFaits = HUMANO.ui.creer('div', { classe: 'champ' });
    const lblSimFaits = HUMANO.ui.creer('label', { texte: 'Données factuelles secrètes (vérité de la crise)' });
    const txtSimFaits = HUMANO.ui.creer('textarea');
    txtSimFaits.value = (donneesPoste.epreuves.simulation && donneesPoste.epreuves.simulation.faits) || '';
    divSimFaits.appendChild(lblSimFaits);
    divSimFaits.appendChild(txtSimFaits);
    carteEpreuves.appendChild(divSimFaits);

    conteneur.appendChild(carteEpreuves);

    // Modèles existants
    btnModeles.addEventListener('click', async function () {
      try {
        const modeles = await HUMANO.api.appeler('postes.modeles', null);
        if (!Array.isArray(modeles) || modeles.length === 0) {
          HUMANO.ui.afficherMessage('Aucun modèle disponible.', 'info');
          return;
        }
        const premier = modeles[0];
        const confirmation = await HUMANO.ui.confirmer(
          'Charger le modèle « ' + premier.libelle + ' » ? Les épreuves actuelles seront remplacées.',
          'Charger le modèle',
          'Annuler'
        );
        if (!confirmation) return;
        const epreuvesChargees = await HUMANO.api.appeler('postes.depuisModele', { modeleId: premier.id });
        appliquerEpreuves(epreuvesChargees);
        HUMANO.ui.afficherMessage('Modèle « ' + premier.libelle + ' » chargé.', 'succes');
      } catch (err) {
        HUMANO.ui.afficherMessage(err.message || 'Impossible de charger le modèle.', 'erreur');
      }
    });

    // Génération IA
    btnGenererIa.addEventListener('click', async function () {
      const intitule = inpIntitule.value.trim();
      const secteur = selSecteur.value;
      const profil = txtProfil.value.trim();
      const hard = Object.keys(casesHard).filter(function (k) { return casesHard[k].checked; });
      const soft = Object.keys(casesSoft).filter(function (k) { return casesSoft[k].checked; });

      if (!intitule) {
        HUMANO.ui.lierErreur(inpIntitule, 'Saisissez d\'abord un intitulé pour guider l\'IA.');
        inpIntitule.focus();
        return;
      }
      if (soft.length === 0) {
        HUMANO.ui.afficherMessage('Cochez au moins une compétence humaine.', 'erreur');
        return;
      }
      if (hard.length === 0 && competencesLibres.length === 0) {
        HUMANO.ui.afficherMessage('Ajoutez au moins une compétence technique ou libre.', 'erreur');
        return;
      }

      btnGenererIa.disabled = true;
      btnGenererIa.textContent = 'Génération en cours (jusqu\'à 90 s)…';
      HUMANO.ui.afficherMessage('Génération des épreuves par l\'IA en cours…', 'info');

      try {
        const epreuvesGen = await HUMANO.api.appeler('postes.generer', {
          intitule: intitule,
          secteur: secteur,
          profil: profil,
          competences: {
            hard: hard,
            soft: soft,
            libres: competencesLibres
          }
        });
        appliquerEpreuves(epreuvesGen);
        HUMANO.ui.afficherMessage('Épreuves générées par l\'IA. Relisez et corrigez attentivement.', 'succes');
      } catch (err) {
        HUMANO.ui.afficherMessage(err.message || 'Impossible de générer les épreuves avec l\'IA.', 'erreur');
      } finally {
        btnGenererIa.disabled = false;
        btnGenererIa.textContent = 'Générer avec l\'IA';
      }
    });

    function appliquerEpreuves(ep) {
      if (!ep) return;
      if (ep.contexteQcm) {
        inpTitreTableau.value = ep.contexteQcm.titre || '';
        inpColonnes.value = (ep.contexteQcm.colonnes || []).join(' | ');
        txtLignes.value = serialiserLignesTableau(ep.contexteQcm.lignes || []);
      }
      if (Array.isArray(ep.qcm)) {
        qcmQuestions = JSON.parse(JSON.stringify(ep.qcm));
        majAffichageQcm();
      }
      if (Array.isArray(ep.questions)) {
        techQuestions = JSON.parse(JSON.stringify(ep.questions));
        majAffichageTech();
      }
      if (ep.simulation) {
        inpSimPersona.value = ep.simulation.persona || '';
        inpSimNom.value = ep.simulation.nomCourt || ep.simulation.nom_court || '';
        inpSimRole.value = ep.simulation.role || '';
        selSimPosture.value = ep.simulation.posture || 'externe';
        txtSimOuv.value = ep.simulation.ouverture || '';
        txtSimFaits.value = ep.simulation.faits || '';
      }
    }

    // Boutons de validation finale
    const barreEnvoi = HUMANO.ui.creer('div', { classe: 'actions' });
    const btnEnregistrer = HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton-principal',
      texte: 'Enregistrer le poste'
    });
    const lienAnnuler = HUMANO.ui.creer('a', {
      classe: 'bouton',
      href: posteId ? '#/postes/' + posteId : '#/postes',
      texte: 'Annuler'
    });
    barreEnvoi.appendChild(btnEnregistrer);
    barreEnvoi.appendChild(lienAnnuler);
    conteneur.appendChild(barreEnvoi);

    btnEnregistrer.addEventListener('click', async function () {
      HUMANO.ui.lierErreur(inpIntitule, null);
      HUMANO.ui.lierErreur(inpEntreprise, null);

      const intitule = inpIntitule.value.trim();
      const entreprise = inpEntreprise.value.trim();
      const secteur = selSecteur.value;
      const profil = txtProfil.value.trim();
      const hard = Object.keys(casesHard).filter(function (k) { return casesHard[k].checked; });
      const soft = Object.keys(casesSoft).filter(function (k) { return casesSoft[k].checked; });
      const duree = parseInt(selDuree.value, 10);
      const sansChrono = chkChrono.checked;

      let premierErreur = null;
      if (!intitule) {
        HUMANO.ui.lierErreur(inpIntitule, 'L\'intitulé du poste est obligatoire.');
        if (!premierErreur) premierErreur = inpIntitule;
      }
      if (!entreprise) {
        HUMANO.ui.lierErreur(inpEntreprise, 'Le nom de l\'entreprise est obligatoire.');
        if (!premierErreur) premierErreur = inpEntreprise;
      }
      if (soft.length === 0) {
        HUMANO.ui.afficherMessage('Cochez au moins une compétence humaine.', 'erreur');
        return;
      }
      if (hard.length === 0 && competencesLibres.length === 0) {
        HUMANO.ui.afficherMessage('Cochez au moins une compétence technique ou ajoutez une compétence libre.', 'erreur');
        return;
      }
      if (qcmQuestions.length < 2 || qcmQuestions.length > 6) {
        HUMANO.ui.afficherMessage('Le QCM doit comporter entre 2 et 6 questions.', 'erreur');
        return;
      }
      if (premierErreur) {
        premierErreur.focus();
        return;
      }

      const colonnes = inpColonnes.value.split('|').map(function (c) { return c.trim(); }).filter(Boolean);
      const lignes = deserialiserLignesTableau(txtLignes.value);

      const payload = {
        id: posteId || null,
        intitule: intitule,
        entreprise: entreprise,
        secteur: secteur,
        profil: profil,
        competences: {
          hard: hard,
          soft: soft,
          libres: competencesLibres
        },
        dureeMinutes: duree,
        sansChrono: sansChrono,
        epreuves: {
          contexteQcm: {
            titre: inpTitreTableau.value.trim(),
            colonnes: colonnes,
            lignes: lignes
          },
          qcm: qcmQuestions,
          questions: techQuestions,
          simulation: {
            persona: inpSimPersona.value.trim(),
            nomCourt: inpSimNom.value.trim(),
            role: inpSimRole.value.trim(),
            posture: selSimPosture.value,
            ouverture: txtSimOuv.value.trim(),
            faits: txtSimFaits.value.trim()
          }
        }
      };

      btnEnregistrer.disabled = true;
      btnEnregistrer.textContent = 'Enregistrement…';

      try {
        const retour = await HUMANO.api.appeler('postes.enregistrer', payload);
        HUMANO.ui.afficherMessage('Poste enregistré avec succès.', 'succes');
        window.location.hash = '#/postes/' + (retour.id || posteId);
      } catch (err) {
        HUMANO.ui.afficherMessage(err.message || 'Impossible d\'enregistrer le poste.', 'erreur');
        btnEnregistrer.disabled = false;
        btnEnregistrer.textContent = 'Enregistrer le poste';
      }
    });
  }

  async function afficherDetail(posteId) {
    HUMANO.ui.afficherEcran('ecran-poste', 'Détail du poste');
    const conteneur = document.getElementById('conteneur-poste');
    if (!conteneur) return;
    HUMANO.ui.vider(conteneur);

    let poste = null;
    try {
      poste = await HUMANO.api.appeler('postes.obtenir', { id: posteId });
    } catch (err) {
      HUMANO.ui.afficherMessage(err.message || 'Impossible de charger ce poste.', 'erreur');
      return;
    }

    const carteEnTete = HUMANO.ui.creer('div', { classe: 'carte' });
    const titre = HUMANO.ui.creer('h2', { texte: poste.intitule });
    carteEnTete.appendChild(titre);

    const dl = HUMANO.ui.creer('dl', { classe: 'definitions' });
    dl.appendChild(HUMANO.ui.creer('dt', { texte: 'Entreprise' }));
    dl.appendChild(HUMANO.ui.creer('dd', { texte: poste.entreprise || '—' }));

    dl.appendChild(HUMANO.ui.creer('dt', { texte: 'Secteur' }));
    dl.appendChild(HUMANO.ui.creer('dd', { texte: HUMANO.config.SECTEURS[poste.secteur] || poste.secteur }));

    dl.appendChild(HUMANO.ui.creer('dt', { texte: 'Statut' }));
    const ddStatut = HUMANO.ui.creer('dd');
    ddStatut.appendChild(creerEtiquetteStatut(poste.statut));
    dl.appendChild(ddStatut);

    dl.appendChild(HUMANO.ui.creer('dt', { texte: 'Durée' }));
    dl.appendChild(HUMANO.ui.creer('dd', { texte: poste.dureeMinutes + ' min' + (poste.sansChrono ? ' (sans événement chronométré)' : '') }));

    dl.appendChild(HUMANO.ui.creer('dt', { texte: 'Dernière mise à jour' }));
    dl.appendChild(HUMANO.ui.creer('dd', { texte: HUMANO.ui.formaterDate(poste.majLe) }));
    carteEnTete.appendChild(dl);

    // Actions selon statut
    const barreActions = HUMANO.ui.creer('div', { classe: 'actions' });
    if (poste.statut === 'brouillon' || poste.statut === 'ferme') {
      const btnModifier = HUMANO.ui.creer('a', {
        classe: 'bouton',
        href: '#/postes/' + poste.id + '/modifier',
        texte: 'Modifier'
      });
      barreActions.appendChild(btnModifier);

      const btnOuvrir = HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton-principal',
        texte: poste.statut === 'ferme' ? 'Réouvrir' : 'Ouvrir le poste'
      });
      btnOuvrir.addEventListener('click', async function () {
        try {
          await HUMANO.api.appeler('postes.statut', { id: poste.id, statut: 'ouvert' });
          HUMANO.ui.afficherMessage('Poste ouvert aux candidatures.', 'succes');
          afficherDetail(poste.id);
        } catch (err) {
          HUMANO.ui.afficherMessage(err.message || 'Impossible d\'ouvrir le poste.', 'erreur');
        }
      });
      barreActions.appendChild(btnOuvrir);
    }

    if (poste.statut === 'ouvert') {
      const btnFermer = HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton-danger',
        texte: 'Fermer le poste'
      });
      btnFermer.addEventListener('click', async function () {
        const ok = await HUMANO.ui.confirmer('Fermer ce poste ? Les candidats ne pourront plus démarrer de test.');
        if (!ok) return;
        try {
          await HUMANO.api.appeler('postes.statut', { id: poste.id, statut: 'ferme' });
          HUMANO.ui.afficherMessage('Poste fermé.', 'succes');
          afficherDetail(poste.id);
        } catch (err) {
          HUMANO.ui.afficherMessage(err.message || 'Impossible de fermer le poste.', 'erreur');
        }
      });
      barreActions.appendChild(btnFermer);
    }

    if (poste.statut === 'ferme') {
      const btnArchiver = HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton',
        texte: 'Archiver'
      });
      btnArchiver.addEventListener('click', async function () {
        const ok = await HUMANO.ui.confirmer('Archiver définitivement ce poste ?');
        if (!ok) return;
        try {
          await HUMANO.api.appeler('postes.statut', { id: poste.id, statut: 'archive' });
          HUMANO.ui.afficherMessage('Poste archivé.', 'info');
          afficherDetail(poste.id);
        } catch (err) {
          HUMANO.ui.afficherMessage(err.message || 'Impossible d\'archiver le poste.', 'erreur');
        }
      });
      barreActions.appendChild(btnArchiver);
    }

    carteEnTete.appendChild(barreActions);
    conteneur.appendChild(carteEnTete);

    // Si ouvert : partage, QR code et invitation
    if (poste.statut === 'ouvert' && poste.lien) {
      const cartePartage = HUMANO.ui.creer('div', { classe: 'carte' });
      const h3Partage = HUMANO.ui.creer('h3', { texte: 'Lien d\'accès pour les candidats' });
      cartePartage.appendChild(h3Partage);

      // QR Code
      if (typeof window.qrcode === 'function') {
        try {
          const qr = window.qrcode(0, 'M');
          qr.addData(poste.lien);
          qr.make();
          const imgUrl = qr.createDataURL(6, 2);

          const fig = HUMANO.ui.creer('figure', { classe: 'qr' });
          const img = HUMANO.ui.creer('img', {
            src: imgUrl,
            alt: 'QR code d\'accès au test pour le poste ' + poste.intitule,
            width: '240',
            height: '240'
          });
          const cap = HUMANO.ui.creer('figcaption', {
            classe: 'aide',
            texte: 'Faites scanner ce QR code pour démarrer le test sur smartphone.'
          });
          fig.appendChild(img);
          fig.appendChild(cap);
          cartePartage.appendChild(fig);
        } catch (e) {
          // Erreur QR code ignorée silencieusement
        }
      }

      // Champ lien
      const divLien = HUMANO.ui.creer('div', { classe: 'champ' });
      const inpLien = HUMANO.ui.creer('input', {
        type: 'text',
        readonly: true,
        value: poste.lien
      });
      divLien.appendChild(inpLien);
      cartePartage.appendChild(divLien);

      const actionsPartage = HUMANO.ui.creer('div', { classe: 'actions' });
      const btnCopier = HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton',
        texte: 'Copier le lien'
      });
      btnCopier.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(poste.lien);
          HUMANO.ui.afficherMessage('Lien copié dans le presse-papiers.', 'succes');
        } catch (err) {
          HUMANO.ui.afficherMessage('Copie impossible. Copiez le lien manuellement.', 'erreur');
        }
      });
      actionsPartage.appendChild(btnCopier);

      const msgPartage = 'Bonjour, voici votre lien pour passer le test de recrutement HUMANO pour le poste ' + poste.intitule + ' : ' + poste.lien;
      const lienWa = HUMANO.ui.creer('a', {
        classe: 'bouton',
        target: '_blank',
        rel: 'noopener noreferrer',
        href: 'https://wa.me/?text=' + echapperLien(msgPartage),
        texte: 'Partager par WhatsApp'
      });
      actionsPartage.appendChild(lienWa);

      const lienMail = HUMANO.ui.creer('a', {
        classe: 'bouton',
        href: 'mailto:?subject=' + echapperLien('Test de recrutement : ' + poste.intitule) + '&body=' + echapperLien(msgPartage),
        texte: 'Préparer un e-mail'
      });
      actionsPartage.appendChild(lienMail);
      cartePartage.appendChild(actionsPartage);

      // Formulaire inviter
      const formInviter = HUMANO.ui.creer('div', { classe: 'champ' });
      const h4Inviter = HUMANO.ui.creer('h4', { texte: 'Inviter un candidat directement' });
      formInviter.appendChild(h4Inviter);

      const inpEmail = HUMANO.ui.creer('input', {
        type: 'email',
        placeholder: 'Adresse e-mail du candidat'
      });
      const inpPrenom = HUMANO.ui.creer('input', {
        type: 'text',
        placeholder: 'Prénom (facultatif)'
      });
      const btnEnvoyerInv = HUMANO.ui.creer('button', {
        type: 'button',
        classe: 'bouton-principal',
        texte: 'Envoyer l\'invitation'
      });

      btnEnvoyerInv.addEventListener('click', async function () {
        const email = inpEmail.value.trim();
        const prenom = inpPrenom.value.trim();
        HUMANO.ui.lierErreur(inpEmail, null);
        if (!email) {
          HUMANO.ui.lierErreur(inpEmail, 'Saisissez une adresse e-mail valide.');
          inpEmail.focus();
          return;
        }

        btnEnvoyerInv.disabled = true;
        btnEnvoyerInv.textContent = 'Envoi…';

        try {
          await HUMANO.api.appeler('postes.inviter', {
            id: poste.id,
            email: email,
            prenom: prenom
          });
          HUMANO.ui.afficherMessage('Invitation envoyée à ' + email + '.', 'succes');
          inpEmail.value = '';
          inpPrenom.value = '';
        } catch (err) {
          HUMANO.ui.afficherMessage(err.message || 'Impossible d\'envoyer l\'invitation.', 'erreur');
        } finally {
          btnEnvoyerInv.disabled = false;
          btnEnvoyerInv.textContent = 'Envoyer l\'invitation';
        }
      });

      formInviter.appendChild(inpEmail);
      formInviter.appendChild(inpPrenom);
      formInviter.appendChild(btnEnvoyerInv);
      cartePartage.appendChild(formInviter);

      conteneur.appendChild(cartePartage);
    }

    // Tableau des tests reçus
    const carteTests = HUMANO.ui.creer('div', { classe: 'carte' });
    const h3Tests = HUMANO.ui.creer('h3', { texte: 'Tests reçus pour ce poste' });
    carteTests.appendChild(h3Tests);

    const barreTests = HUMANO.ui.creer('div', { classe: 'actions' });
    const btnActualiser = HUMANO.ui.creer('button', {
      type: 'button',
      classe: 'bouton',
      texte: 'Actualiser'
    });
    barreTests.appendChild(btnActualiser);
    carteTests.appendChild(barreTests);

    const zoneTableauTests = HUMANO.ui.creer('div');
    carteTests.appendChild(zoneTableauTests);
    conteneur.appendChild(carteTests);

    async function chargerTests() {
      HUMANO.ui.vider(zoneTableauTests);
      let tests = [];
      try {
        tests = await HUMANO.api.appeler('tests.lister', { posteId: poste.id });
      } catch (err) {
        HUMANO.ui.afficherMessage(err.message || 'Impossible de lister les tests.', 'erreur');
        return;
      }

      if (!Array.isArray(tests) || tests.length === 0) {
        const pVide = HUMANO.ui.creer('p', {
          classe: 'aide',
          texte: 'Aucun test reçu pour ce poste.'
        });
        zoneTableauTests.appendChild(pVide);
        return;
      }

      const divDefilant = HUMANO.ui.creer('div', {
        classe: 'tableau-defilant',
        tabindex: '0',
        role: 'region',
        'aria-label': 'Tests reçus'
      });
      const table = HUMANO.ui.creer('table', { classe: 'tableau' });
      const thead = HUMANO.ui.creer('thead');
      const trHead = HUMANO.ui.creer('tr');
      trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Candidat' }));
      trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Statut' }));
      trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Note finale' }));
      trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Sorties' }));
      trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Date' }));
      trHead.appendChild(HUMANO.ui.creer('th', { scope: 'col', texte: 'Motif de fin' }));
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = HUMANO.ui.creer('tbody');
      tests.forEach(function (t) {
        const tr = HUMANO.ui.creer('tr');

        const tdNom = HUMANO.ui.creer('td');
        const lienRapport = HUMANO.ui.creer('a', {
          href: '#/tests/' + t.id,
          texte: 'Test de ' + (t.prenom || '') + ' ' + (t.nom || '')
        });
        tdNom.appendChild(lienRapport);
        tr.appendChild(tdNom);

        const libellesStatut = {
          en_cours: 'En cours',
          termine: 'Terminé, en évaluation',
          evalue: 'Évalué'
        };
        const tdStatut = HUMANO.ui.creer('td', { texte: libellesStatut[t.statut] || t.statut });
        tr.appendChild(tdStatut);

        const tdNote = HUMANO.ui.creer('td', {
          texte: t.noteFinale !== null && t.noteFinale !== undefined ? t.noteFinale + '/20' : '—'
        });
        tr.appendChild(tdNote);

        const tdSorties = HUMANO.ui.creer('td', { texte: String(t.sorties || 0) });
        tr.appendChild(tdSorties);

        const tdDate = HUMANO.ui.creer('td', { texte: HUMANO.ui.formaterDate(t.debut) });
        tr.appendChild(tdDate);

        const libelleMotif = t.motifFin === 'temps' ? 'Temps écoulé' : (t.motifFin === 'candidat' ? 'Terminé par le candidat' : '—');
        const tdMotif = HUMANO.ui.creer('td', { texte: libelleMotif });
        tr.appendChild(tdMotif);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      divDefilant.appendChild(table);
      zoneTableauTests.appendChild(divDefilant);
    }

    btnActualiser.addEventListener('click', chargerTests);
    await chargerTests();
  }

  window.HUMANO = window.HUMANO || {};
  window.HUMANO.postes = Object.freeze({
    afficherListe: afficherListe,
    afficherEditeur: afficherEditeur,
    afficherDetail: afficherDetail
  });
})();
