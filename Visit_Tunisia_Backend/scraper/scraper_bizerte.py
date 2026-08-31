#!/usr/bin/env python3
"""
================================================================================
Visit Tunisia — Scraper Bizerte (PRÉCIS)
================================================================================
Corrige les erreurs de géolocalisation (exclusion de Tunis) et de catégorisation.
================================================================================
"""

import requests
import json
import csv
import time
import re
from urllib.parse import quote
from collections import defaultdict

# -----------------------------------------------------------------------------
# CONFIGURATION — BIZERTE UNIQUEMENT
# -----------------------------------------------------------------------------
GOVERNORAT = "Bizerte"

# BBOX affinée pour le gouvernorat de Bizerte UNIQUEMENT
# Sud: 37.05 (juste au-dessus de Tunis), Nord: 37.50 (Cap Angela)
# Ouest: 9.10 (Cap Serrat), Est: 10.35 (Ghar El Melh)
BBOX = {
    "s": 37.05,
    "w": 9.10,
    "n": 37.50,
    "e": 10.35
}

# Seuil géographique : tout ce qui est au sud de 37.0 est considéré comme Tunis
LAT_MIN_BIZERTE = 37.00

JSON_OUTPUT = f"destinations_{GOVERNORAT.lower()}_precis.json"
CSV_OUTPUT = f"destinations_{GOVERNORAT.lower()}_precis.csv"
MAX_DESTINATIONS = 20

# Quotas par catégorie
CATEGORY_QUOTAS = {
    "BALNEAIRE": 6,
    "CULTUREL": 5,
    "ECOLOGIQUE": 3,
    "AVENTURE": 3,
    "RELIGIEUX": 2,
    "GASTRONOMIQUE": 2,
}

# Mapping OSM tags -> (TypeDestination, [Category])
# CORRIGÉ : cap, phare, côte → BALNEAIRE
OSM_MAPPING = {
    # === BALNEAIRE (prioritaire si côtier) ===
    "beach": ("SITE_TOURISTIQUE", ["BALNEAIRE"]),
    "beach_resort": ("SITE_TOURISTIQUE", ["BALNEAIRE"]),
    "cape": ("SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"]),      # Cap Angela, Cap Serrat
    # === CULTUREL ===
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
    # === ÉCOLOGIQUE ===
    "national_park": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "nature_reserve": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "protected_area": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "wetland": ("SITE_TOURISTIQUE", ["ECOLOGIQUE"]),
    "cave": ("SITE_TOURISTIQUE", ["ECOLOGIQUE", "AVENTURE"]),
    # === AVENTURE ===
    "viewpoint": ("SITE_TOURISTIQUE", ["AVENTURE", "ECOLOGIQUE"]),
    "zoo": ("SITE_TOURISTIQUE", ["AVENTURE"]),
    "theme_park": ("ACTIVITE", ["AVENTURE"]),
    "water_park": ("ACTIVITE", ["BALNEAIRE", "AVENTURE"]),
    "canyon": ("SITE_TOURISTIQUE", ["AVENTURE", "ECOLOGIQUE"]),
    # === RELIGIEUX ===
    "mosque": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    "church": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    "synagogue": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    "cathedral": ("SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"]),
    # === GASTRONOMIQUE ===
    "restaurant": ("RESTAURANT", ["GASTRONOMIQUE"]),
    "cafe": ("RESTAURANT", ["GASTRONOMIQUE"]),
    # === HÉBERGEMENT ===
    "hotel": ("HEBERGEMENT", ["BALNEAIRE"]),
    "hostel": ("HEBERGEMENT", ["BALNEAIRE"]),
    "guest_house": ("HEBERGEMENT", ["BALNEAIRE"]),
    "camp_site": ("HEBERGEMENT", ["ECOLOGIQUE", "AVENTURE"]),
}

# Villes à blacklister (pour éviter Tunis)
CITY_BLACKLIST = ["tunis", "تونس", "tunisia", "carthage", "قرطاج", "sidi bou said", "سيدي بوسعيد"]

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
WIKIDATA_URL = "https://query.wikidata.org/sparql"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


# -----------------------------------------------------------------------------
# ÉTAPE 1 : Overpass
# -----------------------------------------------------------------------------

def build_overpass_query():
    bbox = f"{BBOX['s']},{BBOX['w']},{BBOX['n']},{BBOX['e']}"
    query = f"""[out:json][timeout:90];
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
    return query


def fetch_overpass_data():
    query = build_overpass_query()
    print(f"🌐 Requête Overpass pour {GOVERNORAT}...")
    print(f"   📦 Bbox: {BBOX}")
    
    for idx, url in enumerate(OVERPASS_URLS):
        try:
            print(f"   🔄 Essai {idx+1}/{len(OVERPASS_URLS)}")
            response = requests.post(
                url,
                data={"data": query},
                headers={
                    "Accept": "*/*",
                    "User-Agent": "VisitTunisiaBot/1.0 (student project)",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout=90
            )
            response.raise_for_status()
            data = response.json()
            elements = data.get("elements", [])
            print(f"   ✅ {len(elements)} éléments bruts récupérés")
            return elements
        except requests.exceptions.HTTPError as e:
            print(f"   ⚠️ HTTP {e.response.status_code}")
            continue
        except Exception as e:
            print(f"   ⚠️ {str(e)[:80]}")
            continue
    
    print("   ❌ Overpass indisponible. Fallback manuel...")
    return fetch_manual_fallback()


def fetch_manual_fallback():
    """Données manuelles de qualité pour Bizerte si OSM est vide."""
    print("📋 Fallback manuel (spots connus de Bizerte)...")
    
    manual = [
        # (nom, type_uml, [categories], lat, lon, tag_osm)
        ("Cap Angela", "SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"], 37.3469, 9.7423, "cape"),
        ("Cap Serrat", "SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"], 37.2333, 9.2112, "cape"),
        ("Parc National de l'Ichkeul", "SITE_TOURISTIQUE", ["ECOLOGIQUE", "AVENTURE"], 37.1667, 9.6667, "national_park"),
        ("Utique", "SITE_TOURISTIQUE", ["CULTUREL"], 37.0507, 10.0569, "ruins"),
        ("Ghar El Melh", "SITE_TOURISTIQUE", ["BALNEAIRE", "CULTUREL"], 37.3333, 10.2000, "beach"),
        ("Plage de Raf Raf", "SITE_TOURISTIQUE", ["BALNEAIRE"], 37.1856, 10.2172, "beach"),
        ("Plage Sidi Ali El Mekki", "SITE_TOURISTIQUE", ["BALNEAIRE"], 37.1703, 10.2535, "beach"),
        ("Médina de Bizerte", "SITE_TOURISTIQUE", ["CULTUREL"], 37.2744, 9.8739, "attraction"),
        ("Fort de Bizerte", "SITE_TOURISTIQUE", ["CULTUREL"], 37.2700, 9.8800, "castle"),
        ("Mosquée de Bizerte", "SITE_TOURISTIQUE", ["RELIGIEUX", "CULTUREL"], 37.2740, 9.8740, "mosque"),
        ("Port de Peche de Bizerte", "SITE_TOURISTIQUE", ["BALNEAIRE", "GASTRONOMIQUE"], 37.2680, 9.8820, "attraction"),
        ("Tinja", "SITE_TOURISTIQUE", ["CULTUREL"], 37.1667, 9.7500, "attraction"),
        ("Menzel Bourguiba", "SITE_TOURISTIQUE", ["CULTUREL"], 37.1500, 9.8000, "attraction"),
        ("Metline", "SITE_TOURISTIQUE", ["BALNEAIRE"], 37.2333, 10.0500, "beach"),
        ("Ain Damous", "SITE_TOURISTIQUE", ["BALNEAIRE", "ECOLOGIQUE"], 37.2500, 9.0167, "beach"),
        ("Raf Raf", "SITE_TOURISTIQUE", ["BALNEAIRE"], 37.2000, 10.1833, "beach"),
        ("Plage de Sidi Salem", "SITE_TOURISTIQUE", ["BALNEAIRE"], 37.3000, 9.9000, "beach"),
        ("Hôtel Dar El Bhar", "HEBERGEMENT", ["BALNEAIRE"], 37.2800, 9.8700, "hotel"),
        ("Restaurant Le Méditerranée", "RESTAURANT", ["GASTRONOMIQUE"], 37.2750, 9.8750, "restaurant"),
        ("Cap Blanc", "SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"], 37.3490, 9.9360, "cape"),
    ]
    
    elements = []
    for name, dtype, cats, lat, lon, tag in manual:
        elements.append({
            "type": "node",
            "lat": lat,
            "lon": lon,
            "tags": {
                "name": name,
                "name:fr": name,
                "tourism": tag if tag not in ["restaurant", "cafe", "hotel"] else "yes",
                "amenity": tag if tag in ["restaurant", "cafe"] else "",
                "addr:city": "Bizerte"
            }
        })
    
    print(f"   ✅ {len(elements)} destinations manuelles injectées")
    return elements


# -----------------------------------------------------------------------------
# ÉTAPE 2 : Nettoyage + FILTRE GÉOGRAPHIQUE STRICT
# -----------------------------------------------------------------------------

def is_in_bizerte_region(lat, lon, tags):
    """
    Filtre strict pour exclure Tunis et autres régions.
    Retourne False si le lieu est clairement hors Bizerte.
    """
    # Filtre coordonnées : au sud de 37.0 = Tunis
    if lat < LAT_MIN_BIZERTE:
        return False
    
    # Filtre ville : si explicitement Tunis dans addr:city
    city = (tags.get("addr:city") or tags.get("is_in:city") or tags.get("is_in") or "").lower()
    for black in CITY_BLACKLIST:
        if black in city:
            # Exception : si le nom contient Bizerte, on garde
            name = (tags.get("name") or "").lower()
            if "bizerte" not in name and "منزل بورقيبة" not in name:
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
        score += 25
    if tags.get("wikipedia"):
        score += 15
    if tags.get("description") or tags.get("description:fr"):
        score += 10
    if tags.get("website") or tags.get("contact:website"):
        score += 10
    if tags.get("opening_hours") or tags.get("fee"):
        score += 5
    if tags.get("wikimedia_commons") or tags.get("image"):
        score += 5
    return score


def determine_type_and_categories(tags):
    # Priorité : natural=cape est BALNEAIRE (cap, pointe, phare côtier)
    if tags.get("natural", "").lower() == "cape":
        return ("SITE_TOURISTIQUE", ["BALNEAIRE", "AVENTURE"], "cape")
    
    # Si c'est un phare (man_made=lighthouse) et côtier
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


def clean_and_score(elements):
    destinations = []
    seen_names = set()
    rejected = {"tunis": 0, "coords": 0, "dup": 0}
    
    for elem in elements:
        tags = elem.get("tags", {})
        name = tags.get("name:fr") or tags.get("name:en") or tags.get("name")
        if not name:
            continue
        
        # Coordonnées
        if elem["type"] == "node":
            lat, lon = elem.get("lat"), elem.get("lon")
        else:
            center = elem.get("center", {})
            lat, lon = center.get("lat"), center.get("lon")
        
        if not lat or not lon:
            continue
        
        # FILTRE GÉO STRICT
        if not is_in_bizerte_region(lat, lon, tags):
            rejected["tunis" if lat < LAT_MIN_BIZERTE else "coords"] += 1
            continue
        
        # Déduplication
        name_key = name.lower().strip()
        if name_key in seen_names:
            rejected["dup"] += 1
            continue
        seen_names.add(name_key)
        
        # Type et catégories
        dest_type, categories, osm_tag = determine_type_and_categories(tags)
        quality_score = score_quality(elem)
        
        # Région : forcer Bizerte si ambigu
        city = tags.get("addr:city") or tags.get("is_in:city") or tags.get("is_in:town") or GOVERNORAT
        if city.lower() in ["tunis", "تونس"]:
            city = GOVERNORAT
        
        # Tarif
        fee = tags.get("fee", "")
        charge = tags.get("charge", "")
        tarif = 0.0
        if fee == "yes" or charge:
            try:
                nums = re.findall(r"[\d\.]+", str(charge))
                tarif = float(nums[0]) if nums else 10.0
            except:
                tarif = 10.0
        
        wheelchair = tags.get("wheelchair", "")
        accessibilite = wheelchair == "yes"
        
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
        })
    
    print(f"   ✅ {len(destinations)} destinations VALIDES")
    print(f"   🚫 Rejetés : {rejected['tunis']} (Tunis/coords), {rejected['coords']} (hors zone), {rejected['dup']} (doublons)")
    destinations.sort(key=lambda x: x["quality_score"], reverse=True)
    return destinations


# -----------------------------------------------------------------------------
# ÉTAPE 3 : Sélection diversifiée
# -----------------------------------------------------------------------------

def select_diverse_destinations(destinations, max_total=MAX_DESTINATIONS):
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
    print(f"   📊 Sélection finale : {len(selected)} destinations")
    for cat, quota in CATEGORY_QUOTAS.items():
        actual = sum(1 for d in selected if cat in d["categories"])
        print(f"      • {cat}: {actual}/{quota}")
    return selected


# -----------------------------------------------------------------------------
# ÉTAPE 4 : Wikidata
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
        response = requests.get(
            WIKIDATA_URL,
            params={"query": query, "format": "json"},
            headers={"User-Agent": "VisitTunisiaBot/1.0", "Accept": "application/sparql-results+json"},
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        results = {}
        for binding in data.get("results", {}).get("bindings", []):
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
        print(f"   ⚠️ Erreur Wikidata: {e}")
        return {}


def enrich_with_wikidata(destinations):
    print("🧠 Enrichissement Wikidata...")
    with_wiki = [d for d in destinations if d.get("wikidata_id")]
    if not with_wiki:
        print("   ⚠️ Aucun ID Wikidata")
        return destinations
    
    print(f"   ℹ️ {len(with_wiki)} destinations avec Wikidata")
    ids = [d["wikidata_id"] for d in with_wiki]
    wiki_data = fetch_wikidata_batch(ids)
    
    for dest in destinations:
        wid = dest.get("wikidata_id")
        if wid and wid in wiki_data:
            w = wiki_data[wid]
            dest["description_fr"] = w.get("description_fr", "")
            dest["description_en"] = w.get("description_en", "")
            dest["image_url"] = w.get("image", "")
            dest["wikipedia_fr"] = w.get("article_fr", "")
            dest["wikipedia_en"] = w.get("article_en", "")
            dest["wikipedia_ar"] = w.get("article_ar", "")
    
    count_img = sum(1 for d in destinations if d.get("image_url"))
    print(f"   ✅ {count_img} images trouvées")
    return destinations


# -----------------------------------------------------------------------------
# ÉTAPE 5 : Wikipedia + Commons
# -----------------------------------------------------------------------------

def fetch_wikipedia_extract(title, lang="fr"):
    if not title:
        return ""
    try:
        if ":" in title:
            title = title.split(":", 1)[1]
        url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{quote(title.replace(' ', '_'))}"
        response = requests.get(url, headers={"User-Agent": "VisitTunisiaBot/1.0"}, timeout=15)
        if response.status_code == 200:
            return response.json().get("extract", "")
    except:
        pass
    return ""


def enrich_with_wikipedia(destinations):
    print("📖 Récupération Wikipedia...")
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
    
    print(f"   ✅ {count} descriptions complétées")
    return destinations


def search_commons_image(query):
    try:
        params = {
            "action": "query", "format": "json", "list": "search",
            "srsearch": query, "srnamespace": 6, "srlimit": 1
        }
        response = requests.get(COMMONS_API, params=params, timeout=15)
        results = response.json().get("query", {}).get("search", [])
        if results:
            filename = results[0]["title"].replace(" ", "_")
            return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(filename)}?width=800"
    except:
        pass
    return ""


def enrich_missing_images(destinations):
    print("🖼️ Recherche images Wikimedia Commons...")
    count = 0
    for dest in destinations:
        if dest.get("image_url"):
            continue
        img = search_commons_image(f"{dest['name']} Tunisia")
        if not img:
            img = search_commons_image(f"{dest['name']} Bizerte")
        if img:
            dest["image_url"] = img
            count += 1
        time.sleep(0.4)
    print(f"   ✅ {count} images supplémentaires")
    return destinations


# -----------------------------------------------------------------------------
# ÉTAPE 6 : Format Final
# -----------------------------------------------------------------------------

def convert_to_app_format(destinations):
    output = {"destinations": []}
    
    for dest in destinations:
        desc_fr = dest.get("description_fr", "")
        if not desc_fr or len(desc_fr) < 20:
            desc_fr = f"{dest['name']} est un site de type {dest['type'].lower().replace('_', ' ')} situé à {dest['region']}."
        
        desc_en = dest.get("description_en", "")
        if not desc_en or len(desc_en) < 20:
            desc_en = f"{dest['name_en']} is a {dest['type'].lower().replace('_', ' ')} site located in {dest['region']}."
        
        desc_ar = dest.get("name_ar", dest["name"])
        photos = []
        if dest.get("image_url"):
            photos.append(dest["image_url"])
        
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
    print(f"📊 Export CSV : {CSV_OUTPUT}")
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
    print(f"   ✅ {len(destinations)} lignes exportées")


# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------

def main():
    print("=" * 70)
    print(f"🌍 VISIT TUNISIA — SCRAPER PRÉCIS : {GOVERNORAT}")
    print("=" * 70)
    start_time = time.time()
    
    elements = fetch_overpass_data()
    if not elements:
        print("❌ Aucune donnée récupérée.")
        return
    
    destinations = clean_and_score(elements)
    if not destinations:
        print("❌ Aucune destination valide après filtrage.")
        return
    
    destinations = select_diverse_destinations(destinations)
    destinations = enrich_with_wikidata(destinations)
    destinations = enrich_with_wikipedia(destinations)
    destinations = enrich_missing_images(destinations)
    final_data = convert_to_app_format(destinations)
    
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
    
    export_csv(final_data["destinations"])
    
    elapsed = time.time() - start_time
    print()
    print("=" * 70)
    print("📊 RÉSULTAT FINAL")
    print("=" * 70)
    print(f"   📍 Destinations      : {len(final_data['destinations'])}")
    print(f"   🖼️  Avec images       : {sum(1 for d in final_data['destinations'] if d['photos'])}")
    print(f"   📝 Avec descriptions : {sum(1 for d in final_data['destinations'] if len(d['description']['fr']) > 50)}")
    print(f"   📁 JSON              : {JSON_OUTPUT}")
    print(f"   📁 CSV               : {CSV_OUTPUT}")
    print(f"   ⏱️  Temps total       : {elapsed:.1f}s")
    print("=" * 70)


if __name__ == "__main__":
    main()