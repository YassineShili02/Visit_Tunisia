package tn.esprit.spring.visit_tunisia.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec l'email : " + email));

        String roleName = utilisateur.getRole() != null ? "ROLE_" + utilisateur.getRole().name() : "ROLE_TOURISTE";

        // For OAuth users (Google), motDePasse is null — use empty string as placeholder
        String password = utilisateur.getMotDePasse() != null ? utilisateur.getMotDePasse() : "";

        return new User(
                utilisateur.getEmail(),
                password,
                Collections.singletonList(new SimpleGrantedAuthority(roleName))
        );
    }
}
