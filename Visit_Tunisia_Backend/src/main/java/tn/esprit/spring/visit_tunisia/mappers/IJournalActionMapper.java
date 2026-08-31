package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.journalAction.JournalActionResponse;
import tn.esprit.spring.visit_tunisia.entities.JournalAction;

import java.util.List;

public interface IJournalActionMapper {
    JournalActionResponse toResponse(JournalAction journalAction);
    List<JournalActionResponse> toResponseList(List<JournalAction> journalActionList);
}
