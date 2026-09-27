const Totp = Object.freeze({
  versBase32(octets) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let valeur = 0;
    let sortie = '';
    for (let i = 0; i < octets.length; i++) {
      valeur = (valeur << 8) | (octets[i] & 0xff);
      bits += 8;
      while (bits >= 5) {
        sortie += alphabet[(valeur >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      sortie += alphabet[(valeur << (5 - bits)) & 31];
    }
    return sortie;
  },
  depuisBase32(chaine) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const c = chaine.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let valeur = 0;
    const octets = [];
    for (let i = 0; i < c.length; i++) {
      const idx = alphabet.indexOf(c[i]);
      if (idx === -1) throw erreur('INVALIDE');
      valeur = (valeur << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        octets.push((valeur >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return octets;
  },
  nouveauSecret() {
    const octets = [];
    for (let i = 0; i < 20; i++) {
      octets.push(Math.floor(Math.random() * 256));
    }
    return Totp.versBase32(octets);
  },
  code(secretBase32, pas) {
    const cleOctets = Totp.depuisBase32(secretBase32);
    const compteur = [];
    let p = pas;
    for (let i = 7; i >= 0; i--) {
      compteur[i] = p & 0xff;
      p = Math.floor(p / 256);
    }
    const signature = Utilities.computeHmacSha1Signature(compteur, cleOctets);
    const offset = signature[signature.length - 1] & 0x0f;
    const b0 = signature[offset] & 0x7f;
    const b1 = signature[offset + 1] & 0xff;
    const b2 = signature[offset + 2] & 0xff;
    const b3 = signature[offset + 3] & 0xff;
    const codeEntier = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) % 1000000;
    return String(codeEntier).padStart(6, '0');
  },
  verifier(secretBase32, codeSaisi, pasActuel, dernierPasUtilise) {
    const pas = pasActuel !== undefined ? pasActuel : Math.floor(Date.now() / 30000);
    const fenetres = [pas, pas - 1, pas + 1];
    for (let i = 0; i < fenetres.length; i++) {
      const f = fenetres[i];
      if (dernierPasUtilise !== null && dernierPasUtilise !== undefined && f <= dernierPasUtilise) {
        continue;
      }
      const attendu = Totp.code(secretBase32, f);
      if (egaliteConstante(attendu, String(codeSaisi).trim())) {
        return { valide: true, pas: f };
      }
    }
    return { valide: false, pas: null };
  }
});

const Auth = Object.freeze({
  etat() {
    const props = PropertiesService.getScriptProperties();
    const hash = props.getProperty('AUTH_HASH');
    const totpActif = props.getProperty('TOTP_ACTIF') === 'oui';
    return {
      version: CONFIG.VERSION,
      initialise: Boolean(hash),
      totpActif: totpActif
    };
  },
  initialiser(derive, sel) {
    Valider.texte(derive, 64, 64);
    Valider.texte(sel, 32, 32);
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      if (props.getProperty('AUTH_HASH')) {
        throw erreur('ETAT');
      }
      const poivre = props.getProperty('POIVRE');
      if (!poivre) throw erreur('INTERNE');
      const authHash = sha256Hex(poivre + ':' + derive);
      props.setProperty('AUTH_SEL', sel);
      props.setProperty('AUTH_HASH', authHash);
      props.setProperty('TOTP_ACTIF', 'non');
      props.setProperty('ECHECS', '0');
      props.setProperty('VERROU_JUSQUA', '0');
      Journal.ecrire('systeme', 'auth.initialiser', 'compte', 'Creation compte administrateur');
      return { initialise: true };
    });
  },
  prelogin() {
    const props = PropertiesService.getScriptProperties();
    const sel = props.getProperty('AUTH_SEL');
    if (!sel) throw erreur('ETAT');
    const totpActif = props.getProperty('TOTP_ACTIF') === 'oui';
    return { sel: sel, totpActif: totpActif };
  },
  connexion(derive, code) {
    Valider.texte(derive, 64, 64);
    const props = PropertiesService.getScriptProperties();
    const maintenant = Date.now();
    const verrouJusqua = Number(props.getProperty('VERROU_JUSQUA') || '0');
    if (maintenant < verrouJusqua) {
      throw erreur('VERROUILLE');
    }
    const poivre = props.getProperty('POIVRE');
    const attendu = props.getProperty('AUTH_HASH');
    if (!poivre || !attendu) throw erreur('ETAT');
    const calcule = sha256Hex(poivre + ':' + derive);
    const mdpOk = egaliteConstante(calcule, attendu);
    const totpActif = props.getProperty('TOTP_ACTIF') === 'oui';
    let totpOk = true;
    let nouveauPas = null;
    if (totpActif) {
      const secret = props.getProperty('TOTP_SECRET');
      const dernier = Number(props.getProperty('TOTP_DERNIER_PAS') || '-1');
      const res = Totp.verifier(secret, code || '', Math.floor(maintenant / 30000), dernier);
      totpOk = res.valide;
      nouveauPas = res.pas;
    }
    if (!md堅k || !totpOk) {
      Auth.echec();
      throw erreur('IDENTIFIANTS');
    }
    return Stockage.avecVerrou(() => {
      props.setProperty('ECHECS', '0');
      if (totpActif && nouveauPas !== null) {
        props.setProperty('TOTP_DERNIER_PAS', String(nouveauPas));
      }
      const sess = Auth.ouvrirSession();
      Journal.ecrire('admin', 'auth.connexion', sess.jetonHash, 'Connexion reussie');
      return {
        jeton: sess.jeton,
        expireLe: sess.expireLe,
        inactiviteMin: CONFIG.SESSION_INACTIVITE_MIN
      };
    });
  },
  echec() {
    Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      let echecs = Number(props.getProperty('ECHECS') || '0') + 1;
      Journal.ecrire('inconnu', 'auth.echec', '', 'Tentative ' + echecs);
      if (echecs >= CONFIG.ECHECS_MAX) {
        const jusqua = Date.now() + CONFIG.VERROU_MIN * 60 * 1000;
        props.setProperty('VERROU_JUSQUA', String(jusqua));
        props.setProperty('ECHECS', '0');
        Journal.ecrire('systeme', 'auth.verrouillage', '', 'Verrouillage 15 min');
      } else {
        props.setProperty('ECHECS', String(echecs));
      }
    });
  },
  ouvrirSession() {
    const jeton = jetonAleatoire();
    const hash = sha256Hex(jeton);
    const maintenant = maintenantIso();
    const expireDate = new Date(Date.now() + CONFIG.SESSION_DUREE_MAX_MIN * 60 * 1000).toISOString();
    const sessions = Auth.sessionsValides();
    const cles = Object.keys(sessions);
    if (cles.length >= CONFIG.SESSIONS_MAX) {
      cles.sort((a, b) => new Date(sessions[a].activite).getTime() - new Date(sessions[b].activite).getTime());
      delete sessions[cles[0]];
    }
    sessions[hash] = {
      id: genererId('s_'),
      creeLe: maintenant,
      activite: maintenant,
      expire: expireDate
    };
    Stockage.ecrireProprieteJson('SESSIONS', sessions);
    return { jeton: jeton, jetonHash: hash, expireLe: expireDate };
  },
  sessionsValides() {
    const sessions = Stockage.lireProprieteJson('SESSIONS') || {};
    const maintenant = Date.now();
    const maxAgeMs = CONFIG.SESSION_DUREE_MAX_MIN * 60 * 1000;
    const inactifMs = CONFIG.SESSION_INACTIVITE_MIN * 60 * 1000;
    const valides = {};
    let modifie = false;
    for (const hash in sessions) {
      const s = sessions[hash];
      const cree = new Date(s.creeLe).getTime();
      const act = new Date(s.activite).getTime();
      if (maintenant - cree <= maxAgeMs && maintenant - act <= inactifMs) {
        valides[hash] = s;
      } else {
        modifie = true;
      }
    }
    if (modifie) {
      Stockage.ecrireProprieteJson('SESSIONS', valides);
    }
    return valides;
  },
  verifierSession(jeton) {
    if (!jeton) throw erreur('NON_AUTORISE');
    const hash = sha256Hex(jeton);
    const sessions = Stockage.lireProprieteJson('SESSIONS') || {};
    const sess = sessions[hash];
    if (!sess) throw erreur('NON_AUTORISE');

    const maintenantMs = Date.now();
    const creeMs = new Date(sess.creeLe).getTime();
    const actMs = new Date(sess.activite).getTime();
    const maxAgeMs = CONFIG.SESSION_DUREE_MAX_MIN * 60 * 1000;
    const inactifMs = CONFIG.SESSION_INACTIVITE_MIN * 60 * 1000;

    if (maintenantMs - creeMs > maxAgeMs || maintenantMs - actMs > inactifMs) {
      Stockage.avecVerrou(() => {
        const fraiches = Stockage.lireProprieteJson('SESSIONS') || {};
        if (fraiches[hash]) {
          delete fraiches[hash];
          Stockage.ecrireProprieteJson('SESSIONS', fraiches);
        }
      });
      throw erreur('NON_AUTORISE');
    }

    if (maintenantMs - actMs > 60 * 1000) {
      Stockage.avecVerrou(() => {
        const fraiches = Stockage.lireProprieteJson('SESSIONS') || {};
        const s = fraiches[hash];
        if (s) {
          s.activite = maintenantIso();
          Stockage.ecrireProprieteJson('SESSIONS', fraiches);
        }
      });
    }

    return sess;
  },
  deconnexion(jeton) {
    if (!jeton) return;
    const hash = sha256Hex(jeton);
    Stockage.avecVerrou(() => {
      const sessions = Stockage.lireProprieteJson('SESSIONS') || {};
      if (sessions[hash]) {
        delete sessions[hash];
        Stockage.ecrireProprieteJson('SESSIONS', sessions);
        Journal.ecrire('admin', 'auth.deconnexion', hash, 'Deconnexion manuelle');
      }
    });
  },
  listerSessions(jetonCourant) {
    const hashCourant = jetonCourant ? sha256Hex(jetonCourant) : '';
    const sessions = Auth.sessionsValides();
    const liste = [];
    for (const h in sessions) {
      const s = sessions[h];
      liste.push({
        id: s.id,
        creeLe: s.creeLe,
        activite: s.activite,
        courante: h === hashCourant
      });
    }
    liste.sort((a, b) => new Date(b.activite).getTime() - new Date(a.activite).getTime());
    return liste;
  },
  revoquer(id, jetonCourant) {
    Valider.texte(id, 1, 40);
    const hashCourant = jetonCourant ? sha256Hex(jetonCourant) : '';
    Stockage.avecVerrou(() => {
      const sessions = Stockage.lireProprieteJson('SESSIONS') || {};
      let trouve = null;
      for (const h in sessions) {
        if (sessions[h].id === id) {
          trouve = h;
          break;
        }
      }
      if (!trouve) throw erreur('INTROUVABLE');
      delete sessions[trouve];
      Stockage.ecrireProprieteJson('SESSIONS', sessions);
      Journal.ecrire('admin', 'auth.revoquer', id, 'Session revoquee');
      if (trouve === hashCourant) {
        throw erreur('NON_AUTORISE');
      }
    });
  },
  changerMotDePasse(ancienDerive, nouveauDerive, nouveauSel, jetonCourant) {
    Valider.texte(ancienDerive, 64, 64);
    Valider.texte(nouveauDerive, 64, 64);
    Valider.texte(nouveauSel, 32, 32);
    const hashCourant = jetonCourant ? sha256Hex(jetonCourant) : '';
    Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      const poivre = props.getProperty('POIVRE');
      const hashActuel = props.getProperty('AUTH_HASH');
      const testActuel = sha256Hex(poivre + ':' + ancienDerive);
      if (!egaliteConstante(testActuel, hashActuel)) {
        throw erreur('IDENTIFIANTS');
      }
      const nouveauHash = sha256Hex(poivre + ':' + nouveauDerive);
      props.setProperty('AUTH_SEL', nouveauSel);
      props.setProperty('AUTH_HASH', nouveauHash);
      const sessions = Stockage.lireProprieteJson('SESSIONS') || {};
      const conservees = {};
      if (hashCourant && sessions[hashCourant]) {
        conservees[hashCourant] = sessions[hashCourant];
      }
      Stockage.ecrireProprieteJson('SESSIONS', conservees);
      Journal.ecrire('admin', 'auth.motDePasse', '', 'Changement mot de passe et revocation autres sessions');
    });
  },
  totpPreparer() {
    const secret = Totp.nouveauSecret();
    const props = PropertiesService.getScriptProperties();
    props.setProperty('TOTP_EN_ATTENTE', secret);
    const uri = 'otpauth://totp/HUMANO:recruteur?secret=' + secret + '&issuer=HUMANO&algorithm=SHA1&digits=6&period=30';
    return { secret: secret, uri: uri };
  },
  totpActiver(code) {
    Valider.texte(code, 6, 6);
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      const secret = props.getProperty('TOTP_EN_ATTENTE');
      if (!secret) throw erreur('ETAT');
      const res = Totp.verifier(secret, code);
      if (!res.valide) throw erreur('IDENTIFIANTS');
      props.setProperty('TOTP_SECRET', secret);
      props.setProperty('TOTP_ACTIF', 'oui');
      props.setProperty('TOTP_DERNIER_PAS', String(res.pas));
      props.deleteProperty('TOTP_EN_ATTENTE');
      Journal.ecrire('admin', 'auth.totpActiver', '', 'Second facteur active');
      return { totpActif: true };
    });
  },
  totpDesactiver(derive, code) {
    Valider.texte(derive, 64, 64);
    return Stockage.avecVerrou(() => {
      const props = PropertiesService.getScriptProperties();
      if (props.getProperty('TOTP_ACTIF') !== 'oui') throw erreur('ETAT');
      const poivre = props.getProperty('POIVRE');
      const hashActuel = props.getProperty('AUTH_HASH');
      const testActuel = sha256Hex(poivre + ':' + derive);
      if (!egaliteConstante(testActuel, hashActuel)) throw erreur('IDENTIFIANTS');
      const secret = props.getProperty('TOTP_SECRET');
      const dernier = Number(props.getProperty('TOTP_DERNIER_PAS') || '-1');
      const res = Totp.verifier(secret, code || '', Math.floor(Date.now() / 30000), dernier);
      if (!res.valide) throw erreur('IDENTIFIANTS');
      props.setProperty('TOTP_ACTIF', 'non');
      props.deleteProperty('TOTP_SECRET');
      props.deleteProperty('TOTP_DERNIER_PAS');
      Journal.ecrire('admin', 'auth.totpDesactiver', '', 'Second facteur desactive');
      return { totpActif: false };
    });
  }
});
