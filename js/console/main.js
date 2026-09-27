'use strict';

(function () {
  if (window.top !== window.self) {
    window.document.body.replaceChildren();
    const p = window.document.createElement('p');
    p.textContent = 'Cette page ne peut pas être affichée dans un cadre. Ouvrez-la directement.';
    window.document.body.appendChild(p);
    return;
  }

  let minuterieInactivite = null;

  function reinitialiserInactivite() {
    if (minuterieInactivite) {
      window.clearTimeout(minuterieInactivite);
      minuterieInactivite = null;
    }
    if (!HUMANO.api.jetonCourant()) {
      return;
    }
    const dureeMs = HUMANO.config.SESSION_INACTIVITE_MIN * 60 * 1000;
    minuterieInactivite = window.setTimeout(function () {
      HUMANO.api.oublierJeton();
      majNavigation();
      HUMANO.ui.afficherMessage('Session expirée après inactivité. Reconnectez-vous.', 'info');
      window.location.hash = '#/connexion';
    }, dureeMs);
  }

  window.addEventListener('pointerdown', reinitialiserInactivite, true);
  window.addEventListener('keydown', reinitialiserInactivite, true);

  function majNavigation() {
    const nav = document.getElementById('navigation-console');
    const connecte = Boolean(HUMANO.api.jetonCourant());
    if (!nav) return;
    nav.hidden = !connecte;

    const hash = window.location.hash || '#/connexion';
    const lienPostes = document.getElementById('lien-nav-postes');
    const lienAdmin = document.getElementById('lien-nav-admin');

    if (lienPostes) {
      if (hash.startsWith('#/postes')) {
        lienPostes.setAttribute('aria-current', 'page');
      } else {
        lienPostes.removeAttribute('aria-current');
      }
    }

    if (lienAdmin) {
      if (hash.startsWith('#/admin')) {
        lienAdmin.setAttribute('aria-current', 'page');
      } else {
        lienAdmin.removeAttribute('aria-current');
      }
    }
  }

  async function router() {
    reinitialiserInactivite();
    majNavigation();

    const jeton = HUMANO.api.jetonCourant();
    const hash = window.location.hash || '#/connexion';

    if (!jeton && hash !== '#/connexion') {
      window.location.hash = '#/connexion';
      return;
    }

    if (hash === '#/connexion') {
      if (jeton) {
        window.location.hash = '#/postes';
        return;
      }
      HUMANO.auth.afficherConnexion();
      return;
    }

    if (hash === '#/postes') {
      await HUMANO.postes.afficherListe();
      return;
    }

    if (hash === '#/postes/nouveau') {
      await HUMANO.postes.afficherEditeur(null);
      return;
    }

    if (hash.startsWith('#/postes/') && hash.endsWith('/modifier')) {
      const morceaux = hash.split('/');
      const id = morceaux[2];
      await HUMANO.postes.afficherEditeur(id);
      return;
    }

    if (hash.startsWith('#/postes/')) {
      const id = hash.slice('#/postes/'.length);
      await HUMANO.postes.afficherDetail(id);
      return;
    }

    if (hash.startsWith('#/tests/')) {
      const id = hash.slice('#/tests/'.length);
      if (HUMANO.tests && typeof HUMANO.tests.afficherRapport === 'function') {
        await HUMANO.tests.afficherRapport(id);
      } else {
        HUMANO.ui.afficherEcran('ecran-rapport', 'Rapport de test');
        const conteneur = document.getElementById('conteneur-rapport');
        HUMANO.ui.vider(conteneur);
        const p = HUMANO.ui.creer('p', { classe: 'aide', texte: 'Module des rapports en cours de chargement.' });
        conteneur.appendChild(p);
      }
      return;
    }

    if (hash.startsWith('#/admin')) {
      const onglet = hash.slice('#/admin/'.length) || 'securite';
      if (HUMANO.admin && typeof HUMANO.admin.afficherOnglet === 'function') {
        await HUMANO.admin.afficherOnglet(onglet);
      } else {
        HUMANO.ui.afficherEcran('ecran-admin', 'Administration');
        const conteneur = document.getElementById('conteneur-admin');
        HUMANO.ui.vider(conteneur);
        const p = HUMANO.ui.creer('p', { classe: 'aide', texte: 'Module administration en cours de chargement.' });
        conteneur.appendChild(p);
      }
      return;
    }

    window.location.hash = jeton ? '#/postes' : '#/connexion';
  }

  async function demarrer() {
    const btnDeconnexion = document.getElementById('bouton-nav-deconnexion');
    if (btnDeconnexion) {
      btnDeconnexion.addEventListener('click', async function () {
        await HUMANO.auth.deconnecter();
      });
    }

    window.addEventListener('hashchange', function () {
      router().catch(function (err) {
        HUMANO.ui.afficherMessage(err.message || 'Erreur de navigation.', 'erreur');
      });
    });

    try {
      const etat = await HUMANO.api.appeler('systeme.etat', null);
      HUMANO.auth.enregistrerEtatSysteme(etat);
    } catch (err) {
      HUMANO.ui.afficherMessage(err.message || 'Impossible de joindre le serveur HUMANO.', 'erreur');
    }

    router().catch(function (err) {
      HUMANO.ui.afficherMessage(err.message || 'Erreur lors du chargement initial.', 'erreur');
    });
  }

  window.HUMANO = window.HUMANO || {};
  window.HUMANO.main = Object.freeze({
    router: router,
    majNavigation: majNavigation
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
