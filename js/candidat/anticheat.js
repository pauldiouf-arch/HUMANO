(function () {
  'use strict';

  window.HUMANO = window.HUMANO || {};

  let actif = false;
  let parametres = null;
  let minuterieBlur = null;
  let dernierEnvoiCollage = 0;
  let episodeSortieEnCours = false;
  let longueursChamps = new WeakMap();

  function signaler(type) {
    if (!parametres || !parametres.jetonTest) {
      return;
    }
    window.HUMANO.api.appeler('candidat.signaler', {
      jetonTest: parametres.jetonTest,
      type: type
    }).then(function (etat) {
      if (parametres && typeof parametres.surEtat === 'function') {
        parametres.surEtat(etat);
      }
    }).catch(function (erreur) {
      if (erreur && erreur.code === 'FERME' && parametres && typeof parametres.surFerme === 'function') {
        parametres.surFerme();
      }
    });
  }

  function gererCollage(evenement) {
    if (!actif) {
      return;
    }
    evenement.preventDefault();
    window.HUMANO.ui.annoncer('Le collage est désactivé pendant ce test.');
    const maintenant = Date.now();
    if (maintenant - dernierEnvoiCollage >= 2000) {
      dernierEnvoiCollage = maintenant;
      signaler('collage');
    }
  }

  function gererBeforeInput(evenement) {
    if (!actif) {
      return;
    }
    const type = evenement.inputType || '';
    if (type.indexOf('insertFromPaste') === 0 || type.indexOf('insertFromDrop') === 0) {
      gererCollage(evenement);
      return;
    }
    if (type === 'insertReplacementText' && evenement.data && evenement.data.length > 40) {
      gererCollage(evenement);
    }
  }

  function gererContextMenu(evenement) {
    if (!actif) {
      return;
    }
    const cible = evenement.target;
    if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA')) {
      const zoneTest = document.getElementById('candidat-contenu');
      if (zoneTest && zoneTest.contains(cible)) {
        evenement.preventDefault();
      }
    }
  }

  function declencherSortie() {
    if (episodeSortieEnCours) {
      return;
    }
    episodeSortieEnCours = true;
    signaler('sortie');
  }

  function verifierPerteFocus() {
    if (minuterieBlur) {
      clearTimeout(minuterieBlur);
    }
    minuterieBlur = setTimeout(function () {
      if (!document.hasFocus() || document.visibilityState === 'hidden') {
        declencherSortie();
      }
    }, window.HUMANO.config.DELAI_CONFIRMATION_BLUR_MS);
  }

  function gererChangementVisibilite() {
    if (!actif) {
      return;
    }
    if (document.visibilityState === 'hidden') {
      declencherSortie();
    } else if (document.visibilityState === 'visible') {
      if (episodeSortieEnCours) {
        episodeSortieEnCours = false;
        const zoneAlertes = document.getElementById('zone-alertes');
        if (zoneAlertes) {
          zoneAlertes.textContent = 'Sortie de page détectée : stress +20.';
        }
        window.HUMANO.ui.annoncer('Sortie de page détectée : stress +20.', true);
      }
      if (minuterieBlur) {
        clearTimeout(minuterieBlur);
        minuterieBlur = null;
      }
    }
  }

  function gererBlur() {
    if (!actif) {
      return;
    }
    verifierPerteFocus();
  }

  function gererFocus() {
    if (!actif) {
      return;
    }
    if (episodeSortieEnCours && document.visibilityState === 'visible') {
      episodeSortieEnCours = false;
      const zoneAlertes = document.getElementById('zone-alertes');
      if (zoneAlertes) {
        zoneAlertes.textContent = 'Sortie de page détectée : stress +20.';
      }
      window.HUMANO.ui.annoncer('Sortie de page détectée : stress +20.', true);
    }
    if (minuterieBlur) {
      clearTimeout(minuterieBlur);
      minuterieBlur = null;
    }
  }

  function gererInput(evenement) {
    if (!actif) {
      return;
    }
    const cible = evenement.target;
    if (!cible || (cible.tagName !== 'INPUT' && cible.tagName !== 'TEXTAREA')) {
      return;
    }
    const longueurActuelle = cible.value.length;
    const ancienneLongueur = longueursChamps.get(cible) || 0;
    const difference = longueurActuelle - ancienneLongueur;
    longueursChamps.set(cible, longueurActuelle);
    if (difference >= window.HUMANO.config.SEUIL_INSERTION_SUSPECTE) {
      signaler('insertion');
    }
  }

  function gererFocusChamp(evenement) {
    const cible = evenement.target;
    if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA')) {
      longueursChamps.set(cible, cible.value.length);
    }
  }

  function attacherEcouteurs() {
    document.addEventListener('paste', gererCollage, true);
    document.addEventListener('drop', gererCollage, true);
    document.addEventListener('beforeinput', gererBeforeInput, true);
    document.addEventListener('contextmenu', gererContextMenu, false);
    document.addEventListener('visibilitychange', gererChangementVisibilite, false);
    window.addEventListener('blur', gererBlur, false);
    window.addEventListener('focus', gererFocus, false);
    document.addEventListener('input', gererInput, false);
    document.addEventListener('focusin', gererFocusChamp, false);
  }

  function detacherEcouteurs() {
    document.removeEventListener('paste', gererCollage, true);
    document.removeEventListener('drop', gererCollage, true);
    document.removeEventListener('beforeinput', gererBeforeInput, true);
    document.removeEventListener('contextmenu', gererContextMenu, false);
    document.removeEventListener('visibilitychange', gererChangementVisibilite, false);
    window.removeEventListener('blur', gererBlur, false);
    window.removeEventListener('focus', gererFocus, false);
    document.removeEventListener('input', gererInput, false);
    document.removeEventListener('focusin', gererFocusChamp, false);
  }

  function activer(params) {
    parametres = params;
    if (!actif) {
      actif = true;
      episodeSortieEnCours = false;
      attacherEcouteurs();
    }
  }

  function desactiver() {
    actif = false;
    parametres = null;
    episodeSortieEnCours = false;
    if (minuterieBlur) {
      clearTimeout(minuterieBlur);
      minuterieBlur = null;
    }
    detacherEcouteurs();
  }

  window.HUMANO.anticheat = Object.freeze({
    activer: activer,
    desactiver: desactiver
  });
})();
