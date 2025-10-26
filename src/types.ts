export interface ReviewResponse {
  summary: string;
  suggestions: Suggestion[];
}

export interface Suggestion {
  comment: string;
  target_excerpt?: string;
  category?: string;
  severity?: 'low' | 'moderate' | 'high';
  explanation?: string;
  rewrite?: string | null;
}

export interface PromptConfig {
    temperature: number;
    context: string;
    behaviour: string;
    style_guide?: string | null;
    style_notes?: string | null;
    user_context?: string | null;
}