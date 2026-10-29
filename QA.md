# Jump-1 — vérifications et limites de livraison

Ce document distingue les preuves du jeu solo, les tests de transport, la
production artistique et le lot sonore livré. Il ne constitue pas
une publication sur LOB7. Les preuves de travail sous `.local/` sont locales et
exclues du paquet publié ; leurs chemins sont des références de livraison au
propriétaire, pas des ressources chargées par le jeu.

## Tests automatisés

Commande exécutée sur Node.js 24 :

```sh
node tests/run.mjs
```

Résultat après les correctifs du moteur et l'ajout du lot audio réel :
**60 tests réussis, aucun échec**. La commande a été relancée pour ce point
de contrôle : 57 tests au gel du moteur, deux contrôles supplémentaires des fichiers Suno livrés et une régression sur les redessins de la carte PNG.
La suite couvre notamment :

- Le déterminisme, le rejeu, les actes refusés, les sauvegardes et leurs options
  normalisées ; 1 000 personnages et 1 000 sous-secteurs.
- La stabilité des offres après réservation, l'absence de bonus d'un courtier
  indisponible, les rencontres avec une banque sans impayé, les membres débarqués,
  les liens d'une nouvelle recrue et la possibilité de vaincre le croiseur.
- Les prix, les capacités de cale, les échéances, la poursuite, les scènes et
  les durées distinctes du port, du saut et de l'escale rapide.
- Le redessin répété de la carte de fin avec un contexte canvas préalablement transformé ou aligné à droite.
- Les catalogues FR/EN, les clés de scènes, les chemins statiques, le budget du
  paquet et les fichiers locaux des images, polices et SDK.
- Les clients de salon simulés : autorité, anti-usurpation, ordre des postes,
  arrivée tardive, temporisations et resynchronisation.
- Le lecteur audio : verrouillage avant geste, refus d'autoplay, absence de
  fichiers, chemins de manifeste, limites de voix, relâchement des buffers,
  changements de contexte et déclenchement unique des stingers.

Les tests du lecteur utilisent des doublures techniques. Deux contrôles
supplémentaires vérifient le manifeste réel, les 16 fichiers locaux, leurs
trames MP3 et leur correspondance de hash, taille et profil avec la provenance.
Cela n'atteste ni une écoute artistique, ni le décodage de chaque fichier dans
chaque navigateur cible.

## Campagne dans le navigateur

Preuve finale : `.local/browser-qa-v2.json`, enregistrée le 28 octobre 2026 à
22:02:42 UTC, après les correctifs d'audit du moteur.

| Mesure | Résultat enregistré |
| --- | --- |
| Navigateur | Chromium, navigateur intégré |
| Origine | http://127.0.0.1:8711/?build=core-v2 |
| Graine | `campaign-0` |
| Actes acceptés réalisés par les contrôles de l'interface | 570 |
| Semaines terminées | 52 |
| Sauts | 20 |
| Fin | Victoire |
| Score | 31 536 790 |
| Trésorerie finale | 28 211 790 Cr |
| Hash de l'état | `0043ca5e` |
| Taille de l'état sérialisé | 94 024 octets |
| Rounds de scènes résolus par les contrôles | 47 |
| Manifeste complet des 16 cues Suno présent pendant la campagne | Oui |
| Comparaison avec la référence scriptée et l'export de sauvegarde | Rejeu identique octet pour octet |
| Erreurs console enregistrées | 0 |
| Avertissements console enregistrés | 0 |

Il s'agit d'un parcours automatisé utilisant l'interface. Ce résultat prouve le
chemin testé et la cohérence du rejeu ; il ne mesure pas le temps d'une partie
humaine ni l'équilibrage ressenti. Aucun import de sauvegarde, argent, dégât ou
état de scène n'a été injecté pendant ce parcours. Le pilote de l'interface a
repris après un délai d'outil à partir de son point de suivi, sans réinitialiser
la partie.

L'export JSON réel a été téléchargé puis rejoué et comparé octet pour octet à
la référence indépendante. La carte PNG a également été téléchargée ; sa taille
de 1200 × 630 a été contrôlée. Les captures finales se trouvent dans
`.local/qa-ending-v2.png` et `.local/qa-run-card-v2-fixed.png`. Le PNG final a été inspecté après correction de l’alignement hérité sur plusieurs redessins, puis sa copie `image/png` a été vérifiée dans le presse-papiers.

L'ancien rapport de 550 actes, conservé dans `.local/browser-qa.json`, décrit
une révision précédente et ne remplace pas cette preuve finale.

- [x] Campagne de 570 actes réalisée dans le navigateur après gel du moteur.
- [x] Export JSON réel rejoué à l'identique et carte PNG 1200 × 630 téléchargée.

### Contrôles complémentaires de l'interface

Les contrôles suivants ont été effectués dans le navigateur intégré :

- Import d'un fichier de sauvegarde JSON et reprise de la partie.
- Zones cliquables de la coupe Blender et ouverture des détails du vaisseau.
  Les huit régions normalisées et leurs données sont également couvertes par
  les tests de géométrie.
- Port, carte, marché et menu de réglages à **390 × 844 px**, sans débordement
  horizontal constaté. L'écran titre mobile a été contrôlé après correction
  du chevauchement de ses éléments.
- Aucun message d'erreur de console relevé pendant ces contrôles.

Les captures locales comprennent `.local/qa-title-mobile.png`,
`.local/qa-map-mobile.png` et `.local/qa-audio-mobile.png`. Il s'agit d'une
vérification de viewport dans Chromium : aucun appareil tactile physique n'a
été utilisé et aucune durée de partie humaine n'a été mesurée.

## Fins obtenues sans modification directe d'état

Preuves régénérées le 28 octobre 2026 à 21:35:56 UTC :
`.local/endings-evidence.json` et les sauvegardes sous `.local/endings/`.

| Fin | Graine | Semaine affichée | Actes acceptés | Hash final |
| --- | --- | ---: | ---: | --- |
| Saisie | `economy-0` | 10 | 105 | `921e57d6` |
| Victoire | `economy-1` | 52 | 553 | `440247ce` |
| Vaisseau détruit, aucun survivant en capsule | `economy-2` | 28 | 39 | `7c4e5323` |
| Paiement final impayé | `economy-12` | 52 | 352 | `a7e9157e` |
| Vaisseau détruit avec survie en capsule | `economy-0` | 10 | 73 | `e808207b` |

Chaque trajectoire part d'une graine et ne contient que des actes acceptés par
le reducer. Aucun crédit, dégât, personnage, horaire ou état de scène n'a été
injecté. Chaque sauvegarde a été rejouée sans refus, comparée octet pour octet
à l'état final et contrôlée par les invariants.

Le rejeu des cinq nouvelles sauvegardes a été relancé pour cette vérification :
les cinq fins et hashes correspondent au rapport régénéré. L'empreinte des
sources du moteur portée par ce rapport est
`f7acf91f68c06398f8eed351df4c35e79dfe1383e2aa6e709f8c3e93afb6dfb5`.

La destruction de `economy-2` provient d'accidents répétés d'écopage, avant tout
combat. La fin avec capsule de `economy-0` suit l'usure par écopage puis un
combat hostile avec un tir, sans réparation de coque. Ces deux provenances
doivent rester distinctes. Le reproducteur final s'arrête après 13 graines,
dans une limite fixée à 100.

## Simulation économique après correction

Le rapport `.local/economy-report-v2.json` porte sur 200 campagnes en Normal :
74 victoires, 84 saisies et 42 paiements finaux impayés, soit **37 % de victoires**.
La stratégie automatique ne consulte que les indications commerciales visibles
et ne risque qu'un quart du fonds de roulement sur les achats spéculatifs. Ces
campagnes ne contiennent aucune injection d'argent. Ce résultat caractérise
cette stratégie automatique, pas le taux de victoire de joueurs humains.

## Production Blender initiale

Preuve livrée avec les sources : [art/PROVENANCE.json](art/PROVENANCE.json).

- CLI Kimi 2.3.1 ; alias `kimi-code/k3.1-pro` ; AgentSwarm avec quatre ouvriers
  artistiques. Les identités et modèles des ouvriers figurent dans la provenance.
- **59 images**, issues de **55 scènes Blender canoniques**, pour
  **11 740 882 octets**, soit environ **11,20 Mio** d'assets enregistrés.
- Dimensions et chemins vérifiés ; aucune image requise manquante.
- 41 sprites WebP sans perte avec transparence et marges ; 18 images opaques de
  scènes et de carte. Les mesures de raccord du papier sont consignées.
- Le jeu conserve les contrôles procéduraux si une image ou la géométrie de
  coupe manque. La coupe contient huit régions interactives normalisées.

Les fichiers Blender éditables et les générateurs sont distincts des images
livrées au navigateur. Le comptage ci-dessus ne couvre pas le lot audio et
ne préjuge pas du poids total après son intégration.

L'archive artistique initiale comprend **55 fichiers `.blend` et 18 scripts
Python**, décomptés dans l'arbre Git sans changement de branche. La branche
`dev-assets` doit être synchronisée après le commit final de `main` ; sa tête
finale n'est pas fixée ici. Les modèles éditables ne sont pas ajoutés au paquet
de jeu de `main`.

## Coupe haute définition — v0.1.1

Le rendu agrandi a été repris depuis la scène Blender par Kimi K3.1/AgentSwarm,
en 4 000 × 1 800 pixels, avec 128 échantillons Eevee, filtre de 0,75 px et
halo légèrement réduit. Le WebP RGBA sans perte pèse 3 104 060 octets. Les
pixels décodés sont identiques au PNG natif ; l'image 2 000 × 900 et le JSON
des compartiments restent inchangés. Il y a désormais 60 images, pour
14 844 942 octets d'assets graphiques et polices.

Dans le navigateur à 1 115 × 1 191, densité 1,5, la grande vue charge bien le
fichier 4 000 × 1 800 et l'affiche à 1 028,67 × 462,90 pixels CSS. Le panneau
latéral conserve l'image 2 000 × 900. Le viewBox reste 2 000 × 900, les huit
zones sont présentes et un clic sur le compartiment Jump drive ouvre le bon
dialogue. Aucune erreur ou alerte console. Les exports de la partie du joueur
avant/après sont identiques octet pour octet. La vérification est consignée
dans `.local/ship-sharpness-qa.json`, avec captures avant/après.

## Audio Suno : 16 cues livrés, sans écoute revendiquée

La production comprend **16 cues : trois musiques, deux stingers et onze
effets**, avec **32 identités A/B enregistrées**. Les **19 exports officiels
locaux** comprennent les 16 prises A de référence et trois alternatives
musicales B. Les 13 autres variantes B restent conservées sur Suno avec leurs
liens ; elles sont distinguées des téléchargements autorisés et n'ont pas de
hash ou de durée locale inventés.

Le [manifeste audio local](assets/audio/manifest.json) contient les 16 fichiers
MP3 du jeu, soit **8 148 600 octets**. Il déclare le lot complet, sans cue
manquant. `music.port` est un alias de `music.title` : 17 clés désignent donc
16 enregistrements, sans compter deux fois cette musique.

La [provenance audio](assets/audio/AUDIO-PROVENANCE.json) conserve les identités,
liens, mesures et correspondances entre sources et dérivés. L'audit local
`.local/audio-audit-final.json`, enregistré le 28 octobre 2026 à 21:44:23 UTC,
confirme 32 identités, 19 sources locales contrôlées et 13 prises distantes,
sans cue ni identité manquant. Les sources locales totalisent 25 462 669 octets
et 1 110,562 secondes ; elles sont distinctes des fichiers allégés du jeu.

Les 19 sources de `.local/audio-inbox/` ont une copie dans
`C:\Users\cedri\OneDrive\Downloads\Jump-1-Audio`. Une comparaison indépendante
a confirmé la présence des 19 fichiers et l'identité de chacun de leurs
SHA-256 entre les deux dossiers.

Le compte Premier a été observé dans l'interface. Le relevé initial indique
11 620 crédits et 23 téléchargements disponibles ; le relevé final indique
11 564 crédits et quatre téléchargements disponibles. La production a donc
consommé **56 crédits et 19 allocations de téléchargement**, sans achat et
sans publication. La provenance de session est conservée dans
`.local/suno-session.json`.

La production utilise des générations originales, des paroles vides pour les
musiques et aucune référence à un artiste ou à une franchise. Aucun achat,
aucune publication et aucune utilisation de la fonction Remix de Suno ne sont
inclus dans cette opération.

Les sources natives exportées officiellement sont conservées. Leur format
varie : le premier effet contrôlé est un M4A contenant de l'Opus ; des sources
musicales sont des MP3. Les fichiers de runtime sont préparés localement avec
FFmpeg et leur traçabilité est conservée. Cette conversion ne doit pas être
présentée comme une nouvelle génération, une amélioration du master ou une
preuve d'écoute.

### Contrôles techniques et limite d'écoute

Preuve : `.local/audio-first-native-inspection.json`.

| Mesure de la prise `sfx.click:A` | Résultat |
| --- | --- |
| Fichier source | `.local/audio-inbox/sfx-click__A__eaded2c0.m4a` |
| Taille | 72 235 octets |
| Codec, fréquence, canaux | Opus, 48 000 Hz, stéréo |
| Durée | 3,2 secondes |
| Décodage technique | Contrôlé |
| Pic d'échantillon mesuré | 0 dBFS environ |
| Écoute perceptive | Non effectuée |

Le pic de ce premier fichier source est un constat technique ; il ne permet
pas de conclure à lui seul à une distorsion audible. Les fichiers préparés et
leurs mesures de niveau sont consignés dans la provenance audio. Le contrôle
des trames et des hashes des 16 MP3 livrés fait partie des 60 tests réussis.

Le rapport `.local/audio-browser-qa.json` atteste la lecture fonctionnelle du
premier aperçu de six cues : déverrouillage après geste, musique dans les
contextes titre, port, voyage et menace, stinger de défaite, sourdine et
réactivation, sans erreur ni avertissement de console. Ce contrôle précède le
lot complet et ne vaut pas une vérification des onze effets finaux.

Le contrôle final `.local/audio-codec-browser-report.json` a ensuite décodé
**16 fichiers sur 16 dans le véritable Chromium**, après un clic de confiance :
aucun échec, aucun fichier manquant, durées et profils concordants. Le contexte
44 100 Hz a été fermé après le contrôle. La page technique jetable reste sous
`.local/audio-codec-qa.html`, hors du paquet publié. Ce test n'a émis aucun son
et ne constitue pas une écoute ; aucune erreur ni aucun avertissement de
console n'a été relevé.

La capacité d'analyse audio disponible a explicitement signalé que l'entrée
audio n'était pas prise en charge. Aucun jugement d'écoute n'est donc revendiqué.
Les mentions « sans voix », « boucle fluide », « effet conforme au prompt »,
« mix agréable » ou « meilleure prise A/B » restent à confirmer par écoute.
La prise A est une référence technique de collecte, pas une préférence
artistique démontrée.

### État des vérifications audio

- [x] Présence des 16 cues nécessaires et correspondance avec les prises A exportées.
- [x] Inventaire A/B complet : 19 fichiers locaux et 13 références distantes.
- [x] Sources conservées et copie OneDrive vérifiée par SHA-256.
- [x] Sources locales contrôlées, MP3 livrés vérifiés, manifeste complet et correspondance de provenance testée.
- [x] Contrôles de déverrouillage, volumes, sourdine et changements de contexte sur le premier aperçu dans Chromium.
- [x] Nouvelle campagne navigateur avec le manifeste complet des 16 cues.
- [x] Décodage réel des 16 fichiers dans Chromium après geste utilisateur, sans fichier manquant ni échec.
- [ ] Écoute perceptive des musiques, effets, transitions, boucles et prises alternatives ; elle n'a pas pu être effectuée dans cette session.

Les droits, périmètres CC0 et références primaires Suno sont précisés dans
[ASSETS-LICENSE.md](ASSETS-LICENSE.md). Cette documentation n'affirme pas que
le caractère généré d'un son lui garantit une protection par le droit d'auteur.

## Langues, coop et portée restante

L'anglais est la langue initiale, même si le navigateur annonce `fr-FR`.
Le français reste disponible et le choix explicite est conservé. Un contrôle
isolé du module i18n a vérifié ces deux comportements ; les deux catalogues
restent couverts par les tests de parité.

Le transport coop est testé avec des clients simulés. La connexion à un véritable
salon LOB7 et les métadonnées réelles du service restent à valider ; le bouton
de jeu continue d'annoncer la coop à venir.

Les 60 tests, la campagne finale et le contrôle de décodage Chromium ci-dessus
ne constituent pas une validation complète de Safari, Firefox, d'un appareil tactile réel,
d'une partie humaine chronométrée ou de la coop en production.

## Retour utilisateur : taille du vaisseau

Le panneau latéral desktop a été élargi à 320–360 px. La coupe utilise son ratio réel ; « Enlarge ship » ouvre une grande vue interactive avec cadre panoramique et huit commandes système. À 1 280 px, le plan agrandi mesure 1 178 px. À 901 px, les colonnes restent dans la largeur disponible. À 390 px, le cadre de 320 px contient un plan de 720 px, sans débordement horizontal du document ; les huit boutons font au moins 48 px de haut. Les commandes Jump drive et Sensors ont été vérifiées sans exécuter de réparation.

La sauvegarde réelle de la partie en cours a été exportée avant et après ces contrôles : même configuration, même graine et mêmes quatre actes. Aucune action de jeu n’a été ajoutée. Preuve locale : `.local/ship-ui-qa.json`. Captures : `.local/qa-ship-enlarged-desktop.png` et `.local/qa-ship-enlarged-mobile.png`.
