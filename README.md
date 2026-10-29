# Jump-1

**Variant Rules · Un univers original**

Un roguelite spatial au tour par tour, en anglais par défaut, avec français disponible et choix de langue mémorisé. Cinq membres d'équipage font vivre un cargo de 200 tonnes acheté à crédit dans la Marche des Lanternes. Le commerce paie les traites ; les impayés lancent le croiseur de saisie de la banque à leurs trousses.

La campagne solo couvre 52 semaines : douze mensualités de **154 500 Cr**, aux semaines 4 à 48, puis le paiement final à la semaine 52. Le paiement final vaut 800 000 Cr en Facile, 1 500 000 Cr en Normal et 2 500 000 Cr en Difficile, avant les réductions obtenues à la création d'équipage.

## Lancer le jeu

Depuis la racine du projet, avec Python installé :

```sh
python -m http.server 8711 --bind 127.0.0.1
```

Ouvrir ensuite [le jeu local](http://localhost:8711/). Le serveur HTTP est nécessaire aux modules JavaScript et aux fichiers locaux chargés par le navigateur.

Le dossier de travail de cette livraison est `C:\dev\jump-1`. Aucun dépôt distant n'est configuré à ce stade ; aucune publication LOB7 n'a été effectuée. La publication ultérieure reste à la charge du propriétaire du jeu.

Le jeu utilise HTML, CSS et JavaScript natifs, sans compilation, sans framework et sans installation npm. Les médias et les polices sont servis localement. Le SDK de salons est inclus sous la forme du fichier original `lob7-rooms.js`.

## Prendre le large

1. Choisir une difficulté, un nom de vaisseau et éventuellement une graine. La même graine et les mêmes choix produisent la même partie. La graine du jour utilise la date UTC, impose Normal et interdit la relance d'un personnage.
2. Examiner l'équipage express et ses carrières. Le mode détaillé permet de choisir carrière, nombre de termes et table de compétences, puis résout la carrière et affiche sa frise. Une relance complète est disponible une fois par campagne, hors défi quotidien.
3. Au port, comparer les codes commerciaux des mondes voisins. Acheter sous le prix de base et chercher un débouché favorable aide à financer le paiement final. Réserver fret et passagers pour la même destination fournit des revenus plus réguliers. Garder de quoi payer carburant, entretien, salaires et prochaine traite.
4. Ravitailler et réparer avant de partir. Le cargo ne peut sauter que vers un monde adjacent et consomme 20 tonnes par saut, plus le carburant de centrale au fil des semaines.
5. Pendant une rencontre, choisir une action pour chacun des cinq postes, puis résoudre le round. Les jets 2d6, modificateurs et effets sont consignés dans le journal. Une inspection, un mauvais saut ou une négociation avec la banque peut changer l'itinéraire.

### Temps au port et escale rapide

Une escale complète prend **une semaine de port**, suivie d'**une semaine de saut**. Les actions de poste et le commerce de l'escale partagent cette semaine de port. « Semaine standard » exécute les routines et passe une semaine à quai ; un départ immédiat après cette semaine ne la facture pas une seconde fois. Une nouvelle activité au port engage une nouvelle semaine.

Une **escale rapide** permet de repartir pendant la semaine d'arrivée : livraison, ravitaillement et saut suivant, sans marché, travail de poste ni réparations. Elle prend une semaine de saut et devient indisponible après du travail ou du commerce à cette escale. Elle permet de fuir ou de convoyer vite, au prix du commerce spéculatif.

Si une facture ou une scène interrompt une préparation de départ, elle se résout avant le saut prévu. Le temps de port déjà écoulé reste acquis.

### Commandes et sauvegarde

- Souris ou toucher : boutons, choix de poste, marchés et mondes.
- Flèches : sélection sur la carte ; Entrée ou Espace : confirmation depuis la carte ; Échap : retour au port.
- `1` à `5` : fiches d'équipage ; `M` : carte ; `S` : vaisseau ; `L` : journal.
- `R` : semaine standard ; `Q` : escale rapide vers le monde sélectionné, si elle est autorisée.
- « Enlarge ship » ouvre le grand plan interactif : compartiments, équipiers et systèmes. Sur mobile, le plan se parcourt horizontalement et huit boutons donnent accès aux systèmes.
- Le menu propose l'export et l'import d'une sauvegarde JSON, la taille du texte et la réduction des animations.

La sauvegarde solo repose sur la graine, la configuration et les actes acceptés, rejoués à la reprise. Les écritures dans le stockage local sont protégées contre les erreurs du navigateur. L'export JSON permet de conserver la partie indépendamment de ce stockage. Les dix dernières fins de campagne sont conservées localement.

## Vérifier le projet

Avec Node.js 24, utilisé pour les vérifications locales :

```sh
node tests/run.mjs
node tests/sim-economy.mjs 200
node tests/prove-endings.mjs
```

La suite compte **60 tests**, tous réussis. Elle couvre notamment le rejeu déterministe, les actions refusées, les invariants d'état, 1 000 personnages, 1 000 sous-secteurs, les tables de prix, les phases port/saut, une campagne scriptée de 52 semaines, les fins principales, les traductions et les limites du paquet statique. Les tests des fins utilisent aussi des états de scénario contrôlés ; ils ne remplacent pas des campagnes jouées jusqu'au bout dans un navigateur.

Les tests de protocole utilisent plusieurs clients de salon simulés : identité de l'expéditeur, autorité de l'hôte, ordre des postes, arrivée tardive, délais, reprise après désynchronisation et messages de moins de 8 192 octets, y compris avec accents, guillemets et caractères Unicode.

La dernière simulation économique enregistrée, après correction du temps de port, comprend **200 campagnes en Normal : 74 victoires, 84 saisies et 42 paiements finaux impayés**, soit 37 % de victoires. Le capitaine automatique risque au plus un quart de son fonds de roulement sur des biens légaux sous leur prix de base, utilise les indications commerciales visibles, puis transporte fret, passagers et courriers. Il n'injecte pas de crédits et ne consulte pas les prix futurs. Ce résultat mesure cette stratégie automatique, pas le taux de réussite de joueurs humains.

Les fins principales sont aussi démontrées par des listes d’actes issues d’états initiaux normaux, puis rejouées sans aucun refus : victoire (`economy-1`, semaine 52), paiement final impayé (`economy-12`, semaine 52), saisie (`economy-0`, semaine 10), destruction par accidents répétés d’écopage (`economy-2`, semaine 28). Une cinquième trajectoire (`economy-0`, semaine 10) détruit le vaisseau après un combat hostile, avec survie en capsule. Le script `prove-endings` recrée ces preuves dans `.local/` ; il n’injecte ni argent, ni dégâts, ni scène. Une preuve supplémentaire (`repo-recovery-57`) abat Diligence au douzième round, puis programme son remplaçant douze semaines plus tard.

## Architecture

| Dossier ou fichier | Rôle |
| --- | --- |
| `index.html`, `styles.css`, `src/main.js` | Entrée statique, présentation et événements de l'interface |
| `src/core/` | PRNG à flux dérivés, dés, état JSON, vocabulaire d'actions, reducer et rejeu |
| `src/data/` | Tables de carrières, biens, armes et mondes ; générateur de noms original |
| `src/rules/` | Création d'équipage, liens, sous-secteur, vaisseau, économie, commerce, poursuite et scènes |
| `src/ui/` | Carte canvas, vaisseau SVG, panneaux, journal, chronique, carte de fin et résolution des assets |
| `src/i18n/` | Catalogues français et anglais, avec contrôle de parité des clés et paramètres |
| `src/net/local.js` | Transport solo et sauvegarde par liste d'actes |
| `src/net/protocol.js`, `src/net/room.js` | Protocole coop et adaptation du SDK de salons |
| `assets/manifest.json` | Correspondance des clés d'images avec leurs fichiers locaux et dimensions |
| `assets/fonts/`, `assets/img/`, `assets/audio/` | Polices, rendus et 16 enregistrements Suno locaux |
| `src/audio/` | Lecture après geste, fondus, volumes séparés et limites de voix/mémoire |
| `art/` | Provenance et documentation ; générateurs et modèles sur `dev-assets` |
| `tests/` | Tests sans dépendance npm et simulation économique |

Le reducer est l'unique point d'entrée des changements de jeu. Ses états sont sérialisables en JSON. Le PRNG utilise FNV-1a et Mulberry32, avec des flux dérivés par domaine, semaine, round et acteur. L'interface émet des actions et affiche l'état obtenu.

Les images sont facultatives pour le fonctionnement : leur manifeste est chargé localement et chaque rendu absent ou défectueux laisse place à un substitut procédural. Le paquet de jeu n'utilise pas de requête HTTP externe, de script distant, de chargement dynamique de module, de worker, de compilation WebAssembly ou de transport pair à pair.

## Art et coopération : état de livraison

La direction « carte marine et cuivre » est définie dans [ASSETS-BRIEF.md](ASSETS-BRIEF.md). La CLI Kimi K3.1 Pro et quatre workers AgentSwarm ont produit 59 images avec Blender 4.5.13, ainsi que 55 scènes éditables. Une reprise Kimi/Swarm ajoute un rendu natif de la coupe en 4 000 × 1 800 pour les grandes vues : 60 images et environ 14,2 Mio d'assets au total. Le petit panneau conserve son rendu léger ; les zones interactives gardent leurs coordonnées. Les dimensions, transparences et marges des sprites ont été vérifiées ; les planches de contrôle ont été inspectées. Les sources `.blend` et les générateurs sont séparés sur `dev-assets`. La branche de jeu contient les rendus prêts à servir. Voir [la provenance artistique](art/PROVENANCE.json).

La campagne de validation finale `campaign-0` a été jouée par les contrôles du navigateur : **570 actes acceptés, 47 rounds de scène, 52 semaines, 20 sauts, victoire**, score 31 536 790, trésorerie finale 28 211 790 Cr. Son véritable export JSON rejoue exactement l’état de référence : 94 024 octets, hash `0043ca5e`. Aucune erreur ni avertissement de console n’a été relevé. La reprise, l’import JSON, les zones cliquables du vaisseau, le téléchargement de la carte PNG 1200 × 630 et sa copie dans le presse-papiers ont été vérifiés. Le port, la carte, le marché et les réglages audio ont été contrôlés à 390 × 844 px sans débordement horizontal. Aucun appareil tactile physique n’a été utilisé ; la durée d’une partie humaine n’a pas été mesurée.

Le lot Suno est complet : **3 musiques, 2 thèmes de fin et 11 bruitages**, soit 16 fichiers MP3 et 17 clés de lecture (le port partage le thème du titre). Dix-neuf exports officiels originaux sont conservés dans `.local/audio-inbox/` et copiés dans `C:\Users\cedri\OneDrive\Downloads\Jump-1-Audio` ; les trois prises musicales B restent hors du paquet de jeu. Les treize autres variantes B sont référencées dans Suno comme distantes, sans faux fichier local. Le manifeste et [la provenance audio](assets/audio/AUDIO-PROVENANCE.json) sont complets.

Le lecteur démarre après un geste, propose volumes séparés et coupure du son, et fait des fondus entre les musiques. Les sources sonores viennent toutes de Suno ; WebAudio décode et mélange les fichiers sans synthétiser de remplacement. L’intégrité des exports, les durées, les niveaux et les empreintes ont été vérifiés techniquement. Chromium a décodé les seize fichiers à la suite après un vrai clic, sans échec, puis fermé son contexte audio ; ce contrôle n’émettait aucun son. Le mix, l’absence perceptive de voix et la qualité des raccords n’ont pas été validés à l’oreille : cette session ne disposait pas d’entrée audio. Cette limite est conservée dans les métadonnées, sans sélection artistique fictive.

Le **transport coop M2 est implémenté et testé en simulation**. Le bouton de l'interface affiche encore « bientôt ». Aucune partie dans un véritable salon LOB7 n'a été vérifiée ici. Le SDK laisse les métadonnées d'identité opaques : les adaptateurs refusent les formes inconnues ou ambiguës. La connexion réelle, les champs d'identité du service et la présentation des vues de chaque poste doivent être validés avant d'annoncer la coop comme disponible.

## Règles, licences et adaptations

Les tables et procédures sont dérivées du [Cepheus Engine System Reference Document](https://github.com/orffen/cepheus-srd/tree/0839018902355215fb8148f0b4ce1b1f8e011080), version vérifiée au commit `0839018902355215fb8148f0b4ce1b1f8e011080`.

Jump-1 is compatible with the rules of Cepheus Engine. Cepheus Engine et Samardan Press sont des marques de Jason « Flynn » Kemp. Jump-1 n'est affilié ni à Jason « Flynn » Kemp ni à Samardan Press.

- [LICENSE](LICENSE) : MIT pour l'implémentation, les styles et les visuels procéduraux originaux, Cédric Bernadac, 2026.
- [OGL.md](OGL.md) : OGL 1.0a intégrale, notice de copyright du SRD reproduite exactement, déclaration des contenus ouverts et de l'identité originale, et licence de compatibilité CSL. Les noms tiers obligatoires de cette notice constituent une exception documentée à leur exclusion de l'univers du jeu.
- [ASSETS-LICENSE.md](ASSETS-LICENSE.md) : périmètres distincts des rendus originaux CC0, des éléments procéduraux MIT, des règles OGL et des polices SIL OFL.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) : attribution du SDK LOB7 fourni sans modification. Les polices conservent leurs propres notices dans `assets/fonts/`.

Quelques valeurs approximatives ou contradictoires de la spécification ont été clarifiées à partir du SRD :

- Les prix spéculatifs utilisent la table source, indexée sur le résultat d'un jet 2d6 et bornée de 2 à 16 : achat de 20 % à 200 % du prix de base, vente de 40 % à 400 %. La formule approximative 3d6 de la spécification n'est pas utilisée.
- La génération des mondes suit les formules vérifiées : hydrographie liée à la taille, population modifiée par l'habitabilité, starport lié à la population et modificateurs technologiques du SRD. Le départ A/B et le composant de quatorze systèmes restent garantis.
- Les compétences de carrière non retenues par Jump-1 sont regroupées dans sa liste fermée de compétences. Les choix de formation initiale niveau zéro viennent des compétences d'origine et d'éducation du SRD.
- Les adaptations propres à Jump-1 demeurent explicites : maximum de cinq termes, absence de mort à la création, bénéfices de vaisseau convertis en réduction du paiement final, systèmes et coque adaptés au jeu, douze mensualités puis paiement final à la semaine 52.
- Le combat hostile contre Diligence peut durer douze rounds pour rendre ses 60 points de coque et 60 de structure destructibles avec le canon prévu. La négociation reste accessible avec un véritable cessez-le-feu ; tirer et négocier dans le même round ne donne pas ce bénéfice. Un simple signalement du croiseur ne déclenche pas de saisie contre un équipage à jour.
- La création détaillée actuelle propose les choix de carrière, termes et table, puis résout les jets automatiquement. Elle n'est pas encore le mini-jeu interactif jet par jet décrit dans la spécification.

Le suivi des choix d'implémentation et des preuves de livraison se trouve dans [PROGRESS.md](PROGRESS.md). La spécification fournie reste dans `.local/SPEC.md`, hors du dépôt publié.

## Critères d'acceptation

Cette liste distingue les vérifications exécutées des limites de cette livraison. Les preuves et méthodes sont détaillées dans [QA.md](QA.md).

- [x] Moteur déterministe et rejeu identique, y compris après découpage d'une liste d'actes.
- [x] 1 000 personnages et 1 000 sous-secteurs valides, prix bornés par les tables retenues.
- [x] Campagne scriptée de 52 semaines et fins principales atteignables dans les tests du moteur.
- [x] Une semaine de port puis une semaine de saut ; escale rapide distincte et contrôlée.
- [x] Français et anglais : mêmes clés et paramètres, scènes et choix couverts par les tests.
- [x] Notices MIT, OGL 1.0a et CSL présentes ; polices locales avec leurs notices OFL.
- [x] Protocole de salon borné à 8 192 octets et scénarios multi-clients simulés.
- [x] Test de fumée dans le navigateur : écran titre, clic central, flèches et Espace sans erreur console.
- [x] Campagne de 52 semaines parcourue dans le navigateur avec chronique et carte de run vérifiées.
- [x] Affichage et contrôles à 390 × 844 px dans le navigateur.
- [ ] Appareil tactile physique et durée humaine d’une campagne express inférieure à une heure : non mesurés.
- [x] Rendus artistiques définitifs, preuve d'exécution Kimi/Swarm et intégration ; sources conservées pour la branche dédiée.
- [x] Paquet statique : 191 fichiers, environ 22,6 Mio ; code/styles/polices environ 0,6 Mio, sous les limites de 200 fichiers, 30 Mio au total et 3 Mio pour le code/styles/polices.
- [x] 16 cues Suno locales, déverrouillage après geste, volumes séparés, sources et provenance vérifiées.
- [ ] Salon LOB7 réel et coop accessible dans l'interface : validation d'une édition ultérieure.

## Contribuer une variante

Conserver le contrat statique : entrée à la racine, imports relatifs, ressources locales, aucun fichier `package.json` nécessaire à l'exécution. Ajouter les actions au vocabulaire central et leurs validations au reducer, garder l'aléa dans les flux dérivés et fournir les deux langues pour chaque texte visible. Exécuter les tests avant de proposer une variante.

Les modifications de règles dérivées du SRD conservent les obligations OGL et leur attribution. Un nouvel univers ou de nouveaux médias doivent indiquer clairement leurs auteurs et leur licence. Les manifests LOB7 décrivent le paquet livré ; leur présence ne constitue pas une publication sur la plateforme.
