(function () {
  'use strict';

  window.HUMANO = window.HUMANO || {};

  const MESSAGES_LOCAUX = Object.freeze({
    RESEAU: 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
    DELAI: 'Le serveur met trop de temps à répondre. Réessayez.',
    INTERNE: 'Erreur interne. Réessayez.'
  });

  function ErreurApi(code, message) {
    this.name = 'ErreurApi';
    this.code = code || 'INTERNE';
    this.message = message || MESSAGES_LOCAUX[this.code] || MESSAGES_LOCAUX.INTERNE;
  }
  ErreurApi.prototype = Object.create(Error.prototype);
  ErreurApi.prototype.constructor = ErreurApi;

  function jetonCourant() {
    try {
      return sessionStorage.getItem('humano.jeton');
    } catch (e) {
      return null;
    }
  }

  function definirJeton(j) {
    try {
      if (j) {
        sessionStorage.setItem('humano.jeton', j);
      } else {
        sessionStorage.removeItem('humano.jeton');
      }
    } catch (e) {
      return;
    }
  }

  function oublierJeton() {
    try {
      sessionStorage.removeItem('humano.jeton');
    } catch (e) {
      return;
    }
  }

  function executerRequete(action, donnees, signal) {
    const cfg = window.HUMANO.config || {};
    const url = cfg.URL_API;
    const estConsole = window.location.pathname.indexOf('console.html') !== -1;
    const jeton = estConsole ? jetonCourant() : null;
    const corps = JSON.stringify({
      action: action,
      jeton: jeton,
      donnees: donnees !== undefined ? donnees : null
    });

    return fetch(url, {
      method: 'POST',
      body: corps,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      redirect: 'follow',
      signal: signal
    }).then(function (res) {
      if (!res.ok) {
        throw new ErreurApi('INTERNE', MESSAGES_LOCAUX.INTERNE);
      }
      return res.json().catch(function () {
        throw new ErreurApi('INTERNE', MESSAGES_LOCAUX.INTERNE);
      });
    }).then(function (reponse) {
      if (!reponse || typeof reponse !== 'object') {
        throw new ErreurApi('INTERNE', MESSAGES_LOCAUX.INTERNE);
      }
      if (reponse.ok) {
        return reponse.donnees;
      }
      const err = reponse.erreur || {};
      const code = err.code || 'INTERNE';
      const message = err.message || MESSAGES_LOCAUX[code] || MESSAGES_LOCAUX.INTERNE;
      if (estConsole && code === 'NON_AUTORISE') {
        oublierJeton();
        window.location.hash = '#/connexion';
      }
      throw new ErreurApi(code, message);
    }).catch(function (e) {
      if (e instanceof ErreurApi) {
        throw e;
      }
      if (e && e.name === 'AbortError') {
        throw new ErreurApi('DELAI', MESSAGES_LOCAUX.DELAI);
      }
      throw new ErreurApi('RESEAU', MESSAGES_LOCAUX.RESEAU);
    });
  }

  function appeler(action, donnees, options) {
    const cfg = window.HUMANO.config || {};
    const actionsLongues = cfg.ACTIONS_LONGUES || [];
    const actionsLecture = cfg.ACTIONS_LECTURE || [];
    const estLongue = actionsLongues.indexOf(action) !== -1;
    const delaiMs = (options && options.delaiMs) || (estLongue ? cfg.DELAI_LONG_MS : cfg.DELAI_MS) || 30000;
    const estLecture = actionsLecture.indexOf(action) !== -1;

    function tenter() {
      const controleur = new AbortController();
      const minuterie = setTimeout(function () {
        controleur.abort();
      }, delaiMs);

      if (options && options.signal) {
        if (options.signal.aborted) {
          controleur.abort();
        } else {
          options.signal.addEventListener('abort', function () {
            controleur.abort();
          }, { once: true });
        }
      }

      return executerRequete(action, donnees, controleur.signal).finally(function () {
        clearTimeout(minuterie);
      });
    }

    return tenter().catch(function (err) {
      if (estLecture && (err.code === 'RESEAU' || err.code === 'DELAI')) {
        return tenter();
      }
      throw err;
    });
  }

  window.HUMANO.api = Object.freeze({
    ErreurApi: ErreurApi,
    jetonCourant: jetonCourant,
    definirJeton: definirJeton,
    oublierJeton: oublierJeton,
    appeler: appeler
  });
})();
