package tn.esprit.spring.visit_tunisia.enums;

public enum StatutCompte {
    /**
     * Compte créé par inscription locale mais email pas encore vérifié.
     * L'utilisateur ne peut PAS se connecter tant qu'il reste dans cet état.
     * Passe à ACTIF après validation du code à 6 chiffres.
     */
    EN_ATTENTE_VERIFICATION,
    ACTIF,
    DESACTIVE
}
