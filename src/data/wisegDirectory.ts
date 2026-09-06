// Daten und Verzeichnis basierend auf:
// https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte

import { BezirkNummer, Gemeindebau, HofTyp } from '../types';

export const WIKIPEDIA_WISEG_URL = 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte';
export const WISEG_OFFICIAL_URL = 'https://www.wiseg.at';

export interface WisegObject {
  id: string;
  adresse: string;
  plz: string;
  bezirk: BezirkNummer;
  bezirkName: string;
  hauszeichen?: string; // Historischer Hausname (z.B. "Zu den drei Kronen", "Zum goldenen Hirschen")
  baujahr: number;
  bauzeitText: string;
  architekturStil: 'Biedermeier' | 'Klassizismus' | 'Spätbarock / Vorstadthaus' | 'Historismus / Gründerzeit' | 'Jugendstil';
  denkmalschutz: boolean;
  herisId?: string; // BDA HERIS-Nummer (Bundesdenkmalamt)
  wohnungenApprox: number;
  sanierungsstatus: 'Saniert' | 'In Sanierung / Substanzerhaltung' | 'Denkmalgerecht modernisiert' | 'Substanzerhalten';
  pawlatschenHof: boolean;
  ruheCharakteristik: string;
  schallpegelInnenhofDb: number;
  koordinaten: {
    lat: number;
    lng: number;
  };
  wikipediaUrl?: string;
  beschreibung: string;
  bildUrl?: string;
}

export const WISEG_INFO = {
  name: 'Wiener Substanzerhaltungsgesellschaft (WISEG)',
  definition: 'Atypische Gemeindebauten & historische Zinshäuser der Stadt Wien',
  wikipediaUrl: WIKIPEDIA_WISEG_URL,
  eigentuemer: 'Stadt Wien (Mehrheitseigentümer)',
  verwaltungUebernahme: 'Seit den 2010er Jahren von Wiener Wohnen übertragen',
  gesamtObjekteApprox: 100,
  denkmalschutzAnteil: 'Über 50 % stehen unter Bundesdenkmalschutz (BDA)',
  durchschnittlicheWohnungszahl: 'Selten mehr als 18 Wohnungen pro Haus (Familiärer Charakter)',
  
  warumAtypisch: [
    'Errichtet vor der Ära des Roten Wiens (18., 19. und frühes 20. Jahrhundert) von privaten Bauherren',
    'Gelangten durch historische Schenkungen, Erbschaften, Baurechte oder Stadterweiterungen in Gemeindebesitz',
    'Kleinteilige historische Substanz statt großflächiger Superblöcke',
    'Hoher denkmalpflegerischer Erhaltungsaufwand (Pawlatschengänge, Kastenfenster, Stuckfassaden, Hauszeichen)'
  ],

  vorteileFuerRuhesuchende: [
    'Sehr ruhige, kopfsteingepflasterte Pawlatschen-Innenhöfe, abgeschirmt vom Stadtverkehr',
    'Meterdicke Ziegelwände des Altbaus bieten hervorragenden Tritt- und Luftschallschutz',
    'Kleine Hausgemeinschaften (kein anonymer Großwohnungsbau)',
    'Geschützte Wohnlagen in historischen Vierteln (z.B. Spittelberg, Biedermeier-Kern Landstraße, Josefstadt)'
  ]
};

export const WISEG_OBJEKTE_LISTE: WisegObject[] = [
  {
    id: 'wiseg-gutenberggasse-19',
    adresse: 'Gutenberggasse 19',
    plz: '1070',
    bezirk: 7,
    bezirkName: 'Neubau (Spittelberg)',
    hauszeichen: 'Zu den drei Kronen',
    baujahr: 1790,
    bauzeitText: 'Spätes 18. Jahrhundert (Biedermeier-Kern)',
    architekturStil: 'Biedermeier',
    denkmalschutz: true,
    herisId: '24193',
    wohnungenApprox: 12,
    sanierungsstatus: 'Denkmalgerecht modernisiert',
    pawlatschenHof: true,
    ruheCharakteristik: 'Absolut verkehrsfreie Spittelberger Fußgängerzone; verwunschener Pawlatschenhof mit Weinlaub.',
    schallpegelInnenhofDb: 37,
    koordinaten: { lat: 48.2036, lng: 16.3551 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Spittelberg_(Wien)',
    beschreibung: 'Historisches Bürgerhaus "Zu den drei Kronen" im geschützten Ensemble Spittelberg mit idyllischem Pawlatschenhof.',
    bildUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-zirkusgasse-1',
    adresse: 'Zirkusgasse 1',
    plz: '1020',
    bezirk: 2,
    bezirkName: 'Leopoldstadt',
    hauszeichen: 'Zum goldenen Hirschen',
    baujahr: 1817,
    bauzeitText: '1817 (Klassizistisches Vorstadt-Zinshaus)',
    architekturStil: 'Klassizismus',
    denkmalschutz: true,
    herisId: '8493',
    wohnungenApprox: 14,
    sanierungsstatus: 'In Sanierung / Substanzerhaltung',
    pawlatschenHof: true,
    ruheCharakteristik: 'Kopfsteingepflasterter Innenhof mit Pawlatschengängen; durch hohe Baukörper komplett wind- und schallgeschützt.',
    schallpegelInnenhofDb: 40,
    koordinaten: { lat: 48.2162, lng: 16.3837 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Klassizistisches Biedermeierhaus mit reichem Schmiedeeisengeländer an den umlaufenden Pawlatschengängen.',
    bildUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-malzgasse-3',
    adresse: 'Malzgasse 3',
    plz: '1020',
    bezirk: 2,
    bezirkName: 'Leopoldstadt',
    baujahr: 1848,
    bauzeitText: '1848 (Früher Historismus)',
    architekturStil: 'Historismus / Gründerzeit',
    denkmalschutz: false,
    wohnungenApprox: 16,
    sanierungsstatus: 'Saniert',
    pawlatschenHof: true,
    ruheCharakteristik: 'Ruhige Wohnstraße im Karmeliterviertel ohne Durchzugsverkehr; begrünter Hoftrakt.',
    schallpegelInnenhofDb: 41,
    koordinaten: { lat: 48.2178, lng: 16.3794 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Traditionelles Vorstadt-Zinshaus nahe dem Augarten mit vollständig sanierter Altbausubstanz.',
    bildUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-rasumofskygasse-22',
    adresse: 'Rasumofskygasse 22',
    plz: '1030',
    bezirk: 3,
    bezirkName: 'Landstraße',
    hauszeichen: 'Zur Heiligen Dreifaltigkeit',
    baujahr: 1803,
    bauzeitText: '1803 (Biedermeier)',
    architekturStil: 'Biedermeier',
    denkmalschutz: true,
    herisId: '10696',
    wohnungenApprox: 10,
    sanierungsstatus: 'Denkmalgerecht modernisiert',
    pawlatschenHof: true,
    ruheCharakteristik: 'Hoftrakt liegt geschützt hinter der Straßenfront, alte Rosskastanie im Innenhof spendet Kühle und Ruhe.',
    schallpegelInnenhofDb: 38,
    koordinaten: { lat: 48.2045, lng: 16.3938 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Denkmalgeschütztes Vorstadthaus aus der Biedermeier-Ära mit originaler Treppenanlage und Innenhofgarten.',
    bildUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-kundmanngasse-35',
    adresse: 'Kundmanngasse 35–37',
    plz: '1030',
    bezirk: 3,
    bezirkName: 'Landstraße',
    baujahr: 1798,
    bauzeitText: '1798 (Spätbarock / Klassizismus)',
    architekturStil: 'Spätbarock / Vorstadthaus',
    denkmalschutz: false,
    wohnungenApprox: 15,
    sanierungsstatus: 'Substanzerhalten',
    pawlatschenHof: true,
    ruheCharakteristik: 'Kleine Sackgassen-Atmosphäre nahe dem Donaukanal; tiefer, schattiger Gartenhof.',
    schallpegelInnenhofDb: 39,
    koordinaten: { lat: 48.2031, lng: 16.3989 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Eines der ältesten städtischen Wohnhäuser im 3. Bezirk mit charakteristischen Holztüren und Pflasterung.',
    bildUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-landstrasser-hauptstrasse-98',
    adresse: 'Landstraßer Hauptstraße 98',
    plz: '1030',
    bezirk: 3,
    bezirkName: 'Landstraße',
    baujahr: 1877,
    bauzeitText: '1877 (Strenger Historismus)',
    architekturStil: 'Historismus / Gründerzeit',
    denkmalschutz: true,
    herisId: '10931',
    wohnungenApprox: 18,
    sanierungsstatus: 'In Sanierung / Substanzerhaltung',
    pawlatschenHof: false,
    ruheCharakteristik: 'Die hofseitigen Wohnungen blicken in die parkartigen Gärten der Nachbarhäuser und sind außergewöhnlich ruhig.',
    schallpegelInnenhofDb: 42,
    koordinaten: { lat: 48.1982, lng: 16.3971 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Repräsentatives Gründerzeithaus mit reich gegliederter Fassade und hohen Altbaudecken.',
    bildUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-wiedner-hauptstrasse-60b',
    adresse: 'Wiedner Hauptstraße 60b',
    plz: '1040',
    bezirk: 4,
    bezirkName: 'Wieden',
    baujahr: 1820,
    bauzeitText: '1820 (Biedermeier)',
    architekturStil: 'Biedermeier',
    denkmalschutz: false,
    wohnungenApprox: 12,
    sanierungsstatus: 'Denkmalgerecht modernisiert',
    pawlatschenHof: true,
    ruheCharakteristik: 'Tief im Hoftrakt gelegen; die dicke Vorderfront schluckt jeden Straßenlärm vollständig.',
    schallpegelInnenhofDb: 39,
    koordinaten: { lat: 48.1918, lng: 16.3654 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Romantisches Hoftrakt-Zinshaus im Botschaftsviertel Wieden mit begrüntem Innenhof.',
    bildUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-albertgasse-30',
    adresse: 'Albertgasse 30',
    plz: '1080',
    bezirk: 8,
    bezirkName: 'Josefstadt',
    hauszeichen: 'Hamerlinghof',
    baujahr: 1905,
    bauzeitText: '1905 (Späthistorismus / Jugendstil)',
    architekturStil: 'Jugendstil',
    denkmalschutz: true,
    herisId: '41804',
    wohnungenApprox: 17,
    sanierungsstatus: 'Saniert',
    pawlatschenHof: false,
    ruheCharakteristik: 'Gehobene josefstädter Wohnlage mit ruhiger Einbahnstraße und hoher Wohnqualität.',
    schallpegelInnenhofDb: 40,
    koordinaten: { lat: 48.2125, lng: 16.3448 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Der "Hamerlinghof" in der Josefstadt besticht durch Jugendstil-Dekor, Messingbeschläge und gepflegtes Entree.',
    bildUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-waehringer-strasse-41',
    adresse: 'Währinger Straße 41',
    plz: '1090',
    bezirk: 9,
    bezirkName: 'Alsergrund',
    baujahr: 1825,
    bauzeitText: '1825 (Biedermeier)',
    architekturStil: 'Biedermeier',
    denkmalschutz: true,
    herisId: '11543',
    wohnungenApprox: 11,
    sanierungsstatus: 'Denkmalgerecht modernisiert',
    pawlatschenHof: true,
    ruheCharakteristik: 'Gartenhof mit alten Kletterrosen und ruhiger Hofstiege.',
    schallpegelInnenhofDb: 38,
    koordinaten: { lat: 48.2199, lng: 16.3562 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Historisches Biedermeier-Wohnhaus mit erhaltenen Holzstiegen und ruhigen Wohnungen zum Garten.',
    bildUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-lainzer-strasse-148',
    adresse: 'Lainzer Straße 148',
    plz: '1130',
    bezirk: 13,
    bezirkName: 'Hietzing',
    baujahr: 1860,
    bauzeitText: '1860 (Hietzinger Vorstadt-Bürgerhaus)',
    architekturStil: 'Klassizismus',
    denkmalschutz: true,
    herisId: '41712',
    wohnungenApprox: 8,
    sanierungsstatus: 'Saniert',
    pawlatschenHof: false,
    ruheCharakteristik: 'Dörflicher Charakter Alt-Hietzings, großer Obstbaumgarten hinter dem Gebäude.',
    schallpegelInnenhofDb: 36,
    koordinaten: { lat: 48.1795, lng: 16.2867 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Kleinteiliges Hietzinger Bürgerhaus mit nur 8 Wohnungen und direktem Gartenbezug nahe Lainzer Tiergarten.',
    bildUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-huettelbergstrasse-26a',
    adresse: 'Hüttelbergstraße 26A',
    plz: '1140',
    bezirk: 14,
    bezirkName: 'Penzing',
    baujahr: 1875,
    bauzeitText: '1875 (Historismus im Wienerwald)',
    architekturStil: 'Historismus / Gründerzeit',
    denkmalschutz: false,
    wohnungenApprox: 9,
    sanierungsstatus: 'Substanzerhalten',
    pawlatschenHof: false,
    ruheCharakteristik: 'Unmittelbare Waldrandnähe am Hüttelberg; reine Waldluft und absolutes Vogelgezwitscher.',
    schallpegelInnenhofDb: 35,
    koordinaten: { lat: 48.2098, lng: 16.2534 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Idyllisches Stadtrand-Zinshaus am Fuß des Satzberges, umgeben von altem Baumbestand.',
    bildUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-wigandgasse-25',
    adresse: 'Wigandgasse 25',
    plz: '1190',
    bezirk: 19,
    bezirkName: 'Döbling (Nußdorf)',
    baujahr: 1835,
    bauzeitText: '1835 (Biedermeier Weinhauerhaus)',
    architekturStil: 'Biedermeier',
    denkmalschutz: true,
    herisId: '52611',
    wohnungenApprox: 7,
    sanierungsstatus: 'Denkmalgerecht modernisiert',
    pawlatschenHof: true,
    ruheCharakteristik: 'Kopfsteingepflasterte Heurigen-Gasse in Nußdorf, abends absolut still.',
    schallpegelInnenhofDb: 35,
    koordinaten: { lat: 48.2582, lng: 16.3688 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Ehemaliges Weinhauerhaus mit idyllischem Innenhof, Pawlatschengängen und Blick in die Döblinger Weingärten.',
    bildUrl: 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-baeckerstrasse-9',
    adresse: 'Bäckerstraße 9',
    plz: '1010',
    bezirk: 1,
    bezirkName: 'Innere Stadt',
    baujahr: 1650,
    bauzeitText: '17. Jahrhundert (Frühbarockes Bürgerhaus)',
    architekturStil: 'Spätbarock / Vorstadthaus',
    denkmalschutz: true,
    herisId: '30372',
    wohnungenApprox: 10,
    sanierungsstatus: 'Denkmalgerecht modernisiert',
    pawlatschenHof: true,
    ruheCharakteristik: 'Mittelalterlich anmutender Pawlatschenhof im Universitätsviertel; trotz Innenstadtlage eine Oase der Stille.',
    schallpegelInnenhofDb: 39,
    koordinaten: { lat: 48.2091, lng: 16.3762 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/B%C3%A4ckerstra%C3%9Fe_(Wien)',
    beschreibung: 'Eines der historisch wertvollsten Altstadthäuser Wiens mit stuckierten Pawlatschengängen und historischem Brunnen.',
    bildUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wiseg-scherbangasse-4',
    adresse: 'Scherbangasse 4',
    plz: '1230',
    bezirk: 23,
    bezirkName: 'Liesing (Atzgersdorf)',
    baujahr: 1888,
    bauzeitText: '1888 (Gründerzeit)',
    architekturStil: 'Historismus / Gründerzeit',
    denkmalschutz: false,
    wohnungenApprox: 14,
    sanierungsstatus: 'Saniert',
    pawlatschenHof: false,
    ruheCharakteristik: 'Ruhige Wohngegend in Atzgersdorf mit begrüntem Gartenareal.',
    schallpegelInnenhofDb: 38,
    koordinaten: { lat: 48.1492, lng: 16.3021 },
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte',
    beschreibung: 'Historisches Zinshaus im alten Ortskern Atzgersdorfs mit familiärer Bewohnerstruktur.',
    bildUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'
  }
];

// Helper to convert a WISEG object to a standard Gemeindebau object for map and search
export function convertWisegToGemeindebau(w: WisegObject): Gemeindebau {
  return {
    id: w.id,
    name: w.hauszeichen ? `${w.hauszeichen} (${w.adresse})` : `Zinshaus ${w.adresse}`,
    adresse: w.adresse,
    plz: w.plz,
    bezirk: w.bezirk,
    bezirkName: w.bezirkName,
    baujahr: w.baujahr,
    wohnungenAnzahl: w.wohnungenApprox,
    koordinaten: w.koordinaten,
    ruheScore: Math.min(10, Math.round((60 - w.schallpegelInnenhofDb) / 2.2)),
    hofTyp: (w.pawlatschenHof ? 'Historischer Pawlatschenhof' : 'Geschlossener Gartenhof') as HofTyp,
    liftStatus: 'Lift mit Halbstock-Stufen',
    isStufenlos: false,
    hoehenmeter: '170–185 m ü. A.',
    hoehenmeterMin: 170,
    hoehenmeterMax: 185,
    hoehenmeterSpanne: 15,
    gelaendeTyp: 'Eben / Flachland',
    topographieHinweis: 'Ebenes Terrain im Altstadt- bzw. Vorstadtbereich, Kopfsteinpflaster im Innenhof.',
    akustikDbInnenhof: w.schallpegelInnenhofDb,
    akustikDbStrasse: 62,
    laermPegelTag: 52,
    laermPegelNacht: 40,
    bimBusDistanzMeter: 180,
    naechsteStation: `${w.bezirkName} Zentrum`,
    linien: ['Bim', 'Bus', 'U-Bahn'],
    vorteileSenioren: [
      'Familiäre Hausgemeinschaft (unter 18 Parteien)',
      'Hervorragender Schallschutz durch dickes Ziegelmauerwerk',
      'Herrlicher, kopfsteingepflasterter Innenhof / Pawlatschengarten',
      'Denkmalgeschütztes Wiener Altbau-Flair mit hohen Decken'
    ],
    nachteileSenioren: [
      'Teils historische Stufen am Hauseingang oder Halbstock-Lift',
      'Historisches Kastenfenster-System erfordert fachgerechte Pflege'
    ],
    tippFuerRuhesuchende: w.ruheCharakteristik,
    gruenraumBeschreibung: 'Intimer Innenhof mit Pawlatschengängen, Pflanzentrögen und Altbaumbestand.',
    bildUrl: w.bildUrl,
    wikipediaUrl: w.wikipediaUrl || WIKIPEDIA_WISEG_URL,
    wikipediaDistrictListUrl: WIKIPEDIA_WISEG_URL,
    denkmalschutz: w.denkmalschutz,
    bdaObjektId: w.herisId,
    bauEpoche: 'Bürgerhaus & Gründerzeit (WISEG)',
    isWiseg: true,
    hauszeichen: w.hauszeichen,
    herisId: w.herisId,
    wisegSanierungsstatus: w.sanierungsstatus === 'Saniert' ? 'Saniert' : w.sanierungsstatus === 'In Sanierung / Substanzerhaltung' ? 'In Sanierung' : 'Substanzerhalten'
  };
}
