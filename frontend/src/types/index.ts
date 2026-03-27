export type Role = 'candidate' | 'supervisor' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  department?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
}

export interface ScoreBreakdown {
  confidence_score: number;
  clarity_score: number;
  objection_handling_score: number;
  closing_technique_score: number;
  product_knowledge_score: number;
  rapport_score: number;
}

export interface Session {
  id: string;
  user_id: string;
  scenario_type: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  score?: number;
  duration_seconds?: number;
  ai_feedback?: string;
  improvement_suggestions?: ImprovementSuggestion[];
  strengths?: string[];
  weaknesses?: string[];
  started_at: string;
  completed_at?: string;
  candidate_name?: string;
  candidate_email?: string;
}

export interface SessionWithBreakdown extends Session, ScoreBreakdown {}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  turn_number: number;
  created_at: string;
}

export interface ImprovementSuggestion {
  area: string;
  suggestion: string;
  example: string;
}

export interface Evaluation {
  overall_score: number;
  breakdown: {
    confidence: number;
    clarity: number;
    objection_handling: number;
    closing_technique: number;
    product_knowledge: number;
    rapport_building: number;
  };
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: ImprovementSuggestion[];
  summary: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  tag?: string;
  tagColor?: string;
}

export interface AdminStats {
  total_candidates: number;
  total_sessions: number;
  average_score: number;
}

export interface CandidateWithStats extends User {
  total_sessions: number;
  avg_score?: number;
  last_session?: string;
}
