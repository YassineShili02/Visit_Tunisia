package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.admin.UserResponse;
import tn.esprit.spring.visit_tunisia.DTO.admin.UserStatsResponse;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutCompte;
import tn.esprit.spring.visit_tunisia.repositories.AvisRepository;
import tn.esprit.spring.visit_tunisia.repositories.ConsultationLogRepository;
import tn.esprit.spring.visit_tunisia.repositories.ConversationRepository;
import tn.esprit.spring.visit_tunisia.repositories.DestinationFavoriteRepository;
import tn.esprit.spring.visit_tunisia.repositories.EmailVerificationTokenRepository;
import tn.esprit.spring.visit_tunisia.repositories.ItineraireRepository;
import tn.esprit.spring.visit_tunisia.repositories.JournalActionRepository;
import tn.esprit.spring.visit_tunisia.repositories.MessageRepository;
import tn.esprit.spring.visit_tunisia.repositories.PasswordResetTokenRepository;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class AdminUserController {

    private final UtilisateurRepository utilisateurRepository;
    private final JournalActionRepository journalActionRepository;
    private final ItineraireRepository itineraireRepository;
    private final AvisRepository avisRepository;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final DestinationFavoriteRepository destinationFavoriteRepository;
    private final ConsultationLogRepository consultationLogRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final tn.esprit.spring.visit_tunisia.services.JournalActionService journalActionService;

    private Utilisateur getCurrentAdminUser() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                return utilisateurRepository.findByEmail(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {}
        return null;
    }

    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(required = false) StatutCompte statut,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "dateCreation") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        log.info("[ADMIN] Get users - page={}, size={}, statut={}, role={}, search={}, dateFrom={}, dateTo={}", 
            page, size, statut, role, search, dateFrom, dateTo);
        
        Sort sort = sortDir.equalsIgnoreCase("ASC") 
            ? Sort.by(sortBy).ascending() 
            : Sort.by(sortBy).descending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        
        // Apply filters
        List<Utilisateur> allUsers = utilisateurRepository.findAll();
        
        // Filter by statut
        if (statut != null) {
            allUsers = allUsers.stream()
                .filter(u -> u.getStatut() == statut)
                .toList();
        }
        
        // Filter by role
        if (role != null && !role.isEmpty()) {
            RoleUtilisateur roleEnum = RoleUtilisateur.valueOf(role.toUpperCase());
            allUsers = allUsers.stream()
                .filter(u -> u.getRole() == roleEnum)
                .toList();
        }
        
        // Filter by search (nom, prenom, email)
        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase();
            allUsers = allUsers.stream()
                .filter(u -> 
                    (u.getNom() != null && u.getNom().toLowerCase().contains(searchLower)) ||
                    (u.getPrenom() != null && u.getPrenom().toLowerCase().contains(searchLower)) ||
                    (u.getEmail() != null && u.getEmail().toLowerCase().contains(searchLower))
                )
                .toList();
        }
        
        // Filter by date range
        if (dateFrom != null && !dateFrom.trim().isEmpty()) {
            LocalDate fromDate = LocalDate.parse(dateFrom);
            allUsers = allUsers.stream()
                .filter(u -> u.getDateCreation() != null && 
                    !u.getDateCreation().toLocalDate().isBefore(fromDate))
                .toList();
        }
        
        if (dateTo != null && !dateTo.trim().isEmpty()) {
            LocalDate toDate = LocalDate.parse(dateTo);
            allUsers = allUsers.stream()
                .filter(u -> u.getDateCreation() != null && 
                    !u.getDateCreation().toLocalDate().isAfter(toDate))
                .toList();
        }
        
        // Sort manually
        if (sortBy.equals("dateCreation") && allUsers.size() > 0) {
            allUsers = allUsers.stream()
                .sorted((a, b) -> {
                    if (a.getDateCreation() == null) return 1;
                    if (b.getDateCreation() == null) return -1;
                    int cmp = a.getDateCreation().compareTo(b.getDateCreation());
                    return sortDir.equalsIgnoreCase("DESC") ? -cmp : cmp;
                })
                .toList();
        }
        
        // Paginate manually
        int start = page * size;
        int end = Math.min(start + size, allUsers.size());
        List<Utilisateur> pageContent = start < allUsers.size() ? allUsers.subList(start, end) : List.of();
        
        Page<Utilisateur> usersPage = new org.springframework.data.domain.PageImpl<>(
            pageContent,
            pageable,
            allUsers.size()
        );
        
        Page<UserResponse> response = usersPage.map(this::mapToResponse);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<UserStatsResponse> getUserStats() {
        try {
            long total = utilisateurRepository.count();
            
            long actifs = 0;
            long desactives = 0;
            long enAttenteVerification = 0;
            long touristes = 0;
            long admins = 0;

            List<Utilisateur> allUsers = utilisateurRepository.findAll();

            for (Utilisateur u : allUsers) {
                // Count by statut
                if (u.getStatut() != null) {
                    switch (u.getStatut()) {
                        case ACTIF -> actifs++;
                        case DESACTIVE -> desactives++;
                        case EN_ATTENTE_VERIFICATION -> enAttenteVerification++;
                    }
                } else {
                    desactives++;
                }

                // Count by role
                if (u.getRole() != null && u.getRole() == RoleUtilisateur.TOURISTE) {
                    touristes++;
                } else {
                    admins++;
                }
            }

            UserStatsResponse stats = UserStatsResponse.builder()
                .totalUsers(total)
                .actifs(actifs)
                .desactives(desactives)
                .enAttenteVerification(enAttenteVerification)
                .touristes(touristes)
                .admins(admins)
                .build();

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("[ADMIN] Error getting user stats", e);
            // Return empty stats on error
            return ResponseEntity.ok(UserStatsResponse.builder()
                .totalUsers(0)
                .actifs(0)
                .desactives(0)
                .enAttenteVerification(0)
                .touristes(0)
                .admins(0)
                .build());
        }
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> payload
    ) {
        String statutStr = payload.get("statut");
        log.info("[ADMIN] Update user {} status to {}", id, statutStr);
        
        Utilisateur user = utilisateurRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable (ID: " + id + ")"));
        
        StatutCompte newStatut = StatutCompte.valueOf(statutStr.toUpperCase());
        user.setStatut(newStatut);
        utilisateurRepository.save(user);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                "Compte de " + user.getEmail() + " " + (newStatut == StatutCompte.ACTIF ? "activé" : "désactivé"),
                getCurrentAdminUser()
        );
        
        return ResponseEntity.ok(mapToResponse(user));
    }

    /**
     * Suppression définitive d'un compte utilisateur.
     *
     * <p>⚠️ PostgreSQL refuse de supprimer un utilisateur tant que des tables
     * pointent dessus via une clé étrangère (itineraires, avis, conversations,
     * journal_actions, destination_favorites, password_reset_tokens,
     * email_verification_tokens, consultation_logs, utilisateur_preferences).
     *
     * <p>On vide donc explicitement toutes les tables liées AVANT de supprimer
     * l'utilisateur, le tout dans une seule transaction pour garantir la
     * cohérence (si une étape échoue, rien n'est supprimé).
     *
     * <p>L'entrée de journal "Utilisateur X supprimé" est insérée EN PREMIER,
     * puis les autres entrées du journal de cet utilisateur sont nettoyées,
     * pour conserver une trace d'audit minimale de la suppression.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        log.info("[ADMIN] Delete user {}", id);
        
        Utilisateur user = utilisateurRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable (ID: " + id + ")"));
        
        String userEmail = user.getEmail();

        // 0) Refus d'auto-suppression : un admin ne peut pas se supprimer lui-même
        Utilisateur currentAdmin = getCurrentAdminUser();
        if (currentAdmin != null && currentAdmin.getUtilisateurId().equals(id)) {
            log.warn("[ADMIN] Refus de suppression : l'admin {} tente de se supprimer lui-même", userEmail);
            return ResponseEntity.status(409).build();
        }
        
        // 1) Audit : enregistrer la suppression AVANT tout nettoyage,
        //    pour qu'une trace minimale subsiste dans le journal.
        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                "Utilisateur " + userEmail + " supprimé par l'administrateur",
                currentAdmin
        );
        
        // 2) Nettoyage des tables liées (ordre respectant les dépendances)
        int journalCount       = journalActionRepository.deleteByUtilisateurId(id);
        int itineraireCount    = itineraireRepository.deleteByUtilisateurId(id);
        int avisCount          = avisRepository.deleteByUtilisateurId(id);
        // Les messages doivent être supprimés AVANT les conversations car
        // messages.conversation_id est NOT NULL et le bulk DELETE bypasse
        // le cascade=ALL de Conversation.messages.
        int messageCount       = messageRepository.deleteByUtilisateurId(id);
        int conversationCount  = conversationRepository.deleteByUtilisateurId(id);
        int favoriteCount      = destinationFavoriteRepository.deleteByUtilisateurId(id);
        int consultationCount  = consultationLogRepository.deleteByUtilisateurId(id);
        int pwdTokenCount      = passwordResetTokenRepository.deleteByUtilisateurId(id);
        int emailTokenCount    = emailVerificationTokenRepository.deleteByUtilisateurId(id);

        // 3) Vider les @ElementCollection (préférences) et forcer la suppression
        //    de l'utilisateur. Hibernate émettra le DELETE des preferences puis
        //    du parent dans la même transaction.
        if (user.getPreferences() != null) {
            user.getPreferences().clear();
        }
        utilisateurRepository.delete(user);
        utilisateurRepository.flush();

        log.info("[ADMIN] User {} ({}) supprimé. Nettoyage : {} journaux, {} itinéraires, {} avis, "
                + "{} messages, {} conversations, {} favoris, {} logs consultation, "
                + "{} tokens pwd, {} tokens email",
            id, userEmail, journalCount, itineraireCount, avisCount,
            messageCount, conversationCount, favoriteCount, consultationCount,
            pwdTokenCount, emailTokenCount);

        return ResponseEntity.noContent().build();
    }

    private UserResponse mapToResponse(Utilisateur user) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy");
        
        return UserResponse.builder()
            .id(user.getUtilisateurId())
            .nom(user.getNom())
            .prenom(user.getPrenom())
            .email(user.getEmail())
            .telephone(user.getTelephone())
            .pays(user.getPays())
            .dateNaissance(user.getDateNaissance())
            .role(user.getRole().name())
            .statut(user.getStatut().name())
            .emailVerifie(user.isEmailVerifie())
            .provider(user.getProvider().name())
            .languePreferee(user.getLanguePreferee() != null ? user.getLanguePreferee().name() : null)
            .preferences(user.getPreferences() != null ? 
                user.getPreferences().stream().map(Enum::name).toList() : null)
            .dateCreation(user.getDateCreation())
            .dateCreationFormatted(user.getDateCreation() != null ? 
                user.getDateCreation().toLocalDate().format(formatter) : null)
            .build();
    }
}
