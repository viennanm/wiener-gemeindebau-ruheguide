// Daten und Verzeichnis basierend auf:
// https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten

export interface WikipediaDistrictEntry {
  bezirk: number;
  name: string;
  wikipediaUrl: string;
  anzahlGemeindebautenApprox: number;
  bekannteBauten: string[];
  bedeutendeArchitekten: string[];
  denkmalgeschuetzteObjekte: number;
  charakteristik: string;
}

export const WIKIPEDIA_MAIN_URL = 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten';

export const WIKIPEDIA_DISTRICT_LIST: WikipediaDistrictEntry[] = [
  {
    bezirk: 1,
    name: 'Innere Stadt',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Innere_Stadt',
    anzahlGemeindebautenApprox: 1,
    bekannteBauten: ['Fischerstiege 1–7 (Otto Niedermoser, 1954)'],
    bedeutendeArchitekten: ['Otto Niedermoser'],
    denkmalgeschuetzteObjekte: 1,
    charakteristik: 'Kein Gemeindebau im Roten Wien (erstmals 1954 Wiederaufbau Fischerstiege).'
  },
  {
    bezirk: 2,
    name: 'Leopoldstadt',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Leopoldstadt',
    anzahlGemeindebautenApprox: 110,
    bekannteBauten: ['Wohnhausanlage Machstraße', 'Lassallestraße', 'Engerthstraße'],
    bedeutendeArchitekten: ['Wilhelm Hubatsch', 'Franz Schuster', 'Heinrich Schmid'],
    denkmalgeschuetzteObjekte: 28,
    charakteristik: 'Zahlreiche Zwischenkriegs- und Nachkriegsbauten zwischen Donaukanal und Prater.'
  },
  {
    bezirk: 3,
    name: 'Landstraße',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Landstra%C3%9Fe',
    anzahlGemeindebautenApprox: 95,
    bekannteBauten: ['Rabenhof (1927, Heinrich Schmid & Hermann Aichinger)', 'Hanuschhof'],
    bedeutendeArchitekten: ['Heinrich Schmid', 'Hermann Aichinger', 'Robert Oerley'],
    denkmalgeschuetzteObjekte: 32,
    charakteristik: 'Historische Höfe des Roten Wien mit eigener Theaterbühne (Rabenhof Theater).'
  },
  {
    bezirk: 4,
    name: 'Wieden',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Wieden',
    anzahlGemeindebautenApprox: 25,
    bekannteBauten: ['Südtiroler Hof', 'Wiedner Hauptstraße'],
    bedeutendeArchitekten: ['Karl Badstieber', 'Josef Frank'],
    denkmalgeschuetzteObjekte: 12,
    charakteristik: 'Kompakte Baulückenschließungen und geschützte Gartenhöfe im Botschaftsviertel.'
  },
  {
    bezirk: 5,
    name: 'Margareten',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Margareten',
    anzahlGemeindebautenApprox: 80,
    bekannteBauten: ['Reumannhof (Hubert Gessner)', 'Metzleinstaler Hof (erster Großbau 1919)', 'Julius-Popp-Hof'],
    bedeutendeArchitekten: ['Hubert Gessner', 'Robert Kalesa', 'Heinrich Schmid'],
    denkmalgeschuetzteObjekte: 45,
    charakteristik: 'Das Herzstück der "Ringstraße des Proletariats" entlang des Margaretengürtels.'
  },
  {
    bezirk: 6,
    name: 'Mariahilf',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Mariahilf',
    anzahlGemeindebautenApprox: 20,
    bekannteBauten: ['Einwanggasse', 'Gumpendorfer Straße'],
    bedeutendeArchitekten: ['Viktor Fenzl', 'Josef Hoffmann Schüler'],
    denkmalgeschuetzteObjekte: 9,
    charakteristik: 'Dichte Blockrandbebauung mit grünen Innenhöfen am Wienfluss.'
  },
  {
    bezirk: 7,
    name: 'Neubau',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Neubau',
    anzahlGemeindebautenApprox: 25,
    bekannteBauten: ['Kaiserstraße', 'Zieglergasse'],
    bedeutendeArchitekten: ['Clemens Holzmeister', 'Hans Jaksch'],
    denkmalgeschuetzteObjekte: 11,
    charakteristik: 'Innerstädtische Wohnbauten nahe Museumsquartier und Spittelberg.'
  },
  {
    bezirk: 8,
    name: 'Josefstadt',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Josefstadt',
    anzahlGemeindebautenApprox: 15,
    bekannteBauten: ['Pfeilgasse 10–12', 'Albertgasse'],
    bedeutendeArchitekten: ['Franz Kaym', 'Alfons Hetmanek'],
    denkmalgeschuetzteObjekte: 7,
    charakteristik: 'Kleine, historisch wertvolle Ensembles im kleinsten Wiener Bezirk.'
  },
  {
    bezirk: 9,
    name: 'Alsergrund',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Alsergrund',
    anzahlGemeindebautenApprox: 45,
    bekannteBauten: ['Gall-Hof', 'Lichtentaler Hof'],
    bedeutendeArchitekten: ['Josef Frank', 'Adolf Loos (Mitarbeit)', 'Hans Glaser'],
    denkmalgeschuetzteObjekte: 21,
    charakteristik: 'Klassische Reformarchitektur mit begrünten Wohnhöfen nahe AKH und Donaukanal.'
  },
  {
    bezirk: 10,
    name: 'Favoriten',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Favoriten',
    anzahlGemeindebautenApprox: 230,
    bekannteBauten: ['George-Washington-Hof (1927–1930)', 'Per-Albin-Hansson-Siedlung', 'Victor-Adler-Hof'],
    bedeutendeArchitekten: ['Karl Krist', 'Robert Oerley', 'Franz Schuster'],
    denkmalgeschuetzteObjekte: 58,
    charakteristik: 'Größter Bezirk Wiens nach Einwohnern mit riesigen Parkanlagen und Pioniersiedlungen.'
  },
  {
    bezirk: 11,
    name: 'Simmering',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Simmering',
    anzahlGemeindebautenApprox: 130,
    bekannteBauten: ['Karl-Höger-Hof', 'Thürnlhofstraße'],
    bedeutendeArchitekten: ['Hugo George', 'Franz Kaym'],
    denkmalgeschuetzteObjekte: 34,
    charakteristik: 'Große Wohnanlagen mit parkähnlichen Höfen und dichter Baumbepflanzung.'
  },
  {
    bezirk: 12,
    name: 'Meidling',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Meidling',
    anzahlGemeindebautenApprox: 150,
    bekannteBauten: ['Fuchsenfeldhof (1922–1925, Schmid & Aichinger)', 'Am Schöpfwerk (1976–1980)'],
    bedeutendeArchitekten: ['Heinrich Schmid', 'Hermann Aichinger', 'Viktor Hufnagl'],
    denkmalgeschuetzteObjekte: 44,
    charakteristik: 'Verbindung von früher Gartenstadt-Romantik bis zur Großwohnsiedlung der 1970er.'
  },
  {
    bezirk: 13,
    name: 'Hietzing',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Hietzing',
    anzahlGemeindebautenApprox: 60,
    bekannteBauten: ['Siedlung Lockerwiese (1928–1932, Karl Krist)', 'Werkbundsiedlung (1932)'],
    bedeutendeArchitekten: ['Karl Krist', 'Josef Frank', 'Adolf Loos', 'Gerrit Rietveld'],
    denkmalgeschuetzteObjekte: 39,
    charakteristik: 'Weltberühmte Gartenstadt- und Mustersiedlungen in Ruhelage am Lainzer Tiergarten.'
  },
  {
    bezirk: 14,
    name: 'Penzing',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Penzing',
    anzahlGemeindebautenApprox: 110,
    bekannteBauten: ['Hugo-Breitner-Hof (1953–1956, 126.000 m² Grün)', 'Kienmayergasse'],
    bedeutendeArchitekten: ['Leo Kammel', 'Franz Schuster', 'Max Fellerer'],
    denkmalgeschuetzteObjekte: 29,
    charakteristik: 'Aufgelockerte Pavillonsiedlungen am Fuß des Wienerwalds mit maximalem Grünflächenanteil.'
  },
  {
    bezirk: 15,
    name: 'Rudolfsheim-Fünfhaus',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Rudolfsheim-F%C3%BCnfhaus',
    anzahlGemeindebautenApprox: 80,
    bekannteBauten: ['Vogelweidhof (1926–1927, "Märchenhof")', 'Klimtschgasse'],
    bedeutendeArchitekten: ['Leopold Simony', 'Josef Bittner'],
    denkmalgeschuetzteObjekte: 24,
    charakteristik: 'Berühmt für Kunst am Bau (Märchenreliefs & Fresken von Alfons Riedel).'
  },
  {
    bezirk: 16,
    name: 'Ottakring',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Ottakring',
    anzahlGemeindebautenApprox: 130,
    bekannteBauten: ['Sandleitenhof (1924–1928, 1.587 Wohnungen)', 'Gallitzinberg-Terrassen'],
    bedeutendeArchitekten: ['Emil Hoppe', 'Otto Schönthal', 'Franz Matuschek', 'Siegfried Theiss'],
    denkmalgeschuetzteObjekte: 46,
    charakteristik: 'Größter Gemeindebau des Roten Wien (nach Wohnungszahl) mit eigener Zentralbibliothek.'
  },
  {
    bezirk: 17,
    name: 'Hernals',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Hernals',
    anzahlGemeindebautenApprox: 70,
    bekannteBauten: ['Wohnhausanlage Alszeile 57–63', 'Türkenritter-Hof'],
    bedeutendeArchitekten: ['Theodor Schöll', 'Karl Ehn'],
    denkmalgeschuetzteObjekte: 26,
    charakteristik: 'Gartenhöfe mit altem Baumbestand entlang des früheren Alsbachs und Schafbergs.'
  },
  {
    bezirk: 18,
    name: 'Währing',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/W%C3%A4hring',
    anzahlGemeindebautenApprox: 50,
    bekannteBauten: ['Lindenhof (1924–1925, Karl Ehn)', 'Scheidlstraße'],
    bedeutendeArchitekten: ['Karl Ehn', 'Clemens Holzmeister'],
    denkmalgeschuetzteObjekte: 23,
    charakteristik: 'Eingebettet im Villen- und Cottage-Viertel nahe Türkenschanzpark und Pötzleinsdorf.'
  },
  {
    bezirk: 19,
    name: 'Döbling',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/D%C3%B6bling',
    anzahlGemeindebautenApprox: 100,
    bekannteBauten: [
      'Karl-Marx-Hof (1927–1930, Karl Ehn)', 
      'Krim / An den langen Lüssen (1951)', 
      'Ditteshof', 
      'Grinzinger Allee 54 (Referenz)'
    ],
    bedeutendeArchitekten: ['Karl Ehn', 'Peter Behrens', 'Josef Frank', 'Ernst Lichtblau'],
    denkmalgeschuetzteObjekte: 41,
    charakteristik: 'Weltberühmte Superblöcke (1,1 km Länge Karl-Marx-Hof) und Weingartenlagen.'
  },
  {
    bezirk: 20,
    name: 'Brigittenau',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Brigittenau',
    anzahlGemeindebautenApprox: 95,
    bekannteBauten: ['Wohnhausanlage Friedrich-Engels-Platz (1930–1933, Rudolf Perco)'],
    bedeutendeArchitekten: ['Rudolf Perco', 'Franz Schuster'],
    denkmalgeschuetzteObjekte: 31,
    charakteristik: 'Monumentale Toranlagen und geschlossene Höfe nahe Donaukanal und Millennium Tower.'
  },
  {
    bezirk: 21,
    name: 'Floridsdorf',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Floridsdorf',
    anzahlGemeindebautenApprox: 170,
    bekannteBauten: ['Karl-Seitz-Hof (1926–1931, Hubert Gessner)', 'Scheringgasse'],
    bedeutendeArchitekten: ['Hubert Gessner', 'Franz Schuster', 'Adolf Paregger'],
    denkmalgeschuetzteObjekte: 52,
    charakteristik: '"Gartenstadt im Großformat" mit markantem Uhrturm und riesigen Rosengärten.'
  },
  {
    bezirk: 22,
    name: 'Donaustadt',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Donaustadt',
    anzahlGemeindebautenApprox: 140,
    bekannteBauten: ['Goethehof (1928–1930, Hugo Mayer)', 'Rennbahnweg'],
    bedeutendeArchitekten: ['Hugo Mayer', 'Viktor Hufnagl'],
    denkmalgeschuetzteObjekte: 37,
    charakteristik: 'Direkt an der Alten Donau gelegen mit Bootshaus, Promenaden und Weite.'
  },
  {
    bezirk: 23,
    name: 'Liesing',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/Liesing',
    anzahlGemeindebautenApprox: 75,
    bekannteBauten: ['Atzgersdorf Siedlungen', 'Kaserngasse', 'Breitenfurter Straße'],
    bedeutendeArchitekten: ['Roland Rainer', 'Carl Auböck'],
    denkmalgeschuetzteObjekte: 19,
    charakteristik: 'Südliche Gartenstadtsiedlungen und Niedrigbauten am Liesingbach.'
  }
];

export const WIKIPEDIA_ENCYCLOPEDIA_STATS = {
  gesamtWohnungen: 220000,
  gesamtBauten: 2300,
  wienerEinwohnerInGemeindebauten: 500000,
  bevoelkerungsAnteilProzent: 25,
  
  rotesWien: {
    zeitraum: '1919–1934',
    anzahlBauten: 382,
    anzahlWohnungen: 65000,
    anzahlArchitekten: 199,
    leitmotiv: 'Licht, Luft und Sonne für alle – Abkehr von finsteren Bassena-Zinshäusern',
    ikonen: ['Karl-Marx-Hof', 'Sandleitenhof', 'Rabenhof', 'Reumannhof', 'Karl-Seitz-Hof']
  },
  
  nachkriegszeit: {
    zeitraum: '1947–1970er',
    anzahlWohnungenBis1970: 96000,
    pionierSiedlung: 'Per-Albin-Hansson-Siedlung (ab 1947)',
    leitmotiv: 'Aufgelockerte Zeilenbauweise, riesige Grün- und Freiflächen (z.B. Hugo-Breitner-Hof)'
  },

  denkmalschutzInfo: {
    behoerde: 'Bundesdenkmalamt (BDA) Österreich',
    bedeutung: 'Geschützt nach § 2a Denkmalschutzgesetz aufgrund herausragender architektonischer, geschichtlicher und kultureller Bedeutung.',
    kunstAmBau: 'Gesetzlich verankerte künstlerische Ausgestaltung (Reliefs, Keramikfriese, Plastiken, Wandmosaike, Zierbrunnen).'
  }
};
