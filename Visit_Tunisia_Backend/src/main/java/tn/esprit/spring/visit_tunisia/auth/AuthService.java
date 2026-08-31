package tn.esprit.spring.visit_tunisia.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import tn.esprit.spring.visit_tunisia.auth.dto.*;
import tn.esprit.spring.visit_tunisia.entities.EmailVerificationToken;
import tn.esprit.spring.visit_tunisia.entities.PasswordResetToken;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.AuthProvider;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutCompte;
import tn.esprit.spring.visit_tunisia.exceptions.AccountDisabledException;
import tn.esprit.spring.visit_tunisia.exceptions.EmailAlreadyExistsException;
import tn.esprit.spring.visit_tunisia.exceptions.EmailNotVerifiedException;
import tn.esprit.spring.visit_tunisia.exceptions.InvalidTokenException;
import tn.esprit.spring.visit_tunisia.repositories.EmailVerificationTokenRepository;
import tn.esprit.spring.visit_tunisia.repositories.PasswordResetTokenRepository;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;
import tn.esprit.spring.visit_tunisia.security.CustomUserDetailsService;
import tn.esprit.spring.visit_tunisia.security.JwtService;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final EmailService emailService;
    private final tn.esprit.spring.visit_tunisia.services.JournalActionService journalActionService;

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (utilisateurRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("L'adresse email " + request.getEmail() + " est déjà utilisée.");
        }

        // Validation: motDePasse obligatoire pour provider LOCAL
        if (request.getMotDePasse() == null || request.getMotDePasse().isBlank()) {
            throw new IllegalArgumentException("Le mot de passe est obligatoire pour l'inscription locale.");
        }

        Utilisateur utilisateur = Utilisateur.builder()
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .motDePasse(passwordEncoder.encode(request.getMotDePasse()))
                .dateNaissance(request.getDateNaissance())
                .telephone(request.getTelephone())
                .pays(request.getPays())
                .languePreferee(request.getLanguePreferee())
                .role(RoleUtilisateur.TOURISTE)
                .provider(AuthProvider.LOCAL)
                .statut(StatutCompte.EN_ATTENTE_VERIFICATION) // Le compte n'est actif qu'après vérification de l'email
                .emailVerifie(false) // Email pas encore vérifié
                .build();

        utilisateurRepository.save(utilisateur);

        // Générer et envoyer le code de vérification par email
        String verificationCode = generateVerificationCode();
        
        // Supprimer les anciens tokens de cet utilisateur
        emailVerificationTokenRepository.deleteByUtilisateur(utilisateur);
        
        // Créer le nouveau token
        EmailVerificationToken token = EmailVerificationToken.builder()
                .code(verificationCode)
                .utilisateur(utilisateur)
                .dateExpiration(LocalDateTime.now().plusMinutes(10))
                .utilise(false)
                .build();

        emailVerificationTokenRepository.save(token);

        // Envoyer l'email avec le code
        emailService.sendVerificationEmail(utilisateur.getEmail(), verificationCode);

        // Ne pas générer de JWT token car l'email n'est pas encore vérifié
        // L'utilisateur devra d'abord vérifier son email avant de se connecter

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.CREATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                "Inscription d'un nouveau compte (" + utilisateur.getEmail() + ") - En attente de vérification email",
                utilisateur
        );

        // Retourner une réponse spéciale indiquant que la vérification est requise
        LoginResponse response = LoginResponse.builder()
                .token(null) // Pas de token tant que l'email n'est pas vérifié
                .type("Bearer")
                .expiresInMs(0L)
                .utilisateur(UtilisateurSummary.builder()
                        .id(utilisateur.getUtilisateurId())
                        .nom(utilisateur.getNom())
                        .prenom(utilisateur.getPrenom())
                        .email(utilisateur.getEmail())
                        .role(utilisateur.getRole())
                        .build())
                .needsProfileCompletion(false)
                .emailVerificationRequired(true) // Nouveau flag
                .build();

        return response;
    }

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getMotDePasse())
        );

        Utilisateur utilisateur = utilisateurRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé"));

        if (utilisateur.getStatut() == StatutCompte.DESACTIVE) {
            throw new AccountDisabledException("Votre compte a été désactivé. Veuillez contacter l'administrateur.");
        }

        if (utilisateur.getStatut() == StatutCompte.EN_ATTENTE_VERIFICATION || !utilisateur.isEmailVerifie()) {
            throw new EmailNotVerifiedException(
                    "Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte de réception pour le code à 6 chiffres.",
                    utilisateur.getEmail()
            );
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(utilisateur.getEmail());
        String jwtToken = jwtService.generateToken(userDetails);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.CONNEXION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                "Connexion réussie de " + (utilisateur.getPrenom() != null ? utilisateur.getPrenom() + " " + utilisateur.getNom() : utilisateur.getEmail()),
                utilisateur
        );

        return buildLoginResponse(jwtToken, utilisateur);
    }

    @Transactional
    public LoginResponse googleAuth(GoogleAuthRequest request) {
        Map<String, Object> googleUserMap = verifyGoogleIdToken(request.getIdToken());
        String email = (String) googleUserMap.get("email");
        String providerId = (String) googleUserMap.get("sub");
        String prenom = (String) googleUserMap.getOrDefault("given_name", "Google");
        String nom = (String) googleUserMap.getOrDefault("family_name", "User");

        if (email == null || email.isBlank()) {
            throw new InvalidTokenException("Email non fourni par le jeton Google.");
        }

        boolean isNewUser = false;
        Optional<Utilisateur> userOpt = utilisateurRepository.findByEmail(email);
        Utilisateur utilisateur;

        if (userOpt.isPresent()) {
            utilisateur = userOpt.get();
            if (utilisateur.getStatut() == StatutCompte.DESACTIVE) {
                throw new AccountDisabledException("Votre compte a été désactivé. Veuillez contacter l'administrateur.");
            }
            if (utilisateur.getProviderId() == null) {
                utilisateur.setProviderId(providerId);
                utilisateurRepository.save(utilisateur);
            }
            // Marquer l'email comme vérifié pour les comptes Google
            if (!utilisateur.isEmailVerifie()) {
                utilisateur.setEmailVerifie(true);
                utilisateurRepository.save(utilisateur);
            }
        } else {
            isNewUser = true;
            utilisateur = Utilisateur.builder()
                    .nom(nom)
                    .prenom(prenom)
                    .email(email)
                    .provider(AuthProvider.GOOGLE)
                    .providerId(providerId)
                    .role(RoleUtilisateur.TOURISTE)
                    .statut(StatutCompte.ACTIF)
                    .motDePasse(null)
                    .emailVerifie(true) // Google vérifie déjà l'email
                    .build();
            utilisateurRepository.save(utilisateur);
        }

        boolean needsProfileCompletion = (utilisateur.getPreferences() == null || utilisateur.getPreferences().isEmpty());

        UserDetails userDetails = userDetailsService.loadUserByUsername(utilisateur.getEmail());
        String jwtToken = jwtService.generateToken(userDetails);

        journalActionService.enregistrer(
                isNewUser ? tn.esprit.spring.visit_tunisia.enums.TypeAction.CREATION : tn.esprit.spring.visit_tunisia.enums.TypeAction.CONNEXION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                (isNewUser ? "Inscription via Google de " : "Connexion via Google de ") + utilisateur.getEmail(),
                utilisateur
        );

        LoginResponse response = buildLoginResponse(jwtToken, utilisateur);
        response.setNewUser(isNewUser);
        response.setNeedsProfileCompletion(needsProfileCompletion);
        return response;
    }

    @Transactional
    public LoginResponse completeProfile(String userEmail, CompleteProfileRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé avec l'email: " + userEmail));

        if (request.getDateNaissance() != null) {
            utilisateur.setDateNaissance(request.getDateNaissance());
        }
        if (request.getTelephone() != null && !request.getTelephone().isBlank()) {
            utilisateur.setTelephone(request.getTelephone());
        }
        if (request.getPays() != null && !request.getPays().isBlank()) {
            utilisateur.setPays(request.getPays());
        }
        if (request.getPreferences() != null) {
            utilisateur.setPreferences(request.getPreferences());
        }
        if (request.getLanguePreferee() != null && !request.getLanguePreferee().isBlank()) {
            try {
                utilisateur.setLanguePreferee(
                        tn.esprit.spring.visit_tunisia.enums.Langue.valueOf(request.getLanguePreferee().trim().toUpperCase())
                );
            } catch (IllegalArgumentException ignored) {
                // Valeur de langue inconnue -> ignorée, l'ancienne préférence est conservée
            }
        }

        utilisateurRepository.save(utilisateur);

        UserDetails userDetails = userDetailsService.loadUserByUsername(utilisateur.getEmail());
        String jwtToken = jwtService.generateToken(userDetails);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                "Mise à jour du profil par " + utilisateur.getEmail(),
                utilisateur
        );

        LoginResponse response = buildLoginResponse(jwtToken, utilisateur);
        boolean needsProfileCompletion = (utilisateur.getPreferences() == null || utilisateur.getPreferences().isEmpty());
        response.setNeedsProfileCompletion(needsProfileCompletion);
        return response;
    }

    @Transactional
    public ApiResponse forgotPassword(ForgotPasswordRequest request) {
        Optional<Utilisateur> userOpt = utilisateurRepository.findByEmail(request.getEmail());

        if (userOpt.isPresent()) {
            Utilisateur utilisateur = userOpt.get();
            passwordResetTokenRepository.deleteByUtilisateur(utilisateur);

            String token = UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .token(token)
                    .utilisateur(utilisateur)
                    .dateExpiration(LocalDateTime.now().plusMinutes(30))
                    .utilise(false)
                    .build();

            passwordResetTokenRepository.save(resetToken);
            emailService.sendPasswordResetEmail(utilisateur.getEmail(), token);
        }

        return ApiResponse.builder()
                .message("Si cet email existe dans notre système, un lien de réinitialisation vous a été envoyé.")
                .success(true)
                .build();
    }

    @Transactional
    public ApiResponse resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new InvalidTokenException("Le jeton de réinitialisation est invalide ou inexistant."));

        if (resetToken.isUtilise() || resetToken.getDateExpiration().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("Le jeton de réinitialisation est expiré ou a déjà été utilisé.");
        }

        Utilisateur utilisateur = resetToken.getUtilisateur();
        utilisateur.setMotDePasse(passwordEncoder.encode(request.getNouveauMotDePasse()));
        utilisateurRepository.save(utilisateur);

        resetToken.setUtilise(true);
        passwordResetTokenRepository.save(resetToken);

        return ApiResponse.builder()
                .message("Votre mot de passe a été réinitialisé avec succès.")
                .success(true)
                .build();
    }

    @Transactional
    public ApiResponse changePassword(String userEmail, ChangePasswordRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé avec l'email: " + userEmail));

        // Vérifier si le compte est un compte Google
        if (AuthProvider.GOOGLE.equals(utilisateur.getProvider())) {
            throw new IllegalArgumentException("Ce compte est associé à Google. Le mot de passe ne peut pas être modifié ici.");
        }

        // Vérifier l'ancien mot de passe
        if (utilisateur.getMotDePasse() != null && !passwordEncoder.matches(request.getAncienMotDePasse(), utilisateur.getMotDePasse())) {
            throw new IllegalArgumentException("L'ancien mot de passe est incorrect.");
        }

        // Vérifier la longueur du nouveau mot de passe
        if (request.getNouveauMotDePasse() == null || request.getNouveauMotDePasse().length() < 6) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit contenir au moins 6 caractères.");
        }

        // Mettre à jour avec le nouveau mot de passe haché
        utilisateur.setMotDePasse(passwordEncoder.encode(request.getNouveauMotDePasse()));
        utilisateurRepository.save(utilisateur);

        // Journaliser l'action
        try {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                    "Modification du mot de passe",
                    utilisateur
            );
        } catch (Exception ignored) {}

        return ApiResponse.builder()
                .success(true)
                .message("Votre mot de passe a été modifié avec succès.")
                .build();
    }

    private Map<String, Object> verifyGoogleIdToken(String idToken) {
        RestTemplate restTemplate = new RestTemplate();
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> body = (Map<String, Object>) response.getBody();
                // Validate the audience (aud) matches our client ID
                Object aud = body.get("aud");
                if (aud == null) {
                    throw new InvalidTokenException("Le jeton Google ne contient pas de champ 'aud'.");
                }
                return body;
            }
        } catch (HttpClientErrorException e) {
            // Google returned 400 Bad Request = invalid or expired token
            String body = e.getResponseBodyAsString();
            throw new InvalidTokenException("Jeton Google invalide ou expiré. Détail: " + body);
        } catch (InvalidTokenException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidTokenException("Erreur lors de la vérification du jeton Google: " + e.getMessage());
        }
        throw new InvalidTokenException("Impossible de vérifier le jeton Google.");
    }

    private LoginResponse buildLoginResponse(String token, Utilisateur utilisateur) {
        UtilisateurSummary summary = UtilisateurSummary.builder()
                .id(utilisateur.getUtilisateurId())
                .nom(utilisateur.getNom())
                .prenom(utilisateur.getPrenom())
                .email(utilisateur.getEmail())
                .role(utilisateur.getRole())
                .dateNaissance(utilisateur.getDateNaissance())
                .telephone(utilisateur.getTelephone())
                .pays(utilisateur.getPays())
                .preferences(utilisateur.getPreferences())
                .build();

        boolean needsProfileCompletion = (utilisateur.getPreferences() == null || utilisateur.getPreferences().isEmpty());

        return LoginResponse.builder()
                .token(token)
                .type("Bearer")
                .expiresInMs(jwtService.getExpirationTime())
                .utilisateur(summary)
                .needsProfileCompletion(needsProfileCompletion)
                .build();
    }

    /**
     * Génère un code de vérification à 6 chiffres unique
     */
    private String generateVerificationCode() {
        Random random = new Random();
        String code;
        do {
            // Génère un nombre entre 100000 et 999999
            int codeNumber = 100000 + random.nextInt(900000);
            code = String.valueOf(codeNumber);
        } while (emailVerificationTokenRepository.existsByCode(code));
        
        return code;
    }

    /**
     * Vérifie le code de vérification d'email et active le compte
     */
    @Transactional
    public LoginResponse verifyEmail(VerifyEmailRequest request) {
        // Trouver l'utilisateur
        Utilisateur utilisateur = utilisateurRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Aucun compte associé à cet email."));

        // Vérifier si l'email est déjà vérifié
        if (utilisateur.isEmailVerifie()) {
            throw new IllegalArgumentException("Cet email a déjà été vérifié.");
        }

        // Trouver le token de vérification
        EmailVerificationToken token = emailVerificationTokenRepository.findByCode(request.getCode())
                .orElseThrow(() -> new InvalidTokenException("Code de vérification invalide."));

        // Vérifier que le token appartient bien à cet utilisateur
        if (!token.getUtilisateur().getUtilisateurId().equals(utilisateur.getUtilisateurId())) {
            throw new InvalidTokenException("Ce code ne correspond pas à votre compte.");
        }

        // Vérifier si le token est valide (non utilisé et non expiré)
        if (token.isUtilise()) {
            throw new InvalidTokenException("Ce code a déjà été utilisé.");
        }

        if (token.isExpire()) {
            throw new InvalidTokenException("Ce code a expiré. Veuillez demander un nouveau code.");
        }

        // Marquer l'email comme vérifié et activer le compte
        utilisateur.setEmailVerifie(true);
        utilisateur.setStatut(StatutCompte.ACTIF);
        utilisateurRepository.save(utilisateur);

        // Marquer le token comme utilisé
        token.setUtilise(true);
        emailVerificationTokenRepository.save(token);

        // Générer un JWT token pour connecter l'utilisateur
        UserDetails userDetails = userDetailsService.loadUserByUsername(utilisateur.getEmail());
        String jwtToken = jwtService.generateToken(userDetails);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                "Email vérifié et compte activé pour " + utilisateur.getEmail(),
                utilisateur
        );

        LoginResponse response = buildLoginResponse(jwtToken, utilisateur);
        response.setEmailVerificationRequired(false);
        return response;
    }

    /**
     * Renvoie un nouveau code de vérification par email
     */
    @Transactional
    public ApiResponse resendVerificationCode(ResendVerificationRequest request) {
        // Trouver l'utilisateur
        Utilisateur utilisateur = utilisateurRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Aucun compte associé à cet email."));

        // Vérifier si l'email est déjà vérifié
        if (utilisateur.isEmailVerifie()) {
            throw new IllegalArgumentException("Cet email a déjà été vérifié.");
        }

        // Supprimer les anciens tokens de cet utilisateur
        emailVerificationTokenRepository.deleteByUtilisateur(utilisateur);

        // Générer un nouveau code
        String verificationCode = generateVerificationCode();

        // Créer le nouveau token
        EmailVerificationToken token = EmailVerificationToken.builder()
                .code(verificationCode)
                .utilisateur(utilisateur)
                .dateExpiration(LocalDateTime.now().plusMinutes(10))
                .utilise(false)
                .build();

        emailVerificationTokenRepository.save(token);

        // Envoyer l'email
        emailService.resendVerificationEmail(utilisateur.getEmail(), verificationCode);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                "Nouveau code de vérification envoyé à " + utilisateur.getEmail(),
                utilisateur
        );

        return ApiResponse.builder()
                .success(true)
                .message("Un nouveau code de vérification a été envoyé à votre adresse email.")
                .build();
    }

    /**
     * Envoie (ou renvoie) un code de vérification à un email donné.
     * Utilisé quand l'utilisateur arrive sur /verify-email via le bouton
     * "Vérifier mon email" depuis un compte bloqué — sans condition préalable.
     *
     * - Si le compte n'existe pas → on retourne OK quand même (sécurité)
     * - Si l'email est déjà vérifié → on retourne OK (l'utilisateur n'a rien à faire)
     * - Sinon : on génère un nouveau code et on l'envoie.
     */
    @Transactional
    public ApiResponse sendVerificationCode(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("L'email est obligatoire.");
        }

        Optional<Utilisateur> userOpt = utilisateurRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Pas de compte → on ne révèle rien, on renvoie OK.
            return ApiResponse.builder()
                    .success(true)
                    .message("Si un compte existe pour cet email, un code vient d'être envoyé.")
                    .build();
        }

        Utilisateur utilisateur = userOpt.get();

        // Si l'email est déjà vérifié, on ne renvoie rien.
        if (utilisateur.isEmailVerifie()) {
            return ApiResponse.builder()
                    .success(true)
                    .message("Cet email est déjà vérifié. Vous pouvez vous connecter.")
                    .build();
        }

        // Supprimer les anciens tokens
        emailVerificationTokenRepository.deleteByUtilisateur(utilisateur);

        // Générer + envoyer un nouveau code (valable 10 minutes)
        String verificationCode = generateVerificationCode();
        EmailVerificationToken token = EmailVerificationToken.builder()
                .code(verificationCode)
                .utilisateur(utilisateur)
                .dateExpiration(LocalDateTime.now().plusMinutes(10))
                .utilise(false)
                .build();
        emailVerificationTokenRepository.save(token);
        emailService.resendVerificationEmail(utilisateur.getEmail(), verificationCode);

        try {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.UTILISATEUR,
                    "Code de vérification envoyé à la demande (page verify-email) pour " + utilisateur.getEmail(),
                    utilisateur
            );
        } catch (Exception ignored) {}

        return ApiResponse.builder()
                .success(true)
                .message("Un code de vérification vient d'être envoyé à votre adresse email.")
                .build();
    }
}
