#!/usr/bin/env python3
"""
================================================================================
Visit Tunisia — Scraper Mahdia (FINAL — 20 spots de qualité)
================================================================================
Combine OSM + fallback manuel de spots touristiques réels du gouvernorat de Mahdia.
Inclut El Jem, Chebba, Rejiche, Bradaa. Exclut Sousse, Monastir et Sfax.
================================================================================
"""

import requests
import json
import csv
import time
import re
from urllib.parse import quote
from collections import defaultdict

GOVERNORAT = "Mahdia"

# BBOX du gouvernorat de Mahdia (Sahel + El Jem à l'ouest)
# Nord: 35.65 (limite Sousse/Monastir), Sud: 35.15 (limite Sfax)
# Ouest: 10.20 (El Jem), Est: 11.20 (Cap Afrique)
BBOX = {
    "s": 35.15,
    "w": 10.20,
    "n": 35.65,
    "e": 11.20
}

LAT_MIN, LAT_MAX = 35.10, 35.70
LON_MIN, LON_MAX = 10.15, 11.25

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
    "sfax", "صفاقس", "kairouan", "القيروان", "zaghouan", "زغوان",
    "ben arous", "بن عروس", "manouba", "منوبة", "ariana", "أريانة",
    "la goulette", "حلق الوادي", "bizerte", "بنزرت", "jendouba", "جندوبة",
    "beja", "باجة", "siliana", "سليانة", "kef", "الكاف", "tozeur", "توزر",
    "gafsa", "قفصة", "tataouine", "تطاوين", "medenine", "مدنين", "jerba", "جربة",
    "gabes", "قابس", "kebili", "قبلي"
]

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]
WIKIDATA_URL = "https://query.wikidata.org/sparql"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


# -----------------------------------------------------------------------------
# FALLBACK MANUEL — Spots touristiques réels de Mahdia
# -----------------------------------------------------------------------------

MANUAL_SPOTS = [
    # Mahdia centre — Médina & Culturel
    ("Médina de Mahdia", "SITE_TOURISTIQUE", ["CULTUREL"], 35.5047, 11.0622,
     "La médina de Mahdia est une ancienne cité fortifiée fondée par les Fatimides, célèbre pour ses remparts et sa mosquée.", "attraction"),
    ("Ribat de Mahdia", "SITE_TOURISTIQUE", ["CULTUREL"], 35.5025, 11.0730,
     "Le Ribat de Mahdia est une forteresse monastique du IXe siècle dominant la mer, offrant une vue panoramique sur la côte.", "castle"),
    ("Grande Mosquée de Mahdia", "SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"], 35.5050, 11.0630,
     "La Grande Mosquée de Mahdia est un chef-d'œuvre de l'architecture islamique du Xe siècle, symbole de la ville.", "mosque"),
    ("Musée des Arts Islamiques de Mahdia", "SITE_TOURISTIQUE", ["CULTUREL"], 35.5030, 11.0640,
     "Le musée des Arts Islamiques de Mahdia abrite une collection exceptionnelle de céramiques, manuscrits et tissus historiques.", "museum"),
    ("Bab El Bhar de Mahdia", "SITE_TOURISTIQUE", ["CULTUREL"], 35.5010, 11.0700,
     "Bab El Bhar est la porte maritime de la médina de Mahdia, donnant directement sur le port et la mer.", "city_gate"),
    ("Phare de Mahdia", "SITE_TOURISTIQUE", ["BALNEAIRE", "CULTUREL"], 35.5020, 11.0750,
     "Le phare de Mahdia domine le cap et offre une vue spectaculaire sur la mer Méditerranée et la côte.", "attraction"),
    ("Port de Pêche de Mahdia", "SITE_TOURISTIQUE", ["BALNEAIRE", "CULTUREL"], 35.5010, 11.0700,
     "Le port de pêche de Mahdia est un lieu authentique où l'on peut observer les pointus et déguster du poisson frais.", "attraction"),

    # El Jem — Culturel (UNESCO)
    ("Amphithéâtre d'El Jem", "SITE_TOURISTIQUE", ["CULTUREL"], 35.2964, 10.7064,
     "L'amphithéâtre d'El Jem est le plus grand colisée d'Afrique, classé au patrimoine mondial de l'UNESCO.", "amphitheatre"),
    ("Musée d'El Jem", "SITE_TOURISTIQUE", ["CULTUREL"], 35.2970, 10.7070,
     "Le musée d'El Jem abrite de superbes mosaïques romaines et retrace l'histoire de la Thysdrus antique.", "museum"),
    ("Villas Romaines d'El Jem", "SITE_TOURISTIQUE", ["CULTUREL"], 35.2950, 10.7050,
     "Les villas romaines d'El Jem révèlent des pavements de mosaïques exceptionnellement bien conservés.", "archaeological_site"),

    # Plages — Balnéaire
    ("Plage de Mahdia", "SITE_TOURISTIQUE", ["BALNEAIRE"], 35.5000, 11.0800,
     "La plage de Mahdia est une longue étendue de sable fin bordant la médina, idéale pour la baignade.", "beach"),
    ("Plage de Chebba", "SITE_TOURISTIQUE", ["BALNEAIRE"], 35.2333, 11.1167,
     "La plage de Chebba est réputée pour ses eaux cristallines et son sable doré, l'une des plus belles du Sahel.", "beach"),
    ("Plage de Rejiche", "SITE_TOURISTIQUE", ["BALNEAIRE"], 35.2667, 11.2167,
     "La plage de Rejiche offre un cadre naturel préservé, parfaite pour les familles et les amateurs de calme.", "beach"),
    ("Plage de Bradaa", "SITE_TOURISTIQUE", ["BALNEAIRE"], 35.3167, 11.2333,
     "La plage de Bradaa est une plage sauvage et tranquille au sud de Mahdia, idéale pour l'évasion.", "beach"),
    ("Plage d'Hiboun", "SITE_TOURISTIQUE", ["BALNEAIRE"], 35.5500, 11.0167,
     "La plage d'Hiboun est une station balnéaire familiale au nord de Mahdia, connue pour ses eaux peu profondes.", "beach"),
    ("Plage de Salakta", "SITE_TOURISTIQUE", ["BALNEAIRE", "CULTUREL"], 35.3167, 11.1500,
     "Salakta est un site antique et une plage préservée, célèbre pour son histoire punique et romaine.", "beach"),
    ("Plage d'Ouled Yamina", "SITE_TOURISTIQUE", ["BALNEAIRE"], 35.4167, 11.0167,
     "La plage d'Ouled Yamina est une étendue de sable doré au nord de Mahdia, prisée pour son authenticité.", "beach"),

    # Cap Afrique — Aventure/Balnéaire
    ("Cap Afrique", "SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"], 35.4833, 11.1000,
     "Le Cap Afrique est le point le plus oriental de la Tunisie, offrant des paysages sauvages et des falaises spectaculaires.", "cape"),

    # Gastronomie & Hébergement
    ("Restaurant Le Pêcheur Mahdia", "RESTAURANT", ["GASTRONOMIQUE"], 35.5025, 11.0680,
     "Le Pêcheur est un restaurant institution de Mahdia, spécialisé dans les fruits de mer et la cuisine locale.", "restaurant"),
    ("Café du Port Mahdia", "RESTAURANT", ["GASTRONOMIQUE", "CULTUREL"], 35.5030, 11.0720,
     "Le Café du Port est un établissement traditionnel au bord de l'eau, idéal pour déguster le thé et observer les pêcheurs.", "cafe"),
    ("Hôtel El Mahdia", "HEBERGEMENT", ["BALNEAIRE"], 35.4980, 11.0780,
     "L'hôtel El Mahdia est un établissement en bord de mer offrant une vue imprenable sur la médina et la plage.", "hotel"),
    ("Hôtel El Jem", "HEBERGEMENT", ["CULTUREL"], 35.2980, 10.7080,
     "L'hôtel El Jem permet de séjourner à proximité immédiate de l'amphithéâtre romain.", "hotel"),
]


def inject_manual_spots():
    elements = []
    for name, dtype, cats, lat, lon, desc, tag in MANUAL_SPOTS:
        tags = {
            "name": name,
            "name:fr": name,
            "description:fr": desc,
            "addr:city": "Mahdia",
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
            if any(w in name_lower for w in ["mahdia", "el jem", "chebba", "rejiche", "bradaa", "hiboun", "salakta", "ouled yamina", "cap afrique"]):
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
            img = search_commons_image(f"{dest['name']} Mahdia")
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