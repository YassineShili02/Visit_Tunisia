package tn.esprit.spring.visit_tunisia.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Value("${spring.mail.username:noreply@visit-tunisia.com}")
    private String fromEmail;

    /**
     * Envoie un email de vérification avec un code à 6 chiffres
     * @param toEmail Email du destinataire
     * @param code Code de vérification à 6 chiffres
     */
    public void sendVerificationEmail(String toEmail, String code) {
        log.info("Envoi du code de vérification {} à {}", code, toEmail);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Vérification de votre adresse email - Visit Tunisia");

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">"
                    + "<h2 style=\"color: #1B6FA8;\">Bienvenue sur Visit Tunisia ! 🌴</h2>"
                    + "<p>Merci de vous être inscrit. Pour activer votre compte, veuillez confirmer votre adresse email en saisissant le code ci-dessous :</p>"
                    + "<div style=\"background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;\">"
                    + "<h1 style=\"color: #1B6FA8; font-size: 32px; letter-spacing: 8px; margin: 0;\">" + code + "</h1>"
                    + "</div>"
                    + "<p style=\"color: #666; font-size: 14px;\">Ce code est valable pendant <strong>10 minutes</strong>.</p>"
                    + "<p style=\"color: #666; font-size: 14px;\">Si vous n'avez pas créé de compte sur Visit Tunisia, vous pouvez ignorer cet email.</p>"
                    + "<br><p style=\"color: #999; font-size: 12px;\">Cordialement,<br>L'équipe Visit Tunisia</p>"
                    + "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de vérification envoyé avec succès à {}", toEmail);

        } catch (MessagingException e) {
            log.error("Erreur lors de l'envoi de l'email de vérification à {} : {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email via SMTP (environnement dev local) : {}. Code: {}", e.getMessage(), code);
        }
    }

    /**
     * Renvoie un email de vérification (si l'utilisateur n'a pas reçu le premier)
     * @param toEmail Email du destinataire
     * @param code Nouveau code de vérification à 6 chiffres
     */
    public void resendVerificationEmail(String toEmail, String code) {
        log.info("Renvoi du code de vérification {} à {}", code, toEmail);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Nouveau code de vérification - Visit Tunisia");

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">"
                    + "<h2 style=\"color: #1B6FA8;\">Nouveau code de vérification 🔑</h2>"
                    + "<p>Vous avez demandé un nouveau code de vérification. Voici votre nouveau code :</p>"
                    + "<div style=\"background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;\">"
                    + "<h1 style=\"color: #1B6FA8; font-size: 32px; letter-spacing: 8px; margin: 0;\">" + code + "</h1>"
                    + "</div>"
                    + "<p style=\"color: #666; font-size: 14px;\">Ce code est valable pendant <strong>10 minutes</strong>.</p>"
                    + "<p style=\"color: #666; font-size: 14px;\">Si vous n'avez pas demandé de nouveau code, veuillez ignorer cet email.</p>"
                    + "<br><p style=\"color: #999; font-size: 12px;\">Cordialement,<br>L'équipe Visit Tunisia</p>"
                    + "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Nouveau code de vérification envoyé avec succès à {}", toEmail);

        } catch (MessagingException e) {
            log.error("Erreur lors du renvoi de l'email de vérification à {} : {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email via SMTP (environnement dev local) : {}. Code: {}", e.getMessage(), code);
        }
    }

    /**
     * Envoie un email de réinitialisation de mot de passe
     * @param toEmail Email du destinataire
     * @param token Token unique pour la réinitialisation
     */
    public void sendPasswordResetEmail(String toEmail, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        log.info("Lien de réinitialisation généré pour {} : {}", toEmail, resetUrl);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Réinitialisation de votre mot de passe - Visit Tunisia");

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">"
                    + "<h2 style=\"color: #1B6FA8;\">Réinitialisation de mot de passe 🔒</h2>"
                    + "<p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>Visit Tunisia</strong>.</p>"
                    + "<p>Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe (valable 30 minutes) :</p>"
                    + "<div style=\"text-align: center; margin: 30px 0;\">"
                    + "<a href=\"" + resetUrl + "\" style=\"display:inline-block;padding:12px 30px;color:#ffffff;background-color:#1B6FA8;text-decoration:none;border-radius:5px;font-weight:bold;\">Réinitialiser mon mot de passe</a>"
                    + "</div>"
                    + "<p style=\"color: #666; font-size: 14px;\">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>"
                    + "<p style=\"color: #1B6FA8; font-size: 12px; word-break: break-all;\">" + resetUrl + "</p>"
                    + "<p style=\"color: #666; font-size: 14px;\">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>"
                    + "<br><p style=\"color: #999; font-size: 12px;\">Cordialement,<br>L'équipe Visit Tunisia</p>"
                    + "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de réinitialisation envoyé avec succès à {}", toEmail);

        } catch (MessagingException e) {
            log.error("Erreur lors de l'envoi de l'email à {} : {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email via SMTP (environnement dev local) : {}. Lien direct : {}", e.getMessage(), resetUrl);
        }
    }
}
