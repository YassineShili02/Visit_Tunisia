#!/usr/bin/env python3
"""
================================================================================
Visit Tunisia — Scraper Kairouan (FINAL — 20 spots de qualité)
================================================================================
Combine OSM + fallback manuel de spots touristiques réels du gouvernorat de Kairouan.
Exclut Sousse, Monastir, Mahdia, Sfax, Kasserine, Siliana, Zaghouan et le reste.
================================================================================
"""

import requests
import json
import csv
import time
import re
from urllib.parse import quote
from collections import defaultdict

GOVERNORAT = "Kairouan"

# BBOX du gouvernorat de Kairouan (Centre-Est)
# Nord: 36.00 (El Oueslatia), Sud: 35.30 (sud Kairouan)
# Ouest: 9.80 (Raqqada), Est: 10.50 (Nasrallah/Haffouz)
BBOX = {
    "s": 35.30,
    "w": 9.80,
    "n": 36.00,
    "e": 10.50
}

LAT_MIN, LAT_MAX = 35.25, 36.05
LON_MIN, LON_MAX = 9.75, 10.55

JSON_OUTPUT = f"destinations_{GOVERNORAT.lower()}_final.json"
CSV_OUTPUT = f"destinations_{GOVERNORAT.lower()}_final.csv"
MAX_DESTINATIONS = 20

CATEGORY_QUOTAS = {
    "BALNEAIRE": 7, "CULTUREL": 5, "ECOLOGIQUE": 2,
    "AVENTURE": 2, "RELIGIEUX": 2, "GASTRONOMIQUE": 2,
}

OSM_MAPPING = {
    "beach": ("SITE_TOURISTIQUE", ["BALNEAIRE"]),
    "beach_resort": ("SITE_TOURISTIQUE", ["BALNEAIRE"]),
    "cape": ("SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"]),
    "museum": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "artwork": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "gallery": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "attraction": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "ruins": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "archaeological_site": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "castle": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "monument": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "memorial": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "theatre": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "amphitheatre": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "city_gate": ("SITE_TOURISTIQUE", ["CULTUREL"]),
    "national_park": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "nature_reserve": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "protected_area": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "wetland": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "cave": ("SITE_TOURISTIQUE", ["ECOLOGIQUE", "AVENTURE"]),
    "viewpoint": ("SITE_TOURISTIQUE", ["AVENTURE", "ECOLOGIQUE"]),
    "zoo": ("SITE_TOURISTIQUE", ["AVENTURE"]),
    "theme_park": ("ACTIVITE", ["AVENTURE"]),
    "water_park": ("ACTIVITE", ["BALNEAIRE", "AVENTURE"]),
    "canyon": ("SITE_TOURISTIQUE", ["AVENTURE", "ECOLOGIQUE"]),
    "mosque": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    "church": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    "synagogue": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    "cathedral": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    "restaurant": ("RESTAURANT", ["GASTRONOMIQUE"]),
    "cafe": ("RESTAURANT", ["GASTRONOMIQUE"]),
    "hotel": ("HEBERGEMENT", ["BALNEAIRE"]),
    "hostel": ("HEBERGEMENT", ["BALNEAIRE"]),
    "guest_house": ("HEBERGEMENT", ["BALNEAIRE"]),
    "camp_site": ("HEBERGEMENT", ["ECOLOGIQUE", "AVENTURE"]),
}

NAME_BLACKLIST = [
    r"^maison\s+à\s+louer",
    r"^rent\s+",
    r"^villa\s+\w+\s*\d+",
    r"^appartement",
    r"^studio",
    r"^chambre",
    r"^bureau",
    r"^local\s+",
    r"^dar\s+chabab",
    r"^maison\s+des\s+jeunes",
    r"^maison\s+de\s+\w+$",
    r"^résidence\s+\w+$",
]

CITY_BLACKLIST = [
    "tunis", "تونس", "carthage", "قرطاج", "sidi bou said", "سيدي بوسعيد",
    "la marsa", "المرسى", "le kram", "الكرم", "gammarth", "قمرت",
    "nabeul", "نابل", "hammamet", "الحمامات", "kelibia", "قليبية", "korba", "قربة",
    "sousse", "سوسة", "kantaoui", "القنطاوي", "hergla", "هرقلة", "enfidha", "النفيضة",
    "monastir", "المنستير", "moknine", "المكنين", "ksar hellal", "قصر هلال",
    "mahdia", "المهدية", "chebba", "شبّة", "rejiche", "الرجيش", "el jem", "الجم",
    "sfax", "صفاقس", "zaghouan", "زغوان", "siliana", "سليانة",
    "bizerte", "بنزرت", "jendouba", "جندوبة", "beja", "باجة",
    "kef", "الكاف", "tozeur", "توزر", "gafsa", "قفصة", "tataouine", "تطاوين",
    "medenine", "مدنين", "jerba", "جربة", "houmt souk", "حومة السوق", "zarzis", "جرجيس",
    "gabes", "قابس", "kebili", "قبلي", "douz", "دوز", "matmata", "مطماطة",
    "kasserine", "القصرين", "sidi bouzid", "سيدي بوزيد", "gafsa", "قفصة",
    "ariana", "أريانة", "ben arous", "بن عروس", "manouba", "منوبة",
    "radès", "رادس", "ezzahra", "الزهراء", "mornag", "المرناقية"
]

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]
WIKIDATA_URL = "https://query.wikidata.org/sparql"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


# -----------------------------------------------------------------------------
# FALLBACK MANUEL — Spots touristiques réels de Kairouan
# -----------------------------------------------------------------------------

MANUAL_SPOTS = [
    # Kairouan centre — Religieux & Culturel (UNESCO)
    ("Grande Mosquée Okba Ibn Nafaa", "SITE_TOURISTIQUE", ["CULTUREL", "RELIGIEUX"], 35.6814, 10.1036,
     "La Grande Mosquée de Kairouan est le plus ancien édifice musulman d'Afrique du Nord, classée au patrimoine mondial de l'UNESCO.", "mosque"),
    ("Médina de Kairouan", "SITE_TOURISTIQUE", ["CULTUREL"], 35.6780, 10.1000,
     "La médina de Kairouan est un labyrinthe de ruelles médiévales entouré de remparts, célèbre pour ses souks et ses monuments.", "attraction"),
    ("Zaouïa de Sidi Sahbi", "SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"], 35.6830, 10.1050,
     "La zaouïa de Sidi Sahbi, dite Mosquée du Barbier, est un complexe religieux somptueux avec ses cours en marbre et ses azulejos.", "mosque"),
    ("Bassins des Aghlabides", "SITE_TOURISTIQUE", ["CULTUREL", "ECOLOGIQUE"], 35.6880, 10.0980,
     "Les bassins des Aghlabides sont d'immenses citernes du IXe siècle, chef-d'œuvre de l'ingénierie hydraulique islamique.", "monument"),
    ("Bir Barouta", "SITE_TOURISTIQUE", ["CULTUREL"], 35.6800, 10.1020,
     "Bir Barouta est un puits sacré au cœur de la médina, alimenté par un noria actionné par un dromadaire.", "attraction"),
    ("Mosquée des Trois Portes", "SITE_TOURISTIQUE", ["CULTUREL", "RELIGIEUX"], 35.6820, 10.1010,
     "La mosquée des Trois Portes est une mosquée du IXe siècle célèbre pour sa façade ornée de trois portes en pierre sculptée.", "mosque"),
    ("Zaouïa de Sidi Abid El Ghariani", "SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"], 35.6790, 10.1040,
     "La zaouïa de Sidi Abid El Ghariani est un mausolée soufi du XIVe siècle réputé pour sa décoration en stuc et bois sculpté.", "mosque"),
    ("Zaouïa de Sidi Amor Abbada", "SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"], 35.6750, 10.1100,
     "La zaouïa de Sidi Amor Abbada est un sanctuaire soufi célèbre abritant le tombeau du saint patron des forgerons.", "mosque"),
    ("Dar Hassine Allani", "SITE_TOURISTIQUE", ["CULTUREL"], 35.6810, 10.1030,
     "Dar Hassine Allani est un palais traditionnel du XVIIIe siècle reconverti en musée des arts et traditions kairouanaises.", "museum"),
    ("Marché aux Tapis de Kairouan", "SITE_TOURISTIQUE", ["CULTUREL"], 35.6805, 10.1025,
     "Le souk aux tapis de Kairouan est l'un des plus anciens de Tunisie, réputé pour ses tapis de laine à motifs géométriques.", "attraction"),

    # Environs de Kairouan
    ("Musée de Raqqada", "SITE_TOURISTIQUE", ["CULTUREL"], 35.6000, 10.0500,
     "Le musée de Raqqada présente l'art islamique et les céramiques du IXe siècle dans l'ancienne capitale aghlabide.", "museum"),
    ("Haffouz", "SITE_TOURISTIQUE", ["ECOLOGIQUE", "CULTUREL"], 35.6333, 10.2333,
     "Haffouz est une ville agricole connue pour son barrage et ses paysages de plaines fertiles au pied des collines.", "attraction"),
    ("El Oueslatia", "SITE_TOURISTIQUE", ["CULTUREL"], 35.8333, 10.0000,
     "El Oueslatia est une ville historique du Jérid kairouanais, réputée pour ses poteries et ses traditions artisanales.", "attraction"),
    ("Nasrallah", "SITE_TOURISTIQUE", ["CULTUREL"], 35.7667, 10.2667,
     "Nasrallah est une ville de l'est du gouvernorat connue pour son agriculture et son patrimoine rural.", "attraction"),
    ("Jardin de la Médina", "SITE_TOURISTIQUE", ["ECOLOGIQUE", "CULTUREL"], 35.6795, 10.1015,
     "Le jardin de la Médina est un espace vert historique offrant une pause ombragée au cœur de la vieille ville.", "attraction"),
    ("Zaouïa de Sidi Bou Makhlouf", "SITE_TOURISTIQUE", ["RELIGIEUX"], 35.6760, 10.1080,
     "La zaouïa de Sidi Bou Makhlouf est un lieu de dévotion soufi important de la médina de Kairouan.", "mosque"),

    # Gastronomie & Hébergement
    ("Restaurant La Kasbah", "RESTAURANT", ["GASTRONOMIQUE", "CULTUREL"], 35.6820, 10.1030,
     "La Kasbah est un restaurant réputé de Kairouan spécialisé dans la cuisine traditionnelle : makroudh, chorba frik et agneau.", "restaurant"),
    ("Café El Medina", "RESTAURANT", ["GASTRONOMIQUE", "CULTUREL"], 35.6785, 10.1005,
     "Le Café El Medina est une institution kairouanaise où l'on déguste le thé aux pignons et les pâtisseries locales.", "cafe"),
    ("Hôtel La Kasbah", "HEBERGEMENT", ["BALNEAIRE"], 35.6840, 10.1060,
     "L'hôtel La Kasbah est un établissement de charme en bordure de médina avec piscine et architecture traditionnelle.", "hotel"),
    ("Hôtel Continental Kairouan", "HEBERGEMENT", ["BALNEAIRE"], 35.6770, 10.0990,
     "L'hôtel Continental est un établissement moderne situé à proximité de la Grande Mosquée, idéal pour les pèlerins et touristes.", "hotel"),
]


def inject_manual_spots():
    elements = []
    for name, dtype, cats, lat, lon, desc, tag in MANUAL_SPOTS:
        tags = {
            "name": name,
            "name:fr": name,
            "description:fr": desc,
            "addr:city": "Kairouan",
            "tourism": tag if tag not in ["restaurant", "cafe", "hotel", "hostel", "camp_site"] else "yes",
            "amenity": tag if tag in ["restaurant", "cafe"] else "",
        }
        if tag in ["hotel", "hostel", "camp_site"]:
            tags["tourism"] = tag

        elements.append({
            "type": "node",
            "lat": lat,
            "lon": lon,
            "tags": tags
        })
    return elements


# -----------------------------------------------------------------------------
# ÉTAPE 1 : Overpass
# -----------------------------------------------------------------------------

def build_overpass_query():
    bbox = f"{BBOX['s']},{BBOX['w']},{BBOX['n']},{BBOX['e']}"
    return f"""[out:json][timeout:90];
(
  node["tourism"~"museum|attraction|gallery|artwork"]({bbox});
  way["tourism"~"museum|attraction|gallery|artwork"]({bbox});
  node["historic"]({bbox});
  way["historic"]({bbox});
  relation["historic"]({bbox});
  node["natural"="beach"]({bbox});
  way["natural"="beach"]({bbox});
  node["natural"="cape"]({bbox});
  way["natural"="cape"]({bbox});
  node["leisure"="beach_resort"]({bbox});
  way["leisure"="beach_resort"]({bbox});
  node["boundary"="national_park"]({bbox});
  way["boundary"="national_park"]({bbox});
  relation["boundary"="national_park"]({bbox});
  node["leisure"="nature_reserve"]({bbox});
  way["leisure"="nature_reserve"]({bbox});
  node["natural"~"cave|wetland|volcano"]({bbox});
  node["tourism"~"viewpoint|zoo"]({bbox});
  node["building"~"mosque|church|cathedral|synagogue"]({bbox});
  way["building"~"mosque|church|cathedral|synagogue"]({bbox});
  relation["building"~"mosque|church|cathedral|synagogue"]({bbox});
  node["amenity"~"restaurant|cafe"]({bbox});
  way["amenity"~"restaurant|cafe"]({bbox});
  node["tourism"~"hotel|hostel|guest_house|camp_site"]({bbox});
  way["tourism"~"hotel|hostel|guest_house|camp_site"]({bbox});
);
out center tags 200;"""


def fetch_overpass_data():
    print(f"🌐 Overpass pour {GOVERNORAT}...")
    query = build_overpass_query()

    for idx, url in enumerate(OVERPASS_URLS):
        try:
            print(f"   🔄 Essai {idx+1}/{len(OVERPASS_URLS)}")
            r = requests.post(
                url,
                data={"data": query},
                headers={
                    "Accept": "*/*",
                    "User-Agent": "VisitTunisiaBot/1.0",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout=90
            )
            r.raise_for_status()
            elements = r.json().get("elements", [])
            print(f"   ✅ {len(elements)} éléments OSM")
            return elements
        except Exception as e:
            print(f"   ⚠️ {str(e)[:80]}")

    print("   ❌ Overpass down.")
    return []


# -----------------------------------------------------------------------------
# ÉTAPE 2 : Nettoyage
# -----------------------------------------------------------------------------

def is_name_blacklisted(name):
    if not name:
        return True
    name_lower = name.lower()
    for pattern in NAME_BLACKLIST:
        if re.search(pattern, name_lower):
            return True
    if len(name.strip()) < 3:
        return True
    return False


def is_in_region(lat, lon, tags, name):
    if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
        return False
    city = (tags.get("addr:city") or tags.get("is_in:city") or "").lower()
    name_lower = (name or "").lower()
    for black in CITY_BLACKLIST:
        if black in city:
            if any(w in name_lower for w in ["kairouan", "raqqada", "haffouz", "el oueslatia", "nasrallah", "sidi sahb", "bassins aghlabides", "bir barouta", "okba", "sidi abid", "sidi amor", "dar hassine", "sidi bou makhlouf"]):
                continue
            return False
    return True


def score_quality(elem):
    tags = elem.get("tags", {})
    score = 0
    if tags.get("name") or tags.get("name:fr") or tags.get("name:en"):
        score += 20
    if tags.get("name:fr") and tags.get("name:en"):
        score += 10
    if tags.get("name:ar"):
        score += 5
    if tags.get("wikidata"):
        score += 30
    if tags.get("wikipedia"):
        score += 15
    if tags.get("description:fr") or tags.get("description"):
        score += 10
    if tags.get("website") or tags.get("contact:website"):
        score += 10
    if tags.get("opening_hours") or tags.get("fee"):
        score += 5
    if tags.get("wikimedia_commons") or tags.get("image"):
        score += 5

    name = tags.get("name:fr") or tags.get("name:en") or tags.get("name", "")
    if is_name_blacklisted(name):
        score -= 50

    return max(0, score)


def determine_type_and_categories(tags):
    if tags.get("natural", "").lower() == "cape":
        return ("SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"], "cape")
    if tags.get("man_made", "").lower() == "lighthouse":
        return ("SITE_TOURISTIQUE", ["BALNEAIRE", "CULTUREL"], "lighthouse")

    checks = [
        tags.get("tourism", "").lower(),
        tags.get("historic", "").lower(),
        tags.get("natural", "").lower(),
        tags.get("leisure", "").lower(),
        tags.get("building", "").lower(),
        tags.get("amenity", "").lower(),
        tags.get("boundary", "").lower(),
    ]
    for check in checks:
        if check in OSM_MAPPING:
            return OSM_MAPPING[check] + (check,)
    if tags.get("tourism"):
        return ("SITE_TOURISTIQUE", ["CULTUREL"], "tourism")
    return ("SITE_TOURISTIQUE", ["CULTUREL"], "unknown")


def clean_osm_elements(elements):
    destinations = []
    seen_names = set()
    rejected = []

    for elem in elements:
        tags = elem.get("tags", {})
        name = tags.get("name:fr") or tags.get("name:en") or tags.get("name")
        if not name:
            continue

        if elem["type"] == "node":
            lat, lon = elem.get("lat"), elem.get("lon")
        else:
            center = elem.get("center", {})
            lat, lon = center.get("lat"), center.get("lon")

        if not lat or not lon:
            continue

        if not is_in_region(lat, lon, tags, name):
            continue

        if is_name_blacklisted(name):
            rejected.append(f"'{name[:40]}' → nom blacklisté")
            continue

        name_key = name.lower().strip()
        if name_key in seen_names:
            continue
        seen_names.add(name_key)

        dest_type, categories, osm_tag = determine_type_and_categories(tags)
        quality_score = score_quality(elem)

        if quality_score < 25:
            rejected.append(f"'{name[:40]}' → score {quality_score} < 25")
            continue

        city = tags.get("addr:city") or tags.get("is_in:city") or tags.get("is_in:town") or GOVERNORAT
        if any(b in city.lower() for b in CITY_BLACKLIST):
            city = GOVERNORAT

        fee = tags.get("fee", "")
        charge = tags.get("charge", "")
        tarif = 0.0
        if fee == "yes" or charge:
            try:
                nums = re.findall(r"[\d\.]+", str(charge))
                tarif = float(nums[0]) if nums else 10.0
            except:
                tarif = 10.0

        accessibilite = tags.get("wheelchair", "") == "yes"
        pre_desc = tags.get("description:fr") or tags.get("description", "")

        destinations.append({
            "name": name,
            "name_en": tags.get("name:en", name),
            "name_ar": tags.get("name:ar", name),
            "type": dest_type,
            "categories": categories,
            "region": city,
            "latitude": lat,
            "longitude": lon,
            "tarif_estime": tarif,
            "accessibilite_pmr": accessibilite,
            "wikidata_id": tags.get("wikidata"),
            "wikipedia": tags.get("wikipedia"),
            "osm_tags": {k: v for k, v in tags.items() if not k.startswith("name")},
            "quality_score": quality_score,
            "osm_source_tag": osm_tag,
            "pre_description": pre_desc,
        })

    if rejected:
        print(f"   🚫 {len(rejected)} rejets (exemples):")
        for line in rejected[:10]:
            print(f"      {line}")

    print(f"   ✅ {len(destinations)} destinations OSM valides")
    destinations.sort(key=lambda x: x["quality_score"], reverse=True)
    return destinations


# -----------------------------------------------------------------------------
# ÉTAPE 3 : Merge OSM + Manuel
# -----------------------------------------------------------------------------

def merge_sources(osm_destinations, manual_elements):
    manual_cleaned = clean_osm_elements(manual_elements)
    osm_names = {d["name"].lower().strip(): d for d in osm_destinations}

    merged = list(osm_destinations)
    for m in manual_cleaned:
        key = m["name"].lower().strip()
        if key not in osm_names:
            if m.get("pre_description"):
                m["description_fr"] = m["pre_description"]
            merged.append(m)

    merged.sort(key=lambda x: x["quality_score"], reverse=True)
    print(f"   🔗 Fusion: {len(osm_destinations)} OSM + {len(merged) - len(osm_destinations)} manuels = {len(merged)} total")
    return merged


# -----------------------------------------------------------------------------
# ÉTAPE 4 : Sélection diversifiée
# -----------------------------------------------------------------------------

def select_diverse(destinations, max_total=MAX_DESTINATIONS):
    selected = []
    category_counts = defaultdict(int)

    for dest in destinations:
        if len(selected) >= max_total:
            break
        main_cat = dest["categories"][0]
        quota = CATEGORY_QUOTAS.get(main_cat, 2)
        if category_counts[main_cat] < quota:
            selected.append(dest)
            for cat in dest["categories"]:
                category_counts[cat] += 1

    if len(selected) < max_total:
        selected_ids = {id(d) for d in selected}
        for dest in destinations:
            if len(selected) >= max_total:
                break
            if id(dest) not in selected_ids:
                selected.append(dest)

    selected.sort(key=lambda x: x["quality_score"], reverse=True)
    print(f"   📊 Sélection: {len(selected)} destinations")
    for cat, quota in CATEGORY_QUOTAS.items():
        actual = sum(1 for d in selected if cat in d["categories"])
        print(f"      • {cat}: {actual}/{quota}")
    return selected


# -----------------------------------------------------------------------------
# ÉTAPE 5 : Wikidata
# -----------------------------------------------------------------------------

def fetch_wikidata_batch(wikidata_ids):
    if not wikidata_ids:
        return {}
    ids_filter = " ".join([f"wd:{wid}" for wid in wikidata_ids if wid])
    if not ids_filter:
        return {}

    query = f"""
    SELECT ?item ?itemLabel ?itemDescription ?image ?articleFR ?articleEN ?articleAR WHERE {{
      VALUES ?item {{ {ids_filter} }}
      OPTIONAL {{ ?item wdt:P18 ?image. }}
      OPTIONAL {{ ?articleFR schema:about ?item; schema:isPartOf <https://fr.wikipedia.org/>. }}
      OPTIONAL {{ ?articleEN schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }}
      OPTIONAL {{ ?articleAR schema:about ?item; schema:isPartOf <https://ar.wikipedia.org/>. }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "fr,en,ar". }}
    }}
    """
    try:
        r = requests.get(
            WIKIDATA_URL,
            params={"query": query, "format": "json"},
            headers={"User-Agent": "VisitTunisiaBot/1.0", "Accept": "application/sparql-results+json"},
            timeout=60
        )
        r.raise_for_status()
        results = {}
        for binding in r.json().get("results", {}).get("bindings", []):
            item_url = binding.get("item", {}).get("value", "")
            wid = item_url.split("/")[-1]
            results[wid] = {
                "description_fr": binding.get("itemLabel", {}).get("value", ""),
                "description_en": binding.get("itemDescription", {}).get("value", ""),
                "image": binding.get("image", {}).get("value", ""),
                "article_fr": binding.get("articleFR", {}).get("value", ""),
                "article_en": binding.get("articleEN", {}).get("value", ""),
                "article_ar": binding.get("articleAR", {}).get("value", "")
            }
        return results
    except Exception as e:
        print(f"   ⚠️ Wikidata: {e}")
        return {}


def enrich_wikidata(destinations):
    print("🧠 Wikidata...")
    with_wiki = [d for d in destinations if d.get("wikidata_id")]
    if not with_wiki:
        print("   ⚠️ Aucun Wikidata")
        return destinations

    print(f"   ℹ️ {len(with_wiki)} avec Wikidata")
    ids = [d["wikidata_id"] for d in with_wiki]
    wiki_data = fetch_wikidata_batch(ids)

    for dest in destinations:
        wid = dest.get("wikidata_id")
        if wid and wid in wiki_data:
            w = wiki_data[wid]
            if not dest.get("description_fr") or len(dest.get("description_fr", "")) < 50:
                dest["description_fr"] = w.get("description_fr", "")
            dest["description_en"] = w.get("description_en", "")
            dest["image_url"] = w.get("image", "")
            dest["wikipedia_fr"] = w.get("article_fr", "")
            dest["wikipedia_en"] = w.get("article_en", "")
            dest["wikipedia_ar"] = w.get("article_ar", "")

    print(f"   ✅ {sum(1 for d in destinations if d.get('image_url'))} images")
    return destinations


# -----------------------------------------------------------------------------
# ÉTAPE 6 : Wikipedia
# -----------------------------------------------------------------------------

def fetch_wikipedia_extract(title, lang="fr"):
    if not title:
        return ""
    try:
        if ":" in title:
            title = title.split(":", 1)[1]
        url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{quote(title.replace(' ', '_'))}"
        r = requests.get(url, headers={"User-Agent": "VisitTunisiaBot/1.0"}, timeout=15)
        if r.status_code == 200:
            data = r.json()
            extract = data.get("extract", "")
            bad_patterns = ["peut faire référence", "peut désigner", "homonymie", "plusieurs", "différents"]
            if any(p in extract.lower() for p in bad_patterns):
                return ""
            foreign = ["barcelone", "los angeles", "paris", "rome", "pirandello", "shakespeare", "hollywood"]
            if any(f in extract.lower() for f in foreign):
                if not any(t in extract.lower() for t in ["tunisie", "tunisia", "tunisian"]):
                    return ""
            return extract
    except:
        pass
    return ""


def enrich_wikipedia(destinations):
    print("📖 Wikipedia...")
    count = 0
    for dest in destinations:
        if dest.get("description_fr") and len(dest["description_fr"]) > 50:
            continue

        title_fr = ""
        if dest.get("wikipedia_fr"):
            title_fr = dest["wikipedia_fr"].split("/")[-1].replace("_", " ")
        else:
            title_fr = dest["name"]

        extract = fetch_wikipedia_extract(title_fr, "fr")
        if not extract and dest.get("wikipedia_en"):
            title_en = dest["wikipedia_en"].split("/")[-1]
            extract = fetch_wikipedia_extract(title_en, "en")

        if extract:
            dest["description_fr"] = extract
            count += 1
        time.sleep(0.3)

    print(f"   ✅ {count} descriptions Wikipedia")
    return destinations


def search_commons_image(query):
    try:
        params = {
            "action": "query", "format": "json", "list": "search",
            "srsearch": query, "srnamespace": 6, "srlimit": 1
        }
        r = requests.get(COMMONS_API, params=params, timeout=15)
        results = r.json().get("query", {}).get("search", [])
        if results:
            filename = results[0]["title"].replace(" ", "_")
            return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(filename)}?width=800"
    except:
        pass
    return ""


def enrich_images(destinations):
    print("🖼️ Wikimedia Commons...")
    count = 0
    for dest in destinations:
        if dest.get("image_url"):
            continue
        img = search_commons_image(f"{dest['name']} Tunisia")
        if not img:
            img = search_commons_image(f"{dest['name']} Kairouan")
        if img:
            dest["image_url"] = img
            count += 1
        time.sleep(0.4)
    print(f"   ✅ {count} images")
    return destinations


# -----------------------------------------------------------------------------
# ÉTAPE 7 : Export
# -----------------------------------------------------------------------------

def convert_format(destinations):
    output = {"destinations": []}

    for dest in destinations:
        desc_fr = dest.get("description_fr", "")
        if not desc_fr or len(desc_fr) < 20:
            desc_fr = dest.get("pre_description", "")
        if not desc_fr or len(desc_fr) < 20:
            desc_fr = f"{dest['name']} est un site de type {dest['type'].lower().replace('_', ' ')} situé à {dest['region']}."

        desc_en = dest.get("description_en", "")
        if not desc_en or len(desc_en) < 20:
            desc_en = f"{dest['name_en']} is a {dest['type'].lower().replace('_', ' ')} site located in {dest['region']}."

        desc_ar = dest.get("name_ar", dest["name"])
        photos = [dest["image_url"]] if dest.get("image_url") else []

        horaires = {"toujours_ouvert": True}
        if dest["type"] == "SITE_TOURISTIQUE" and dest["tarif_estime"] > 0:
            horaires = {
                "lundi": "08:00-17:00", "mardi": "08:00-17:00",
                "mercredi": "08:00-17:00", "jeudi": "08:00-17:00",
                "vendredi": "08:00-17:00", "samedi": "08:00-17:00",
                "dimanche": "08:00-12:00"
            }
        elif dest["type"] == "RESTAURANT":
            horaires = {
                "lundi": "11:00-23:00", "mardi": "11:00-23:00",
                "mercredi": "11:00-23:00", "jeudi": "11:00-23:00",
                "vendredi": "11:00-23:00", "samedi": "11:00-23:00",
                "dimanche": "11:00-23:00"
            }

        output["destinations"].append({
            "nom": {"fr": dest["name"], "en": dest["name_en"], "ar": desc_ar},
            "description": {"fr": desc_fr, "en": desc_en, "ar": desc_ar},
            "type": dest["type"],
            "categories": dest["categories"],
            "region": dest["region"],
            "localisation": f"POINT({dest['longitude']} {dest['latitude']})",
            "latitude": dest["latitude"],
            "longitude": dest["longitude"],
            "tarifEstime": dest["tarif_estime"],
            "accessibilitePmr": dest["accessibilite_pmr"],
            "photos": photos,
            "horaires": horaires,
            "statut": "ACTIF",
            "attributsSpecifiques": {
                "quality_score": dest["quality_score"],
                "osm_source_tag": dest["osm_source_tag"],
                "wikidata_id": dest.get("wikidata_id", ""),
                "wikipedia_fr": dest.get("wikipedia_fr", ""),
                "wikipedia_en": dest.get("wikipedia_en", ""),
                **dest.get("osm_tags", {})
            }
        })
    return output


def export_csv(destinations):
    print(f"📊 CSV : {CSV_OUTPUT}")
    with open(CSV_OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "ID", "Nom (FR)", "Type", "Catégories", "Région",
            "Latitude", "Longitude", "Tarif (TND)", "Accessibilité PMR",
            "Score Qualité", "Description (FR)", "Photos", "Horaires"
        ])
        for idx, d in enumerate(destinations, 1):
            writer.writerow([
                idx, d["nom"]["fr"], d["type"], ", ".join(d["categories"]),
                d["region"], d["latitude"], d["longitude"],
                d["tarifEstime"], "Oui" if d["accessibilitePmr"] else "Non",
                d["attributsSpecifiques"]["quality_score"],
                d["description"]["fr"][:200] + "..." if len(d["description"]["fr"]) > 200 else d["description"]["fr"],
                d["photos"][0] if d["photos"] else "",
                str(d["horaires"])
            ])
    print(f"   ✅ {len(destinations)} lignes")


# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------

def main():
    print("=" * 70)
    print(f"🌍 VISIT TUNISIA — SCRAPER FINAL : {GOVERNORAT}")
    print("=" * 70)
    start = time.time()

    osm_elements = fetch_overpass_data()
    osm_destinations = clean_osm_elements(osm_elements)

    manual_elements = inject_manual_spots()

    all_destinations = merge_sources(osm_destinations, manual_elements)

    if not all_destinations:
        print("❌ Aucune destination.")
        return

    selected = select_diverse(all_destinations)

    selected = enrich_wikidata(selected)
    selected = enrich_wikipedia(selected)
    selected = enrich_images(selected)

    final_data = convert_format(selected)

    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)

    export_csv(final_data["destinations"])

    print()
    print("=" * 70)
    print("📊 RÉSULTAT FINAL")
    print("=" * 70)
    print(f"   📍 Destinations      : {len(final_data['destinations'])}")
    print(f"   🖼️  Avec images       : {sum(1 for d in final_data['destinations'] if d['photos'])}")
    print(f"   📝 Avec descriptions : {sum(1 for d in final_data['destinations'] if len(d['description']['fr']) > 50)}")
    print(f"   📁 JSON              : {JSON_OUTPUT}")
    print(f"   📁 CSV               : {CSV_OUTPUT}")
    print(f"   ⏱️  Temps             : {time.time()-start:.1f}s")
    print("=" * 70)


if __name__ == "__main__":
    main()