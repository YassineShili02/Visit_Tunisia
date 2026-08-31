import os
import json
import logging
from typing import Optional
import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiClient:
    """Wrapper for Google Gemini API calls"""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-3.6-flash')
        logger.info("GeminiClient initialized with gemini-3.6-flash model")
    
    def analyze_sentiment(self, commentaire: str) -> float:
        """
        Analyze sentiment of a comment and return a polarity score.
        
        Args:
            commentaire: Review comment (can be in French, Arabic, English, Italian, or German)
        
        Returns:
            float: Sentiment polarity score between 0.0 (very negative) and 1.0 (very positive)
        
        Raises:
            ValueError: If response format is invalid after retry
            Exception: For network/API errors (no retry for these)
        """
        
        prompt = f"""Analyze the sentiment of the following tourist review and return ONLY a JSON object with a single field "score".

The score must be a float between 0.0 and 1.0 representing sentiment polarity:
- 0.0 = very negative
- 0.5 = neutral
- 1.0 = very positive

The review can be in French, Arabic, English, Italian, or German. Detect the language automatically.

Review: "{commentaire}"

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{"score": 0.75}}"""

        max_attempts = 2
        last_error = None
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Calling Gemini API (attempt {attempt + 1}/{max_attempts})")
                
                response = self.model.generate_content(
                    prompt,
                    generation_config={
                        'temperature': 0.3,  # Lower temperature for more consistent scoring
                        'top_p': 0.8,
                        'top_k': 40,
                        'max_output_tokens': 100,
                    }
                )
                
                if not response or not response.text:
                    last_error = "Empty response from Gemini"
                    logger.warning(f"Attempt {attempt + 1}: Empty response")
                    continue
                
                # Parse JSON response
                response_text = response.text.strip()
                
                # Remove markdown code blocks if present
                if response_text.startswith('```'):
                    lines = response_text.split('\n')
                    response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
                    response_text = response_text.replace('```json', '').replace('```', '').strip()
                
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError as e:
                    last_error = f"Invalid JSON: {response_text[:100]}"
                    logger.warning(f"Attempt {attempt + 1}: JSON parse error - {e}")
                    continue
                
                # Validate response format
                if 'score' not in result:
                    last_error = f"Missing 'score' field in response: {result}"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue
                
                score = float(result['score'])
                
                # Validate score range
                if not (0.0 <= score <= 1.0):
                    last_error = f"Score {score} out of valid range [0.0, 1.0]"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue
                
                # Success!
                logger.info(f"✓ Sentiment analysis successful: score={score:.4f}")
                return score
                
            except Exception as e:
                # Network/API errors - don't retry, fail immediately
                if "timeout" in str(e).lower() or "connection" in str(e).lower():
                    logger.error(f"Network error calling Gemini API: {e}")
                    raise Exception(f"Network error calling Gemini: {e}") from e
                
                # Other errors - log and retry
                last_error = str(e)
                logger.warning(f"Attempt {attempt + 1}: Unexpected error - {e}")
        
        # All attempts failed
        error_msg = f"Gemini API failed after {max_attempts} attempts. Last error: {last_error}"
        logger.error(error_msg)
        raise ValueError(error_msg)
