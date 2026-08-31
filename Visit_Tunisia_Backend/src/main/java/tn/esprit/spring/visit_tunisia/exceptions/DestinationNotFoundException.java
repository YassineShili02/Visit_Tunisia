package tn.esprit.spring.visit_tunisia.exceptions;

public class DestinationNotFoundException extends RuntimeException {
    public DestinationNotFoundException(String message) {
        super(message);
    }
}
