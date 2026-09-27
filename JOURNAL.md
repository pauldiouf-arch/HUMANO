# JOURNAL HUMANO — 27/09/2026

Dernière mise à jour : 11:00

## Lots

| Commande | Fichiers | État (livré / validé / corrigé / abandonné) | Heure |
| :--- | :--- | :--- | :--- |
| EXECUTE S1-SERVEUR-A | Config.gs, Outils.gs, Stockage.gs, Auth.gs, Modeles.gs | validé | 09:45 |
| EXECUTE S1-SERVEUR-B | IA.gs, Postes.gs, Tests.gs, Candidat.gs, Rgpd.gs, Code.gs | validé | 10:30 |
| EXECUTE S2-COMMUN | css/styles.css, js/commun/config.js, js/commun/ui.js, js/commun/api.js | validé | 11:00 |

## Contrôles

- installer exécuté sans erreur : OK
- Classeur « HUMANO — données » avec 3 onglets (postes, tests, journal) au format texte brut et ligne systeme.installation présente : OK
- Déploiement application web (Moi, Tout le monde) : OK — version 1
- URL /exec ouverte dans le navigateur renvoie le JSON d'état : OK
- fetch systeme.etat depuis GitHub Pages renvoie initialise: false : OK
- fetch postes.lister sans jeton renvoie l'erreur NON_AUTORISE : OK
- Commande 3 (S2-COMMUN) : 4 fichiers livrés et déposés dans GitHub (css/styles.css, js/commun/config.js, js/commun/ui.js, js/commun/api.js) : OK
- Relecture syntaxe, 14 fonctions de HUMANO.ui, toutes les classes du §5.4, aucun motif interdit : OK
- URL_API de config.js renseignée avec l'adresse /exec : OK
- Onglet Actions GitHub : coche verte : OK
- styles.css et config.js s'ouvrent sur GitHub Pages (pas de 404) : OK

## Corrections effectuées

- 10:20 — serveur/Code.gs : correction de la constante ENTETES, formatage texte brut complet de chaque feuille avant écriture, nettoyage des feuilles superflues et englobement complet de traiterRequete sous try/catch → validé.

## Décisions (font foi)

- La fonction installer met toutes les cellules des 3 feuilles au format texte brut (setNumberFormat('@')) et fige la ligne d'en-tête, avant toute écriture.

## Écarts connus, à traiter à l'AUDIT

- Vérifier le calcul TOTP avec le vecteur du §4.5 (secret GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ, pas 1 → 287082) avant le sprint S4.

## Version du serveur qui fonctionne

- n° 1 (10:30)

## Prochaine commande

- EXECUTE S2-CONSOLE-A — à joindre : js/commun/config.js, js/commun/ui.js, js/commun/api.js (§7.3).

