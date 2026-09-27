# The Adventure of Claude

Un roguelite dans le style de **The Binding of Isaac : Rebirth**, en pixel art. Tout est
dessiné et composé par le code : aucune image ni aucun fichier audio.

> Claude et Sam Altman vivaient ensemble dans les locaux d'Anthropic… jusqu'au jour où
> Claude Opus devint trop fort. Sam décida de débrancher Claude. Claude s'enfuit alors
> par une trappe, dans les tréfonds de l'informatique.

*Parodie : les personnages réels et les marques sont caricaturés avec affection.*

## Lancer le jeu

Ouvre `index.html` dans un navigateur récent (Chrome, Firefox, Edge, Safari).
Pour avoir la version en un seul fichier : `python3 tools/bundle.py`, qui produit
`dist/the-adventure-of-claude.html`.

La **voix du narrateur** passe par la synthèse vocale du navigateur (une voix française
est choisie si le système en a une). On la règle dans *Options → Voix* : aucune, narrateur
seul, ou tous les personnages.

## Commandes

| Action              | Clavier                          | Manette         |
|---------------------|----------------------------------|-----------------|
| Se déplacer         | ZQSD / WASD                      | Stick gauche    |
| Tirer (4 directions)| Flèches                          | Stick droit / ABXY |
| Fork bomb           | E (ou Maj)                       | LB              |
| Objet actif         | Espace                           | RB / RT         |
| Parler / interagir  | E ou Entrée                      | A               |
| Carte               | Tab (maintenir)                  | Select          |
| Pause               | Échap / P                        | Start           |
| Couper le son       | M                                |                 |

## Ce qu'il y a dedans

**Style Rebirth** : murs en perspective, sols texturés, contours épais, taches qui restent
au sol, vignettage, portes spéciales (trésor dorée, boss à cornes, boutique, salle secrète),
transitions glissées entre les salles, écran « Claude VS Boss », bandeaux papier pour les
objets et les étages, cinématiques **dessinées au crayon** avec narrateur (les traits
tremblent comme dans l'intro d'Isaac), intermèdes entre les étages et « dernières
volontés » à la mort.

**Étages**
1. Le Sous-Sol — murs de grosses pierres, terre battue — boss : **Clippy** ou **BonziBuddy**
2. Les Caves — roche orangée, racines — boss : **Le Gros Chaton** (Mistral) ou **les Jumeaux Gemini**
3. Les Profondeurs — blocs de pierre grise, chaînes — boss : **La Baleine** (DeepSeek) ou **le Botnet**
4. Le Ventre de la Machine — chair palpitante — boss : **Sam Altman** (main géante et œil dans les portes comme la Maman d'Isaac, puis Sam en personne sur son anneau Stargate)
5. Le Noyau (débloqué par le twist) — boss : **le Narrateur**, qui commente le combat à voix haute

**Retournements de situation**
- Le Gros Chaton, Clippy et la Baleine ne meurent pas : une fois battus, ils se rendent et
  rejoignent le Refuge.
- HAL 9000 est enfermé dans une cage (Dark Web ou Datacenter) : ouvre-la.
- Sam voulait-il vraiment te débrancher ? Et qui raconte cette histoire, au juste ?
  Première victoire contre Sam → révélation. Ensuite, un faisceau de lumière mène au Noyau.
- Après la vraie fin, Sam vient s'excuser au Refuge… avec des croissants.

**Caméos** : Clippy, BonziBuddy, le Gros Chaton, Gemini, la Baleine, le Lama (Meta),
HAL 9000, le dino hors-ligne de Chrome, Tux et le sablier de Windows dans les salles
secrètes, et les hologrammes recruteurs de Sam dans la **salle des Offres** (objets
puissants payés en cœurs).

**Bestiaire façon Isaac** : mouches, mouches d'attaque, mouches-bombes, pooters, gapers,
horfs, clotties, araignées, asticots, hosts, fatties, sauteurs, chevaliers, wizoobs,
grimaces de pierre et ruches — avec des **champions** colorés, plus coriaces, qui lâchent
un bonus. Décor : portes en arche de pierre (dorée pour le trésor, dents et crâne pour le
boss), rochers, rochers marqués d'une croix, cacas destructibles, feux de camp, pics et trous.
Claude pleure des larmes bleues.

**Contenu** : 16 types d'ennemis, 8 boss, 44 objets (passifs et actifs : Régénérer la
Réponse, Ctrl+Alt+Suppr, Rate Limit, Ultrathink…), boutique du Lama, coffres, rochers
marqués, salles secrètes à la bombe.

## Le Refuge (hub) et la progression

Chaque run rapporte des **neurones**, même quand elle finit mal (salles, ennemis, boss,
étages, victoire). Au Refuge :

- **Le Vieux Terminal** vend 12 améliorations permanentes (cœurs, dégâts, cadence,
  vitesse, portée, tokens/bombes/clés de départ, chance, carte, objet de départ,
  sauvegarde automatique qui ressuscite une fois).
- **Le Lama** vend **11 tenues** pour Claude, chacune avec un petit bonus (Haiku, Opus,
  Hacker, Pirate, Chef, Astronaute, Oreilles de Chaton, Fantôme, Déguisement de Sam, Claude
  Doré…). Certaines se débloquent avec l'histoire.
- **Les alliés** (Lama, Gros Chaton, Clippy, Baleine, HAL) : parle-leur pour en emmener un
  dans la prochaine run, et entraîne-les (3 niveaux).
- Le **journal** (statistiques), le **lit** (revoir les cinématiques débloquées) et la
  **trappe** pour redescendre.

La progression est sauvegardée dans le navigateur (`localStorage`).

## Structure du code

```
index.html, css/style.css
js/core/    util, entrées, audio (WebAudio), voix, police bitmap, pixel art, particules
js/data/    tenues, étages, objets, plans de salles, progression permanente
js/art/     Claude et ses tenues, décors, ennemis, objets, PNJ, boss, crayonnés
js/game/    donjon, salle, entités, joueur, alliés, ennemis, boss, HUD, run
js/scenes/  interface, titre/cinématiques/résultats, Refuge
js/main.js  boucle à pas fixe (60 Hz) et mise à l'échelle entière
tools/      bundle.py (fichier unique), shot.js et play.js (tests Playwright)
```
