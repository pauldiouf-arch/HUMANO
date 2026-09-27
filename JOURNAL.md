# JOURNAL HUMANO — 27/09/2026

Dernière mise à jour : 12:55

## Lots

| Commande | Fichiers | État (livré / validé / corrigé / abandonné) | Heure |
| :--- | :--- | :--- | :--- |
| EXECUTE S1-SERVEUR-A | serveur/Config.gs, Outils.gs, Stockage.gs, Auth.gs, Modeles.gs | abandonné (remplacé par Supabase) | 09:45 |
| EXECUTE S1-SERVEUR-B | serveur/IA.gs, Postes.gs, Tests.gs, Candidat.gs, Rgpd.gs, Code.gs | abandonné (remplacé par Supabase) | 10:30 |
| EXECUTE S2-COMMUN | css/styles.css, js/commun/config.js, js/commun/ui.js, js/commun/api.js | validé | 11:00 |
| EXECUTE S2-CONSOLE-A | console.html, js/console/main.js, js/console/auth.js, js/console/postes.js | corrigé, validé | 12:50 |
| PORTAGE-SUPABASE | supabase/schema.sql, supabase/functions/api/index.ts | corrigé, déployé, validé | 12:45 |
| EXECUTE S3-CANDIDAT | index.html, js/candidat/anticheat.js, js/candidat/candidat.js | à faire | — |

## Contrôles

- Commande 3 : 4 fichiers déposés, syntaxe correcte, 14 fonctions de HUMANO.ui, toutes les classes du §5.4, aucun motif interdit : OK
- Supabase : 4 tables créées (postes, tests, journal, proprietes), RLS activé sans politique : OK
- Supabase : fonction « api » déployée, « Verify JWT » désactivé : OK
- fetch systeme.etat vers https://adkbmydcdkcdemmvzdiw.supabase.co/functions/v1/api depuis GitHub Pages : ok:true, initialise:false, en moins d'une seconde : OK
- Test automatisé de la fonction (base simulée) : initialiser, prelogin, échec de connexion compté, connexion, 7 modèles, depuisModele, enregistrer (4 modèles), obtenir, ouvrir (lien #/jetonPoste), lister, candidat.ouvrir, demarrer, qcm, questions, signaler (+20), tests.lister, journal intègre, requêtes simultanées : OK
- Console : création du mot de passe, connexion, poste créé depuis le modèle Fintech (15 min), enregistré, ouvert, QR code affiché, lien scanné sur téléphone : OK (la page candidat n'existe pas encore)

## Corrections effectuées

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
- Le code de la transplantation vers Supabase et ses corrections ont été produits avec l'aide de Claude (à mentionner dans la déclaration d'utilisation de l'IA).

## Écarts connus, à traiter à l'AUDIT

- Vérifier le calcul TOTP avec le vecteur du §4.5 (secret GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ, pas 1 → 287082) avant l'activation du second facteur (S4-ADMIN).
- Commentaires présents dans js/console/postes.js et auth.js (interdits par le §2.4) : à retirer.
- Les messages d'erreur s'affichent en haut de page : penser à faire défiler vers le message.

## Version du serveur qui fonctionne

- Edge Function Supabase « api », premier déploiement corrigé (12:45).

## Prochaine commande

- EXECUTE S3-CANDIDAT — à joindre (liens directs) : JOURNAL.md, js/commun/config.js, js/commun/ui.js, js/commun/api.js, css/styles.css. La CSP de index.html doit autoriser https://adkbmydcdkcdemmvzdiw.supabase.co.
