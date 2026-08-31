package tn.esprit.spring.visit_tunisia.DTO.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsResponse {
    private long totalUsers;
    private long actifs;
    private long desactives;
    private long enAttenteVerification;
    private long touristes;
    private long admins;
}
