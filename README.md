# VILLE ROUGE

Jeu PC jouable dans le navigateur : GTA 1 (conduite, open world, missions criminelles)
× Hotline Miami (ultra-violence, pixel art néon, combat corps-à-corps et armes à feu),
en 2D vue de dessus. 100 % procédural (aucun asset externe, aucune marque citée).

## Lancer le jeu

Ouvrir `index.html` directement dans le navigateur, ou :

```
cd ville-rouge
python3 -m http.server 8000
# puis http://localhost:8000
```

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches | déplacer (à pied) / conduire |
| Souris + clic | viser / attaquer |
| E | interagir : cabine de mission, porte de bâtiment, portière de voiture |
| Espace | frein à main |
| Clic en voiture | klaxon |
| C | mode CRT on/off (style Balatro, persisté) |
| M | muet |
| P / Échap | pause |
| R (mort) | recommencer |

## Contenu

- Ville en grille (routes, trottoirs, parcs, parkings) avec hôpital, commissariat, banque…
- Bâtiments pénétrables (intérieurs générés : murs, meubles, butin).
- Voitures génériques (berline, coupé, SUV, utilitaire, taxi, police) : vol, conduite, carambolages, explosions en chaîne.
- Trafic civil, piétons qui fuient, niveau de recherche (★) avec renforts policiers.
- 8 missions en intérieur : tuer tout le monde, récupérer un objet, sauver un otage, détruire un dispositif.
- Gore (sang persistant), hitstop, screen shake, HUD, minimap.
- Audio 100 % synthétisé (WebAudio) : tirs, explosions, sirènes, moteur, musique dark synthwave dont l'intensité suit le wanted.
- Mode CRT : scanlines + vignette + distorsion + flicker, toggle C.

## Tests

```
node test/smoke.js
```

Harnais headless (stubs DOM/canvas) : invariants de la carte, déplacements, collisions,
conduite, combat, explosions, spawns policiers, les 4 types de missions, toggle CRT, game over.

## Architecture

```
index.html         page + HUD + overlays (menu, game over, pause) + filtre SVG CRT
css/style.css      HUD néon + effet CRT (scanlines/vignette/flicker)
js/util.js         maths, collisions (rect, cercle, OBB/SAT), stockage
js/input.js        clavier (codes physiques : ZQSD = WASD) + souris
js/audio.js        SFX + musique synthétisés en WebAudio
js/world.js        génération de la ville, bâtiments, intérieurs, voitures garées
js/entities.js     Player, Ped, Enemy, Car (conduite + trafic + poursuite police)
js/missions.js     définitions des 8 missions + cabines téléphoniques
js/render.js       rendu 2D (pré-rendu de la carte, décalques de sang, minimap)
js/game.js         boucle de jeu, interactions, combat, wanted, missions, HUD
js/main.js         boot + boucle requestAnimationFrame
test/smoke.js      tests headless Node
```
