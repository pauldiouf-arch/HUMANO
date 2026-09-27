const Totp = Object.freeze({
  versBase32(octets) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let valeur = 0;
    let sortie = '';
    for (let i = 0; i < octets.length; i++) {
      const b = octets[i] < 0 ? octets[i] + 256 : octets[i];
      valeur = (valeur << 8) | b;
      bits += 8;
      while (bits >= 5) {
        sortie += alphabet.charAt((valeur >>> (bits - 5)) & 31);
        bits -= 5;
      }
    }
    if (bits > 0) {
      sortie += alphabet.charAt((valeur << (5 - bits)) & 31);
    }
    return sortie;
  },
  depuisBase32(chaine) {
    const propre = String(chaine).toUpperCase().split('=').join('').split(' ').join('');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let valeur = 0;
    const octets = [];
    for (let i = 0; i < propre.length; i++) {
      const idx = alphabet.indexOf(propre.charAt(i));
      if (idx === -1) throw erreur('INVALIDE');
      valeur = (valeur << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        octets.push((valeur >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return octets;
  },
  nouveauSecret() {
    const graine = Utilities.getUuid() + ':' + Utilities.getUuid() + ':' + Date.now();
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, graine, Utilities.Charset.UTF_8);
    return Totp.versBase32(digest.slice(0, 20));
  },
  code(secretBase32, pas) {
    const cleOctets = Totp.depuisBase32(secretBase32);
    const pasOctets = [0, 0, 0, 0, 0, 0, 0, 0];
    let p = pas;
    for (let i = 7; i >= 0; i--) {
      pasOctets[i] = p & 0xff;
      p = Math.floor(p / 256);
    }
    const hmac = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, pasOctets, cleOctets);
    const dernierOctet = hmac[hmac.length - 1];
    const offset = (dernierOctet < 0 ? dernierOctet + 256 : dernierOctet) & 0x0f;
    const b0 = (hmac[offset] < 0 ? hmac[offset] + 256 : hmac[offset]) & 0x7f;
    const b1 = (hmac[offset + 1] < 0 ? hmac[offset + 1] + 256 : hmac[offset + 1]) & 0xff;
    const b2 = (hmac[offset + 2] < 0 ? hmac[offset + 2] + 256 : hmac[offset + 2]) & 0xff;
    const b3 = (hmac[offset + 3] < 0 ? hmac[offset + 3] + 256 : hmac[offset + 3]) & 0xff;
    const binaire = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    const otp = (binaire % 1000000).toString();
    return ('000000' + otp).slice(-6);
  },
  verifier(secretBase32, codeSaisi, pasActuel) {
    const codeNet = String(codeSaisi || '').trim();
    if (codeNet.length !== 6) return false;
    const props = PropertiesService.getScriptProperties();
    const dernierPas = Number(props.getProperty('TOTP_DERNIER_PAS') || 0);
    const pasBase = pasActuel !== undefined ? pasActuel : Math.floor(Date.now() / 1000 / 30);
    for (let decalage = -1; decalage <= 1; decalage++) {
      const p = pasBase + decalage;
      if (p <= dernierPas) continue;
      const attendu = Totp.code(secretBase32, p);
      if (egaliteConstante(attendu, codeNet)) {
        props.setProperty('TOTP_DERNIER_PAS', String(p));
        return true;
      }
    }
    return false;
  }
});

const Auth = Object.freeze({
  etat() {
    const props = PropertiesService.getScriptProperties();
    const initialise = Boolean(props.getProperty('AUTH_HASH'));
    const totpActif = props.getProperty('TOTP_ACTIF') === 'oui';
    return { version: CONFIG.VERSION, initialise, totpActif };
  },
  initialiser(donnees) {
    Valider.objet(donnees);
    const derive = Valider.texte(donnees.derive, 64, 64);
    const sel = Valider.texte(donnees.sel, 32, 32);
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      if (props.getProperty('AUTH_HASH')) throw erreur('ETAT');
      const poivre = props.getProperty('POIVRE');
      if (!poivre) throw erreur('INTERNE');
      const hash = sha256Hex(poivre + ':' + derive);
      props.setProperty('AUTH_SEL', sel);
      props.setProperty('AUTH_HASH', hash);
      Journal.ecrire('recruteur', 'auth.initialiser', 'systeme', 'Compte recruteur créé.');
      return { initialise: true };
    });
  },
  prelogin() {
    const props = PropertiesService.getScriptProperties();
    const sel = props.getProperty('AUTH_SEL') || '';
    const totpActif = props.getProperty('TOTP_ACTIF') === 'oui';
    return { sel, totpActif };
  },
  connexion(donnees) {
    Valider.objet(donnees);
    const derive = Valider.texte(donnees.derive, 64, 64);
    const code = String(donnees.code || '').trim();
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      const maintenant = Date.now();
      const verrouJusqua = Number(props.getProperty('VERROU_JUSQUA') || 0);
      if (maintenant < verrouJusqua) throw erreur('VERROUILLE');
      const poivre = props.getProperty('POIVRE');
      const attendu = props.getProperty('AUTH_HASH');
      if (!poivre || !attendu) throw erreur('ETAT');
      const calcule = sha256Hex(poivre + ':' + derive);
      if (!egaliteConstante(attendu, calcule)) {
        Auth.echec();
        throw erreur('IDENTIFIANTS');
      }
      const totpActif = props.getProperty('TOTP_ACTIF') === 'oui';
      if (totpActif) {
        const secret = props.getProperty('TOTP_SECRET');
        if (!secret || !Totp.verifier(secret, code)) {
          Auth.echec();
          throw erreur('IDENTIFIANTS');
        }
      }
      props.setProperty('ECHECS', '0');
      const jeton = Auth.ouvrirSession();
      Journal.ecrire('recruteur', 'auth.connexion', 'session', 'Connexion réussie.');
      const sessions = Stockage.lireProprieteJson('SESSIONS') || {};
      const session = sessions[sha256Hex(jeton)];
      return {
        jeton,
        expireLe: session ? session.expire : maintenantIso(),
        inactiviteMin: CONFIG.SESSION_INACTIVITE_MIN
      };
    });
  },
  echec() {
    const props = PropertiesService.getScriptProperties();
    const echecs = Number(props.getProperty('ECHECS') || 0) + 1;
    if (echecs >= CONFIG.ECHECS_MAX) {
      const verrouJusqua = Date.now() + CONFIG.VERROU_MIN * 60 * 1000;
      props.setProperty('VERROU_JUSQUA', String(verrouJusqua));
      props.setProperty('ECHECS', '0');
      Journal.ecrire('anonyme', 'auth.verrouillage', 'securite', 'Compte verrouillé après 5 échecs.');
    } else {
      props.setProperty('ECHECS', String(echecs));
      Journal.ecrire('anonyme', 'auth.echec', 'securite', 'Échec d\'authentification.');
    }
  },
  ouvrirSession() {
    const jeton = jetonAleatoire();
    const jetonHash = sha256Hex(jeton);
    const sessions = Auth.sessionsValides();
    const cles = Object.keys(sessions);
    if (cles.length >= CONFIG.SESSIONS_MAX) {
      cles.sort((a, b) => new Date(sessions[a].activite) - new Date(sessions[b].activite));
      delete sessions[cles[0]];
    }
    const maintenant = new Date();
    const expire = new Date(maintenant.getTime() + CONFIG.SESSION_DUREE_MAX_MIN * 60 * 1000).toISOString();
    const activite = maintenant.toISOString();
    sessions[jetonHash] = {
      id: genererId('s_'),
      creeLe: activite,
      activite,
      expire
    };
    Stockage.ecrireProprieteJson('SESSIONS', sessions);
    return jeton;
  },
  sessionsValides() {
    const brutes = Stockage.lireProprieteJson('SESSIONS') || {};
    const valides = {};
    const maintenant = Date.now();
    const limiteInactiviteMs = CONFIG.SESSION_INACTIVITE_MIN * 60 * 1000;
    Object.keys(brutes).forEach((h) => {
      const s = brutes[h];
      const expireMs = new Date(s.expire).getTime();
      const activiteMs = new Date(s.activite).getTime();
      if (maintenant < expireMs && maintenant - activiteMs < limiteInactiviteMs) {
        valides[h] = s;
      }
    });
    return valides;
  },
  verifierSession(jeton) {
    if (!jeton || typeof jeton !== 'string' || jeton.length !== 64) {
      throw erreur('NON_AUTORISE');
    }
    return Stockage.avecVerrou(() => {
      const jetonHash = sha256Hex(jeton);
      const sessions = Auth.sessionsValides();
      const session = sessions[jetonHash];
      if (!session) {
        Stockage.ecrireProprieteJson('SESSIONS', sessions);
        throw erreur('NON_AUTORISE');
      }
      session.activite = maintenantIso();
      sessions[jetonHash] = session;
      Stockage.ecrireProprieteJson('SESSIONS', sessions);
      return session;
    });
  },
  deconnexion(jeton) {
    if (!jeton) return {};
    return Stockage.avecVerrou(() => {
      const jetonHash = sha256Hex(jeton);
      const sessions = Auth.sessionsValides();
      delete sessions[jetonHash];
      Stockage.ecrireProprieteJson('SESSIONS', sessions);
      Journal.ecrire('recruteur', 'auth.deconnexion', 'session', 'Déconnexion manuelle.');
      return {};
    });
  },
  listerSessions(jetonCourant) {
    const jetonHash = sha256Hex(jetonCourant);
    const sessions = Auth.sessionsValides();
    return Object.keys(sessions).map((h) => {
      const s = sessions[h];
      return {
        id: s.id,
        creeLe: s.creeLe,
        activite: s.activite,
        courante: h === jetonHash
      };
    });
  },
  revoquer(donnees, jetonCourant) {
    Valider.objet(donnees);
    const id = Valider.texte(donnees.id, 1, 60);
    return Stockage.avecVerrou(() => {
      const jetonHash = sha256Hex(jetonCourant);
      const sessions = Auth.sessionsValides();
      let trouve = null;
      Object.keys(sessions).forEach((h) => {
        if (sessions[h].id === id) trouve = h;
      });
      if (!trouve) throw erreur('INTROUVABLE');
      if (trouve === jetonHash) throw erreur('ETAT');
      delete sessions[trouve];
      Stockage.ecrireProprieteJson('SESSIONS', sessions);
      Journal.ecrire('recruteur', 'auth.revoquer', id, 'Révocation d\'une session.');
      return {};
    });
  },
  changerMotDePasse(donnees, jetonCourant) {
    Valider.objet(donnees);
    const ancienDerive = Valider.texte(donnees.ancienDerive, 64, 64);
    const nouveauDerive = Valider.texte(donnees.nouveauDerive, 64, 64);
    const nouveauSel = Valider.texte(donnees.nouveauSel, 32, 32);
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      const poivre = props.getProperty('POIVRE');
      const hashActuel = props.getProperty('AUTH_HASH');
      const calculeAncien = sha256Hex(poivre + ':' + ancienDerive);
      if (!egaliteConstante(hashActuel, calculeAncien)) {
        throw erreur('IDENTIFIANTS');
      }
      const nouveauHash = sha256Hex(poivre + ':' + nouveauDerive);
      props.setProperty('AUTH_SEL', nouveauSel);
      props.setProperty('AUTH_HASH', nouveauHash);
      const jetonHash = sha256Hex(jetonCourant);
      const sessions = Auth.sessionsValides();
      const conservees = {};
      if (sessions[jetonHash]) {
        conservees[jetonHash] = sessions[jetonHash];
      }
      Stockage.ecrireProprieteJson('SESSIONS', conservees);
      Journal.ecrire('recruteur', 'auth.motDePasse', 'securite', 'Mot de passe modifié.');
      return {};
    });
  },
  totpPreparer() {
    const props = PropertiesService.getScriptProperties();
    const secret = Totp.nouveauSecret();
    props.setProperty('TOTP_EN_ATTENTE', secret);
    const uri = 'otpauth://totp/HUMANO:recruteur?secret=' + secret + '&issuer=HUMANO&algorithm=SHA1&digits=6&period=30';
    return { secret, uri };
  },
  totpActiver(donnees) {
    Valider.objet(donnees);
    const code = Valider.texte(donnees.code, 6, 6);
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      const secret = props.getProperty('TOTP_EN_ATTENTE');
      if (!secret) throw erreur('ETAT');
      if (!Totp.verifier(secret, code)) throw erreur('IDENTIFIANTS');
      props.setProperty('TOTP_SECRET', secret);
      props.setProperty('TOTP_ACTIF', 'oui');
      props.deleteProperty('TOTP_EN_ATTENTE');
      Journal.ecrire('recruteur', 'auth.totpActiver', 'securite', 'Second facteur activé.');
      return { totpActif: true };
    });
  },
  totpDesactiver(donnees) {
    Valider.objet(donnees);
    const derive = Valider.texte(donnees.derive, 64, 64);
    const code = Valider.texte(donnees.code, 6, 6);
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      const poivre = props.getProperty('POIVRE');
      const attendu = props.getProperty('AUTH_HASH');
      const calcule = sha256Hex(poivre + ':' + derive);
      if (!egaliteConstante(attendu, calcule)) throw erreur('IDENTIFIANTS');
      const secret = props.getProperty('TOTP_SECRET');
      if (!secret || !Totp.verifier(secret, code)) throw erreur('IDENTIFIANTS');
      props.setProperty('TOTP_ACTIF', 'non');
      props.deleteProperty('TOTP_SECRET');
      Journal.ecrire('recruteur', 'auth.totpDesactiver', 'securite', 'Second facteur désactivé.');
      return { totpActif: false };
    });
  }
});
