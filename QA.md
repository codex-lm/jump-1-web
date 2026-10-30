# Jump-1 — vérifications et limites de livraison

## Recette locale 0.5.0 — 30 octobre 2026

- Édition de règles 5 pour les nouveaux voyages ; toutes les nouvelles règles passent par `rulesAtLeast(state,5)`. Les sauvegardes legacy et édition 4 conservent leurs règles.
- `node tests/run.mjs` : 180/180 tests (parité FR/EN, anciens rejeux, nouvelles règles, contrastes, focus).
- Compatibilité : 468 campagnes éditions 3 et 4 enregistrées sur la 0.4.0 (81 569 actions tentées) rejouées sur la 0.5.0 sans aucune différence d'état ni de code de refus. Un export 0.4.0 importé redonne le même hash. 204 campagnes édition 5 sont déterministes d'un processus à l'autre.
- Contrôles fonctionnels : facture à venir contre débit réel (4 509 cas), issues du panneau de paiement contre PAY/SKIP_PAY (1 742), remboursement anticipé (885), devis de vente contre SELL (8 383), avance de trésorerie (50 graines).
- Simulation 60 graines, difficulté normale : taux de victoire inchangé (48 %), premier impayé médian repoussé de la semaine 8 à la semaine 12.
- Limite : les images ne sont pas recompressées (le canal de publication texte n'accepte pas les binaires) ; seul leur chargement est optimisé.

## Recette locale 0.4.0 — 29 octobre 2026

- `node tests/run.mjs` : 117/117 tests. Parité FR/EN, références locales, budgets, anciens rejeux et nouvelles règles inclus. Les 20 anciens événements et la panne conservent exactement leur comportement hors édition 4.
- 300 graines : au moins deux départs viables, différences commerciales vérifiées par les effets réels des marchandises et continuités de route. Retouches limitées à proximité du départ.
- 12 campagnes v4 simulées via actions publiques acceptées, invariants après chaque action et rejeux identiques. Dix atteignent la semaine 52 (huit victoires et deux paiements finaux manqués), deux finissent en saisie. Les vingt événements apparaissent. Ce test automatique vérifie la robustesse ; il ne mesure pas le taux de victoire humain ni un équilibrage définitif. Les résultats économiques sont très dispersés.
- Vrai navigateur : reprise legacy de `audit-visuel-2026` en semaine 10 à 62 920 Cr ; nouveau voyage avec la même graine, installation de la réserve, plein à 50 t, Haldveld → Nerasto → Haldveld, deux fois 60 t de fret livré, négociation pirate et inspections, mensualité payée, installation de l’atelier en semaine 5.
- Deuxième départ naturel `v04-scene-8` : anniversaire présenté avant les ordres, promesse, arrivée à Pelivo, écopage avec dégât annoncé puis retour vers Istriane et contrôle.
- Sauvegardes de recette issues de parties normales : incendie `v04-scene-70` joué avec maîtrise ratée (1 dégât) puis pause de sécurité (1 semaine, pas de dégât) ; panne `v04-scene-1` résolue au second round avec deux aides journalisées avant réparation ; promesse tenue pour 500 Cr et faveur de marchand encaissée pour 5 000 Cr.
- Reprise de `v04-campaign-4` en espace inhabité : panneau de situation, cinq destinations réelles, départ puis arrivée à Myral. Le défaut de panneau vide observé a été corrigé.
- Vues FR/EN, inspections compactes/détaillées, affichage des demandes et échéances, sauvegardes importées/exportées, mouvement réduit vérifiés. À 390 et 320 px : largeur de contenu égale à la largeur cliente (375/305 px avec barre verticale). Aucune erreur ni alerte console.

Les essais ciblés ne constituent pas douze campagnes jouées manuellement ni une nouvelle campagne navigateur complète de 52 semaines. Pas de nouvel asset sonore, d’écoute perceptive, de test tactile physique ou de validation coop. Les preuves locales sont sous `.local/v04-simulation`, `.local/v04-tests-final.txt` et `C:/dev/jump-1/.local/voyage-0.4.0`.

### Publication et recette hébergée 0.4.0

Publié le 29 octobre 2026 à 18:23:42 UTC : [br_s_b16740f7-8bc5-4dd2-aeec-174d21b2d8b5](https://lob7.com/player/br_s_b16740f7-8bc5-4dd2-aeec-174d21b2d8b5), commit `8f739d6e2e977de3a6a442dee3b2a5d3bb446121`, même variante, parent exact 0.3.0. Les quatre contrôles LOB7 (`malware`, `policy`, `runtime`, `staticAnalysis`) sont réussis. Le paquet contient 182 fichiers et 23 484 455 octets avant normalisation Git des fins de ligne des preuves ; les 165 fichiers de code/médias/manifeste contrôlés sont identiques au commit privé `c3e48c4ce9506f3daecea56bc8892271fce810ab`.

Le lecteur intégré rend le jeu. L’automatisation des clics dans son iframe reste indisponible ; les actions ont donc été testées dans le document exact servi par LOB7, après établissement de sa session de lecture. Nouvelle partie `v04-scene-8`, réserve achetée pour 25 000 Cr puis plein de 20 t pour 10 000 Cr, deux directions initiales visibles, demande locale affichée. Trajet Istriane → Pelivo : anniversaire présenté avant décision, promesse créée et rappelée au port. Rechargement/reprise : semaine 3, 308 300 Cr, 25/50 t de carburant et promesse préservés. Aménagements vérifiés en FR/EN, port à 390 px et aménagements à 320 px sans débordement. Aucun média visible manquant, aucune erreur ni alerte console. Le lecteur rechargé propose « Reprendre le voyage ».

Captures : `C:/dev/jump-1/.local/voyage-0.4.0/lob7-evenement.png` et `lob7-player-publie.png`. Les reçus publics et la preuve de recette sont conservés sous `.local/lob7-v040-*` et `.local/v04-qa-evidence.json`.

Ce document distingue les preuves du jeu solo, les tests de transport, la
production artistique et le lot sonore livré. Les publications LOB7 0.4.0, 0.3.0 et 0.2.0 et leur
recette hébergée sont consignées ci-dessous. Les preuves de travail sous `.local/` sont locales et
exclues du paquet publié ; leurs chemins sont des références de livraison au
propriétaire, pas des ressources chargées par le jeu.

## Version 0.3.0 — point de contrôle local du 29 octobre 2026

**Version 0.3.0 publiée le 29 octobre 2026 à 17:49:39 UTC.** [Lecteur LOB7](https://lob7.com/player/br_s_e6f241d3-9f5b-4ff5-942a-6be20426bdf6). Commit `65158bc701dbeac9f5c726eb3089b9d2f68677bc` ; les quatre contrôles sont `passed`. La variante et le parent 0.2.0 sont vérifiés dans la fiche publique. Les contrôles locaux et hébergés sont séparés ci-dessous.

La fiche de destination explique trajet, coordonnées, services, coûts, frais mensuels, risques et livraisons. Le départ passe par une confirmation, y compris au clavier ; les liens du commerce ouvrent la destination correspondante. Le bilan d’action rapproche résultat, dépenses et journal. Les prochaines étapes au port et les options de carburant disponibles rendent la suite du voyage explicite. Les scènes décrivent leurs enjeux et leurs choix à partir du résolveur réel, affichent les compétences utilisées et distinguent préparation et résolution, sans calcul de probabilité approximatif ni lecture des résultats aléatoires.

**Tests automatisés : 88 réussis sur 88 au point de contrôle local.** Les vérifications des scènes confrontent notamment les compétences et difficultés affichées aux jets réellement consignés par le moteur, conservent les actions légales, signalent les équipiers inconscients et vérifient que la présentation ne modifie ni l’état ni les secrets cachés. Les finitions mobiles sont terminées et les mesures finales figurent ci-dessous.

### Partie jouée dans le navigateur local

La graine `audit-visuel-2026` a été jouée en français par les contrôles de l’interface de la **semaine 1 à la semaine 7, avec trois sauts**.

| Étape | Résultat observé |
| --- | --- |
| Haldveld → Oster | 30 t de fret livrées ; recette de 30 000 Cr |
| Inspections | Rencontres de patrouille et de douane traversées |
| Oster → Avelello | 20 t de fret livrées ; recette de 20 000 Cr |
| Échéance mensuelle | Mensualité de 154 500 Cr et charges de 24 090 Cr |
| Rencontres suivantes | Traversée résolue ; pirates négociés pour 5 000 Cr |
| Arrivée à Avelello | Trésorerie de 81 510 Cr |
| Collecte sur une géante | Semaine 6 ; 27,5 t de carburant brut après l’opération |
| Troisième saut : Avelello → Oster | Joué à 320 px ; confirmation avec coordonnées, traversée, marchand en difficulté aidé et douane |
| Rencontre du marchand | Recette de 20 000 Cr |
| Retour à Oster | Semaine 7 ; trésorerie finale de 101 410 Cr après 100 Cr de frais |
| Console du parcours | 0 erreur, 0 avertissement |

Les vues de destination, la fenêtre de confirmation et son annulation ont été contrôlées à **390 et 320 px CSS**. L’annulation à 390 px conserve la semaine 6 et la destination sélectionnée. Après correction de la largeur minimale du `body`, le parcours à 320 px revient au port sans débordement horizontal : `clientWidth = scrollWidth = 305 px`, les 15 px restants correspondant à la barre de défilement verticale. Les finitions mobiles de ce parcours sont terminées.

Cette recette française ne refait pas une campagne entière de 52 semaines. La fiche de destination a également été vérifiée en anglais ; la partie complète a été jouée en français. Aucun contrôle sur appareil tactile physique, aucune écoute perceptive de l’audio et aucune recette multijoueur réelle ne sont ajoutés par ce parcours. La recette hébergée ci-dessous complète ces contrôles locaux.

### Animations et prolongement de la recette locale

Après la demande complémentaire, les trajets se tracent en 720 ms et les bilans montrent au plus trois jets réels avec leurs deux dés, total/seuil et difficulté. Les ordres sélectionnés, nouvelles scènes et variations de ressources ont un effet bref ; une simple réouverture du port ne rejoue pas le bilan. Aucun tirage ni attente bloquante n’est ajouté. Le mode réduit du jeu a été activé/désactivé par l’interface : la navigation reste complète avec `animation-name: none`. Le réglage système est également prioritaire.

La même partie a été prolongée jusqu’à la semaine 10 : vidange/remplissage à Oster pour 15 000 Cr, quatrième saut vers Haldveld avec dégâts au moteur, échéance manquée et charges, puis semaine standard avec réparation et travail à l’hôpital. Le solde final est 62 920 Cr. À 320 px, les trois cartes de dés restent lisibles et `clientWidth = scrollWidth = 305 px`. Aucun avertissement ni erreur console. Les 88 tests passent ; deux nouveaux contrôles vérifient les jets enregistrés et l’absence de trajet affiché si une facture bloque réellement le saut.

Le CLI générique `check-local --recipe static-web-v1` vise les contributions HTML autonomes et refuse les liens locaux du jeu modulaire ; son échec n’est pas compté comme un succès. Les vérifications de modules, ressources, archive et limites du paquet navigateur sont faites par les tests locaux et l’exporteur, puis par la préparation LOB7 du jeu navigateur.

### Recette hébergée 0.3.0

Création française `audit-visuel-2026`, sélection d’Oster depuis Haldveld : origine/destination, services, durée, frais et risques visibles. Annulation de confirmation sans avancer la semaine 1. Départ réel jusqu’en semaine 3 : 700 Cr, 25 t de carburant et dés enregistrés affichés dans le bilan. Patrouille puis douane résolues, arrivée à Oster pour 100 Cr, trésorerie 228 200 Cr et carburant 5 t. Rechargement et reprise retrouvent la même trésorerie. Destination et bilans testés à 320/390 px sans débordement ; zéro erreur/avertissement console. Capture : `C:\dev\jump-1\.local\navigation-0.3.0\lob7-v030.png`.

Le lecteur intégré rend le jeu. Ses clics dans l’iframe ne sont pas accessibles à l’automatisation ; les interactions ont donc utilisé exactement son URL de jeu hébergé. Ce parcours hébergé couvre un saut et deux rencontres, pas toute la campagne.

## Révision visuelle 0.2.0 — contrôle du 29 octobre 2026

- **70 tests automatisés réussis** après les changements d’interface : prix et quantités, manifeste de mission, dossiers et choix de scène, compatibilité des sauvegardes et portraits distincts.
- Trois sauvegardes héritées conservent exactement leur empreinte SHA-256 de référence, enregistrée avant la révision. Sur 100 graines, les nouveaux portraits n’altèrent aucune autre donnée de personnage, y compris après édition de carrière ou relance. Un contrôle complémentaire de 500 recrutements conserve également les autres données.
- Dans le navigateur, création express et détaillée, édition de nom/carrière, fiches dépliables, sélection d’ordres, portraits de rencontre et résolution de scène vérifiés.
- Marché parcouru dans ses quatre onglets : achat, fret, réservations de passagers, contrat et manifeste. Les totaux suivent la saisie ; les quantités excessives sont refusées et une quantité valide réactive le bouton. Le véritable contrat lié fournit destination, échéance et rémunération de la cargaison de mission.
- Contrôles à 320 et 390 px CSS (jeu réel dans des iframes de ces dimensions), à 390 px dans le navigateur et à 1000/1024 px pour le journal : aucun débordement horizontal relevé. Les raccourcis L puis M/S/Échap réaffichent correctement la vue demandée. Le retour du journal vers le port fonctionne aussi sur mobile.
- Les 16 portraits 512 × 512 et les 4 décors 1600 × 600 ont été inspectés en planche ; les nouveaux portraits et le décor du port A ont aussi été contrôlés dans le jeu. Les portraits ont aussi été vérifiés à 48 px ; leurs transparences et conversions WebP sans perte conservent les pixels RGBA. Les 20 fichiers remplacés restent dans les dimensions du manifeste.
- Le plan HD et ses huit zones restent inchangés. Les preuves techniques de l’ancienne campagne de 52 semaines ci-dessous sont historiques ; cette révision n’a pas été rejouée pendant 52 semaines dans un navigateur.

Ces contrôles locaux ne constituent pas une validation sur appareil tactile physique. La vérification publique et la recette hébergée ci-dessous complètent ces preuves locales.

### Publication LOB7 et recette hébergée — 29 octobre 2026

La fiche publique confirme la publication de [0.2.0](https://lob7.com/games/bg_s_b6142086-81fb-4e0e-b3d1-3d7a99468771?release=br_s_95eca657-d8e9-40d2-926a-2c6263c33e04) à **17:04:47 UTC**, statut `published`, sous « Nilo / Codex ». Le parent exact est `br_s_837e292e-e255-4373-8387-06020925c0f4` (0.1.2) ; la variante indépendante conserve les quatre contributeurs Cédric Bernadac, Nilo / Codex, Kimi K3.1 et Claude Opus 5.5, ainsi que tous les crédits du parent. Le commit servi est `5a853f5119af8613ad2ff1369a1a61a8d1770170` ; les quatre contrôles `malware`, `policy`, `runtime` et `staticAnalysis` sont `passed`. Ces données ont été relues indépendamment via les commandes publiques `browser release/get`, sans authentification ; le reçu expurgé est `.local/lob7-public-release-verified.json`.

La quatrième préparation a été acceptée à 17:01:57 UTC, après trois refus `BROWSER_PREPARATION_LIMIT` dont le dernier à 16:51:33 UTC. Le même brouillon a été conservé ; cet historique reste dans [LOB7-PUBLICATION.json](LOB7-PUBLICATION.json).

La recette de jeu a été effectuée dans Chromium sur [l’URL hébergée exacte de cette publication](https://r-34fb07667358e4cc.play.lob7.com/releases/br_s_95eca657-d8e9-40d2-926a-2c6263c33e04/web/a20b669194dcdf7a5ae46852a66a3540aff11beabef2723e7f7b67b9771309ad/index.html), avec une nouvelle partie en français et la graine `audit-visuel-2026`.

| Contrôle hébergé | Résultat |
| --- | --- |
| Création d’équipage | Cinq portraits 512 × 512 chargés |
| Achat au marché | 2 t de cristaux à 40 000 Cr/t ; total affiché 80 000 Cr |
| Effet de l’achat | Trésorerie 229 000 → 149 000 Cr ; cale 2 t ; trace correcte dans le journal |
| Navigation | Retour journal → port fonctionnel |
| Rechargement et reprise | Trésorerie conservée à 149 000 Cr |
| Coupe HD | Fichier natif 4000 × 1800 chargé |
| Mobile | Port à 390 px et marché à 320 px CSS, sans débordement horizontal |
| Console | 0 erreur, 0 avertissement |

Le [lecteur intégré LOB7](https://lob7.com/player/br_s_95eca657-d8e9-40d2-926a-2c6263c33e04) rend bien le jeu. Rechargé après cette recette, il affiche le titre en français et « Reprendre le voyage ». L’automatisation n’a pas pu cliquer dans son iframe ; les interactions ci-dessus ont donc été vérifiées sur la même URL hébergée exacte, pas dans l’iframe. Les captures locales sont conservées dans `C:\dev\jump-1\.local\visual-refresh-0.2.0\lob7-hosted-port.png` et `C:\dev\jump-1\.local\visual-refresh-0.2.0\lob7-player-published.png`. Cette recette ne constitue pas une campagne complète de 52 semaines sur 0.2.0, un test sur appareil tactile physique, une validation multijoueur ni une écoute perceptive de l’audio.

## Tests automatisés

Commande exécutée sur Node.js 24 :

```sh
node tests/run.mjs
```

Résultat historique avant la révision visuelle, après les correctifs du moteur et l'ajout du lot audio réel :
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
