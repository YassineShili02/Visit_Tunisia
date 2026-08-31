package tn.esprit.spring.visit_tunisia.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.spring.visit_tunisia.entities.*;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.repositories.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final UtilisateurRepository utilisateurRepository;
    private final DestinationRepository destinationRepository;
    private final EvenementRepository evenementRepository;
    private final AvisRepository avisRepository;
    private final ConsultationLogRepository consultationLogRepository;

    /**
     * Statistiques générales (KPIs)
     */
    public Map<String, Object> getOverviewStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Nombre total d'utilisateurs
        long totalUsers = utilisateurRepository.count();
        
        // Nombre d'utilisateurs par rôle
        long touristCount = utilisateurRepository.countByRole(RoleUtilisateur.TOURISTE);
        long adminCount = utilisateurRepository.countByRole(RoleUtilisateur.ADMIN);
        
        // Nombre de destinations par statut
        long totalDestinations = destinationRepository.count();
        long publishedDestinations = destinationRepository.countByStatut(StatutPublication.ACTIF);
        long pendingDestinations = destinationRepository.countByStatut(StatutPublication.BROUILLON);
        
        // Nombre d'événements actifs
        long totalEvents = evenementRepository.countByStatut(StatutPublication.ACTIF);
        
        // Nombre d'avis
        long totalReviews = avisRepository.count();
        
        stats.put("totalUsers", totalUsers);
        stats.put("touristCount", touristCount);
        stats.put("adminCount", adminCount);
        stats.put("totalDestinations", totalDestinations);
        stats.put("publishedDestinations", publishedDestinations);
        stats.put("pendingDestinations", pendingDestinations);
        stats.put("totalEvents", totalEvents);
        stats.put("totalReviews", totalReviews);
        
        return stats;
    }

    /**
     * Répartition des destinations par région (gouvernorat)
     */
    public Map<String, Long> getDestinationsByRegion() {
        List<Destination> destinations = destinationRepository.findByStatut(StatutPublication.ACTIF);
        if (destinations.isEmpty()) {
            destinations = destinationRepository.findAll();
        }
        
        return destinations.stream()
            .collect(Collectors.groupingBy(
                d -> d.getRegion() != null ? d.getRegion() : "Non spécifié",
                Collectors.counting()
            ))
            .entrySet()
            .stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                Map.Entry::getValue,
                (e1, e2) -> e1,
                LinkedHashMap::new
            ));
    }

    /**
     * Répartition des destinations par type
     */
    public Map<String, Long> getDestinationsByType() {
        List<Destination> destinations = destinationRepository.findByStatut(StatutPublication.ACTIF);
        if (destinations.isEmpty()) {
            destinations = destinationRepository.findAll();
        }
        
        return destinations.stream()
            .collect(Collectors.groupingBy(
                d -> d.getType() != null ? d.getType().toString() : "Non spécifié",
                Collectors.counting()
            ))
            .entrySet()
            .stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                Map.Entry::getValue,
                (e1, e2) -> e1,
                LinkedHashMap::new
            ));
    }

    /**
     * Activités récentes (derniers users, derniers avis)
     */
    public Map<String, Object> getRecentActivity() {
        Map<String, Object> activity = new HashMap<>();
        
        // 5 derniers utilisateurs inscrits
        List<Utilisateur> recentUsers = utilisateurRepository.findTop5ByOrderByUtilisateurIdDesc();
        List<Map<String, Object>> usersData = recentUsers.stream()
            .map(u -> {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", u.getUtilisateurId());
                userData.put("nom", u.getNom());
                userData.put("prenom", u.getPrenom());
                userData.put("email", u.getEmail());
                userData.put("role", u.getRole().toString());
                userData.put("pays", u.getPays());
                
                // Champs supplémentaires pour UX enrichie
                // Note: photoUrl sera null si le champ n'existe pas encore
                userData.put("photoUrl", null); // TODO: Ajouter le champ photoUrl à l'entité Utilisateur
                String initiales = "";
                if (u.getPrenom() != null && !u.getPrenom().isEmpty()) {
                    initiales += u.getPrenom().charAt(0);
                }
                if (u.getNom() != null && !u.getNom().isEmpty()) {
                    initiales += u.getNom().charAt(0);
                }
                userData.put("initiales", initiales.toUpperCase());
                
                return userData;
            })
            .collect(Collectors.toList());
        
        // 5 derniers avis publiés
        List<Avis> recentReviews = avisRepository.findTop5ByOrderByDateCreationDesc();
        List<Map<String, Object>> reviewsData = recentReviews.stream()
            .map(a -> {
                Map<String, Object> reviewData = new HashMap<>();
                reviewData.put("id", a.getAvisId());
                reviewData.put("note", a.getNote());
                reviewData.put("commentaire", a.getCommentaire() != null && a.getCommentaire().length() > 80 
                    ? a.getCommentaire().substring(0, 80) + "..." 
                    : a.getCommentaire());
                reviewData.put("datePublication", a.getDateCreation());
                reviewData.put("sentiment", a.getSentimentLabel() != null ? a.getSentimentLabel() : "NEUTRE");
                
                // Info utilisateur
                if (a.getUtilisateur() != null) {
                    reviewData.put("userId", a.getUtilisateur().getUtilisateurId());
                    reviewData.put("userName", a.getUtilisateur().getPrenom() + " " + a.getUtilisateur().getNom());
                    reviewData.put("userPhotoUrl", null); // TODO: Ajouter le champ photoUrl à l'entité Utilisateur
                    
                    String initiales = "";
                    if (a.getUtilisateur().getPrenom() != null && !a.getUtilisateur().getPrenom().isEmpty()) {
                        initiales += a.getUtilisateur().getPrenom().charAt(0);
                    }
                    if (a.getUtilisateur().getNom() != null && !a.getUtilisateur().getNom().isEmpty()) {
                        initiales += a.getUtilisateur().getNom().charAt(0);
                    }
                    reviewData.put("userInitiales", initiales.toUpperCase());
                }
                
                // Info destination
                if (a.getDestination() != null) {
                    reviewData.put("destinationId", a.getDestination().getDestinationId());
                    Object nomObj = a.getDestination().getNom().get("fr");
                    reviewData.put("destinationName", nomObj != null ? nomObj.toString() : "Destination");
                    reviewData.put("destinationRegion", a.getDestination().getRegion());
                }
                
                return reviewData;
            })
            .collect(Collectors.toList());
        
        activity.put("recentUsers", usersData);
        activity.put("recentReviews", reviewsData);
        
        return activity;
    }

    /**
     * Statistiques de fréquentation & consultation avec filtre temporel
     * @param period "TODAY", "7D", "30D", "YEAR" (défaut: 30D)
     */
    public Map<String, Object> getFrequentationStats(String period) {
        if (period == null || period.trim().isEmpty()) period = "30D";
        LocalDateTime since = resolveSinceDate(period);
        Map<String, Object> result = new HashMap<>();

        // 1. Top destinations les plus consultées (VUE_DESTINATION)
        List<Object[]> topDestRaw = consultationLogRepository.findTopDestinations(since);
        List<Map<String, Object>> topDestinations = new ArrayList<>();
        for (Object[] row : topDestRaw) {
            Map<String, Object> item = new HashMap<>();
            item.put("destinationId", row[0]);
            item.put("nom", row[1]);
            item.put("region", row[2]);
            item.put("viewsCount", ((Number) row[3]).longValue());
            topDestinations.add(item);
        }

        // 2. Top termes de recherche les plus fréquents (RECHERCHE)
        List<Object[]> topSearchRaw = consultationLogRepository.findTopSearchTerms(since);
        List<Map<String, Object>> topSearchTerms = new ArrayList<>();
        for (Object[] row : topSearchRaw) {
            Map<String, Object> item = new HashMap<>();
            item.put("term", row[0]);
            item.put("count", ((Number) row[1]).longValue());
            topSearchTerms.add(item);
        }

        // 3. Évolution de la fréquentation par jour (TOUS les jours inclus, avec 0 si vide)
        List<Object[]> dailyRaw = consultationLogRepository.findDailyConsultations(since);
        Map<String, Long> rawCounts = new HashMap<>();
        for (Object[] row : dailyRaw) {
            String day = row[0] != null ? row[0].toString() : "";
            long count = ((Number) row[1]).longValue();
            if (!day.isEmpty()) {
                rawCounts.put(day, count);
            }
        }

        Map<String, Long> dailyEvolution = new LinkedHashMap<>();
        LocalDate startDay = since.toLocalDate();
        LocalDate today = LocalDate.now();

        if ("TODAY".equalsIgnoreCase(period)) {
            String todayStr = today.toString();
            dailyEvolution.put(todayStr, rawCounts.getOrDefault(todayStr, 0L));
        } else {
            LocalDate cur = startDay;
            while (!cur.isAfter(today)) {
                String dayStr = cur.toString();
                dailyEvolution.put(dayStr, rawCounts.getOrDefault(dayStr, 0L));
                cur = cur.plusDays(1);
            }
        }

        long totalConsultations = dailyEvolution.values().stream().mapToLong(Long::longValue).sum();

        result.put("period", period.toUpperCase());
        result.put("topDestinations", topDestinations);
        result.put("topSearchTerms", topSearchTerms);
        result.put("dailyEvolution", dailyEvolution);
        result.put("totalConsultations", totalConsultations);

        return result;
    }

    private LocalDateTime resolveSinceDate(String period) {
        if (period == null) period = "30D";
        LocalDateTime now = LocalDateTime.now();
        switch (period.toUpperCase()) {
            case "TODAY":
                return LocalDate.now().atStartOfDay();
            case "7D":
                return now.minusDays(6).toLocalDate().atStartOfDay();
            case "YEAR":
                return LocalDate.now().with(TemporalAdjusters.firstDayOfYear()).atStartOfDay();
            case "30D":
            default:
                return now.minusDays(29).toLocalDate().atStartOfDay();
        }
    }
}

