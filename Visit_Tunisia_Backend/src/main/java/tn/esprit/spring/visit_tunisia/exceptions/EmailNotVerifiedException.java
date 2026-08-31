package tn.esprit.spring.visit_tunisia.exceptions;

import lombok.Getter;

/**
 * Exception levée lorsqu'un utilisateur tente de se connecter
 * avec un compte dont l'email n'a pas encore été vérifié.
 *
 * Le champ {@code email} est transmis au front afin de permettre
 * la redirection vers la page de vérification d'email pré-remplie
 * (ou la création d'un nouveau compte).
 */
@Getter
public class EmailNotVerifiedException extends RuntimeException {
    private final String email;

    public EmailNotVerifiedException(String message, String email) {
        super(message);
        this.email = email;
    }

    public EmailNotVerifiedException(String message) {
        this(message, null);
    }
}
