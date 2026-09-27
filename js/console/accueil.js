(function () {
  'use strict';

  const H = window.HUMANO;

  const STATUTS_POSTE = { brouillon: 'Brouillon', ouvert: 'Ouvert', ferme: 'Fermé', archive: 'Archivé' };
  const STATUTS_TEST = { en_cours: 'En cours', termine: 'À évaluer', evalue: 'Évalué', expire: 'Expiré', abandonne: 'Abandonné' };
  const NIVEAUX = { action: 'À traiter', vigilance: 'Vigilance', info: 'Information' };

  function el(balise, attributs, enfants) {
    return H.ui.creer(balise, attributs || {}, enfants || []);
  }

  function lien(href, texte, classe) {
    return el('a', { href: href, classe: classe || '', texte: texte });
  }

  function tuile(valeur, libelle, href, accent) {
    const a = el('a', { href: href, classe: 'tuile' + (accent ? ' tuile-accent' : '') });
    a.appendChild(el('span', { classe: 'tuile-valeur', texte: String(valeur) }));
    a.appendChild(el('span', { classe: 'tuile-libelle', texte: libelle }));
    return a;
  }

  function salutation(nom) {
    const h = new Date().getHours();
    const mot = h < 18 ? 'Bonjour' : 'Bonsoir';
    return nom ? mot + ', ' + nom : mot;
  }

  function majPastille(nombre) {
    const p = document.getElementById('pastille-alertes');
    if (!p) return;
    p.textContent = String(nombre);
    p.hidden = nombre === 0;
    p.setAttribute('aria-label', nombre + ' alerte(s) à traiter');
  }

  async function afficher() {
    H.ui.afficherEcran('ecran-accueil', 'Tableau de bord');
    const conteneur = document.getElementById('conteneur-accueil');
    H.ui.vider(conteneur);
    conteneur.appendChild(el('p', { classe: 'attente', texte: 'Chargement' }));

    let d;
    try {
      d = await H.api.appeler('tableau.bord', null);
    } catch (err) {
      H.ui.vider(conteneur);
      H.ui.afficherMessage((err && err.message) || 'Tableau de bord indisponible.', 'erreur');
      return;
    }
    H.ui.vider(conteneur);

    if (d.nom) {
      try {
        window.sessionStorage.setItem('humano.nom', d.nom);
      } catch (e) {
        // Stockage indisponible
      }
      const zoneNom = document.getElementById('nav-utilisateur');
      if (zoneNom) zoneNom.textContent = d.nom;
    }

    const titre = document.getElementById('titre-accueil');
    if (titre) titre.textContent = salutation(d.nom);

    const intro = el('div', { classe: 'accueil-intro' });
    intro.appendChild(el('p', {
      classe: 'aide',
      texte: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()) + ' — voici où en sont vos recrutements.'
    }));
    const actions = el('div', { classe: 'actions' });
    actions.appendChild(lien('#/postes/nouveau', 'Créer un poste', 'bouton-principal'));
    actions.appendChild(lien('#/postes', 'Tous les postes', 'bouton'));
    intro.appendChild(actions);
    conteneur.appendChild(intro);

    const c = d.compteurs;
    const tuiles = el('div', { classe: 'tuiles' });
    tuiles.appendChild(tuile(c.postesOuverts, 'poste(s) ouvert(s)', '#/postes'));
    tuiles.appendChild(tuile(c.testsEnCours, 'test(s) en cours', '#/postes'));
    tuiles.appendChild(tuile(c.aEvaluer, 'test(s) à évaluer', '#/postes', c.aEvaluer > 0));
    tuiles.appendChild(tuile(c.evalues, 'rapport(s) prêt(s)', '#/postes'));
    conteneur.appendChild(tuiles);

    const grille = el('div', { classe: 'grille-2' });

    const cartePostes = el('section', { classe: 'carte' });
    cartePostes.appendChild(el('h2', { texte: 'Postes récents' }));
    if (d.postesRecents.length === 0) {
      cartePostes.appendChild(el('p', { classe: 'aide', texte: 'Aucun poste pour l\'instant. Commencez par en créer un à partir d\'un modèle.' }));
    } else {
      const ul = el('ul', { classe: 'liste-acces' });
      d.postesRecents.forEach(function (p) {
        const a = el('a', { href: '#/postes/' + p.id, classe: 'acces' });
        a.appendChild(el('span', { classe: 'acces-titre', texte: p.intitule }));
        a.appendChild(el('span', { classe: 'acces-detail', texte: p.nbTests + ' test(s), ' + p.nbEvalues + ' évalué(s) — ' + H.ui.formaterDate(p.majLe) }));
        a.appendChild(el('span', { classe: 'etiquette-statut statut-' + p.statut, texte: STATUTS_POSTE[p.statut] || p.statut }));
        ul.appendChild(el('li', {}, [a]));
      });
      cartePostes.appendChild(ul);
    }
    grille.appendChild(cartePostes);

    const carteAlertes = el('section', { classe: 'carte', 'aria-labelledby': 'titre-alertes' });
    carteAlertes.appendChild(el('h2', { id: 'titre-alertes', texte: 'Notifications' }));
    const importantes = d.alertes.filter(function (a) { return a.niveau !== 'info'; }).length;
    majPastille(importantes);
    if (d.alertes.length === 0) {
      carteAlertes.appendChild(el('p', { classe: 'aide', texte: 'Rien à signaler.' }));
    } else {
      const ul = el('ul', { classe: 'liste-alertes' });
      d.alertes.forEach(function (a) {
        const li = el('li', { classe: 'alerte alerte-' + a.niveau });
        li.appendChild(el('span', { classe: 'alerte-niveau', texte: NIVEAUX[a.niveau] || a.niveau }));
        const corps = el('a', { href: a.lien, classe: 'alerte-texte', texte: a.texte });
        li.appendChild(corps);
        if (a.date) li.appendChild(el('span', { classe: 'alerte-date', texte: H.ui.formaterDate(a.date) }));
        ul.appendChild(li);
      });
      carteAlertes.appendChild(ul);
    }
    grille.appendChild(carteAlertes);
    conteneur.appendChild(grille);

    const carteTests = el('section', { classe: 'carte' });
    carteTests.appendChild(el('h2', { texte: 'Derniers tests' }));
    if (d.testsRecents.length === 0) {
      carteTests.appendChild(el('p', { classe: 'aide', texte: 'Aucun candidat n\'a encore passé de test. Partagez le lien ou le QR code d\'un poste ouvert.' }));
    } else {
      const ul = el('ul', { classe: 'liste-acces' });
      d.testsRecents.forEach(function (t) {
        const a = el('a', { href: '#/tests/' + t.id, classe: 'acces' });
        a.appendChild(el('span', { classe: 'acces-titre', texte: t.candidat }));
        a.appendChild(el('span', { classe: 'acces-detail', texte: t.poste + ' — ' + H.ui.formaterDate(t.debut) }));
        a.appendChild(el('span', { classe: 'etiquette-statut test-' + t.statut, texte: t.note !== null && t.note !== undefined ? t.note + ' / 20' : (STATUTS_TEST[t.statut] || t.statut) }));
        ul.appendChild(el('li', {}, [a]));
      });
      carteTests.appendChild(ul);
    }
    conteneur.appendChild(carteTests);

    const carteRaccourcis = el('section', { classe: 'carte' });
    carteRaccourcis.appendChild(el('h2', { texte: 'Administration' }));
    const raccourcis = el('div', { classe: 'raccourcis' });
    [['#/admin/journal', 'Journal d\'audit', 'Vérifier l\'intégrité, exporter'], ['#/admin/securite', 'Sécurité', 'Mot de passe, second facteur, sessions'], ['#/admin/rgpd', 'RGPD', 'Conservation, purge, registre'], ['#/admin/parametres', 'Paramètres', 'Adresse du site, notifications']].forEach(function (r) {
      const a = el('a', { href: r[0], classe: 'raccourci' });
      a.appendChild(el('span', { classe: 'acces-titre', texte: r[1] }));
      a.appendChild(el('span', { classe: 'acces-detail', texte: r[2] }));
      raccourcis.appendChild(a);
    });
    carteRaccourcis.appendChild(raccourcis);
    conteneur.appendChild(carteRaccourcis);
  }

  H.accueil = Object.freeze({ afficher: afficher });
})();
