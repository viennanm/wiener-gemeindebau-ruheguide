export type BauEpoche =
  | 'Bürgerhaus & Gründerzeit (WISEG)'
  | 'Rotes Wien (1919–1934)'
  | 'Wiederaufbau & Nachkriegszeit (1945–1979)'
  | 'Postmoderne & Zeitgenössisch'
  | 'Gemeindebau NEU';

export type HofTyp =
  | 'Parkartiger Großhof'
  | 'Geschlossener Gartenhof'
  | 'Historischer Pawlatschenhof'
  | 'Pavillon-Siedlung im Grünen'
  | 'Hanglage mit Terrassengärten'
  | 'Straßenseitig mit Hofgarten';

export type GelaendeTyp =
  | 'Eben / Flachland'
  | 'Sanfte Neigung'
  | 'Terrassierte Hanglage'
  | 'Hanglage am Wienerwald';

export type LiftStatus =
  | 'Stufenloser Lift (ebenerdig)'
  | 'Lift mit Halbstock-Stufen'
  | 'Kein Lift vorhanden';

export type BezirkNummer =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23;

export interface WienerBezirkInfo {
  nummer: BezirkNummer;
  name: string;
  charakter: string;
  typischeHoehe: string;
  gelaendeCharakteristik?: string;
  seniorenEmpfehlung?: string;
}

export interface Gemeindebau {
  id: string;
  name: string;
  adresse: string;
  plz: string;
  bezirk: BezirkNummer;
  bezirkName: string;
  baujahr: number;
  architekt?: string;
  wohnungenAnzahl: number;

  // Koordinaten & Street View
  koordinaten: {
    lat: number;
    lng: number;
  };
  googleStreetViewUrl?: string;

  // Metriken
  ruheScore: number; // 1 bis 10
  hofTyp: HofTyp;
  liftStatus: LiftStatus;
  isStufenlos: boolean;

  // Höhenmeter & Geländetopographie (m ü. A. mit von-bis Spanne)
  hoehenmeter: string; // z.B. "168–172 m ü. A." oder "258–278 m ü. A."
  hoehenmeterMin: number;
  hoehenmeterMax: number;
  hoehenmeterSpanne: number; // Höhendifferenz der Wohnhausanlage
  gelaendeTyp: GelaendeTyp;
  topographieHinweis: string; // Bewertung der Steigungen / Barrierefreiheit

  // Akustik & Lärmkataster Wien (LDEN / LNIGHT)
  akustikDbInnenhof: number; // z.B. 42 dB(A)
  akustikDbStrasse: number; // z.B. 68 dB(A)
  laermPegelTag: number; // LDEN
  laermPegelNacht: number; // LNIGHT

  // Öffi-Anbindung
  bimBusDistanzMeter: number; // ideal: 150 - 300 m
  naechsteStation: string;
  linien: string[];

  // Ausgewählte Vor- und Nachteile
  vorteileSenioren: string[];
  nachteileSenioren: string[];
  tippFuerRuhesuchende: string;
  gruenraumBeschreibung: string;

  // Bild / Impression & Urheberrecht
  bildUrl?: string;
  bildFotograf?: string;
  bildLizenz?: string;
  bildQuellseiteUrl?: string;
  ogdId?: string;

  // Wikipedia & Denkmal-Register (Liste der Wiener Gemeindebauten)
  wikipediaUrl?: string;
  wikipediaDistrictListUrl?: string;
  denkmalschutz?: boolean;
  bdaObjektId?: string;
  kunstAmBau?: string;
  bauEpoche?: BauEpoche;

  // WISEG - Atypische Gemeindebauten & historische Zinshäuser
  isWiseg?: boolean;
  hauszeichen?: string; // Historischer Hausname (z.B. "Zu den drei Kronen")
  herisId?: string; // BDA HERIS-Inventarnummer
  wisegSanierungsstatus?: 'Saniert' | 'In Sanierung' | 'Substanzerhalten';

  // Phase 6: Amtliche Umfeldstatistik auf Zählbezirksebene
  umfeldstatistik?: Umfeldstatistik;
}

export interface Umfeldstatistik {
  raeumlicheEbene: 'Zählbezirk';
  zaehlgebietCode: string;
  zaehlbezirkCode: string;
  prognoseregionCode: string;
  gemeindebezirkCode: string;
  gebietstyp?: string | null;
  aggregierterGebietstyp?: string | null;
  datenstand: string;
  einwohner?: number | null;
  hauptwohnsitzwohnungen?: number | null;
  bevoelkerungsdichtePersonenJeHektar?: number | null;
  anteilUnter15Prozent?: number | null;
  anteilPensionsbezugProzent?: number | null;
  anteilPersonenInHauptmieteProzent?: number | null;
  bevoelkerungsentwicklung2011Bis2023Prozent?: number | null;
  bevoelkerungsentwicklung2011Bis2023ProJahr?: number | null;
  bevoelkerungsentwicklung2021Bis2023Prozent?: number | null;
  bevoelkerungsentwicklung2021Bis2023ProJahr?: number | null;
  qualitaetsstatus: string;
  hinweis: string;
}

export type HoehenlageFilter = 'ALL' | 'TIEF' | 'MITTEL' | 'HOCH' | 'PANORAMA';

export type UmfeldDichteFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type UmfeldEntwicklungFilter = 'ALL' | 'RUECKLAEUFIG' | 'STABIL' | 'WACHSEND' | 'STARK_WACHSEND';
export type UmfeldPensionsbezugFilter = 'ALL' | 'UNDER_15' | '15_TO_20' | '20_TO_25' | 'OVER_25';

export interface FilterState {
  searchText: string;
  selectedBezirk: BezirkNummer | 'ALL';
  minRuheScore: number;
  onlyStufenlosLift: boolean;
  maxBimDistanz: number;
  onlyFlatTerrain?: boolean;
  selectedHoehenlage?: HoehenlageFilter;
  onlyDenkmalschutz?: boolean;
  onlyWiseg?: boolean;
  selectedEpoche?: BauEpoche | 'ALL';
  selectedUmfeldDichte?: UmfeldDichteFilter;
  selectedUmfeldEntwicklung?: UmfeldEntwicklungFilter;
  selectedUmfeldPensionsbezug?: UmfeldPensionsbezugFilter;
}

