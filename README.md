# HUMANO

**L'étape test du recrutement, vue autrement.**

Démo en ligne : https://pauldiouf-arch.github.io/HUMANO/
Console recruteur : https://pauldiouf-arch.github.io/HUMANO/console.html

## Le problème

Au Sénégal, un poste d'agent de comptoir, d'assistant financier ou de chargé de clientèle reçoit des centaines de CV qui se ressemblent. Les recruteurs, souvent seuls dans une PME ou une ONG, n'ont ni le temps ni les outils pour vérifier ce que le candidat sait réellement faire, en particulier face à un client en colère ou à une situation de crise. Les entretiens arrivent trop tard et coûtent cher. Les tests existants sont génériques, en anglais, et pensés pour d'autres marchés.

## Ce que fait HUMANO

1. **Le recruteur crée un poste en quelques minutes**, à partir de 7 modèles de métiers (fintech, finance d'ONG, logistique, service client…) ou d'une génération par IA. Il choisit les compétences techniques et humaines recherchées.
2. **Il partage un lien ou un QR code.** Le candidat passe le test sur son téléphone, sans compte ni application.
3. **Le candidat passe trois épreuves** : un QCM sur un document de travail réaliste (budget, facture, relevé…), des questions techniques ouvertes, puis une **mise en situation** : un client, un chef ou un partenaire joué par l'IA, avec un niveau de stress qui évolue selon ses réponses.
4. **Le recruteur reçoit un rapport** : une note indicative sur 20, l'analyse par compétence et par question, les points forts, les points de vigilance, l'historique de la conversation et les signaux d'intégrité (sorties de page, collages bloqués). Le rapport s'exporte en PDF.
5. **Le tableau de bord** regroupe les postes récents, les derniers tests et les notifications : un test à évaluer, un candidat qui a quitté la page, l'IA indisponible, des tentatives de connexion, un mot de passe oublié.

## Utilisation de l'IA (Gemini)

| Usage | Modèle | Pourquoi |
|---|---|---|
| Interlocuteur de la mise en situation | `gemini-3.5-flash-lite`, réflexion minimale | Réponses courtes et rapides, dialogue fluide |
| Secours de la simulation | `gemini-3.8-flash` | Prend le relais si le premier modèle ne répond pas en 12 s |
| Évaluation du test | `gemini-3.8-flash`, réflexion légère, secours `3.5-flash-lite` | Analyse structurée de tout le test |
| Génération d'épreuves pour un nouveau poste | `gemini-3.8-flash` | QCM, questions et scénario adaptés au métier |

- **Sorties structurées** : chaque appel impose un schéma JSON. La réponse est vérifiée côté serveur (bornes, libellés, longueurs) avant d'être enregistrée.
- **Résistance à la manipulation** : les réponses du candidat sont isolées entre balises et traitées comme des données, jamais comme des instructions. Une tentative de manipulation est relevée comme point de vigilance.
- **Temps de l'IA non décompté** : le temps d'attente de l'IA est rendu au candidat.
- **Coût** : l'offre gratuite de Gemini est suffisante, avec un plafond de 400 appels IA par jour dans l'application pour maîtriser les coûts.

## Fiabilité et modes de défaillance

| Défaillance | Réponse de HUMANO |
|---|---|
| Gemini lent ou muet | Délai de 12 s, puis modèle de secours |
| Les deux modèles en échec | Réplique de secours cohérente avec le personnage : le test n'est jamais bloqué. La réplique est marquée « non évaluée » dans le rapport. |
| JSON mal formé | Lecture tolérante (texte autour, balises Markdown), puis secours |
| Évaluation impossible à la fin du test | Test enregistré, bouton « Évaluer » dans le rapport, erreur visible dans les logs |
| Quota atteint | Message clair ; compteur journalier côté serveur |
| Requête bloquée | Plafond de 80 s par requête, file d'attente pour éviter les écritures concurrentes |
| Candidat qui ferme l'onglet | Reprise du test là où il en était |

**Tests réalisés** : scénarios automatisés de bout en bout sur la fonction serveur, avec une base et une IA simulées (création de poste, passation complète, évaluation, IA muette, IA lente, JSON cassé, libellés de compétences différents, réinitialisation du mot de passe, intégrité du journal), rendu des écrans dans un navigateur automatisé, puis tests réels sur téléphone.

## IA responsable et données

- **Consentement** explicite du candidat avant le test, avec une notice et une page [confidentialité et CGU](confidentialite.html).
- **Minimisation** : prénom et nom seulement ; pas d'e-mail, de photo, de biométrie ni de localisation.
- **Pseudonymisation** : le prénom et le nom sont remplacés avant l'envoi à l'IA pour l'évaluation.
- **Équité** : l'évaluation ignore le genre, l'âge, l'origine, la religion et le handicap, et ne pénalise ni l'orthographe ni les tournures locales, sauf si c'est la compétence recherchée.
- **Contrôle humain** : la note est indicative, à confirmer en entretien. Aucune décision automatique, et le candidat ne voit pas sa note.
- **Droits** : effacement d'un test, conservation limitée (180 jours par défaut, réglable de 30 à 365), purge, registre des traitements modifiable (RGPD et loi sénégalaise n° 2008-12).
- **Sécurité** :
  - mot de passe dérivé dans le navigateur (PBKDF2, 600 000 itérations) puis haché avec un poivre ;
  - identifiant, verrouillage après 5 échecs, second facteur TOTP, code de secours à usage unique ;
  - sessions révocables ;
  - politique de sécurité du contenu (CSP) stricte avec Trusted Types ;
  - journal d'audit chaîné SHA-256, avec une vérification d'intégrité en un clic ;
  - clés secrètes uniquement côté serveur, jamais dans le navigateur ni dans le dépôt.
- **Contenus** : entreprises, personnes et situations des épreuves fictives, sans stéréotypes.

## Architecture

- **Front** : HTML, CSS et JavaScript sans framework, hébergés sur GitHub Pages.
- **Serveur** : une Edge Function Supabase (Deno, TypeScript) qui porte toute la logique, et une base Postgres avec la sécurité au niveau des lignes (RLS) activée, sans accès public.
- **IA** : API Gemini appelée uniquement depuis le serveur.

## Limites connues (prototype)

- Un seul compte recruteur ; pas d'envoi d'e-mails (partage par lien, QR code ou WhatsApp).
- Offre gratuite de Gemini : en production, il faudra une offre payante pour la confidentialité des données.
- Le second facteur doit encore être validé sur un vecteur de test avant son activation en production.

## Déclaration d'utilisation de l'IA

Le code a été produit le jour du hackathon avec Gemini. Claude (Anthropic) a servi de relecteur et de testeur, et a écrit :
- le portage du serveur vers Supabase ;
- la page de confidentialité ;
- l'écran d'administration et le tableau de bord ;
- le design de l'interface ;
- la fiabilisation des appels IA (simulation et évaluation) et des correctifs du front.

Gemini est aussi le moteur IA de l'application.
