# JOURNAL HUMANO — 27/09/2026

Dernière mise à jour : 15:50

## Lots

| Commande | Fichiers | État (livré / validé / corrigé / abandonné) | Heure |
| :--- | :--- | :--- | :--- |
| EXECUTE S1-SERVEUR-A | serveur/Config.gs, Outils.gs, Stockage.gs, Auth.gs, Modeles.gs | abandonné (remplacé par Supabase) | 09:45 |
| EXECUTE S1-SERVEUR-B | serveur/IA.gs, Postes.gs, Tests.gs, Candidat.gs, Rgpd.gs, Code.gs | abandonné (remplacé par Supabase) | 10:30 |
| EXECUTE S2-COMMUN | css/styles.css, js/commun/config.js, js/commun/ui.js, js/commun/api.js | validé | 11:00 |
| EXECUTE S2-CONSOLE-A | console.html, js/console/main.js, js/console/auth.js, js/console/postes.js | corrigé, validé | 12:50 |
| PORTAGE-SUPABASE | supabase/schema.sql, supabase/functions/api/index.ts | corrigé, déployé, validé | 12:45 |
| EXECUTE S3-CANDIDAT | index.html, js/candidat/anticheat.js, js/candidat/candidat.js | corrigé, validé | 13:30 |
| EXECUTE S3-RAPPORT | js/console/tests.js | validé | 13:55 |
| FIABILITE-IA | supabase/functions/api/index.ts | corrigé, déployé, validé | 14:15 |
| S4-ADMIN (écrit par Claude) | js/console/admin.js | validé | 14:30 |
| DESIGN + TABLEAU DE BORD (Claude) | css/styles.css, img/logo.svg, img/favicon.svg, js/console/accueil.js, auth.js, main.js, index.html, console.html, candidat.js | validé | 14:45 |
| MOT DE PASSE OUBLIÉ + REGISTRE RGPD (Claude) | index.ts, auth.js, admin.js | livré | 15:00 |
| README + PRÉSENTATION + VIDÉO | README.md, présentation Kawasaki 10 diapositives, vidéo 89 s | livré | 15:45 |

## Contrôles

- Commande 3 : 4 fichiers déposés, syntaxe correcte, 14 fonctions de HUMANO.ui, toutes les classes du §5.4, aucun motif interdit : OK
- Supabase : 4 tables créées (postes, tests, journal, proprietes), RLS activé sans politique : OK
- Supabase : fonction « api » déployée, « Verify JWT » désactivé : OK
- fetch systeme.etat vers https://adkbmydcdkcdemmvzdiw.supabase.co/functions/v1/api depuis GitHub Pages : ok:true, initialise:false, en moins d'une seconde : OK
- Test automatisé de la fonction (base simulée) : initialiser, prelogin, échec de connexion compté, connexion, 7 modèles, depuisModele, enregistrer (4 modèles), obtenir, ouvrir (lien #/jetonPoste), lister, candidat.ouvrir, demarrer, qcm, questions, signaler (+20), tests.lister, journal intègre, requêtes simultanées : OK
- Console : création du mot de passe, connexion, poste créé depuis le modèle Fintech (15 min), enregistré, ouvert, QR code affiché, lien scanné sur téléphone : OK (la page candidat n'existe pas encore)

## Corrections effectuées

- 15:20 — js/candidat/candidat.js : le message d'ouverture de l'interlocuteur s'affiche désormais après le QCM et les questions.
- 15:00 — index.ts : règle d'équité ajoutée au prompt d'évaluation.

- 13:20 — confidentialite.html : politique de confidentialité et CGU ; lien depuis la notice du candidat → validé.
- 13:25 — js/candidat/candidat.js : temps de réponse de l'IA non décompté, chrono relancé à chaque changement de fin prévue → validé.
- 13:30 — js/console/postes.js : retour visuel « Lien copié » → validé.
- 14:05 — index.ts, simulation : délai de 12 s par appel, modèle de secours gemini-3.8-flash, réplique de secours dans le rôle si l'IA ne répond pas (signalée « non évaluée » dans le rapport), lecture tolérante du JSON, historique limité aux 10 derniers messages → validé.
- 14:15 — index.ts, évaluation : délai de 50 s, modèle de secours gemini-3.5-flash-lite, reconnaissance souple des libellés de compétences, erreurs journalisées dans les Logs → validé.

- 10:20 — serveur/Code.gs : en-têtes ENTETES, format texte brut, feuilles superflues, traiterRequete sous try/catch → validé (Apps Script, abandonné depuis).
- 11:25 — js/console/main.js : délai d'inactivité (NaN → déconnexion immédiate) ; inactiviteMin du serveur, 30 min par défaut → validé.
- 11:25 — js/console/postes.js : « Partir d'un modèle » chargeait toujours le premier modèle ; liste déroulante + bouton « Charger ce modèle » → validé.
- 11:40 — serveur/Stockage.gs : trouver renvoyait la ligne brute au lieu de l'objet JSON → corrigé (repris dans le portage).
- 11:52 — serveur/Outils.gs : Valider accepte le nom du champ en 2e argument (texte, entier, liste, identifiant) → corrigé (repris dans le portage).
- 12:02 — serveur/Stockage.gs et Auth.gs : optimisations → insuffisantes (2 à 4 s par requête avec Apps Script).
- 12:40 — supabase/schema.sql : colonnes camelCase entre guillemets ("creeLe", "majLe", "posteId", "finPrevue", "jetonHash"), balises Markdown retirées → validé.
- 12:40 — supabase/functions/api/index.ts : balises Markdown retirées ; enregistrement en base aussi en cas d'erreur métier (échecs de connexion, clôture d'un test expiré) ; requêtes traitées une par une (file d'attente) ; chargement parallèle des 4 tables → validé.
- 12:45 — js/commun/config.js : URL_API = https://adkbmydcdkcdemmvzdiw.supabase.co/functions/v1/api ; console.html : connect-src = https://adkbmydcdkcdemmvzdiw.supabase.co → validé.

## Décisions (font foi)

- Le serveur est l'Edge Function Supabase « api » : https://adkbmydcdkcdemmvzdiw.supabase.co/functions/v1/api. Les fichiers serveur/*.gs ne sont plus utilisés. Le protocole (§4.2), les actions (§4.4) et les messages d'erreur sont inchangés.
- Toute page web doit avoir dans sa CSP : connect-src https://adkbmydcdkcdemmvzdiw.supabase.co (au lieu des adresses script.google.com du §3.3).
- Les propriétés du script sont dans la table proprietes (cle, valeur). La clé Gemini y est enregistrée sous CLE_GEMINI.
- Pas d'e-mails (prototype) : postes.inviter renvoie { envoye: false } ; invitation et notification de fin de test sont seulement journalisées. Le partage se fait par QR code, lien copié ou WhatsApp.
- Pas de tâches planifiées : la fermeture des tests dont le temps est dépassé se fait au début de postes.lister, tests.lister et tests.obtenir ; l'évaluation se fait à « Terminer » ou par le bouton « Évaluer » du rapport.
- Durée d'un test : 10 à 180 minutes ; réponse à une question technique : 5 000 caractères au maximum.
- Le code de la transplantation vers Supabase et ses corrections, la page confidentialite.html, les correctifs du front et la fiabilisation de l'IA (simulation et évaluation) ont été produits avec l'aide de Claude (y compris js/console/admin.js) (à mentionner dans la déclaration d'utilisation de l'IA).
- Export PDF du rapport : par l'impression du navigateur (« Enregistrer au format PDF »), sans bibliothèque ni service tiers.
- Administration : 4 onglets (Sécurité, Journal d'audit, RGPD, Paramètres). La clé Gemini n'est jamais saisie ni affichée dans le navigateur : elle se gère uniquement dans Supabase (table proprietes) ; l'onglet Paramètres indique seulement si le service est configuré.
- Le second facteur TOTP n'est pas activé sur le compte de démo tant que le calcul n'est pas vérifié.

## Écarts connus, à traiter à l'AUDIT

- Vérifier le calcul TOTP avec le vecteur du §4.5 (secret GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ, pas 1 → 287082) avant l'activation du second facteur (S4-ADMIN).
- Commentaires présents dans js/console/postes.js et auth.js (interdits par le §2.4) : à retirer.
- Les messages d'erreur s'affichent en haut de page : penser à faire défiler vers le message.

## Version du serveur qui fonctionne

- Edge Function Supabase « api », version fiabilisée IA (14:15).

## Prochaine commande

- Soumission du formulaire avant 16:30 (heure de Dakar). Code gelé.
