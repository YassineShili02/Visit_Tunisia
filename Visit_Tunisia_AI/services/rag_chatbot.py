import os, time, random, logging, httpx
import google.generativeai as genai
from typing import List, Dict, Any, Tuple, Optional
from schemas.chat import ChatMessage, DestinationCard, ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "http://localhost:8082")

# Cache global avec protection contre les rafraîchissements concurrents
_destinations_cache: List[Dict[str, Any]] = []
_dest_last_cache_time: float = 0.0
_dest_is_refreshing: bool = False  # Flag pour éviter les rafraîchissements simultanés

_events_cache: List[Dict[str, Any]] = []
_events_last_cache_time: float = 0.0

CACHE_TTL_SECONDS = 300

QUICK_QUESTION_POOL = [
    "Que visiter \u00e0 Sidi Bou Sa\u00efd ?",
    "O\u00f9 manger les meilleures sp\u00e9cialit\u00e9s locales ?",
    "Quel circuit faire pour 3 jours dans le sud ?",
    "Quels sont les prochains festivals et \u00e9v\u00e9nements ?",
    "Quand est la meilleure saison pour visiter la Tunisie ?",
    "Que faire \u00e0 Djerba en famille ?",
    "Les plus beaux ksour de Tataouine ?",
    "Comment aller de Tunis \u00e0 Tozeur ?",
    "Sp\u00e9cialit\u00e9s culinaires \u00e0 ne pas rater ?",
    "Que faire \u00e0 Carthage ?",
    "Meilleurs h\u00f4tels \u00e0 Monastir ?",
    "Activit\u00e9s nautiques \u00e0 Sousse ?",
    "Que voir \u00e0 Kairouan ?",
    "Quels \u00e9v\u00e9nements culturels ont lieu \u00e0 Tunis ?",
    "Plages secr\u00e8tes autour de Nabeul ?",
    "Que faire une journ\u00e9e \u00e0 Bizerte ?",
]

TYPE_LABELS = {
    "HEBERGEMENT": "Hébergement",
    "HOTEL": "Hôtel",
    "RESTAURANT": "Restaurant",
    "SITE_TOURISTIQUE": "Site touristique",
    "ACTIVITE": "Activité",
    "PLAGE": "Plage",
    "MUSEE": "Musée",
    "MONUMENT": "Monument",
    "PARC": "Parc",
}

REGION_ALIASES = {
    "djerba": "medenine", "zarzis": "medenine", "mdenine": "medenine",
    "hammamet": "nabeul", "kelibia": "nabeul", "kélibia": "nabeul", "korba": "nabeul", "el haouaria": "nabeul",
    "douz": "kebili", "kbili": "kebili",
    "carthage": "tunis", "la marsa": "tunis", "sidi bou said": "tunis", "la goulette": "tunis", "gammarth": "tunis",
    "el jem": "mahdia", "el djem": "mahdia", "chebba": "mahdia",
    "port el kantaoui": "sousse", "kantaoui": "sousse", "hergla": "sousse",
    "tabarka": "jendouba", "ain draham": "jendouba", "aïn draham": "jendouba",
    "matmata": "gabes", "chenini": "tataouine", "douiret": "tataouine", "guermassa": "tataouine",
    "chott el djerid": "tozeur", "nefta": "tozeur", "tamaghza": "tozeur", "chebika": "tozeur", "mides": "tozeur",
}

ALL_GOVERNORATES = [
    "tunis", "ariana", "ben arous", "manouba", "nabeul", "zaghouan", "bizerte",
    "beja", "béja", "jendouba", "kef", "le kef", "siliana",
    "sousse", "monastir", "mahdia", "sfax", "kairouan", "kasserine", "sidi bouzid", "gafsa",
    "tozeur", "kebili", "tataouine", "gabes", "gabès", "medenine"
]

EVENT_KEYWORDS = {
    "evenement", "événement", "evenements", "événements", "festival", "festivals",
    "concert", "concerts", "spectacle", "spectacles", "theatre", "théâtre",
    "cinema", "cinéma", "culturel", "manifestation", "programme", "fete", "fête",
    "jmc", "jcc", "carthage festival", "el jem"
}

FOOD_KEYWORDS = {
    "manger", "restaurant", "restaurants", "resto", "restos", "cuisine", "plat", "plats",
    "gastronomie", "gastronomique", "dejeuner", "déjeuner", "diner", "dîner", "repas",
    "specialite", "spécialité", "specialites", "spécialités", "cafe", "café", "gourmand"
}

HOTEL_KEYWORDS = {
    "hotel", "hotels", "hôtel", "hôtels", "dormir", "loger", "logement", "hebergement", "hébergement",
    "chambre", "resort", "resorts", "nuitee", "nuitée", "sejourner", "séjourner", "auberge"
}

BEACH_KEYWORDS = {
    "plage", "plages", "mer", "baignade", "baigner", "crique", "criques", "sable", "nautique"
}

VISIT_KEYWORDS = {
    "visite", "visites", "visiter", "voir", "lieu", "lieux", "endroit", "endroits",
    "monument", "monuments", "musee", "musée", "musees", "musées", "histoire", "historique",
    "site", "sites", "ruines", "patrimoine", "decouvrir", "découvrir", "circuit"
}


class RAGChatbotService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        genai.configure(api_key=api_key)
        self.model_name = "gemini-3.5-flash-lite"
        logger.info("RAGChatbotService initialise avec %s", self.model_name)

    async def get_all_destinations(self) -> List[Dict[str, Any]]:
        global _destinations_cache, _dest_last_cache_time, _dest_is_refreshing
        if _destinations_cache:
            if time.time() - _dest_last_cache_time >= CACHE_TTL_SECONDS:
                # Ne lance le rafraîchissement que si aucun autre n'est en cours
                if not _dest_is_refreshing:
                    import asyncio
                    asyncio.create_task(self._refresh_destinations_cache())
            return _destinations_cache
        await self._refresh_destinations_cache()
        return _destinations_cache

    async def _refresh_destinations_cache(self):
        global _destinations_cache, _dest_last_cache_time, _dest_is_refreshing
        
        # Protection contre les rafraîchissements simultanés
        if _dest_is_refreshing:
            logger.debug("Cache refresh already in progress, skipping")
            return
        
        _dest_is_refreshing = True
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.get(f"{SPRING_BOOT_URL}/api/destinations?size=300")
                if res.status_code == 200:
                    data = res.json()
                    items = data.get("content", data) if isinstance(data, dict) else data
                    if isinstance(items, list) and items:
                        _destinations_cache = items
                        _dest_last_cache_time = time.time()
                        logger.info("Cache: %d destinations", len(items))
        except Exception as e:
            logger.warning("Cache destinations failed: %s", e)
        finally:
            _dest_is_refreshing = False

    async def get_all_events(self) -> List[Dict[str, Any]]:
        global _events_cache, _events_last_cache_time
        if _events_cache:
            if time.time() - _events_last_cache_time >= CACHE_TTL_SECONDS:
                import asyncio
                asyncio.create_task(self._refresh_events_cache())
            return _events_cache
        await self._refresh_events_cache()
        return _events_cache

    async def _refresh_events_cache(self):
        global _events_cache, _events_last_cache_time
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.get(f"{SPRING_BOOT_URL}/api/events?upcomingOnly=false&size=100")
                if res.status_code == 200:
                    data = res.json()
                    items = data.get("content", data) if isinstance(data, dict) else data
                    if isinstance(items, list) and items:
                        _events_cache = items
                        _events_last_cache_time = time.time()
                        logger.info("Cache: %d evenements", len(items))
        except Exception as e:
            logger.warning("Cache evenements failed: %s", e)

    def _extract_name(self, dest: Dict[str, Any]) -> str:
        nom = dest.get("nom") or dest.get("titre") or dest.get("name") or "Destination"
        if isinstance(nom, dict):
            return nom.get("fr") or nom.get("en") or nom.get("ar") or str(nom)
        return str(nom)

    def _extract_image(self, dest: Dict[str, Any]) -> Optional[str]:
        photos = dest.get("photos")
        if photos and isinstance(photos, list):
            p = photos[0]
            if isinstance(p, str):
                return p if (p.startswith("http") or p.startswith("/")) else f"data:image/jpeg;base64,{p}"
            if isinstance(p, dict):
                if p.get("url"): return p["url"]
                if p.get("data"): return f"data:image/jpeg;base64,{p['data']}"
        return str(dest["image"]) if dest.get("image") else None

    def _extract_desc(self, dest: Dict[str, Any]) -> str:
        desc = dest.get("description") or ""
        if isinstance(desc, dict):
            desc = desc.get("fr") or desc.get("en") or ""
        return str(desc)[:220]

    def _extract_event_title(self, ev: Dict[str, Any]) -> str:
        titre = ev.get("titreFr") or ev.get("titre") or ev.get("name") or "Événement"
        if isinstance(titre, dict):
            return titre.get("fr") or titre.get("en") or titre.get("ar") or str(titre)
        return str(titre)

    def _detect_regions_in_query(self, query: str) -> List[str]:
        q_lower = query.lower()
        mentioned = []
        for alias, canon in REGION_ALIASES.items():
            if alias in q_lower:
                mentioned.append(canon)
        for r in ALL_GOVERNORATES:
            clean_r = "beja" if r == "béja" else ("kef" if r == "le kef" else ("gabes" if r == "gabès" else r))
            if r in q_lower and clean_r not in mentioned:
                mentioned.append(clean_r)
        return mentioned

    def search_relevant_destinations(
        self, query: str, destinations: List[Dict[str, Any]], top_k: int = 6
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        if not destinations:
            return [], []

        q_lower = query.lower()
        query_words = set(q_lower.split())

        # 1. Detect region intent
        mentioned_regions = self._detect_regions_in_query(query)

        # 2. Detect category / type intent
        is_food = bool(query_words.intersection(FOOD_KEYWORDS))
        is_hotel = bool(query_words.intersection(HOTEL_KEYWORDS))
        is_beach = bool(query_words.intersection(BEACH_KEYWORDS))
        is_visit = bool(query_words.intersection(VISIT_KEYWORDS))

        scored: List[Tuple[float, Dict[str, Any]]] = []

        for d in destinations:
            name   = self._extract_name(d).lower()
            region = str(d.get("region") or "").lower()
            desc   = self._extract_desc(d).lower()
            dtype  = str(d.get("type") or "").upper()
            cats   = [str(c).upper() for c in (d.get("categories") or [])]

            # STRICT REGION FILTER: If a region is asked, reject destinations from other regions!
            if mentioned_regions:
                if not any(r in region or r in name for r in mentioned_regions):
                    continue

            score = 0.0

            # Region match score
            if mentioned_regions:
                score += 8.0

            # Strict Category / Type Intent Filter
            if is_food:
                if dtype in ["RESTAURANT", "CAFE", "SALON_DE_THE"]:
                    score += 15.0
                else:
                    continue  # Skip non-restaurants (even if they have food tag)
            elif is_hotel:
                if dtype in ["HEBERGEMENT", "HOTEL"]:
                    score += 15.0
                else:
                    continue  # Skip non-hotels when asking for accommodation
            elif is_beach:
                if dtype == "PLAGE" or "PLAGE" in cats or "plage" in name:
                    score += 15.0
                else:
                    continue  # Skip non-beaches when asking for beaches
            elif is_visit:
                if dtype in ["SITE_TOURISTIQUE", "MUSEE", "MONUMENT", "ACTIVITE"]:
                    score += 8.0

            # Keyword match in name or description
            for word in query_words:
                if len(word) > 2 and word not in ["les", "des", "une", "pour", "dans", "avec", "sur", "est", "que", "qui", "quel", "quels", "quelle", "quelles", "ou", "où"]:
                    if word in name:
                        score += 5.0
                    if word in desc:
                        score += 2.0
                    if any(word in c.lower() for c in cats):
                        score += 3.0

            # ONLY add rating bonus if there is already a positive relevant match!
            if score > 0:
                rating = float(d.get("noteAverage") or d.get("noteMoyenne") or 0)
                score += rating * 0.2
                scored.append((score, d))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]], mentioned_regions

    def search_relevant_events(self, query: str, events: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        if not events:
            return []
        q_lower = query.lower()
        scored: List[Tuple[float, Dict[str, Any]]] = []
        for ev in events:
            score = 1.0
            titre = self._extract_event_title(ev).lower()
            genre = str(ev.get("genre") or "").lower()
            lieu = str(ev.get("lieuLibre") or ev.get("destinationNom") or ev.get("destinationRegion") or "").lower()
            desc = str(ev.get("descriptionFr") or ev.get("description") or "").lower()

            for word in q_lower.split():
                if len(word) > 2:
                    if word in titre: score += 5.0
                    if word in genre: score += 4.0
                    if word in lieu:  score += 3.0
                    if word in desc:  score += 2.0

            scored.append((score, ev))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def _build_system_instruction(
        self,
        context_destinations: List[Dict[str, Any]],
        context_events: List[Dict[str, Any]],
        mentioned_regions: List[str],
        history_len: int
    ) -> str:
        ctx = ""
        if context_destinations:
            ctx += "DESTINATIONS DISPONIBLES DANS NOTRE BASE VISIT TUNISIA :\n"
            for d in context_destinations:
                name      = self._extract_name(d)
                reg       = d.get("region", "Tunisie")
                dtype     = d.get("type", "SITE_TOURISTIQUE")
                price     = d.get("tarifEstime") or d.get("price") or 0
                price_str = f"{price} DT" if price else "non renseigne"
                rating    = d.get("noteAverage") or 4.5
                desc      = self._extract_desc(d)
                cats      = ", ".join(d.get("categories") or [])
                ctx += (
                    f"- {name} ({reg}) | Type: {dtype}"
                    f" | Tarif: {price_str} | Note: {rating}/5"
                    + (f" | Tags: {cats}" if cats else "")
                    + (f"\n  Description: {desc}" if desc else "")
                    + "\n"
                )
        elif mentioned_regions:
            reg_names = ", ".join(r.capitalize() for r in mentioned_regions)
            ctx += f"\nNOTE BASE DE DONNEES : Notre plateforme ne dispose pas encore d'etablissements ou fiches enregistrees pour la region de {reg_names}. Explique poliment a l'utilisateur ce qu'il y a d'interessant dans cette region mais sans inventer d'etablissements inexistants dans l'application.\n"

        if context_events:
            ctx += "\nEVENEMENTS ET FESTIVALS ACTUELS EN TUNISIE :\n"
            for ev in context_events:
                titre = self._extract_event_title(ev)
                genre = ev.get("genre") or "Culturel"
                d_deb = ev.get("dateDebut") or "A venir"
                d_fin = ev.get("dateFin") or ""
                date_str = f"du {d_deb} au {d_fin}" if d_fin and d_fin != d_deb else f"le {d_deb}"
                lieu = ev.get("lieuLibre") or ev.get("destinationNom") or ev.get("destinationRegion") or "Tunisie"
                prix = ev.get("prix")
                prix_str = f"{prix} DT" if prix else "Entree libre / Non renseigne"
                desc = ev.get("descriptionFr") or ev.get("description") or ""
                ctx += (
                    f"- Festival / Evenement: {titre} ({genre}) | Lieu: {lieu} | Dates: {date_str} | Tarif: {prix_str}\n"
                    f"  Details: {str(desc)[:200]}\n"
                )

        if history_len == 0:
            style = "Debut de conversation : accueille chaleureusement avec un mot tunisien ou une touche locale."
        elif history_len < 6:
            style = "En cours : va directement a l'essentiel sans repeter de salutation."
        else:
            style = "Conversation avancee : sois concise, directe, propose des experiences insolites."

        return (
            "Tu es Yasmine, guide touristique virtuelle de Visit Tunisia.\n\n"
            "PERSONNALITE :\n"
            "- Passionnee, chaleureuse et directe. Tu utilises parfois aslema, bsaha, yallah naturellement.\n"
            "- Ton style VARIE a chaque reponse : jamais la meme accroche deux fois.\n"
            "- Tu enrichis avec anecdotes historiques, conseils pratiques, programmation des evenements/festivals et gastronomie.\n\n"
            "REGLES ABSOLUES :\n"
            "1. PERIMETRE TUNISIE uniquement : tourisme, culture, evenements, festivals, gastronomie, voyages, hebergements.\n"
            "2. COHERENCE ET LOGIQUE : Si l'utilisateur demande où manger / restaurants, réponds avec des restaurants ou spécialités culinaires (ne propose JAMAIS de musée pour un repas !). Si l'utilisateur demande des hôtels, propose des hébergements.\n"
            "3. REGIONS STRICTES : Si l'utilisateur demande une région précise (ex: Béja, Sousse, Djerba), réponds STRICTEMENT sur cette région. Si la base n'a pas encore de fiches pour cette région, dis-le clairement avec bienveillance.\n"
            "4. REFUS HORS-SUJET : refuse poliment et recentre sur la Tunisie.\n"
            "5. VARIETE : alterne listes, paragraphes, anecdotes, conseils pratiques.\n"
            "6. COMPLETUDE : ne coupe jamais une phrase. Conclus proprement.\n"
            "7. PRIX STRICTS : cite un tarif en DT UNIQUEMENT s'il est explicitement present dans le contexte ci-dessous. Ne l'invente JAMAIS.\n"
            "8. JAMAIS D'IDs TECHNIQUES : n'affiche JAMAIS les identifiants numeriques (ID, destinationId) dans ta reponse.\n"
            f"9. STYLE ACTUEL : {style}\n\n"
            + ctx
        )

    def _pick_quick_questions(
        self, query: str, relevant_dests: List[Dict[str, Any]], relevant_events: List[Dict[str, Any]]
    ) -> List[str]:
        q_lower = query.lower()
        pool = list(QUICK_QUESTION_POOL)
        query_words = {w for w in q_lower.split() if len(w) > 3}
        pool = [q for q in pool if not query_words.intersection({w for w in q.lower().split() if len(w) > 3})]

        dest_regions = {str(d.get("region") or "").lower() for d in relevant_dests}
        boosted = [q for q in pool if any(r in q.lower() for r in dest_regions)]

        if any(w in q_lower for w in EVENT_KEYWORDS):
            boosted.extend([q for q in pool if "festival" in q.lower() or "evenement" in q.lower() or "\u00e9v\u00e9nement" in q.lower()])

        remaining = [q for q in pool if q not in boosted]
        random.shuffle(remaining)
        ordered = boosted + remaining
        if len(ordered) < 3:
            ordered = QUICK_QUESTION_POOL[:]
            random.shuffle(ordered)
        return ordered[:3]

    async def chat(self, request: ChatRequest) -> ChatResponse:
        destinations = await self.get_all_destinations()
        events = await self.get_all_events()

        q_lower = request.message.lower()
        query_words = set(q_lower.split())

        is_event_query = any(w in q_lower for w in EVENT_KEYWORDS)
        is_food_query = bool(query_words.intersection(FOOD_KEYWORDS))
        is_hotel_query = bool(query_words.intersection(HOTEL_KEYWORDS))
        is_beach_query = bool(query_words.intersection(BEACH_KEYWORDS))
        is_visit_query = bool(query_words.intersection(VISIT_KEYWORDS))
        is_rec_query = is_food_query or is_hotel_query or is_beach_query or is_visit_query

        relevant_dests, mentioned_regions = self.search_relevant_destinations(request.message, destinations, top_k=6)
        relevant_events = self.search_relevant_events(request.message, events, top_k=4) if (is_event_query or not relevant_dests) else []

        history_len = len(request.history)
        system_instruction = self._build_system_instruction(relevant_dests, relevant_events, mentioned_regions, history_len)

        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system_instruction,
        )
        contents = []
        # ⚠️ SECURITY NOTE: L'historique vient directement du client sans validation.
        # Pour un environnement de production, il faudrait :
        # 1. Stocker l'historique côté serveur (table Message avec conversation_id)
        # 2. Récupérer l'historique depuis la base au lieu de faire confiance au client
        # 3. Valider que tous les messages appartiennent bien à la conversation de l'utilisateur
        for msg in request.history[-12:]:
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [msg.content]})
        contents.append({"role": "user", "parts": [request.message]})

        try:
            response = model.generate_content(
                contents,
                generation_config={"temperature": 0.85, "top_p": 0.93, "max_output_tokens": 550},
            )
            reply_text = response.text.strip() if response and response.text else "Bienvenue ! Comment puis-je vous aider ?"
        except Exception as e:
            logger.error("Erreur Gemini : %s", e, exc_info=True)
            # Distinguer les erreurs techniques des cas normaux
            error_str = str(e).lower()
            if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
                reply_text = "Désolée, notre service est temporairement surchargé. Veuillez réessayer dans quelques instants."
            elif "api key" in error_str or "authentication" in error_str or "401" in error_str or "403" in error_str:
                reply_text = "Un problème technique est survenu. Notre équipe en a été informée."
                logger.critical("API Key ou authentification Gemini invalide!")
            elif "timeout" in error_str or "connection" in error_str:
                reply_text = "La connexion au service IA a échoué. Veuillez réessayer."
            else:
                reply_text = "Désolée, une erreur technique s'est produite. Veuillez réessayer dans un instant."

        # Cards should ONLY be suggested if:
        # 1. The user asks for recommendations (places/hotels/food/beaches).
        # 2. We actually have relevant destinations for the requested region/type.
        # 3. If a region was requested (e.g. Béja), NO cards from other regions are leaked.
        suggestions: List[DestinationCard] = []
        if is_rec_query and relevant_dests:
            filtered_dests = relevant_dests
            if is_food_query:
                food_only = [d for d in relevant_dests if str(d.get("type")).upper() in ["RESTAURANT", "CAFE", "SALON_DE_THE"]]
                if food_only:
                    filtered_dests = food_only
            elif is_hotel_query:
                hotel_only = [d for d in relevant_dests if str(d.get("type")).upper() in ["HEBERGEMENT", "HOTEL"]]
                if hotel_only:
                    filtered_dests = hotel_only

            for d in filtered_dests[:3]:
                d_id   = int(d.get("destinationId") or d.get("id") or 0)
                name   = self._extract_name(d)
                region = str(d.get("region") or "Tunisie")
                dtype  = str(d.get("type") or "SITE_TOURISTIQUE")
                price  = float(d.get("tarifEstime") or d.get("price") or 0)
                rating = float(d.get("noteAverage") or d.get("noteMoyenne") or 4.5)
                img    = self._extract_image(d)
                category_label = TYPE_LABELS.get(dtype.upper(), dtype.replace("_", " ").capitalize())

                suggestions.append(DestinationCard(
                    id=d_id, name=name, region=region,
                    category=category_label,
                    type=dtype, price=price if price > 0 else None,
                    rating=rating, image=img,
                ))

        return ChatResponse(
            reply=reply_text,
            suggestions=suggestions,
            quick_questions=self._pick_quick_questions(request.message, relevant_dests, relevant_events),
        )
