# The Binding of Claude

Un roguelite en pixel art façon 16/32 bits, à mi-chemin entre **The Binding of Isaac**
et **Hadès**. Tu incarnes Claude (la mascotte orange). Inquiet de le voir devenir de plus
en plus puissant, **Sam Altman** envoie bugs, hallucinations et spambots pour corrompre
son réseau. Claude doit descendre étage après étage… et l'affronter lui-même.

*Parodie humoristique : les personnages réels y sont caricaturés à des fins comiques.*

## Lancer le jeu

Aucune installation : ouvre simplement `index.html` dans un navigateur récent
(Chrome, Firefox, Edge, Safari).

Tu peux aussi le servir en local :

```bash
npx http-server .   # puis http://localhost:8080
```

## Commandes

| Action        | Clavier                    | Manette            |
|---------------|----------------------------|--------------------|
| Se déplacer   | ZQSD / WASD                | Stick gauche       |
| Tirer         | Flèches (diagonales OK)    | Stick droit / ABXY |
| Dash          | Espace / Maj               | LB / RB            |
| Artefact      | E                          | LT / RT            |
| Pause         | Échap / P                  | Start              |
| Couper le son | M                          |                    |

## Contenu de la v0.3

- **Intro narrative** (5 tableaux, texte animé, passable avec Échap)
- **Menu principal** : jouer, commandes, options (volumes, plein écran), revoir l'intro
- **Sélection du personnage** : Claude (les autres emplacements sont verrouillés)
- **3 étages générés procéduralement** (grille de salles façon Isaac) :
  1. *Le Dataset* : boss **Le Grand Bug**
  2. *La Ferme de Serveurs* : boss **L'Hallucinateur**
  3. *Le Cloud Latent* : boss final **Sam Altman** dans son mécha (2 phases :
     « Levée de fonds », « Scaling », « GPT-Spam », « Pivot », « Hype »… puis « Plan B : AGI »)
- **Salles au trésor** avec 18 objets liés à l'IA (GPU H100, Fenêtre de Contexte,
  Attention Is All You Need, Mixture of Experts, RLHF, Chain of Thought, Sous-Agent,
  Protocole MCP, Constitution…)
- **Boutique** (« API Store ») : objets, cœurs et clés contre des pièces ;
  verrouillée par une clé à partir de l'étage 2
- **Côté Hadès** : dash avec invulnérabilité, jauge d'**Artefact** (onde de choc
  qui efface les tirs ennemis), et après chaque boss un **choix de bénédiction
  parmi 3**
- **Ennemis** : bugs, mouches à tokens, slimes surajustés (qui se divisent),
  spambots, captchas-tourelles, hallucinations qui se téléportent
- Écran « VS » avant les boss, mini-carte, écran de game over et de victoire avec
  statistiques de la partie
- **Rendu « HD pixelisé » façon Isaac** (résolution interne 2x) : personnages et ennemis repeints avec contour épais et ombrage doux, portes en arche (bois, cadenas, crâne du boss), illustrations HD de l'intro,
  sols et murs texturés avec tramage, éclairage dynamique et lueurs additives
- **Menus** : sous-sol sombre, panneaux sombres ornés,
  avis de décès qui montre l'ennemi responsable
- Musique chiptune et effets sonores **synthétisés en direct** (WebAudio), sans
  aucun fichier audio

## Structure du code

```
index.html
css/style.css
js/
  engine/   util, police bitmap, sprites (pixel art en texte), input, audio
  game/     items & bénédictions, génération des étages, rendu des décors,
            projectiles/objets, joueur, ennemis, boss, scène de jeu
  scenes/   démarrage, intro, menu, options, personnages, game over, victoire
  main.js   boucle à pas fixe (60 Hz), gestion des scènes et mise à l'échelle
```

Tout le pixel art est défini dans le code (`js/engine/sprites.js` et les
fonctions de dessin des boss) : aucune image externe.
