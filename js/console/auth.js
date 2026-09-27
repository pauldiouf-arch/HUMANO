'use strict';

(function () {
  let etatSysteme = { initialise: true, totpActif: false };

  const MOTS_DE_PASSE_COURANTS = Object.freeze([
    '123456789012',
    'password1234',
    'motdepasse12',
    'administrateur',
    'azertyuiop12',
    'qwertyuiop12',
    'superadmin12',
    'bienvenue123',
    'passerelle12',
    'soleildakar1',
    'secret123456',
    'azerty123456',
    'motdepasse123',
    'welcome12345',
    'administrateur1',
    'changeit1234',
    'masterkey123',
    'access123456',
    'complexpass1',
    'monmotdepasse'
  ]);

  function octetsVersHex(tampon) {
    const octets = new Uint8Array(tampon);
    let hex = '';
    for (let i = 0; i < octets.length; i += 1) {
      hex += octets[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  function hexVersOctets(hex) {
    const longueur = hex.length / 2;
    const octets = new Uint8Array(longueur);
    for (let i = 0; i < longueur; i += 1) {
      octets[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return octets;
  }

  async function deriverMotDePasse(motDePasse, selHex) {
    const encodeur = new TextEncoder();
    const cleBrute = await window.crypto.subtle.importKey(
      'raw',
      encodeur.encode(motDePasse),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const selOctets = hexVersOctets(selHex);
    const bits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: selOctets,
        iterations: HUMANO.config.ITERATIONS_PBKDF2,
        hash: 'SHA-256'
      },
      cleBrute,
      256
    );
    return octetsVersHex(bits);
  }

  function genererSelHex() {
    const octets = new Uint8Array(16);
    window.crypto.getRandomValues(octets);
    return octetsVersHex(octets.buffer);
  }

  function evaluerForce(mdp) {
    if (!mdp || mdp.length < HUMANO.config.MOT_DE_PASSE_MIN) {
      return { niveau: 'faible', libelle: 'Faible' };
    }
    let score = 0;
    if (mdp.length >= 16) score += 1;
    if (/[A-Z]/.test(mdp)) score += 1;
    if (/[a-z]/.test(mdp)) score += 1;
    if (/[0-9]/.test(mdp)) score += 1;
    if (/[^A-Za-z0-9]/.test(mdp)) score += 1;

    if (score >= 4) {
      return { niveau: 'solide', libelle: 'Solide' };
    }
    if (score >= 2) {
      return { niveau: 'correct', libelle: 'Correct' };
    }
    return { niveau: 'faible', libelle: 'Faible' };
  }

  function enregistrerEtatSysteme(etat) {
    if (etat && typeof etat === 'object') {
      etatSysteme = {
        initialise: Boolean(etat.initialise),
        totpActif: Boolean(etat.totpActif)
      };
    }
  }

  function afficherFormulaireCreation(conteneur) {
    HUMANO.ui.vider(conteneur);

    const carte = HUMANO.ui.creer('div', { classe: 'carte' });
    const pIntro = HUMANO.ui.creer('p', {
      classe: 'aide',
      texte: 'Première utilisation : choisissez votre identifiant et le mot de passe de la console.'
    });
    carte.appendChild(pIntro);

    const divId = HUMANO.ui.creer('div', { classe: 'champ' });
    divId.appendChild(HUMANO.ui.creer('label', { for: 'auth-creation-identifiant', texte: 'Identifiant' }));
    const inputId = HUMANO.ui.creer('input', { id: 'auth-creation-identifiant', type: 'text', autocomplete: 'username', maxlength: '40', spellcheck: 'false', autocapitalize: 'none' });
    divId.appendChild(inputId);
    carte.appendChild(divId);


    const divMdp = HUMANO.ui.creer('div', { classe: 'champ' });
    const labelMdp = HUMANO.ui.creer('label', { for: 'auth-creation-mdp', texte: 'Mot de passe maître' });
    const inputMdp = HUMANO.ui.creer('input', {
      id: 'auth-creation-mdp',
      type: 'password',
      autocomplete: 'new-password'
    });
    const aideForce = HUMANO.ui.creer('p', {
      id: 'auth-creation-force',
      classe: 'aide',
      texte: 'Force : en attente de saisie (au moins 12 caractères).'
    });
    divMdp.appendChild(labelMdp);
    divMdp.appendChild(inputMdp);
    divMdp.appendChild(aideForce);
    carte.appendChild(divMdp);

    const divConf = HUMANO.ui.creer('div', { classe: 'champ' });
    const labelConf = HUMANO.ui.creer('label', {
      for: 'auth-creation-confirmation',
      texte: 'Confirmez le mot de passe'
    });
    const inputConf = HUMANO.ui.creer('input', {
      id: 'auth-creation-confirmation',
      type: 'password',
      autocomplete: 'new-password'
    });
    divConf.appendChild(labelConf);
    divConf.appendChild(inputConf);
    carte.appendChild(divConf);

    const actions = HUMANO.ui.creer('div', { classe: 'actions' });
    const boutonValider = HUMANO.ui.creer('button', {
      type: 'button',
      id: 'auth-bouton-creer',
      classe: 'bouton-principal',
      texte: 'Créer le mot de passe'
    });
    actions.appendChild(boutonValider);
    carte.appendChild(actions);
    conteneur.appendChild(carte);

    inputMdp.addEventListener('input', function () {
      const mdp = inputMdp.value;
      const force = evaluerForce(mdp);
      aideForce.textContent = 'Force : ' + force.libelle + (mdp.length < 12 ? ' (au moins 12 caractères requis).' : '.');
      HUMANO.ui.lierErreur(inputMdp, null);
    });

    boutonValider.addEventListener('click', async function () {
      const mdp = inputMdp.value;
      const conf = inputConf.value;

      HUMANO.ui.lierErreur(inputMdp, null);
      HUMANO.ui.lierErreur(inputConf, null);
      HUMANO.ui.lierErreur(inputId, null);

      if (inputId.value.trim().length < 3) {
        HUMANO.ui.lierErreur(inputId, 'Choisissez un identifiant d\'au moins 3 caractères.');
        inputId.focus();
        return;
      }

      if (mdp.length < HUMANO.config.MOT_DE_PASSE_MIN) {
        HUMANO.ui.lierErreur(inputMdp, 'Le mot de passe doit comporter au moins 12 caractères.');
        inputMdp.focus();
        return;
      }
      if (MOTS_DE_PASSE_COURANTS.indexOf(mdp.toLowerCase()) !== -1) {
        HUMANO.ui.lierErreur(inputMdp, 'Ce mot de passe est trop courant. Choisissez un mot de passe plus robuste.');
        inputMdp.focus();
        return;
      }
      if (mdp !== conf) {
        HUMANO.ui.lierErreur(inputConf, 'Les deux mots de passe ne correspondent pas.');
        inputConf.focus();
        return;
      }

      boutonValider.disabled = true;
      boutonValider.textContent = 'Initialisation…';

      try {
        const sel = genererSelHex();
        const derive = await deriverMotDePasse(mdp, sel);
        await HUMANO.api.appeler('auth.initialiser', { derive: derive, sel: sel, identifiant: inputId.value.trim() });
        etatSysteme.initialise = true;
        HUMANO.ui.afficherMessage('Mot de passe créé avec succès. Vous pouvez maintenant vous connecter.', 'succes');
        afficherConnexion();
      } catch (err) {
        HUMANO.ui.afficherMessage(err.message || 'Impossible d\'initialiser le mot de passe.', 'erreur');
        boutonValider.disabled = false;
        boutonValider.textContent = 'Créer le mot de passe';
      }
    });
  }

  function afficherFormulaireConnexion(conteneur) {
    HUMANO.ui.vider(conteneur);

    const carte = HUMANO.ui.creer('div', { classe: 'carte' });

    const divId = HUMANO.ui.creer('div', { classe: 'champ' });
    divId.appendChild(HUMANO.ui.creer('label', { for: 'auth-connexion-identifiant', texte: 'Identifiant' }));
    const inputId = HUMANO.ui.creer('input', { id: 'auth-connexion-identifiant', type: 'text', autocomplete: 'username', maxlength: '40', spellcheck: 'false', autocapitalize: 'none' });
    divId.appendChild(inputId);
    carte.appendChild(divId);

    const divMdp = HUMANO.ui.creer('div', { classe: 'champ' });
    const labelMdp = HUMANO.ui.creer('label', { for: 'auth-connexion-mdp', texte: 'Mot de passe' });
    const inputMdp = HUMANO.ui.creer('input', {
      id: 'auth-connexion-mdp',
      type: 'password',
      autocomplete: 'current-password'
    });
    divMdp.appendChild(labelMdp);
    divMdp.appendChild(inputMdp);
    carte.appendChild(divMdp);

    let inputCode = null;
    if (etatSysteme.totpActif) {
      const divCode = HUMANO.ui.creer('div', { classe: 'champ' });
      const labelCode = HUMANO.ui.creer('label', {
        for: 'auth-connexion-code',
        texte: 'Code à 6 chiffres (authentificateur)'
      });
      inputCode = HUMANO.ui.creer('input', {
        id: 'auth-connexion-code',
        type: 'text',
        inputmode: 'numeric',
        pattern: '[0-9]*',
        maxlength: '6',
        autocomplete: 'one-time-code'
      });
      divCode.appendChild(labelCode);
      divCode.appendChild(inputCode);
      carte.appendChild(divCode);
    }

    const actions = HUMANO.ui.creer('div', { classe: 'actions' });
    const boutonConnexion = HUMANO.ui.creer('button', {
      type: 'button',
      id: 'auth-bouton-connexion',
      classe: 'bouton-principal',
      texte: 'Se connecter'
    });
    actions.appendChild(boutonConnexion);
    const lienOubli = HUMANO.ui.creer('button', { type: 'button', classe: 'lien-discret', texte: 'Mot de passe oublié ?' });
    lienOubli.addEventListener('click', function () {
      afficherFormulaireOubli(conteneur);
    });
    actions.appendChild(lienOubli);
    carte.appendChild(actions);
    conteneur.appendChild(carte);

    boutonConnexion.addEventListener('click', async function () {
      const mdp = inputMdp.value;
      const code = inputCode ? inputCode.value.trim() : '';

      HUMANO.ui.lierErreur(inputMdp, null);
      HUMANO.ui.lierErreur(inputId, null);
      if (inputCode) HUMANO.ui.lierErreur(inputCode, null);

      if (!inputId.value.trim()) {
        HUMANO.ui.lierErreur(inputId, 'Saisissez votre identifiant.');
        inputId.focus();
        return;
      }

      if (!mdp) {
        HUMANO.ui.lierErreur(inputMdp, 'Saisissez votre mot de passe.');
        inputMdp.focus();
        return;
      }
      if (etatSysteme.totpActif && (!code || code.length !== 6)) {
        HUMANO.ui.lierErreur(inputCode, 'Saisissez le code à 6 chiffres.');
        inputCode.focus();
        return;
      }

      boutonConnexion.disabled = true;
      boutonConnexion.textContent = 'Vérification…';

      try {
        const prelogin = await HUMANO.api.appeler('auth.prelogin', null);
        etatSysteme.totpActif = Boolean(prelogin.totpActif);
        const derive = await deriverMotDePasse(mdp, prelogin.sel);
        const rep = await HUMANO.api.appeler('auth.connexion', {
          identifiant: inputId.value.trim(),
          derive: derive,
          code: code
        });
        HUMANO.api.definirJeton(rep.jeton);
        try {
          window.sessionStorage.setItem('humano.nom', rep.nom || inputId.value.trim());
        } catch (e) {
          // Stockage indisponible
        }
        HUMANO.main.majNavigation();
        HUMANO.ui.annoncer('Connexion réussie.');
        window.location.hash = '#/accueil';
      } catch (err) {
        boutonConnexion.disabled = false;
        boutonConnexion.textContent = 'Se connecter';
        if (err.code === 'VERROUILLE') {
          HUMANO.ui.afficherMessage(err.message, 'erreur');
        } else if (err.code === 'IDENTIFIANTS') {
          HUMANO.ui.lierErreur(inputMdp, 'Identifiant, mot de passe ou code incorrect.');
          inputMdp.focus();
        } else {
          HUMANO.ui.afficherMessage(err.message || 'Impossible de se connecter.', 'erreur');
        }
      }
    });
  }

  function afficherFormulaireOubli(conteneur) {
    const U = HUMANO.ui;
    U.vider(conteneur);
    const titre = document.getElementById('titre-connexion');
    if (titre) titre.textContent = 'Mot de passe oublié';
    const carte = U.creer('div', { classe: 'carte' });
    carte.appendChild(U.creer('p', { classe: 'aide', texte: 'Saisissez votre identifiant et le code de secours généré dans Administration, Sécurité. Toutes les sessions ouvertes seront fermées.' }));
    const champs = [
      ['oubli-identifiant', 'Identifiant', { type: 'text', autocomplete: 'username', maxlength: '40', autocapitalize: 'none' }],
      ['oubli-code', 'Code de secours', { type: 'text', autocomplete: 'off', autocapitalize: 'characters', maxlength: '30' }],
      ['oubli-mdp', 'Nouveau mot de passe (12 caractères minimum)', { type: 'password', autocomplete: 'new-password' }],
      ['oubli-confirmation', 'Confirmez le nouveau mot de passe', { type: 'password', autocomplete: 'new-password' }]
    ];
    const entrees = {};
    champs.forEach(function (c) {
      const div = U.creer('div', { classe: 'champ' });
      div.appendChild(U.creer('label', { for: c[0], texte: c[1] }));
      const input = U.creer('input', Object.assign({ id: c[0] }, c[2]));
      div.appendChild(input);
      carte.appendChild(div);
      entrees[c[0]] = input;
    });
    const actions = U.creer('div', { classe: 'actions' });
    const boutonValider = U.creer('button', { type: 'button', classe: 'bouton-principal', texte: 'Réinitialiser le mot de passe' });
    const boutonRetour = U.creer('button', { type: 'button', classe: 'bouton', texte: 'Retour à la connexion' });
    boutonRetour.addEventListener('click', function () {
      afficherConnexion();
    });
    actions.appendChild(boutonValider);
    actions.appendChild(boutonRetour);
    carte.appendChild(actions);
    conteneur.appendChild(carte);

    const carteSignal = U.creer('div', { classe: 'carte' });
    carteSignal.appendChild(U.creer('h2', { texte: 'Pas de code de secours ?' }));
    carteSignal.appendChild(U.creer('p', { classe: 'aide', texte: 'Signalez l\'oubli à l\'administrateur de HUMANO : il sera averti sur son tableau de bord et pourra réinitialiser votre accès.' }));
    const divMsg = U.creer('div', { classe: 'champ' });
    divMsg.appendChild(U.creer('label', { for: 'oubli-message', texte: 'Message pour l\'administrateur (facultatif)' }));
    const inputMsg = U.creer('textarea', { id: 'oubli-message', rows: '2', maxlength: '300' });
    divMsg.appendChild(inputMsg);
    carteSignal.appendChild(divMsg);
    const actionsSignal = U.creer('div', { classe: 'actions' });
    const boutonSignal = U.creer('button', { type: 'button', classe: 'bouton', texte: 'Signaler à l\'administrateur' });
    actionsSignal.appendChild(boutonSignal);
    carteSignal.appendChild(actionsSignal);
    conteneur.appendChild(carteSignal);
    boutonSignal.addEventListener('click', async function () {
      boutonSignal.disabled = true;
      try {
        await HUMANO.api.appeler('auth.signalerOubli', {
          identifiant: entrees['oubli-identifiant'].value.trim(),
          message: inputMsg.value.trim()
        });
        U.vider(carteSignal);
        carteSignal.appendChild(U.creer('h2', { texte: 'Demande envoyée' }));
        carteSignal.appendChild(U.creer('p', { classe: 'aide', texte: 'L\'administrateur a été averti. Il vous recontactera pour réinitialiser votre accès.' }));
        U.annoncer('Demande envoyée à l\'administrateur.');
      } catch (err) {
        boutonSignal.disabled = false;
        U.afficherMessage(err.message || 'Envoi impossible.', 'erreur');
      }
    });
    entrees['oubli-identifiant'].focus();

    boutonValider.addEventListener('click', async function () {
      Object.keys(entrees).forEach(function (k) { U.lierErreur(entrees[k], null); });
      const mdp = entrees['oubli-mdp'].value;
      if (!entrees['oubli-identifiant'].value.trim()) {
        U.lierErreur(entrees['oubli-identifiant'], 'Saisissez votre identifiant.');
        return;
      }
      if (!entrees['oubli-code'].value.trim()) {
        U.lierErreur(entrees['oubli-code'], 'Saisissez votre code de secours.');
        return;
      }
      if (mdp.length < HUMANO.config.MOT_DE_PASSE_MIN || MOTS_DE_PASSE_COURANTS.indexOf(mdp.toLowerCase()) !== -1) {
        U.lierErreur(entrees['oubli-mdp'], 'Choisissez un mot de passe robuste d\'au moins 12 caractères.');
        return;
      }
      if (mdp !== entrees['oubli-confirmation'].value) {
        U.lierErreur(entrees['oubli-confirmation'], 'Les deux mots de passe ne correspondent pas.');
        return;
      }
      boutonValider.disabled = true;
      boutonValider.textContent = 'Réinitialisation…';
      try {
        const sel = genererSelHex();
        const derive = await deriverMotDePasse(mdp, sel);
        await HUMANO.api.appeler('auth.reinitialiser', {
          identifiant: entrees['oubli-identifiant'].value.trim(),
          code: entrees['oubli-code'].value.trim(),
          nouveauDerive: derive,
          nouveauSel: sel
        });
        U.afficherMessage('Mot de passe réinitialisé. Connectez-vous, puis générez un nouveau code de secours.', 'succes');
        afficherConnexion();
      } catch (err) {
        boutonValider.disabled = false;
        boutonValider.textContent = 'Réinitialiser le mot de passe';
        if (err.code === 'IDENTIFIANTS') {
          U.lierErreur(entrees['oubli-code'], 'Identifiant ou code de secours incorrect.');
        } else {
          U.afficherMessage(err.message || 'Réinitialisation impossible.', 'erreur');
        }
      }
    });
  }

  function afficherConnexion() {
    HUMANO.ui.afficherEcran('ecran-connexion', 'Connexion');
    const titreConnexion = document.getElementById('titre-connexion');
    if (titreConnexion) titreConnexion.textContent = 'Connexion';
    const conteneur = document.getElementById('conteneur-auth');
    if (!conteneur) return;
    if (!etatSysteme.initialise) {
      afficherFormulaireCreation(conteneur);
    } else {
      afficherFormulaireConnexion(conteneur);
    }
  }

  async function deconnecter() {
    try {
      await HUMANO.api.appeler('auth.deconnexion', null);
    } catch (ignore) {
      // Ignorer l'erreur réseau éventuelle lors de la déconnexion
    }
    HUMANO.api.oublierJeton();
    try {
      window.sessionStorage.removeItem('humano.nom');
    } catch (e) {
      // Stockage indisponible
    }
    HUMANO.main.majNavigation();
    HUMANO.ui.afficherMessage('Vous êtes déconnecté.', 'info');
    window.location.hash = '#/connexion';
  }

  window.HUMANO = window.HUMANO || {};
  window.HUMANO.auth = Object.freeze({
    enregistrerEtatSysteme: enregistrerEtatSysteme,
    afficherConnexion: afficherConnexion,
    deconnecter: deconnecter
  });
})();
