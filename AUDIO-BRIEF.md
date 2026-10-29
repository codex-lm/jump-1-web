# Jump-1 — brief audio Suno

La musique et tous les bruitages proviennent de Suno, conformément à la demande de Cédric. Nilo assure le brief, la collecte, la traçabilité, l'intégration et les mesures techniques. L'entrée audio n'étant pas disponible dans le canal actuel, aucune écoute artistique n'est déclarée. Le jeu utilise uniquement les fichiers audio locaux sélectionnés. Le code ne crée aucun son de remplacement.

## Direction sonore

Une petite salle des cartes dans un cargo acheté à crédit : encre bleue, parchemin, laiton patiné, cuivre oxydé et lumière de cabine ambrée. Le son est chaud, mat, tactile et peu dense. Il accompagne la lecture, les choix et les jets de dés. La nostalgie vient de timbres analogiques doux, du piano feutré, de l'harmonium, de cuivres sourds et de petits mécanismes ; la menace reste patiente et administrative.

Le brief demande un motif original D–A–F pour relier discrètement le titre, le voyage, les courriers et la victoire. Son respect dans les sorties n'est pas confirmé à l'écoute. Il ne doit pas devenir une mélodie insistante. Toute musique reste instrumentale, sans voix, chœur, parole ou syllabe chantée. Les prompts ne citent aucun artiste ni aucune franchise.

## Générations prévues

Les prompts anglais complets, leurs titres, leurs limites et leurs durées demandées sont dans `.local/audio-prompts.json`.

| Clé | Usage | Durée finale visée | Surface Suno |
| --- | --- | ---: | --- |
| `music.title` | Écran titre et escale, chaleur et confiance prudente | 60–120 s | Songs, instrumental |
| `music.port` | Réutilisation de `music.title` | alias | — |
| `music.travel` | Carte, saut, exploration calme | 60–120 s | Songs, instrumental |
| `music.threat` | Compagnie de recouvrement et rencontres tendues | 60–120 s | Songs, instrumental |
| `stinger.victory` | Soulagement, vaisseau enfin possédé | 8–12 s | Sounds, One-Shot |
| `stinger.defeat` | Perte ou saisie, déception sobre | 8–12 s | Sounds, One-Shot |
| `sfx.click` | Petit interrupteur de laiton | ≤ 0,32 s | Sounds, One-Shot |
| `sfx.dice` | Deux dés métalliques sur feutre et bois | ≤ 1 s | Sounds, One-Shot |
| `sfx.trade` | Registre, tampon et deux petits tintements | ≤ 1 s | Sounds, One-Shot |
| `sfx.jump` | Montée douce du moteur, passage violet | ≤ 3 s | Sounds, One-Shot |
| `sfx.arrival` | Verrou d'amarrage, pression et carillon sourd | ≤ 2 s | Sounds, One-Shot |
| `sfx.laser` | Impulsion analogique courte et contenue | ≤ 0,6 s | Sounds, One-Shot |
| `sfx.impact` | Coque frappée, vibration métallique étouffée | ≤ 1 s | Sounds, One-Shot |
| `sfx.alarm` | Deux notes de prudence, douces et brèves | ≤ 2 s | Sounds, One-Shot |
| `sfx.repair` | Cliquet, clé et petit signal de fin | ≤ 2 s | Sounds, One-Shot |
| `sfx.refuel` | Vanne, bref écoulement filtré et fermeture | ≤ 2 s | Sounds, One-Shot |
| `sfx.message` | Motif D–A–F et pli de papier, politesse bancaire | ≤ 2 s | Sounds, One-Shot |

Cela représente 16 cues originaux et un alias. Préserver les deux identités A/B de chaque cue dans la bibliothèque Suno et le registre, soit 32 identités prévues. Le nombre effectivement livré par Suno doit être constaté dans l'interface. Télécharger les 16 cues retenus et, si le quota le permet, les 3 alternatives musicales ; les autres prises restent liées comme `remoteOnly`, sans prétendre disposer de fichiers locaux. Les durées ci-dessus sont des objectifs de sélection et d'intégration ; leur présence dans un prompt ne garantit pas la longueur générée.

## Capacités constatées pour cette session

Root a inspecté l'interface Suno : Songs propose le modèle v6 et un champ Styles de 1 000 caractères ; Sounds propose One-Shot et Loop, un prompt de 500 caractères et des contrôles BPM/Key. Les trois prompts de musique font au plus 874 caractères ; les treize prompts Sounds, au plus 448. Les paroles restent vides et le caractère instrumental est demandé explicitement. Les paramètres de durée, BPM, tonalité et nombre de prises ne sont appliqués que s'ils sont réellement proposés par l'interface.

## Collecte et provenance

Confirmer le dossier de téléchargement réellement utilisé par l'onglet. Préserver chaque export original, son nom, son identité de prise, sa page ou son identifiant Suno observé et son SHA-256. `.local/audio-inbox/` contient les originaux et le registre des prises ; les fichiers intégrés sont des dérivés documentés. Une erreur de téléchargement ou d'export se traite en récupérant la génération existante.

Les fichiers ne reçoivent pas automatiquement la licence MIT ou CC0 des visuels. La provenance enregistre Suno, la date, le modèle ou la surface constatée et les conditions applicables au compte pour la génération. Les droits retenus pour la publication seront renseignés dans la documentation audio.

## Référence technique et écoute à effectuer

Dans cette session, le moteur multimodal a explicitement indiqué qu'il ne reçoit pas le contenu audio. Cédric a autorisé la conservation de la première prise A complète comme référence technique. Ce choix ne constitue pas une préférence artistique entre A et B. La provenance porte `selectionMode: "technical_first_take_A"`, `listenStatus: "not_performed_no_audio_input"` et une raison de sélection explicite. Les alternatives restent archivées ou liées dans Suno selon les exports réellement effectués.

Les trois musiques A restent complètes si le budget le permet. Les 60–120 secondes sont un objectif de génération, sans prélèvement automatique d'une portion supposée meilleure. Le débit MP3 peut être ajusté pour tenir le budget en conservant les morceaux entiers. Aucune affirmation sur les voix, le caractère musical, l'agrément ou la qualité du raccord de boucle n'est fondée sur les seules mesures.

Les SFX sont bornés par une règle fonctionnelle déterministe autorisée : détection du premier onset énergique en RMS mono à 16 kHz, fenêtres de 10 ms, seuil égal au plus élevé de −50 dBFS RMS et du maximum RMS moins 18 dB, confirmation sur deux fenêtres et marge d'attaque de 5 ms. Une impulsion isolée peut déclencher un repli documenté sur une fenêtre. La durée est ensuite plafonnée à 0,32 s pour click ; 1 s pour dice, trade et impact ; 3 s pour jump ; 0,6 s pour laser ; 2 s pour arrival, alarm, repair, refuel et message. Il s'agit de contraintes d'interface, pas d'une sélection de portion jugée meilleure.

Le silence terminal mesuré peut réduire encore cette plage : seuil −55 dBFS, durée silencieuse minimale 150 ms, marge de 20 ms avant et 80 ms après la zone utile. Les silences internes restent intacts. Les seuils, plages détectées, onset, points retenus, plafonds, fondus et conversions sont consignés. Une source sans onset au-dessus du plancher RMS est rejetée au lieu de fabriquer un effet.

Les mesures de durée, de crête, de niveau intégré et de silence décrivent des propriétés techniques. Elles ne sont pas présentées comme une écoute ni comme la preuve d'un bruitage approprié. Une écoute humaine pourra vérifier ensuite les voix, les attaques, la longueur perçue, la discrétion du mix et les raccords de boucle, puis renseigner un choix artistique distinct.

Les musiques et effets normalisés ont un gain de piste de 1 ; les stingers, 0,9. Le master musical de départ est 0,45 et celui des effets 0,55, pour éviter de cumuler deux atténuations musicales. Ces valeurs sont techniques et ne constituent pas un mix approuvé à l'oreille. Le lecteur fournit des fondus globaux de 900 ms, active le son après un geste utilisateur, garde musique et effets réglables et limite les effets simultanés à quatre voix. Le build technique conserve les morceaux entiers avec de très courts fondus de déclic documentés ; la boucle musicale n'est pas déclarée approuvée à l'oreille.

## Contrat du manifeste

Chemin : `assets/audio/manifest.json`. Le lecteur accepte une table plate ou `{ "schemaVersion": 1, "clips": { ... } }`.

```json
{
  "schemaVersion": 1,
  "clips": {
    "music.title": {
      "src": "assets/audio/music-title.mp3",
      "volume": 1.0,
      "loop": true,
      "kind": "music",
      "fadeMs": 900,
      "provenanceId": "music.title:A"
    },
    "music.port": "music.title"
  }
}
```

Le lecteur comprend `src`, `volume`, `loop`, `start` et `end` en secondes. `start/end` permettent aussi plusieurs cues issus d'un même export Suno, avec une règle de découpage et une provenance par segment. Les autres champs sont conservés comme métadonnées. Le build peut extraire des fichiers courts autonomes : leurs points de coupe d'origine restent dans la provenance, et les points du lecteur repartent alors à zéro.

## Formats et budget

Les originaux réellement téléchargés restent intacts dans `.local/audio-inbox/`. Les alternatives non exportées restent dans Suno et sont marquées explicitement dans le registre ; aucune empreinte ni durée locale ne leur est inventée. Pour le jeu : MP3 44,1 kHz, musique stéréo à 128 kbit/s, stingers stéréo à 96 kbit/s, SFX mono à 80 kbit/s comme point de départ. Ces réglages sont ajustables après écoute. Trois morceaux de 120 secondes à 128 kbit/s occupent environ 5,8 Mo, ce qui laisse de la marge aux stingers et aux effets.

Budget audio final : 12 Mio maximum, y compris manifeste et provenance. Budget total du jeu publié : moins de 30 Mio. Les originaux, prises non retenues, fichiers de travail et mesures restent hors de la branche statique. Les scripts de traitement accompagnent les sources dans `dev-assets`.

## Outil de traitement

`.local/audio-build.py` prépare la collecte, l'audit et les dérivés avec FFmpeg/FFprobe locaux. Il ne génère aucun audio et ne contacte pas Suno. Son plan indique soit une écoute réellement effectuée, soit la convention technique explicite de première prise A, sans prétention artistique. Son mode par défaut est un examen sans encodage ; l'écriture de dérivés demande `--write`.

L'audit contrôle les fichiers, les identités de prises, les SHA-256, la durée, le décodage et les correspondances du registre. Les mesures de niveau sont distinguées de l'écoute. Le registre de l'opérateur `.local/suno-session.json` est importé en lecture seule ; l'outil écrit son propre `TAKES.json` et ne modifie pas la session du navigateur. La cible est −20 LUFS pour les musiques et −18 LUFS pour les effets, avec une crête vraie maximale de −1,5 dBTP après encodage. Pour les effets de moins de 400 ms, le LUFS intégré autonome n'est pas défini : la mesure de référence ajoute une seconde de silence uniquement dans le calcul, sans l'écrire dans le fichier. Le gain statique vise cette référence, sous contrainte de crête et avec une amplification maximale de 12 dB. Les métadonnées signalent cette exception. Un contrôle de crête vraie après MP3 peut appliquer une atténuation technique supplémentaire depuis la source intacte. Les coupes, fondus, conversions, débits et mesures finales figurent dans la provenance des fichiers intégrés.

## État du lot audio local complet

Les 16 cues sont intégrés dans `assets/audio/` : trois musiques A complètes, deux stingers A et onze SFX A adaptés à leurs durées fonctionnelles. Le manifeste comporte 17 clés avec l'alias `music.port`, `complete: true`, `partial: false` et aucun `missingCues`. Le dossier complet pèse 8 246 264 octets, sous le budget de 12 Mio.

La provenance répertorie 32 identités Suno : 19 natifs locaux réellement conservés et vérifiés par SHA-256, dont trois alternatives musicales B hors runtime, plus 13 prises distantes explicitement marquées `remoteOnly`. Les trois musiques A durent 174 / 183,16 / 127,84 secondes ; les stingers restent complets à 7,213 / 10,014 secondes. Ces durées sont les sorties réelles, pas une affirmation que Suno a suivi exactement les longueurs demandées.

Le lot a passé le décodage, les contrôles de source, d'empreinte, de durée, de bornage et de crête. Aucune écoute artistique n'a pu être effectuée dans cette session ; le statut `not_performed_no_audio_input` reste explicite. La palette et les rendus Blender ne sont pas modifiés par cette livraison.
