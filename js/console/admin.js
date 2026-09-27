(function () {
  'use strict';

  const H = window.HUMANO;

  function el(balise, attributs, enfants) {
    return H.ui.creer(balise, attributs || {}, enfants || []);
  }

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(function (o) { return o.toString(16).padStart(2, '0'); }).join('');
  }

  function depuisHex(h) {
    const o = new Uint8Array(h.length / 2);
    for (let i = 0; i < o.length; i += 1) o[i] = parseInt(h.substr(i * 2, 2), 16);
    return o;
  }

  async function deriver(motDePasse, selHex) {
    const cle = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(motDePasse), 'PBKDF2', false, ['deriveBits']);
    const bits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: depuisHex(selHex), iterations: H.config.ITERATIONS_PBKDF2, hash: 'SHA-256' },
      cle,
      256
    );
    return hex(bits);
  }

  function nouveauSel() {
    const o = new Uint8Array(16);
    window.crypto.getRandomValues(o);
    return hex(o.buffer);
  }

  function champ(id, libelle, attributs) {
    const bloc = el('div', { classe: 'champ' });
    bloc.appendChild(el('label', { for: id, texte: libelle }));
    bloc.appendChild(el('input', Object.assign({ id: id }, attributs || {})));
    return bloc;
  }

  function valeur(id) {
    const e = document.getElementById(id);
    return e ? e.value.trim() : '';
  }

  function bouton(texte, classe, action) {
    const b = el('button', { type: 'button', classe: classe || 'bouton', texte: texte });
    b.addEventListener('click', async function () {
      b.disabled = true;
      try {
        await action();
      } catch (err) {
        H.ui.afficherMessage((err && err.message) || 'Erreur.', 'erreur');
      } finally {
        b.disabled = false;
      }
    });
    return b;
  }

  function carte(titre) {
    const c = el('section', { classe: 'carte' });
    c.appendChild(el('h2', { texte: titre }));
    return c;
  }

  function tableau(legende, entetes, lignes) {
    const zone = el('div', { classe: 'tableau-defilant' });
    const t = el('table', { classe: 'tableau' });
    t.appendChild(el('caption', { texte: legende }));
    const thead = el('thead');
    const trh = el('tr');
    entetes.forEach(function (e) { trh.appendChild(el('th', { scope: 'col', texte: e })); });
    thead.appendChild(trh);
    t.appendChild(thead);
    const tbody = el('tbody');
    lignes.forEach(function (cellules) {
      const tr = el('tr');
      cellules.forEach(function (c) {
        const td = el('td');
        if (c instanceof Node) td.appendChild(c); else td.textContent = c;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    zone.appendChild(t);
    return zone;
  }

  async function ongletSecurite(conteneur) {
    const cMdp = carte('Changer le mot de passe');
    cMdp.appendChild(champ('admin-ancien', 'Mot de passe actuel', { type: 'password', autocomplete: 'current-password' }));
    cMdp.appendChild(champ('admin-nouveau', 'Nouveau mot de passe (12 caractères minimum)', { type: 'password', autocomplete: 'new-password', minlength: '12' }));
    cMdp.appendChild(champ('admin-confirmation', 'Confirmation', { type: 'password', autocomplete: 'new-password' }));
    const aMdp = el('div', { classe: 'actions' });
    aMdp.appendChild(bouton('Changer le mot de passe', 'bouton-principal', async function () {
      const ancien = document.getElementById('admin-ancien').value;
      const nouveau = document.getElementById('admin-nouveau').value;
      if (nouveau.length < 12) throw new Error('Le nouveau mot de passe doit contenir au moins 12 caractères.');
      if (nouveau !== document.getElementById('admin-confirmation').value) throw new Error('La confirmation ne correspond pas.');
      const pre = await H.api.appeler('auth.prelogin', null);
      const sel = nouveauSel();
      await H.api.appeler('auth.motDePasse', {
        ancienDerive: await deriver(ancien, pre.sel),
        nouveauDerive: await deriver(nouveau, sel),
        nouveauSel: sel
      });
      ['admin-ancien', 'admin-nouveau', 'admin-confirmation'].forEach(function (id) { document.getElementById(id).value = ''; });
      H.ui.afficherMessage('Mot de passe modifié.', 'succes');
    }));
    cMdp.appendChild(aMdp);
    conteneur.appendChild(cMdp);

    const pre = await H.api.appeler('auth.prelogin', null);
    const c2 = carte('Second facteur (application d\'authentification)');
    const zone2 = el('div');
    c2.appendChild(zone2);
    if (pre.totpActif) {
      zone2.appendChild(el('p', { texte: 'Le second facteur est activé.' }));
      zone2.appendChild(champ('admin-totp-mdp', 'Mot de passe', { type: 'password', autocomplete: 'current-password' }));
      zone2.appendChild(champ('admin-totp-code-d', 'Code à 6 chiffres', { inputmode: 'numeric', maxlength: '6', autocomplete: 'one-time-code' }));
      const a = el('div', { classe: 'actions' });
      a.appendChild(bouton('Désactiver le second facteur', 'bouton-danger', async function () {
        await H.api.appeler('auth.totpDesactiver', {
          derive: await deriver(document.getElementById('admin-totp-mdp').value, pre.sel),
          code: valeur('admin-totp-code-d')
        });
        H.ui.afficherMessage('Second facteur désactivé.', 'succes');
        await afficherOnglet('securite');
      }));
      zone2.appendChild(a);
    } else {
      zone2.appendChild(el('p', { texte: 'Le second facteur n\'est pas activé.' }));
      const a = el('div', { classe: 'actions' });
      a.appendChild(bouton('Activer le second facteur', 'bouton-principal', async function () {
        const prep = await H.api.appeler('auth.totpPreparer', null);
        H.ui.vider(zone2);
        if (typeof window.qrcode === 'function') {
          const qr = window.qrcode(0, 'M');
          qr.addData(prep.uri);
          qr.make();
          const fig = el('figure', { classe: 'qr' });
          fig.appendChild(el('img', { src: qr.createDataURL(6, 2), alt: 'QR code à scanner avec votre application d\'authentification', width: '240', height: '240' }));
          fig.appendChild(el('figcaption', { classe: 'aide', texte: 'Scannez ce QR code avec Google Authenticator ou une application équivalente.' }));
          zone2.appendChild(fig);
        }
        zone2.appendChild(el('p', { classe: 'aide', texte: 'Ou saisissez ce secret : ' + prep.secret.replace(/(.{4})/g, '$1 ').trim() }));
        zone2.appendChild(champ('admin-totp-code', 'Code à 6 chiffres affiché par l\'application', { inputmode: 'numeric', maxlength: '6', autocomplete: 'one-time-code' }));
        const a2 = el('div', { classe: 'actions' });
        a2.appendChild(bouton('Confirmer l\'activation', 'bouton-principal', async function () {
          await H.api.appeler('auth.totpActiver', { code: valeur('admin-totp-code') });
          H.ui.afficherMessage('Second facteur activé.', 'succes');
          await afficherOnglet('securite');
        }));
        zone2.appendChild(a2);
      }));
      zone2.appendChild(a);
    }
    conteneur.appendChild(c2);

    const sessions = await H.api.appeler('auth.sessions', null);
    const c3 = carte('Sessions actives');
    c3.appendChild(tableau('Sessions ouvertes sur la console', ['Ouverte le', 'Dernière activité', 'Action'], sessions.map(function (s) {
      const action = s.courante
        ? 'Cette session'
        : bouton('Révoquer', 'bouton-danger', async function () {
          await H.api.appeler('auth.revoquer', { id: s.id });
          H.ui.afficherMessage('Session révoquée.', 'succes');
          await afficherOnglet('securite');
        });
      return [H.ui.formaterDate(s.creeLe), H.ui.formaterDate(s.activite), action];
    })));
    const a3 = el('div', { classe: 'actions' });
    a3.appendChild(bouton('Se déconnecter', 'bouton', async function () { await H.auth.deconnecter(); }));
    c3.appendChild(a3);
    conteneur.appendChild(c3);
  }

  let filtreJournal = '';

  async function ongletJournal(conteneur) {
    const c = carte('Journal d\'audit');
    const bloc = el('div', { classe: 'champ' });
    bloc.appendChild(el('label', { for: 'admin-filtre', texte: 'Filtrer par type d\'action' }));
    const select = el('select', { id: 'admin-filtre' });
    [['', 'Tous'], ['auth.', 'Connexions (auth.)'], ['poste.', 'Postes (poste.)'], ['test.', 'Tests (test.)'], ['rgpd.', 'RGPD (rgpd.)'], ['admin.', 'Administration (admin.)'], ['systeme.', 'Système (systeme.)']].forEach(function (o) {
      const opt = el('option', { value: o[0], texte: o[1] });
      if (o[0] === filtreJournal) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      filtreJournal = select.value;
      afficherOnglet('journal');
    });
    bloc.appendChild(select);
    c.appendChild(bloc);

    const actions = el('div', { classe: 'actions' });
    actions.appendChild(bouton('Vérifier l\'intégrité', 'bouton-principal', async function () {
      const r = await H.api.appeler('admin.journalVerifier', null);
      if (r.integre) {
        H.ui.afficherMessage('Journal intègre : ' + r.lignes + ' entrées vérifiées.', 'succes');
      } else {
        const m = 'Anomalie détectée à la ligne ' + r.premiereAnomalie + ' : le journal a été modifié hors de HUMANO.';
        H.ui.afficherMessage(m, 'erreur');
        H.ui.annoncer(m, true);
      }
    }));
    actions.appendChild(bouton('Exporter en CSV', 'bouton', async function () {
      const r = await H.api.appeler('admin.journalCsv', null);
      H.ui.telecharger('humano-journal-' + new Date().toISOString().slice(0, 10) + '.csv', r.csv, 'text/csv;charset=utf-8');
    }));
    c.appendChild(actions);

    const entrees = await H.api.appeler('admin.journal', { action: filtreJournal });
    const liste = (entrees || []).slice(0, 200);
    c.appendChild(tableau('Dernières actions (' + liste.length + ')', ['Date', 'Acteur', 'Action', 'Cible', 'Détail'], liste.map(function (e) {
      return [H.ui.formaterDate(e.horodatage), e.acteur, e.action, e.cible, e.detail];
    })));
    conteneur.appendChild(c);
  }

  async function ongletRgpd(conteneur) {
    const p = await H.api.appeler('admin.parametres', null);
    const c = carte('Conservation des données');
    c.appendChild(champ('admin-conservation', 'Durée de conservation (jours, 30 à 365)', { type: 'number', min: '30', max: '365', value: String(p.conservationJours) }));
    const a = el('div', { classe: 'actions' });
    a.appendChild(bouton('Enregistrer la durée', 'bouton-principal', async function () {
      await H.api.appeler('admin.parametresEnregistrer', {
        conservationJours: Number(valeur('admin-conservation')),
        emailNotification: p.emailNotification || '',
        urlPublique: p.urlPublique,
        cleIa: ''
      });
      H.ui.afficherMessage('Durée de conservation enregistrée.', 'succes');
    }));
    a.appendChild(bouton('Purger maintenant', 'bouton-danger', async function () {
      const ok = await H.ui.confirmer('Supprimer définitivement les tests plus anciens que la durée de conservation ?', 'Purger', 'Annuler');
      if (!ok) return;
      const r = await H.api.appeler('admin.purger', null);
      H.ui.afficherMessage('Purge effectuée : ' + r.supprimes + ' test(s) supprimé(s).', 'succes');
    }));
    c.appendChild(a);
    conteneur.appendChild(c);

    const reg = await H.api.appeler('admin.registre', null);
    const c2 = carte('Registre des traitements');
    const dl = el('dl', { classe: 'definitions' });
    [['responsable', 'Responsable'], ['finalite', 'Finalité'], ['baseLegale', 'Base légale'], ['donnees', 'Données traitées'], ['destinataires', 'Destinataires'], ['conservation', 'Conservation'], ['droits', 'Droits des personnes'], ['securite', 'Sécurité']].forEach(function (k) {
      if (!reg[k[0]]) return;
      dl.appendChild(el('dt', { texte: k[1] }));
      dl.appendChild(el('dd', { texte: reg[k[0]] }));
    });
    dl.appendChild(el('dt', { texte: 'Version de la notice' }));
    dl.appendChild(el('dd', { texte: H.config.VERSION_NOTICE || '2026-09-27' }));
    c2.appendChild(dl);
    conteneur.appendChild(c2);
  }

  async function ongletParametres(conteneur) {
    const p = await H.api.appeler('admin.parametres', null);
    const c = carte('Paramètres');
    c.appendChild(champ('admin-url', 'URL publique du site (se termine par /)', { type: 'url', value: p.urlPublique || '' }));
    c.appendChild(champ('admin-email', 'E-mail de notification (facultatif)', { type: 'email', value: p.emailNotification || '', autocomplete: 'email' }));
    c.appendChild(champ('admin-cle', 'Clé Gemini (laisser vide pour ne pas la changer)', { type: 'password', autocomplete: 'off' }));
    c.appendChild(el('p', { classe: 'aide', texte: p.cleIaConfiguree ? 'Clé configurée.' : 'Aucune clé.' }));
    const a = el('div', { classe: 'actions' });
    a.appendChild(bouton('Enregistrer', 'bouton-principal', async function () {
      const url = valeur('admin-url');
      if (!url.endsWith('/')) throw new Error('L\'URL publique doit se terminer par /.');
      await H.api.appeler('admin.parametresEnregistrer', {
        conservationJours: p.conservationJours,
        emailNotification: valeur('admin-email'),
        urlPublique: url,
        cleIa: valeur('admin-cle')
      });
      H.ui.afficherMessage('Paramètres enregistrés.', 'succes');
      await afficherOnglet('parametres');
    }));
    c.appendChild(a);
    conteneur.appendChild(c);
  }

  const ONGLETS = { securite: ['Sécurité', ongletSecurite], journal: ['Journal d\'audit', ongletJournal], rgpd: ['RGPD', ongletRgpd], parametres: ['Paramètres', ongletParametres] };

  async function afficherOnglet(nom) {
    const cle = ONGLETS[nom] ? nom : 'securite';
    H.ui.afficherEcran('ecran-admin', 'Administration — ' + ONGLETS[cle][0]);
    Object.keys(ONGLETS).forEach(function (k) {
      const lien = document.getElementById('lien-admin-' + k);
      if (!lien) return;
      if (k === cle) lien.setAttribute('aria-current', 'page'); else lien.removeAttribute('aria-current');
    });
    const conteneur = document.getElementById('conteneur-admin');
    H.ui.vider(conteneur);
    conteneur.appendChild(el('p', { classe: 'attente', texte: 'Chargement' }));
    const zone = el('div');
    try {
      await ONGLETS[cle][1](zone);
      H.ui.vider(conteneur);
      conteneur.appendChild(zone);
    } catch (err) {
      H.ui.vider(conteneur);
      H.ui.afficherMessage((err && err.message) || 'Chargement impossible.', 'erreur');
    }
  }

  H.admin = Object.freeze({ afficherOnglet: afficherOnglet });
})();
