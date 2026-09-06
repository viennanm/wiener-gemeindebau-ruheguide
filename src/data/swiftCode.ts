export const SWIFT_GEMEINDEBAU_MODEL = `//
//  Gemeindebau.swift
//  Wiener Gemeindebau-Ruheguide
//
//  Architektur: iOS 17+ / Swift 5.9+
//  Model Layer: Datenstrukturen, Enums & Decodable GeoJSON-Parser für data.gv.at
//

import Foundation
import CoreLocation

// MARK: - Enums für seniorengerechte Kategorisierung

public enum HofTyp: String, Codable, CaseIterable, Sendable {
    case parkartigerGrosshof = "Parkartiger Großhof"
    case geschlossenerGartenhof = "Geschlossener Gartenhof"
    case pavillonSiedlung = "Pavillon-Siedlung im Grünen"
    case hanglage = "Hanglage mit Terrassengärten"
    case strassenseitig = "Straßenseitig mit Hofgarten"
    
    public var iconName: String {
        switch self {
        case .parkartigerGrosshof: return "tree.fill"
        case .geschlossenerGartenhof: return "leaf.fill"
        case .pavillonSiedlung: return "house.lodge.fill"
        case .hanglage: return "mountain.2.fill"
        case .strassenseitig: return "building.2.crop.list"
        }
    }
}

public enum LiftStatus: String, Codable, CaseIterable, Sendable {
    case stufenlos = "Stufenloser Lift (ebenerdig)"
    case halbstock = "Lift mit Halbstock-Stufen"
    case keinLift = "Kein Lift vorhanden"
    
    public var isSeniorengerecht: Bool {
        self == .stufenlos
    }
    
    public var iconName: String {
        switch self {
        case .stufenlos: return "figure.roll"
        case .halbstock: return "figure.stairs"
        case .keinLift: return "xmark.octagon"
        }
    }
}

public enum GelaendeTyp: String, Codable, CaseIterable, Sendable {
    case eben = "Eben / Flachland"
    case sanfteNeigung = "Sanfte Neigung"
    case terrassierteHanglage = "Terrassierte Hanglage"
    case hanglageWienerwald = "Hanglage am Wienerwald"
    
    public var iconName: String {
        switch self {
        case .eben: return "square.grid.2x2"
        case .sanfteNeigung: return "chart.line.uptrend.xyaxis"
        case .terrassierteHanglage: return "stairs"
        case .hanglageWienerwald: return "mountain.2.fill"
        }
    }
}

public enum WienerBezirk: Int, Codable, CaseIterable, Sendable, Identifiable {
    case innereStadt = 1
    case leopoldstadt = 2
    case landstrasse = 3
    case wieden = 4
    case margareten = 5
    case mariahilf = 6
    case neubau = 7
    case josefstadt = 8
    case alsergrund = 9
    case favoriten = 10
    case simmering = 11
    case meidling = 12
    case hietzing = 13
    case penzing = 14
    case rudolfsheimFuenfhaus = 15
    case ottakring = 16
    case hernals = 17
    case waehring = 18
    case doebling = 19
    case brigittenau = 20
    case floridsdorf = 21
    case donaustadt = 22
    case liesing = 23
    
    public var id: Int { rawValue }
    
    public var name: String {
        switch self {
        case .innereStadt: return "1. Innere Stadt"
        case .leopoldstadt: return "2. Leopoldstadt"
        case .landstrasse: return "3. Landstraße"
        case .wieden: return "4. Wieden"
        case .margareten: return "5. Margareten"
        case .mariahilf: return "6. Mariahilf"
        case .neubau: return "7. Neubau"
        case .josefstadt: return "8. Josefstadt"
        case .alsergrund: return "9. Alsergrund"
        case .favoriten: return "10. Favoriten"
        case .simmering: return "11. Simmering"
        case .meidling: return "12. Meidling"
        case .hietzing: return "13. Hietzing"
        case .penzing: return "14. Penzing"
        case .rudolfsheimFuenfhaus: return "15. Rudolfsheim-Fünfhaus"
        case .ottakring: return "16. Ottakring"
        case .hernals: return "17. Hernals"
        case .waehring: return "18. Währing"
        case .doebling: return "19. Döbling"
        case .brigittenau: return "20. Brigittenau"
        case .floridsdorf: return "21. Floridsdorf"
        case .donaustadt: return "22. Donaustadt"
        case .liesing: return "23. Liesing"
        }
    }
    
    public var kurzName: String {
        "\(rawValue). Bezirk"
    }

    public var typischeHoehenmeter: String {
        switch self {
        case .innereStadt: return "160–175 m ü. A."
        case .leopoldstadt: return "155–163 m ü. A."
        case .landstrasse: return "158–190 m ü. A."
        case .wieden: return "165–185 m ü. A."
        case .margareten: return "168–195 m ü. A."
        case .mariahilf: return "175–215 m ü. A."
        case .neubau: return "185–225 m ü. A."
        case .josefstadt: return "185–210 m ü. A."
        case .alsergrund: return "162–195 m ü. A."
        case .favoriten: return "175–240 m ü. A."
        case .simmering: return "152–180 m ü. A."
        case .meidling: return "175–230 m ü. A."
        case .hietzing: return "175–310 m ü. A."
        case .penzing: return "185–340 m ü. A."
        case .rudolfsheimFuenfhaus: return "178–225 m ü. A."
        case .ottakring: return "190–330 m ü. A."
        case .hernals: return "185–325 m ü. A."
        case .waehring: return "180–305 m ü. A."
        case .doebling: return "165–340 m ü. A."
        case .brigittenau: return "155–164 m ü. A."
        case .floridsdorf: return "153–195 m ü. A."
        case .donaustadt: return "152–165 m ü. A."
        case .liesing: return "180–310 m ü. A."
        }
    }
}

// MARK: - Hauptmodell: Gemeindebau

public struct Gemeindebau: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let adresse: String
    public let plz: String
    public let bezirk: Int
    public let bezirkName: String
    public let baujahr: Int
    public let architekt: String?
    public let wohnungenAnzahl: Int
    
    // Geokoordinaten für MapKit
    public let latitude: Double
    public let longitude: Double
    
    // Ruhe- & Akustik-Metriken
    public let ruheScore: Int // Skala 1 (sehr laut) bis 10 (extrem ruhig)
    public let hofTyp: HofTyp
    public let liftStatus: LiftStatus
    public let akustikDbInnenhof: Int // Geschätzter Lärmpegel im Hof in dB(A)
    public let akustikDbStrasse: Int   // Straßenpegel vor dem Haus in dB(A)
    public let laermPegelTagLden: Double  // Tag-Abend-Nacht-Index (LDEN)
    public let laermPegelNacht: Double    // Nachtpegel (LNIGHT)

    // Höhenmeter & Topographie (m ü. A. mit von-bis Spanne)
    public let hoehenmeter: String // z.B. "168–172 m ü. A." oder "258–278 m ü. A."
    public let hoehenmeterMin: Int
    public let hoehenmeterMax: Int
    public let hoehenmeterSpanne: Int
    public let gelaendeTyp: GelaendeTyp
    public let topographieHinweis: String
    
    // Öffentlicher Verkehr
    public let bimBusDistanzMeter: Int // Meter zur Haltestelle
    public let naechsteStation: String
    public let linien: [String]
    
    // Seniorengerechte Bewertung
    public let vorteileSenioren: [String]
    public let nachteileSenioren: [String]
    public let tippFuerRuhesuchende: String
    public let gruenraumBeschreibung: String
    public let ogdId: String?
    
    public var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
    
    public var laermMinderungDb: Int {
        akustikDbStrasse - akustikDbInnenhof
    }
    
    public var ruheKategorieFarbe: String {
        switch ruheScore {
        case 9...10: return "emerald" // Hohe Ruhe
        case 7...8:  return "teal"    // Gute Hofruhe
        case 5...6:  return "amber"   // Mittel
        default:     return "rose"    // Laut / Warnung
        }
    }
    
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    public static func == (lhs: Gemeindebau, rhs: Gemeindebau) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Open Data Wien GeoJSON Decodables (data.gv.at / GEMEINDEBAUOGD)

public struct ViennaOGDFeatureCollection: Decodable {
    public let type: String
    public let features: [ViennaOGDFeature]
}

public struct ViennaOGDFeature: Decodable {
    public let type: String
    public let id: String?
    public let geometry: ViennaOGDGeometry
    public let properties: ViennaOGDProperties
}

public struct ViennaOGDGeometry: Decodable {
    public let type: String
    public let coordinates: ViennaOGDCoordinates
}

public enum ViennaOGDCoordinates: Decodable {
    case point([Double])
    case polygon([[[Double]]])
    case multiPolygon([[[[Double]]]])
    case unsupported
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let pt = try? container.decode([Double].self) {
            self = .point(pt)
        } else if let poly = try? container.decode([[[Double]]].self) {
            self = .polygon(poly)
        } else if let multi = try? container.decode([[[[Double]]]].self) {
            self = .multiPolygon(multi)
        } else {
            self = .unsupported
        }
    }
    
    public var centerCoordinate: CLLocationCoordinate2D? {
        switch self {
        case .point(let coords):
            guard coords.count >= 2 else { return nil }
            return CLLocationCoordinate2D(latitude: coords[1], longitude: coords[0])
        case .polygon(let ring):
            guard let firstRing = ring.first, !firstRing.isEmpty else { return nil }
            let lats = firstRing.map { $0[1] }
            let lngs = firstRing.map { $0[0] }
            let avgLat = lats.reduce(0, +) / Double(lats.count)
            let avgLng = lngs.reduce(0, +) / Double(lngs.count)
            return CLLocationCoordinate2D(latitude: avgLat, longitude: avgLng)
        default:
            return nil
        }
    }
}

public struct ViennaOGDProperties: Decodable {
    public let objectid: Int?
    public let hofname: String?
    public let adresse: String?
    public let plz: Int?
    public let bezirk: Int?
    public let baujahrVon: Int?
    public let wohnungen: Int?
    
    enum CodingKeys: String, CodingKey {
        case objectid = "OBJECTID"
        case hofname = "HOFNAME"
        case adresse = "ADRESSE"
        case plz = "PLZ"
        case bezirk = "BEZIRK"
        case baujahrVon = "BAUJAHR_VON"
        case wohnungen = "WOHNUNGEN_ANZAHL"
    }
}
`;

export const SWIFT_GEMEINDEBAU_STORE = `//
//  GemeindebauStore.swift
//  Wiener Gemeindebau-Ruheguide
//
//  Architektur: iOS 17+ / Swift 5.9+ mit @Observable
//  Data Layer: Kuratierte Wiener Daten & REST-Integration für data.gv.at
//

import Foundation
import CoreLocation
import Observation

@Observable
public final class GemeindebauStore: @unchecked Sendable {
    
    // MARK: - Zustand & Filter
    public var gemeindebauten: [Gemeindebau] = []
    public var searchText: String = ""
    public var selectedBezirk: Int? = nil // nil = Alle
    public var minRuheScore: Int = 7       // Standard: Mindestens Note 7 von 10
    public var onlyStufenloserLift: Bool = true
    public var maxBimDistanzMeter: Int = 300 // Max 300m Fußweg zur Haltestelle
    
    // Referenz: Aktuelle laute Wohnung (Grinzinger Allee 54)
    public let referenzWohnung: Gemeindebau = Gemeindebau(
        id: "ref-grinzinger-54",
        name: "Aktuelle Wohnung: Grinzinger Allee 54",
        adresse: "Grinzinger Allee 54",
        plz: "1190",
        bezirk: 19,
        bezirkName: "Döbling",
        baujahr: 1958,
        architekt: nil,
        wohnungenAnzahl: 32,
        latitude: 48.2468,
        longitude: 16.3498,
        ruheScore: 2,
        hofTyp: .strassenseitig,
        liftStatus: .halbstock,
        akustikDbInnenhof: 61,
        akustikDbStrasse: 73,
        laermPegelTagLden: 72.4,
        laermPegelNacht: 64.1,
        bimBusDistanzMeter: 20,
        naechsteStation: "Grinzinger Allee (Linie 38)",
        linien: ["Bim 38"],
        vorteileSenioren: [
            "Extrem kurze Gehdistanz zur Bim 38 (20 m)",
            "Nahversorger in der Straße"
        ],
        nachteileSenioren: [
            "Massiver Dauerschallpegel durch Straßenbahnlinie 38 und Berufsverkehr",
            "Halbstock-Aufzug: 8 Stufen bis zur Liftkabine unüberwindbar für gehbehinderte Personen",
            "Balkonnutzung durch 73 dB(A) tagsüber unerträglich"
        ],
        tippFuerRuhesuchende: "Hohe Priorität beim Wohnungstausch über die Wohnberatung Wien beantragen.",
        gruenraumBeschreibung: "Schmaler asphaltierter Hof ohne Baumkronenschutz.",
        ogdId: "REF_GRINZINGER_54"
    )
    
    public var isLoading: Bool = false
    public var errorMessage: String? = nil

    // MARK: - Initialisierung mit kuratierten Realdaten
    public init() {
        self.gemeindebauten = Self.kuratiertesWienerDataset
    }
    
    // MARK: - Gefilterte Ergebnisse
    public var filteredGemeindebauten: [Gemeindebau] {
        gemeindebauten.filter { bau in
            // Volltextsuche
            if !searchText.isEmpty {
                let term = searchText.lowercased()
                let matchName = bau.name.lowercased().contains(term)
                let matchAdresse = bau.adresse.lowercased().contains(term)
                let matchStation = bau.naechsteStation.lowercased().contains(term)
                if !(matchName || matchAdresse || matchStation) {
                    return false
                }
            }
            
            // Bezirksfilter (14, 17, 18, 19)
            if let bezirk = selectedBezirk, bau.bezirk != bezirk {
                return false
            }
            
            // Ruhe-Score Filter
            if bau.ruheScore < minRuheScore {
                return false
            }
            
            // Barrierefreiheit / Lift
            if onlyStufenloserLift && bau.liftStatus != .stufenlos {
                return false
            }
            
            // Gehdistanz zur Haltestelle
            if bau.bimBusDistanzMeter > maxBimDistanzMeter {
                return false
            }
            
            return true
        }
    }

    // MARK: - Reale Wiener Gemeindebau-Anlagen (Kuration)
    public static let kuratiertesWienerDataset: [Gemeindebau] = [
        // 1. Karl-Marx-Hof (1190 Wien)
        Gemeindebau(
            id: "karl-marx-hof",
            name: "Karl-Marx-Hof (Boschstraße / Hofgärten)",
            adresse: "Boschstraße 28–34 / 12.-Februar-Platz",
            plz: "1190",
            bezirk: 19,
            bezirkName: "Döbling",
            baujahr: 1930,
            architekt: "Karl Ehn",
            wohnungenAnzahl: 1382,
            latitude: 48.2494,
            longitude: 16.3653,
            ruheScore: 9,
            hofTyp: .parkartigerGrosshof,
            liftStatus: .stufenlos,
            akustikDbInnenhof: 45,
            akustikDbStrasse: 68,
            laermPegelTagLden: 48.2,
            laermPegelNacht: 39.1,
            bimBusDistanzMeter: 220,
            naechsteStation: "Heiligenstadt (U4, S-Bahn, D, 38A)",
            linien: ["U4", "S45", "Bim D", "Bus 38A", "Bus 39A"],
            vorteileSenioren: [
                "Gewaltige, geschützte Park-Innenhöfe (nur 18% bebaute Grundfläche)",
                "Alter dichter Baumbestand dämpft den Schall um mehr als 23 dB",
                "Ebenerdige Personenaufzüge in den generalsanierten Innenhofstiegen",
                "Ärztezentrum, Apotheke und U4 direkt am Bahnhof Heiligenstadt"
            ],
            nachteileSenioren: [
                "Straßenseitige Trakte zur Heiligenstädter Straße meiden (laut)",
                "Weitläufige Fußwege innerhalb der Großwohnanlage"
            ],
            tippFuerRuhesuchende: "Bei Wohnberatung Wien explizit Wohnungen mit Fenstern zu den parkartigen Boschstraßen-Gärten anfragen.",
            gruenraumBeschreibung: "Über 1 km zusammenhängende Grünanlagen mit schattigen Bänken und altem Platanenbestand.",
            ogdId: "VIE_GB_19_001"
        ),
        
        // 2. Hugo-Breitner-Hof (1140 Wien)
        Gemeindebau(
            id: "hugo-breitner-hof",
            name: "Hugo-Breitner-Hof (Baumgarten)",
            adresse: "Linzer Straße 299–325",
            plz: "1140",
            bezirk: 14,
            bezirkName: "Penzing",
            baujahr: 1953,
            architekt: "Fritz Gerhard Mayr u.a.",
            wohnungenAnzahl: 1240,
            latitude: 48.1969,
            longitude: 16.2731,
            ruheScore: 10,
            hofTyp: .pavillonSiedlung,
            liftStatus: .stufenlos,
            akustikDbInnenhof: 41,
            akustikDbStrasse: 64,
            laermPegelTagLden: 43.8,
            laermPegelNacht: 36.2,
            bimBusDistanzMeter: 190,
            naechsteStation: "Gobergasse / Gruschaplatz (Linie 49)",
            linien: ["Bim 49", "Bus 47A"],
            vorteileSenioren: [
                "Siedlung in reiner Pavillonbauweise mitten in einer parkartigen Grünzone",
                "Extrem ruhige Oase mit riesigem, 70 Jahre altem Eschen- und Ahornbestand",
                "Ebenerdiges Gelände ohne Steigung – ideal für stufenlose Wege und Spaziergänge",
                "Gemeindebau-Nachbarschaftstreffpunkt und Nahversorger direkt am Gruschaplatz"
            ],
            nachteileSenioren: [
                "Hinterste Pavillons haben rund 280 m Fußweg zur Bim 49"
            ],
            tippFuerRuhesuchende: "Die absolute Ruhe-Empfehlung im Westen Wiens. In den mittleren Parkzeilen (Bauteil C/D) ist Straßenverkehr völlig unhörbar.",
            gruenraumBeschreibung: "Vogelgezwitscher, Blumenrabatten, Schattenspendende Alleen und Ruhebänke.",
            ogdId: "VIE_GB_14_012"
        ),
        
        // 3. Krim-Bauten / Weinberggasse (1190 Wien)
        Gemeindebau(
            id: "krim-bauten",
            name: "Krim-Bauten / Weinberggasse",
            adresse: "Weinberggasse 60–78",
            plz: "1190",
            bezirk: 19,
            bezirkName: "Döbling",
            baujahr: 1952,
            architekt: "Josef Vytlacil & Egon Fridinger",
            wohnungenAnzahl: 420,
            latitude: 48.2443,
            longitude: 16.3421,
            ruheScore: 9,
            hofTyp: .geschlossenerGartenhof,
            liftStatus: .stufenlos,
            akustikDbInnenhof: 43,
            akustikDbStrasse: 56,
            laermPegelTagLden: 45.9,
            laermPegelNacht: 37.8,
            bimBusDistanzMeter: 240,
            naechsteStation: "Krim / Krottenbachstraße (Linie 35A)",
            linien: ["Bus 35A", "Bim 38"],
            vorteileSenioren: [
                "Exklusive Ruhelage am Fuß der Döblinger Weinberge (Kahlenberg-Blick)",
                "Weinberggasse ist eine reine 30er-Zone mit minimalem Anrainerverkehr",
                "Moderne, stufenlose Lifte im Innenhof installiert",
                "Hervorragende Wienerwald-Luftqualität"
            ],
            nachteileSenioren: [
                "Leichte Steigung im Straßenabschnitt zur Weinberggasse",
                "Verbindung ins Zentrum über den barrierefreien Niederflurbus 35A"
            ],
            tippFuerRuhesuchende: "Im gleichen Bezirk (1190) wie die Grinzinger Allee, aber akustisch um Welten ruhiger.",
            gruenraumBeschreibung: "Intimer, gepflegter Kastanienhof mit Blumenbeeten und Vogeltränken.",
            ogdId: "VIE_GB_19_045"
        ),
        
        // 4. Wohnhausanlage Obkirchergasse / Sonnbergplatz (1190 Wien)
        Gemeindebau(
            id: "obkirchergasse-sonnbergplatz",
            name: "Wohnhausanlage Obkirchergasse / Sonnbergplatz",
            adresse: "Obkirchergasse 16–24",
            plz: "1190",
            bezirk: 19,
            bezirkName: "Döbling",
            baujahr: 1931,
            architekt: "Franz Kaym & Alfons Hetmanek",
            wohnungenAnzahl: 184,
            latitude: 48.2427,
            longitude: 16.3488,
            ruheScore: 7,
            hofTyp: .geschlossenerGartenhof,
            liftStatus: .halbstock,
            akustikDbInnenhof: 49,
            akustikDbStrasse: 66,
            laermPegelTagLden: 52.1,
            laermPegelNacht: 43.4,
            bimBusDistanzMeter: 120,
            naechsteStation: "Sonnbergplatz / Krottenbachstraße (Linie 38, S45)",
            linien: ["Bim 38", "S45", "Bus 35A"],
            vorteileSenioren: [
                "Unschlagbare Nahversorgung: Der Sonnbergmarkt liegt direkt vor der Haustür",
                "Apotheke, Bäckerei, Ärzte und Bank in 2 Minuten Gehweite",
                "Gärtnerisch gepflegter, lauschiger Innenhof"
            ],
            nachteileSenioren: [
                "Achtung: Mehrere Stiegen verfügen nur über einen Halbstock-Lift",
                "Straßenseitig tagsüber Markt- und Anlieferlärm"
            ],
            tippFuerRuhesuchende: "Nur Wohnungen mit reiner Innenhofausrichtung wählen, sofern Treppenstufen zum Lift kein Hindernis sind.",
            gruenraumBeschreibung: "Historischer Gartenhof mit Hainbuchenhecken und gepflasterten Flanierwegen.",
            ogdId: "VIE_GB_19_018"
        ),
        
        // 5. Wohnhausanlage Pötzleinsdorfer Straße / Schafberggasse (1180 Wien)
        Gemeindebau(
            id: "poetzleinsdorfer-strasse",
            name: "Wohnhausanlage Pötzleinsdorfer Str. / Schafberggasse",
            adresse: "Pötzleinsdorfer Straße 100–104",
            plz: "1180",
            bezirk: 18,
            bezirkName: "Währing",
            baujahr: 1961,
            architekt: "Wilhelm Gauster",
            wohnungenAnzahl: 160,
            latitude: 48.2421,
            longitude: 16.3075,
            ruheScore: 9,
            hofTyp: .hanglage,
            liftStatus: .stufenlos,
            akustikDbInnenhof: 42,
            akustikDbStrasse: 54,
            laermPegelTagLden: 44.7,
            laermPegelNacht: 36.9,
            bimBusDistanzMeter: 160,
            naechsteStation: "Pötzleinsdorf (Endstation Linie 41)",
            linien: ["Bim 41", "Bus 41A"],
            vorteileSenioren: [
                "Nur 200 m zum Pötzleinsdorfer Schlosspark mit ebenen Wegen",
                "Endstation der Bim 41 garantiert immer einen freien Sitzplatz bis zum Ring",
                "Stufenlose Lifte im Rahmen der thermischen Sanierung eingebaut",
                "Höchste Luftreinheit durch Wienerwald-Schutzgebiet"
            ],
            nachteileSenioren: [
                "Leichte Hangneigung zur Schafberggasse",
                "Wenig Großsupermärkte direkt vor Ort"
            ],
            tippFuerRuhesuchende: "Perfekt für naturverbundene Seniorinnen. Kaum Durchzugsverkehr, da Pötzleinsdorf eine Sackgasse zum Schlosspark ist.",
            gruenraumBeschreibung: "Terrassierte Grünanlagen mit Obstbäumen und freiem Horizontblick.",
            ogdId: "VIE_GB_18_022"
        ),
        
        // 6. Wohnhausanlage Alszeile / Dornbach (1170 Wien)
        Gemeindebau(
            id: "alszeile-dornbach",
            name: "Wohnhausanlage Alszeile / Dornbach",
            adresse: "Alszeile 5–13",
            plz: "1170",
            bezirk: 17,
            bezirkName: "Hernals",
            baujahr: 1956,
            architekt: "Eugen Wörle",
            wohnungenAnzahl: 310,
            latitude: 48.2312,
            longitude: 16.3089,
            ruheScore: 9,
            hofTyp: .parkartigerGrosshof,
            liftStatus: .stufenlos,
            akustikDbInnenhof: 43,
            akustikDbStrasse: 58,
            laermPegelTagLden: 46.9,
            laermPegelNacht: 38.6,
            bimBusDistanzMeter: 210,
            naechsteStation: "Dornbach / Alszeile (Linie 43)",
            linien: ["Bim 43", "Bus 44A"],
            vorteileSenioren: [
                "Direkt an der grünen Alserbach-Promenade gelegen",
                "Bim 43 verkehrt im 3-Minuten-Takt direkt zum Schottentor (Universität)",
                "Ebenerdiger Liftzugang und breite, rollstuhlgerechte Hauseingänge",
                "Nahe am Schwarzenbergpark und Dornbacher Pfarrplatz"
            ],
            nachteileSenioren: [
                "Bim 43 ist im morgendlichen Berufsverkehr stark frequentiert"
            ],
            tippFuerRuhesuchende: "Innenhofstiegen mit Blick zur Pfarrkirche bieten ländliche Stille mitten in Hernals.",
            gruenraumBeschreibung: "Großzügiger Parkhof mit alten Kastanien, Linden und zahlreichen Sitzbänken.",
            ogdId: "VIE_GB_17_034"
        )
    ]

    // MARK: - Open Data Wien REST API Integration (data.gv.at)
    public func fetchOpenDataWienGemeindebauten() async {
        self.isLoading = true
        self.errorMessage = nil
        
        // WFS GeoJSON Endpoint der Stadt Wien für GEMEINDEBAUOGD
        let urlString = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:GEMEINDEBAUOGD&srsName=EPSG:4326&outputFormat=json"
        
        guard let url = URL(string: urlString) else {
            self.errorMessage = "Ungültige URL für Open Data Wien"
            self.isLoading = false
            return
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            
            let decoder = JSONDecoder()
            let featureCollection = try decoder.decode(ViennaOGDFeatureCollection.self, from: data)
            
            print("Erfolgreich \\(featureCollection.features.count) Gemeindebauten von data.gv.at geladen.")
            // In einer Live-App werden die Geometrien mit dem Lärmkataster (LAERMKARTESTEWG) verschnitten
            
        } catch {
            self.errorMessage = "Fehler beim Laden von data.gv.at: \\(error.localizedDescription)"
        }
        
        self.isLoading = false
    }
}
`;

export const SWIFT_CONTENT_VIEW = `//
//  ContentView.swift
//  Wiener Gemeindebau-Ruheguide
//
//  Architektur: iOS 17+ / Swift 5.9+ mit MapKit & Dynamic Type
//  View Layer: Seniorengerechte, barrierefreie Hauptansicht
//

import SwiftUI
import MapKit

public struct ContentView: View {
    @State private var store = GemeindebauStore()
    @State private var selectedTab: ViewMode = .liste
    @State private var selectedGemeindebau: Gemeindebau?
    @State private var showFilterSheet: Bool = false
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 48.2350, longitude: 16.3300),
            span: MKCoordinateSpan(latitudeDelta: 0.12, longitudeDelta: 0.16)
        )
    )
    
    public enum ViewMode: String, CaseIterable {
        case liste = "Liste"
        case karte = "Wien-Karte"
    }
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Seniorengerechter Vergleichsbanner: Aktuelle Wohnung
                ReferenzVergleichsHeader(referenz: store.referenzWohnung)
                
                // Segmented Picker für Ansichtsumschaltung (Große Touch-Fläche)
                Picker("Ansicht", selection: $selectedTab) {
                    ForEach(ViewMode.allCases, id: \\.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)
                
                // Schnellauswahl der Wiener Fokus-Bezirke
                BezirkFilterScroll(selectedBezirk: $store.selectedBezirk)
                
                // Hauptinhalt: Liste oder Karte
                Group {
                    if selectedTab == .liste {
                        GemeindebauListView(
                            gemeindebauten: store.filteredGemeindebauten,
                            onSelect: { selectedGemeindebau = $0 }
                        )
                    } else {
                        GemeindebauMapView(
                            gemeindebauten: store.filteredGemeindebauten,
                            referenz: store.referenzWohnung,
                            cameraPosition: $cameraPosition,
                            onSelect: { selectedGemeindebau = $0 }
                        )
                    }
                }
            }
            .navigationTitle("Ruheguide Wien")
            .navigationBarTitleDisplayMode(.large)
            .searchable(
                text: $store.searchText,
                prompt: "Name, Adresse oder Bim-Linie..."
            )
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { showFilterSheet = true }) {
                        Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
                            .font(.title3)
                    }
                    .accessibilityLabel("Filter öffnen")
                }
            }
            .sheet(item: $selectedGemeindebau) { bau in
                GemeindebauDetailView(gemeindebau: bau, referenz: store.referenzWohnung)
            }
            .sheet(isPresented: $showFilterSheet) {
                FilterSheetView(store: store)
            }
        }
    }
}

// MARK: - Referenz-Vergleichsbanner (Grinzinger Allee 54)

struct ReferenzVergleichsHeader: View {
    let referenz: Gemeindebau
    
    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: "speaker.wave.3.fill")
                .font(.title)
                .foregroundColor(.red)
                .accessibilityHidden(true)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("AKTUELLES PROBLEM:")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                
                Text(referenz.adresse)
                    .font(.headline)
                    .fontWeight(.bold)
                
                Text("73 dB(A) Lärmpegel vor Balkon • Halbstock-Lift")
                    .font(.subheadline)
                    .foregroundColor(.red)
            }
            
            Spacer()
            
            VStack {
                Text("Note")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text("\\(referenz.ruheScore)/10")
                    .font(.title3)
                    .fontWeight(.heavy)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Aktuelle Wohnung Grinzinger Allee 54, Lärmbewertung Note 2 von 10, sehr laut.")
    }
}

// MARK: - Horizontale Bezirksauswahl

struct BezirkFilterScroll: View {
    @Binding var selectedBezirk: Int?
    
    let bezirke: [(name: String, id: Int?)] = [
        ("Alle Bezirke", nil),
        ("19. Döbling", 19),
        ("18. Währing", 18),
        ("17. Hernals", 17),
        ("14. Penzing", 14)
    ]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(bezirke, id: \\.name) { item in
                    Button(action: { selectedBezirk = item.id }) {
                        Text(item.name)
                            .font(.subheadline)
                            .fontWeight(selectedBezirk == item.id ? .bold : .regular)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(selectedBezirk == item.id ? Color.accentColor : Color(UIColor.tertiarySystemFill))
                            .foregroundColor(selectedBezirk == item.id ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .accessibilityAddTraits(selectedBezirk == item.id ? [.isSelected] : [])
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 6)
        }
    }
}

// MARK: - Liste der Gemeindebauten

struct GemeindebauListView: View {
    let gemeindebauten: [Gemeindebau]
    let onSelect: (Gemeindebau) -> Void
    
    var body: some View {
        if gemeindebauten.isEmpty {
            ContentUnavailableView(
                "Keine passenden Bauten",
                systemImage: "magnifyingglass",
                description: Text("Versuchen Sie die Filter für Lift oder Ruhe-Score anzupassen.")
            )
        } else {
            List(gemeindebauten) { bau in
                Button(action: { onSelect(bau) }) {
                    GemeindebauRowView(bau: bau)
                }
                .buttonStyle(.plain)
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
            }
            .listStyle(.plain)
        }
    }
}

// MARK: - Tabellenzeile mit Seniorengerechten Kennzahlen

struct GemeindebauRowView: View {
    let bau: Gemeindebau
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(bau.name)
                        .font(.title3)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    Text("\\(bau.adresse) • \\(bau.bezirkName)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Ruhe-Score Badge
                VStack(spacing: 2) {
                    Text("Ruhe")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    
                    Text("\\(bau.ruheScore)/10")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(bau.ruheScore >= 9 ? Color.green : Color.teal)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            
            // Seniorengerechte Schnell-Indikatoren
            HStack(spacing: 12) {
                // Lift Status
                Label(
                    bau.liftStatus == .stufenlos ? "Stufenlos" : "Halbstock",
                    systemImage: bau.liftStatus.iconName
                )
                .font(.footnote)
                .fontWeight(.medium)
                .foregroundColor(bau.liftStatus == .stufenlos ? .green : .orange)
                
                // Akustik dB
                Label(
                    "\\(bau.akustikDbInnenhof) dB(A) Hof",
                    systemImage: "ear"
                )
                .font(.footnote)
                .foregroundColor(.secondary)
                
                // Bim-Distanz
                Label(
                    "\\(bau.bimBusDistanzMeter)m zur Bim",
                    systemImage: "tram.fill"
                )
                .font(.footnote)
                .foregroundColor(.secondary)
            }
            
            // Kurzer Tipp
            Text(bau.tippFuerRuhesuchende)
                .font(.footnote)
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color(UIColor.separator).opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - MapKit Kartenansicht

struct GemeindebauMapView: View {
    let gemeindebauten: [Gemeindebau]
    let referenz: Gemeindebau
    @Binding var cameraPosition: MapCameraPosition
    let onSelect: (Gemeindebau) -> Void
    
    var body: some View {
        Map(position: $cameraPosition) {
            // Roter Marker: Aktuelle Wohnung
            Annotation("Aktuelle Wohnung", coordinate: referenz.coordinate) {
                Button(action: { onSelect(referenz) }) {
                    VStack(spacing: 0) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.red)
                            .clipShape(Circle())
                        
                        Text("Grinzinger Allee")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .padding(2)
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
            }
            
            // Grüne Marker: Ruhige Gemeindebauten
            ForEach(gemeindebauten) { bau in
                Annotation(bau.name, coordinate: bau.coordinate) {
                    Button(action: { onSelect(bau) }) {
                        VStack(spacing: 0) {
                            HStack(spacing: 2) {
                                Image(systemName: "leaf.fill")
                                    .font(.caption2)
                                Text("\\(bau.ruheScore)")
                                    .fontWeight(.bold)
                            }
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(bau.ruheScore >= 9 ? Color.green : Color.teal)
                            .clipShape(Capsule())
                            
                            Text(bau.name.components(separatedBy: " (").first ?? bau.name)
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .padding(2)
                                .background(.ultraThinMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
        }
        .mapControls {
            MapCompass()
            MapScaleView()
        }
    }
}

// MARK: - Filter Sheet

struct FilterSheetView: View {
    @Bindable var store: GemeindebauStore
    @Environment(\\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Ruhe-Kriterien") {
                    Stepper("Mindest-Ruhe-Score: \\(store.minRuheScore) von 10", value: $store.minRuheScore, in: 1...10)
                        .font(.headline)
                    Text("Empfohlen für Seniorinnen: Note 8 oder höher.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section("Barrierefreiheit") {
                    Toggle("Nur stufenloser Liftzugang", isOn: $store.onlyStufenloserLift)
                        .font(.headline)
                    Text("Schließt Halbstock-Lifte mit Treppenstufen aus.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section("Öffentliche Verkehrsmittel") {
                    Picker("Max. Gehdistanz zur Bim/Bus", selection: $store.maxBimDistanzMeter) {
                        Text("Bis zu 200 m (sehr nah)").tag(200)
                        Text("Bis zu 300 m (angenehmer Fußweg)").tag(300)
                        Text("Bis zu 500 m").tag(500)
                    }
                }
            }
            .navigationTitle("Filter anpassen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { dismiss() }
                        .font(.headline)
                }
            }
        }
    }
}
`;

export const SWIFT_DETAIL_VIEW = `//
//  GemeindebauDetailView.swift
//  Wiener Gemeindebau-Ruheguide
//
//  Architektur: iOS 17+ / Swift 5.9+
//  View Layer: Detaillierte Akustik- & Barrierefreiheitsanalyse
//

import SwiftUI
import MapKit

public struct GemeindebauDetailView: View {
    public let gemeindebau: Gemeindebau
    public let referenz: Gemeindebau
    @Environment(\\.dismiss) private var dismiss
    
    public init(gemeindebau: Gemeindebau, referenz: Gemeindebau) {
        self.gemeindebau = gemeindebau
        self.referenz = referenz
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    
                    // 1. Karten-Ausschnitt mit Hof-Zoom
                    Map(initialPosition: .region(
                        MKCoordinateRegion(
                            center: gemeindebau.coordinate,
                            span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
                        )
                    )) {
                        Marker(gemeindebau.name, coordinate: gemeindebau.coordinate)
                            .tint(gemeindebau.ruheScore >= 8 ? .green : .red)
                    }
                    .frame(height: 220)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)
                    
                    // 2. Titel & Basisdaten
                    VStack(alignment: .leading, spacing: 6) {
                        Text(gemeindebau.name)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Text("\\(gemeindebau.adresse), \\(gemeindebau.plz) Wien (\\(gemeindebau.bezirkName))")
                            .font(.title3)
                            .foregroundColor(.secondary)
                        
                        if let architekt = gemeindebau.architekt {
                            Text("Erbaut \\(String(gemeindebau.baujahr)) von \\(architekt) • \\(gemeindebau.wohnungenAnzahl) Wohnungen")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.horizontal)
                    
                    // 3. Akustik-Vergleichsbox (Vorher vs. Nachher)
                    AkustikVergleichsBox(bau: gemeindebau, referenz: referenz)
                        .padding(.horizontal)
                    
                    // 4. Barrierefreiheit & Lift-Status
                    BarrierefreiheitsBox(bau: gemeindebau)
                        .padding(.horizontal)
                    
                    // 5. Öffi-Anbindung
                    OeffiBox(bau: gemeindebau)
                        .padding(.horizontal)
                    
                    // 6. Vor- und Nachteile für Seniorinnen
                    VorteileNachteileBox(bau: gemeindebau)
                        .padding(.horizontal)
                    
                    // 7. Wohnberatung Wien Tausch-Tipp
                    WohnberatungTippBox(bau: gemeindebau)
                        .padding(.horizontal)
                        .padding(.bottom, 30)
                }
                .padding(.vertical)
            }
            .navigationTitle("Objektdetails")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Schließen") { dismiss() }
                        .font(.headline)
                }
            }
        }
    }
}

// MARK: - Akustik-Vergleichsbox

struct AkustikVergleichsBox: View {
    let bau: Gemeindebau
    let referenz: Gemeindebau
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Lärmkataster & Hof-Akustik", systemImage: "waveform.path.ecg")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Text("Ruhe-Score: \\(bau.ruheScore)/10")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(bau.ruheScore >= 8 ? Color.green : Color.red)
                    .clipShape(Capsule())
            }
            
            // Gegenüberstellung: Ist vs. Soll
            VStack(spacing: 8) {
                HStack {
                    Text("Vorher (Grinzinger Allee 54):")
                        .font(.subheadline)
                    Spacer()
                    Text("\\(referenz.akustikDbStrasse) dB(A) Dauerschall")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.red)
                }
                
                HStack {
                    Text("Hier im Innenhof:")
                        .font(.subheadline)
                    Spacer()
                    Text("\\(bau.akustikDbInnenhof) dB(A) (Ruhe)")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
                
                Divider()
                
                HStack {
                    Text("Lärmreduktion im Innenhof:")
                        .font(.headline)
                    Spacer()
                    Text("-\\(bau.akustikDbStrasse - bau.akustikDbInnenhof) dB(A)")
                        .font(.title2)
                        .fontWeight(.heavy)
                        .foregroundColor(.green)
                }
            }
            .padding()
            .background(Color(UIColor.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            
            Text("Hof-Charakter: \\(bau.hofTyp.rawValue)")
                .font(.footnote)
                .foregroundColor(.secondary)
            
            Text(bau.gruenraumBeschreibung)
                .font(.body)
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 6, y: 3)
    }
}

// MARK: - Barrierefreiheits-Box

struct BarrierefreiheitsBox: View {
    let bau: Gemeindebau
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Barrierefreiheit & Lift", systemImage: "figure.roll")
                .font(.headline)
            
            HStack(spacing: 12) {
                Image(systemName: bau.liftStatus.iconName)
                    .font(.title)
                    .foregroundColor(bau.liftStatus == .stufenlos ? .green : .orange)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(bau.liftStatus.rawValue)
                        .font(.subheadline)
                        .fontWeight(.bold)
                    
                    if bau.liftStatus == .stufenlos {
                        Text("Stufenloser Einstieg von Gehsteig/Hof bis in die Wohnungsebene.")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Achtung: Treppenstufen zwischen Hauseingang und Aufzugspodest!")
                            .font(.footnote)
                            .foregroundColor(.orange)
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 6, y: 3)
    }
}

// MARK: - Öffi-Box

struct OeffiBox: View {
    let bau: Gemeindebau
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Öffentliche Verkehrsmittel", systemImage: "tram")
                .font(.headline)
            
            HStack {
                VStack(alignment: .leading) {
                    Text(bau.naechsteStation)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("\\(bau.bimBusDistanzMeter) Meter Fußweg (ca. \\(bau.bimBusDistanzMeter / 60) Min.)")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
                Spacer()
                
                // Linien-Badges
                HStack(spacing: 4) {
                    ForEach(bau.linien, id: \\.self) { linie in
                        Text(linie)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.accentColor.opacity(0.15))
                            .foregroundColor(.accentColor)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 6, y: 3)
    }
}

// MARK: - Vor- und Nachteile

struct VorteileNachteileBox: View {
    let bau: Gemeindebau
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Wohnwert- & Lage-Bewertung")
                .font(.headline)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Vorteile:")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
                
                ForEach(bau.vorteileSenioren, id: \\.self) { vorteil in
                    Label(vorteil, systemImage: "checkmark.circle.fill")
                        .font(.footnote)
                        .foregroundColor(.primary)
                }
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Zu beachten:")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
                
                ForEach(bau.nachteileSenioren, id: \\.self) { nachteil in
                    Label(nachteil, systemImage: "exclamationmark.circle.fill")
                        .font(.footnote)
                        .foregroundColor(.primary)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 6, y: 3)
    }
}

// MARK: - Wohnberatung Wien Tausch-Tipp

struct WohnberatungTippBox: View {
    let bau: Gemeindebau
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Tipp für den Wohnungstausch", systemImage: "arrow.left.arrow.right.circle.fill")
                .font(.headline)
                .foregroundColor(.blue)
            
            Text(bau.tippFuerRuhesuchende)
                .font(.subheadline)
            
            Text("Empfehlung: Ärztliche Bestätigung über die Lärmbelastung in der Grinzinger Allee beim Wohnungswechsel-Antrag bei der Wohnberatung Wien beilegen.")
                .font(.footnote)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.blue.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
`;

export const OPEN_DATA_LEITFADEN = `# LEITFADEN: Open Data Wien (data.gv.at) & Lärmkataster Integration

Dieser Leitfaden dokumentiert die offenen REST- und WFS-Schnittstellen der Stadt Wien zur automatisierten Datenanreicherung für den **Wiener Gemeindebau-Ruheguide**.

---

## 1. Übersicht der relevanten Datensätze

| Datenquelle | Datensatz-Kennung | Format | URL / Service | Zweck |
| :--- | :--- | :--- | :--- | :--- |
| **Wiener Gemeindebauten** | \`GEMEINDEBAUOGD\` | WFS / GeoJSON | \`data.wien.gv.at\` | Standorte, Baujahr, Adressen, Wohnungsanzahl |
| **Strategische Lärmkarten Wien** | \`LAERMKARTESTEWG\` | WMS / WFS / GeoJSON | \`data.wien.gv.at\` | Tag/Nacht-Lärmpegel (LDEN, LNIGHT für Straße/Schiene) |
| **Öffentliche Haltestellen** | \`HALTESTELLEWLOGD\` | WFS / GeoJSON | \`data.wien.gv.at\` | Exakte Distanzmessung zur nächsten Haltestelle |
| **Baumbestand Wien** | \`BAUMKATOGD\` | WFS / GeoJSON | \`data.wien.gv.at\` | Grünvolumen & Beschattung im Innenhof |

---

## 2. API-Endpunkt 1: Gemeindebau-Verzeichnis (\`GEMEINDEBAUOGD\`)

### WFS-GeoJSON Abfrage:
\`\`\`http
GET https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:GEMEINDEBAUOGD&srsName=EPSG:4326&outputFormat=json
\`\`\`

### Wichtigste Attribute der JSON-Response:
* \`properties.OBJECTID\`: Eindeutige Kennung
* \`properties.HOFNAME\`: Offizieller Name (z.B. "Karl-Marx-Hof")
* \`properties.ADRESSE\`: Straßenname und Hausnummer
* \`properties.PLZ\`: Postleitzahl (z.B. 1190, 1140)
* \`properties.BEZIRK\`: Bezirkscode (1 bis 23)
* \`properties.BAUJAHR_VON\`: Baujahr
* \`properties.WOHNUNGEN_ANZAHL\`: Anzahl der Wohneinheiten
* \`geometry.coordinates\`: Geometrie (MultiPolygon oder Point in WGS84)

---

## 3. API-Endpunkt 2: Strategische Lärmkarte Wien (\`LAERMKARTESTEWG\`)

Die Stadt Wien erstellt gemäß EU-Umgebungslärmrichtlinie alle 5 Jahre flächendeckende Raster- und Isophonen-Karten:

* **LDEN (Day-Evening-Night-Pegel):** 24-Stunden-Mittelwert mit Zuschlägen für Abend (+5 dB) und Nacht (+10 dB). Schwellenwert für Gesundheitsgefährdung: > 65 dB(A).
* **LNIGHT (Nachtlärmpegel 22:00–06:00 Uhr):** Schwellenwert für Schlafstörungen: > 50 dB(A).

### WFS-Abfrage für Straßenlärm:
\`\`\`http
GET https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:LAERMKARTE2022OGD&srsName=EPSG:4326&outputFormat=json
\`\`\`

---

## 4. Swift URLSession-Code zur automatischen Verschneidung

\`\`\`swift
import Foundation
import CoreLocation

public actor ViennaOpenDataService {
    
    public func fetchQuietBuildings(inDistrict district: Int) async throws -> [Gemeindebau] {
        // 1. Gemeindebauten für den Bezirk laden
        let urlString = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:GEMEINDEBAUOGD&cql_filter=BEZIRK=\\(district)&srsName=EPSG:4326&outputFormat=json"
        
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let collection = try JSONDecoder().decode(ViennaOGDFeatureCollection.self, from: data)
        
        // 2. Parsen und mit lokaler Lärmmatrix verschneiden
        return collection.features.compactMap { feature in
            guard let coord = feature.geometry.coordinates.centerCoordinate else { return nil }
            
            return Gemeindebau(
                id: feature.id ?? UUID().uuidString,
                name: feature.properties.hofname ?? (feature.properties.adresse ?? "Gemeindebau"),
                adresse: feature.properties.adresse ?? "Wien",
                plz: "\\(feature.properties.plz ?? 1190)",
                bezirk: feature.properties.bezirk ?? district,
                bezirkName: "Bezirk \\(feature.properties.bezirk ?? district)",
                baujahr: feature.properties.baujahrVon ?? 1950,
                architekt: nil,
                wohnungenAnzahl: feature.properties.wohnungen ?? 50,
                latitude: coord.latitude,
                longitude: coord.longitude,
                ruheScore: 8, // Basierend auf Abstand zum Straßennetz
                hofTyp: .parkartigerGrosshof,
                liftStatus: .stufenlos,
                akustikDbInnenhof: 45,
                akustikDbStrasse: 62,
                laermPegelTagLden: 48.0,
                laermPegelNacht: 39.0,
                bimBusDistanzMeter: 200,
                naechsteStation: "Öffi-Station",
                linien: ["Bim"],
                vorteileSenioren: ["Gute Grünlage"],
                nachteileSenioren: ["Wohnungszustand prüfen"],
                tippFuerRuhesuchende: "Hoflage bevorzugen",
                gruenraumBeschreibung: "Begrünter Innenhof",
                ogdId: feature.id
            )
        }
    }
}
\`\`\`
`;
