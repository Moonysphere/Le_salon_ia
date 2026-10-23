# Mini-projet — Le Salon

Un salon de discussion déjà fonctionnel, auquel vous ajoutez un participant « ia ».

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `server.ts` | Le serveur du salon : pseudo, messages, présence et diffusion à tous sont déjà écrits. C'est ici que vit l'IA. | 6 zones, par niveaux : contexte, file, pump, answer, /stop, /resume | `npm run projet, puis http://localhost:3000 dans deux onglets` |
| `public/index.html` | La page du salon, complète : elle affiche déjà les messages de l'IA (ia_start, ia_delta, ia_done), la file d'attente et la synthèse. | Rien : fournie complète | ouverte par le navigateur |
| `../tp3/llm.ts` | Votre client du TP 3 (ou son corrigé) : chatStream() pour la réponse en flux, limiter pour partager le débit de la clé. | Rien de plus : il doit simplement fonctionner | — |

**Comment ils s'enchaînent.** Un message « @ia » arrive dans server.ts → mis en file → answer() appelle chatStream() de llm.ts → chaque morceau est diffusé à tous les onglets.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.




# Le Salon — Chat collaboratif avec assistant IA

## Présentation

**Le Salon** est un mini-projet de discussion de groupe en temps réel, développé avec **Node.js**, **TypeScript** et **WebSocket**. Les participants rejoignent le salon avec un pseudo, échangent des messages et peuvent interpeller un assistant IA avec `@ia`.

Le projet a été enrichi pour gérer les réponses IA en streaming, une file d'attente partagée, la génération de synthèses et plusieurs commandes de gestion du salon. L'interface a également été modernisée.

## Fonctionnalités

### Salon WebSocket
- Connexion avec un pseudo et affichage des participants présents.
- Diffusion des messages à tous les clients connectés.
- Historique en mémoire, limité à **200 messages** côté serveur.
- Reconnexion automatique côté navigateur.

### N1 — Assistant IA en streaming
- Une mention `@ia` déclenche une demande à l'assistant.
- La réponse est envoyée progressivement (`ia_start`, `ia_delta`, `ia_done`) et visible par tous les participants.
- Les derniers messages du salon servent de contexte à la réponse.

### N2 — File d'attente et interruption
- Les demandes IA sont placées dans une **file commune** et traitées une par une.
- Un délai de **10 secondes** entre deux sollicitations `@ia` d'un même pseudo limite les abus.
- `/stop` interrompt la réponse en cours lorsque la commande vient du pseudo demandeur.
- `/cancel` retire la première demande en attente du pseudo concerné.
- Le nombre de demandes en attente est affiché dans l'interface.

### N3 — Synthèse structurée
- `/resume` demande à l'IA une synthèse de la conversation.
- La réponse suit un schéma **Zod** avec trois catégories : **sujets**, **décisions** et **actions** (personne et tâche).
- Les messages du salon sont encadrés comme des données non fiables afin de limiter les risques d'injection d'instructions.

## Nouvelles commandes

| Commande | Utilité |
|---|---|
| `@ia <question>` | Interpeller l'assistant IA |
| `/help` | Afficher l'aide et les commandes |
| `/users` | Lister les utilisateurs connectés |
| `/history` | Consulter les 10 derniers messages |
| `/status` | Afficher l'état de l'IA et du limiteur |
| `/queue` | Consulter la file d'attente IA |
| `/cancel` | Annuler sa demande IA en attente |
| `/stop` | Interrompre sa réponse IA en cours |
| `/resume` | Générer une synthèse du salon |
| `/clear` | Vider l'historique côté serveur |

Les commandes d'information (`/help`, `/users`, `/history`, `/status`, `/queue`) répondent uniquement à leur demandeur dans la version corrigée du serveur.

> **Attention :** `/clear` vide l'historique conservé par le serveur, mais ne retire pas les messages déjà affichés dans les navigateurs. Les données sont conservées uniquement en mémoire et disparaissent au redémarrage.

## Améliorations de l'interface

Le fichier `projet/public/index.html` a été retravaillé :

- Nouveau **bandeau de commandes en bas de page** avec des raccourcis cliquables.
- Fenêtre d'aide `/help`, organisée par catégories.
- Affichage plus lisible des informations de commande sous forme de cartes.
- Indicateurs de connexion et de file d'attente IA.
- Boutons distincts pour les actions sensibles (`/stop`, `/clear`).
- Confirmation avant la commande `/clear` depuis le bouton d'interface.
- Mise en page adaptée aux petits écrans.

Les boutons utilisent la connexion WebSocket existante : aucune API HTTP supplémentaire n'est nécessaire pour envoyer les commandes.

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `projet/server.ts` | Serveur HTTP/WebSocket, commandes, file d'attente, streaming et synthèse |
| `projet/public/index.html` | Interface du salon, affichage des événements et bandeau de raccourcis |
| `tp3/llm.ts` | Appels au modèle, streaming, limitation du débit et gestion des tentatives |
| `tp2/sse.ts` | Lecture des événements SSE renvoyés par l'API du modèle |
| `src/config.ts` | Configuration du modèle et des identifiants d'accès |

## Technologies

- **Node.js / TypeScript** — logique serveur.
- **`ws`** — communication WebSocket en temps réel.
- **Zod** — validation des messages et des synthèses.
- **API LLM compatible Chat Completions** — génération des réponses streamées.
- **SDK OpenAI** — synthèse structurée via `responses.parse`.
- **HTML, CSS et JavaScript natif** — interface, sans framework frontend.

## Démarrage

Depuis la racine du projet :

```bash
npm install
npm run projet
```

Ouvrir ensuite **http://localhost:3000** dans deux onglets, choisir un pseudo différent dans chaque onglet, puis envoyer :

```text
@ia Bonjour, peux-tu résumer le rôle de ce salon ?
```

La configuration de l'API LLM et la clé d'accès doivent être renseignées selon les paramètres attendus par `src/config.ts`.

## Scénario de démonstration

1. Ouvrir deux onglets et rejoindre le salon avec deux pseudos.
2. Envoyer des messages classiques pour vérifier la diffusion en temps réel.
3. Envoyer `@ia` pour observer la réponse diffusée progressivement.
4. Soumettre une seconde question depuis l'autre onglet et consulter `/queue`.
5. Tester `/status`, `/users` et `/history` depuis le bandeau inférieur.
6. Utiliser `/stop` ou `/cancel` selon l'état de la demande.
7. Terminer avec `/resume` pour obtenir les sujets, décisions et actions.

## Bilan

Les évolutions transforment le chat initial en **salon collaboratif assisté par IA** : les utilisateurs disposent de commandes de pilotage, les réponses sont diffusées en temps réel, les demandes IA sont organisées dans une file partagée et l'historique peut être synthétisé de manière structurée.

*Ce README décrit les fonctionnalités présentes dans les versions de `server.ts` et `index.html` préparées pour le projet. Il ne constitue pas un compte rendu de tests d'exécution complets.*
