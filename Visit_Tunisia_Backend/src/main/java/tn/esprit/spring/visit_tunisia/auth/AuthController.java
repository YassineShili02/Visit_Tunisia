package tn.esprit.spring.visit_tunisia.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.auth.dto.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/google")
    public ResponseEntity<LoginResponse> googleAuth(@Valid @RequestBody GoogleAuthRequest request) {
        LoginResponse response = authService.googleAuth(request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/complete-profile")
    public ResponseEntity<LoginResponse> completeProfile(@Valid @RequestBody CompleteProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        // Vérification défensive : si l'utilisateur n'est pas authentifié ou est anonyme, retourner 401
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String userEmail = authentication.getName();
        LoginResponse response = authService.completeProfile(userEmail, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        ApiResponse response = authService.forgotPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        ApiResponse response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();
        ApiResponse response = authService.changePassword(userEmail, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Vérifie le code de vérification d'email après inscription
     */
    @PostMapping("/verify-email")
    public ResponseEntity<LoginResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        LoginResponse response = authService.verifyEmail(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Renvoie un nouveau code de vérification par email
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        ApiResponse response = authService.resendVerificationCode(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Déclenche l'envoi d'un code de vérification à un email donné.
     * Pas de condition préalable : si l'utilisateur arrive sur la page
     * /verify-email (via le bouton "Vérifier mon email" d'un compte bloqué),
     * on lui envoie un code frais automatiquement.
     */
    @PostMapping("/send-verification")
    public ResponseEntity<ApiResponse> sendVerification(@RequestBody ResendVerificationRequest request) {
        ApiResponse response = authService.sendVerificationCode(request.getEmail());
        return ResponseEntity.ok(response);
    }
}
