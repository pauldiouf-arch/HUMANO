(function () {
  'use strict';

  window.HUMANO = window.HUMANO || {};

  let minuteriePolie = null;
  let minuterieUrgente = null;
  let observateurBandeau = null;
  let premierAffichage = true;

  function creer(balise, attributs, enfants) {
    const el = document.createElement(balise);
    const attrs = attributs || {};
    const cles = Object.keys(attrs);
    for (let i = 0; i < cles.length; i += 1) {
      const cle = cles[i];
      if (cle.slice(0, 2) === 'on') {
        throw new Error('Gestionnaire inline interdit');
      }
      const val = attrs[cle];
      if (cle === 'classe') {
        el.className = String(val);
      } else if (cle === 'texte') {
        el.textContent = String(val);
      } else if (val === true) {
        el.setAttribute(cle, '');
      } else if (val !== false && val !== null && val !== undefined) {
        el.setAttribute(cle, String(val));
      }
    }
    const listeEnfants = enfants || [];
    for (let j = 0; j < listeEnfants.length; j += 1) {
      const enf = listeEnfants[j];
      if (enf instanceof Node) {
        el.appendChild(enf);
      } else if (enf !== null && enf !== undefined) {
        el.appendChild(document.createTextNode(String(enf)));
      }
    }
    return el;
  }

  function vider(element) {
    if (!element) return;
    while (element.firstChild) {
      element.firstChild.remove();
    }
  }

  function annoncer(texte, urgent) {
    const id = urgent ? 'annonce-urgente' : 'annonce-polie';
    const conteneur = document.getElementById(id);
    if (!conteneur) return;
    vider(conteneur);
    if (urgent) {
      if (minuterieUrgente) clearTimeout(minuterieUrgente);
      minuterieUrgente = setTimeout(function () {
        conteneur.textContent = texte;
      }, 50);
    } else {
      if (minuteriePolie) clearTimeout(minuteriePolie);
      minuteriePolie = setTimeout(function () {
        conteneur.textContent = texte;
      }, 50);
    }
  }

  function confirmer(message, libelleOk, libelleAnnuler) {
    return new Promise(function (resolve) {
      const dialog = document.getElementById('dialogue-confirmation');
      const pMsg = document.getElementById('dialogue-message');
      const btnOk = document.getElementById('dialogue-ok');
      const btnAnnuler = document.getElementById('dialogue-annuler');
      if (!dialog || !pMsg || !btnOk || !btnAnnuler) {
        resolve(false);
        return;
      }
      const elementActif = document.activeElement;
      pMsg.textContent = message;
      btnOk.textContent = libelleOk || 'Confirmer';
      btnAnnuler.textContent = libelleAnnuler || 'Annuler';

      function nettoyer() {
        dialog.removeEventListener('close', surFermeture);
        btnOk.removeEventListener('click', surOk);
        btnAnnuler.removeEventListener('click', surAnnuler);
        if (elementActif && typeof elementActif.focus === 'function') {
          elementActif.focus();
        }
      }

      function surOk() {
        nettoyer();
        dialog.close();
        resolve(true);
      }

      function surAnnuler() {
        nettoyer();
        dialog.close();
        resolve(false);
      }

      function surFermeture() {
        nettoyer();
        resolve(false);
      }

      btnOk.addEventListener('click', surOk);
      btnAnnuler.addEventListener('click', surAnnuler);
      dialog.addEventListener('close', surFermeture);
      dialog.showModal();
      btnAnnuler.focus();
    });
  }

  function creerJauge(idBase, libelle) {
    const idLibelle = idBase + '-libelle';
    const pLibelle = creer('p', { id: idLibelle, classe: 'jauge-libelle', texte: libelle });
    const divRemplissage = creer('div', { classe: 'jauge-remplissage' });
    const divJauge = creer('div', {
      id: idBase,
      classe: 'jauge',
      role: 'meter',
      'aria-labelledby': idLibelle,
      'aria-valuemin': '0',
      'aria-valuemax': '100'
    }, [divRemplissage]);
    return creer('div', { classe: 'jauge-bloc' }, [pLibelle, divJauge]);
  }

  function majJauge(bloc, valeur, libelle) {
    if (!bloc) return;
    const v = Math.max(0, Math.min(100, Math.round(Number(valeur) || 0)));
    const remplissage = bloc.querySelector('.jauge-remplissage');
    const jauge = bloc.querySelector('.jauge');
    const pLibelle = bloc.querySelector('.jauge-libelle');
    const libelleNiveau = window.HUMANO.config.libelleStress(v);
    const niveau = window.HUMANO.config.niveauStress(v);
    if (remplissage) {
      remplissage.style.width = v + '%';
    }
    if (jauge) {
      jauge.classList.remove('niveau-calme', 'niveau-tendu', 'niveau-rupture');
      jauge.classList.add('niveau-' + niveau);
      jauge.setAttribute('aria-valuenow', String(v));
      jauge.setAttribute('aria-valuetext', v + ' sur 100, ' + libelleNiveau.toLowerCase());
    }
    if (pLibelle) {
      pLibelle.textContent = libelle + ' : ' + v + '/100 — ' + libelleNiveau;
    }
  }

  function formaterDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Africa/Dakar'
      }).format(d);
    } catch (e) {
      return '—';
    }
  }

  function lierErreur(champ, message) {
    if (!champ || !champ.id) return;
    const idErreur = champ.id + '-erreur';
    let pErreur = document.getElementById(idErreur);
    if (message) {
      if (!pErreur) {
        pErreur = creer('p', { id: idErreur, classe: 'erreur-champ' });
        champ.parentNode.insertBefore(pErreur, champ.nextSibling);
      }
      pErreur.textContent = 'Erreur : ' + message;
      champ.setAttribute('aria-invalid', 'true');
      const descripteurs = (champ.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (descripteurs.indexOf(idErreur) === -1) {
        descripteurs.push(idErreur);
        champ.setAttribute('aria-describedby', descripteurs.join(' '));
      }
    } else {
      if (pErreur) pErreur.remove();
      champ.removeAttribute('aria-invalid');
      const descripteurs = (champ.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(function (id) { return id && id !== idErreur; });
      if (descripteurs.length > 0) {
        champ.setAttribute('aria-describedby', descripteurs.join(' '));
      } else {
        champ.removeAttribute('aria-describedby');
      }
    }
  }

  function afficherEcran(idSection, titre) {
    const main = document.getElementById('contenu');
    if (!main) return;
    const ecrans = main.querySelectorAll('section.ecran');
    for (let i = 0; i < ecrans.length; i += 1) {
      ecrans[i].setAttribute('hidden', '');
    }
    const cible = document.getElementById(idSection);
    if (cible) {
      cible.removeAttribute('hidden');
    }
    document.title = titre + ' — HUMANO';
    window.scrollTo(0, 0);
    const msgGlobal = document.getElementById('message-global');
    if (msgGlobal) vider(msgGlobal);
    if (cible) {
      const h1 = cible.querySelector('h1');
      if (h1 && !premierAffichage) {
        h1.focus();
      }
    }
    premierAffichage = false;
  }

  function afficherMessage(texte, type) {
    const t = type || 'info';
    const conteneur = document.getElementById('message-global');
    if (!conteneur) return;
    vider(conteneur);
    if (!texte) return;
    const prefixes = {
      info: 'Information : ',
      succes: 'Succès : ',
      erreur: 'Erreur : '
    };
    const prefixe = prefixes[t] || 'Information : ';
    const p = creer('p', {
      classe: 'message message-' + t,
      texte: prefixe + texte
    });
    conteneur.appendChild(p);
    annoncer(prefixe + texte, t === 'erreur');
  }

  function suivreBandeau(element) {
    libererBandeau();
    if (!element) return;
    function majHauteur() {
      const h = element.offsetHeight || 0;
      document.documentElement.style.scrollPaddingTop = (h + 16) + 'px';
    }
    majHauteur();
    if (typeof ResizeObserver !== 'undefined') {
      observateurBandeau = new ResizeObserver(majHauteur);
      observateurBandeau.observe(element);
    }
  }

  function libererBandeau() {
    if (observateurBandeau) {
      observateurBandeau.disconnect();
      observateurBandeau = null;
    }
    document.documentElement.style.removeProperty('scroll-padding-top');
  }

  function formaterDuree(ms) {
    const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const minStr = min < 10 ? '0' + min : String(min);
    const secStr = sec < 10 ? '0' + sec : String(sec);
    return minStr + ':' + secStr;
  }

  function telecharger(nomFichier, contenu, type) {
    const blob = new Blob([contenu], { type: type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  window.HUMANO.ui = Object.freeze({
    creer: creer,
    vider: vider,
    annoncer: annoncer,
    confirmer: confirmer,
    creerJauge: creerJauge,
    majJauge: majJauge,
    formaterDate: formaterDate,
    lierErreur: lierErreur,
    afficherEcran: afficherEcran,
    afficherMessage: afficherMessage,
    suivreBandeau: suivreBandeau,
    libererBandeau: libererBandeau,
    formaterDuree: formaterDuree,
    telecharger: telecharger
  });
})();
