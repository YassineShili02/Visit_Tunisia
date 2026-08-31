from pydantic import BaseModel, Field, field_validator


class SentimentRequest(BaseModel):
    """Request schema for sentiment analysis"""
    commentaire: str = Field(..., min_length=1, description="Review comment to analyze")

    @field_validator('commentaire')
    @classmethod
    def commentaire_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Comment cannot be empty or whitespace only')
        return v.strip()


class SentimentResponse(BaseModel):
    """Response schema for sentiment analysis - ONLY the score"""
    score: float = Field(..., ge=0.0, le=1.0, description="Sentiment polarity score (0.0=very negative, 1.0=very positive)")
