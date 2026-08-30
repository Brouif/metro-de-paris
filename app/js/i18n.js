/* UI strings. Station and line names stay in French — they are proper nouns —
   but the words wrapped around them are translated, including the "Ligne N"
   prefix, which reads as a label rather than part of the name. */

window.METRO_I18N = {

  fr: {
    "html.lang": "fr",
    "doc.title": "Chronologie du métro de Paris",
    "title": "Chronologie du métro de Paris",
    "subtitle": "L'expansion du réseau, 1900 – 2026",
    "legend": "Lignes en service",
    "notes.title": "Noms historiques",
    "notes.body":
      "<p><b>Ligne A</b> et <b>Ligne B</b> sont les lignes de la compagnie " +
      "Nord-Sud, devenues les lignes 12 et 13 en 1930.</p>" +
      "<p><b>Ligne 2 Sud</b> a été absorbée par la ligne 5 en 1906.</p>" +
      "<p><b>Ligne 14 (ancienne)</b> reliait Invalides à Porte de Vanves&nbsp;; " +
      "elle a fusionné avec la ligne 13 en 1976. La ligne 14 actuelle date de 1998.</p>" +
      "<p><b>Couloirs</b> désigne les voies de raccordement, pas une ligne commerciale.</p>",
    "hint": "Molette pour zoomer · glisser pour déplacer",
    "play.start": "Lancer l'animation",
    "play.pause": "Mettre en pause",
    "play.start.back": "Lancer l'animation à rebours",
    "play.reverse": "Inverser le sens du temps",
    "scrubber": "Année",
    "speed": "Vitesse",
    "lang.group": "Langue",
    "zoom.in": "Zoomer",
    "zoom.out": "Dézoomer",
    "zoom.reset": "Réinitialiser la vue",
    "tip.since": "depuis %s",
    "tip.range": "%s–%s",
    "tip.today": "aujourd'hui : %s",
    "tip.was": "autrefois : %s",
    "credits.open": "Sources et licences",
    "credits.close": "Fermer",
    "credits.title": "Sources et licences",
    "credits.body":
      "<p><b>Histoire des stations et des lignes</b><br>" +
      "D'après <a href='https://fr.wikipedia.org/wiki/Liste_des_stations_du_m%C3%A9tro_de_Paris' " +
      "target='_blank' rel='noopener'>fr.wikipedia.org</a> — " +
      "<a href='https://creativecommons.org/licenses/by-sa/4.0/deed.fr' " +
      "target='_blank' rel='noopener'>CC BY-SA</a>. " +
      "Partage dans les mêmes conditions.</p>" +

      "<p><b>Cours d'eau et canaux</b><br>" +
      "<a href='https://opendata.apur.org/datasets/5e20951f1b7148d48503dceb480f7f6f_0' " +
      "target='_blank' rel='noopener'>Apur</a>, jeu de données <i>Plan eau</i> — " +
      "<a href='https://opendatacommons.org/licenses/odbl/1-0/' " +
      "target='_blank' rel='noopener'>ODbL&nbsp;1.0</a>.</p>" +

      "<p><b>Parcs et jardins</b><br>" +
      "Ville de Paris, <i>espaces verts</i> " +
      "(<a href='https://opendata.paris.fr' target='_blank' rel='noopener'>opendata.paris.fr</a>) — " +
      "<a href='https://opendatacommons.org/licenses/odbl/1-0/' " +
      "target='_blank' rel='noopener'>ODbL</a>. " +
      "Luxembourg et Tuileries&nbsp;: © OpenStreetMap contributors — ODbL.</p>" +

      "<p><b>Logiciel</b><br>" +
      "Cartographie&nbsp;: <a href='https://d3js.org' target='_blank' rel='noopener'>D3</a> " +
      "© Mike Bostock — <a href='js/d3-LICENSE.txt'>ISC</a>.<br>" +
      "Caractère&nbsp;: Archivo, Omnibus-Type — <a href='fonts/OFL.txt'>SIL OFL&nbsp;1.1</a>.<br>" +
      "Code de l'application&nbsp;: licence MIT.</p>" +

      "<p class='credits-note'>Les textes de licence liés ici sont en anglais. " +
      "C'est voulu&nbsp;: seule la version originale fait foi, les traductions " +
      "de ces licences n'étant pas officielles.</p>" +

      "<p class='credits-note'>Les couleurs des lignes numérotées sont celles de la RATP, " +
      "reproduites à titre d'identification. Projet indépendant, sans affiliation.</p>",
    "line.prefix": null            // names already read "Ligne N"
  },

  en: {
    "html.lang": "en",
    "doc.title": "The Paris Métro through time",
    "title": "The Paris Métro through time",
    "subtitle": "How the network grew, 1900 – 2026",
    "legend": "Lines in service",
    "notes.title": "Historical names",
    "notes.body":
      "<p><b>Line A</b> and <b>Line B</b> were the Nord-Sud company's lines, " +
      "which became lines 12 and 13 in 1930.</p>" +
      "<p><b>Line 2 South</b> was absorbed into line 5 in 1906.</p>" +
      "<p><b>Line 14 (former)</b> ran from Invalides to Porte de Vanves and " +
      "merged into line 13 in 1976. Today's line 14 opened in 1998.</p>" +
      "<p><b>Connecting tracks</b> are link lines, not passenger services.</p>",
    "hint": "Scroll to zoom · drag to pan",
    "play.start": "Play",
    "play.pause": "Pause",
    "play.start.back": "Play backwards",
    "play.reverse": "Reverse the direction of time",
    "scrubber": "Year",
    "speed": "Speed",
    "lang.group": "Language",
    "zoom.in": "Zoom in",
    "zoom.out": "Zoom out",
    "zoom.reset": "Reset view",
    "tip.since": "since %s",
    "tip.range": "%s–%s",
    "tip.today": "today: %s",
    "tip.was": "formerly: %s",
    "credits.open": "Sources and licences",
    "credits.close": "Close",
    "credits.title": "Sources and licences",
    "credits.body":
      "<p><b>Station and line history</b><br>" +
      "From <a href='https://fr.wikipedia.org/wiki/Liste_des_stations_du_m%C3%A9tro_de_Paris' " +
      "target='_blank' rel='noopener'>fr.wikipedia.org</a> — " +
      "<a href='https://creativecommons.org/licenses/by-sa/4.0/deed.en' " +
      "target='_blank' rel='noopener'>CC BY-SA</a>. Share-alike applies.</p>" +

      "<p><b>Rivers and canals</b><br>" +
      "<a href='https://opendata.apur.org/datasets/5e20951f1b7148d48503dceb480f7f6f_0' " +
      "target='_blank' rel='noopener'>Apur</a>, <i>Plan eau</i> dataset — " +
      "<a href='https://opendatacommons.org/licenses/odbl/1-0/' " +
      "target='_blank' rel='noopener'>ODbL&nbsp;1.0</a>.</p>" +

      "<p><b>Parks and gardens</b><br>" +
      "Ville de Paris, <i>espaces verts</i> " +
      "(<a href='https://opendata.paris.fr' target='_blank' rel='noopener'>opendata.paris.fr</a>) — " +
      "<a href='https://opendatacommons.org/licenses/odbl/1-0/' " +
      "target='_blank' rel='noopener'>ODbL</a>. " +
      "Luxembourg and the Tuileries: © OpenStreetMap contributors — ODbL.</p>" +

      "<p><b>Software</b><br>" +
      "Mapping: <a href='https://d3js.org' target='_blank' rel='noopener'>D3</a> " +
      "© Mike Bostock — <a href='js/d3-LICENSE.txt'>ISC</a>.<br>" +
      "Typeface: Archivo, Omnibus-Type — <a href='fonts/OFL.txt'>SIL OFL&nbsp;1.1</a>.<br>" +
      "Application code: MIT licence.</p>" +

      "<p class='credits-note'>Numbered line colours are RATP's own, reproduced to identify " +
      "the lines. This is an independent project, unaffiliated.</p>",
    "line.prefix": "Line "         // "Ligne 6" -> "Line 6"
  }
};

/* Line names that a prefix swap alone would not translate. */
window.METRO_LINE_NAMES = {
  en: {
    "Couloirs": "Connecting tracks",
    "Ligne 2 Sud": "Line 2 South",
    "Ligne 14 (ancienne)": "Line 14 (former)",
    "Voie des Fêtes et voie navette": "Voie des Fêtes & shuttle track"
  }
};
