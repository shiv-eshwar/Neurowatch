export type DomainName = "typing" | "reaction" | "memory" | "voice";
export type DomainTrend = "improving" | "stable" | "declining" | "insufficient_data";
export type RiskLevel = "low" | "moderate" | "elevated" | "high";

export interface TypingMetrics {
  wpm: number;
  keystroke_interval_variance_ms: number;
  error_rate_percent: number;
  backspace_frequency_per_100chars: number;
  key_hold_duration_mean_ms: number;
}

export interface ReactionMetrics {
  mean_reaction_time_ms: number;
  reaction_time_variance_ms: number;
  miss_rate_percent: number;
  anticipation_errors: number;
}

export interface MemoryMetrics {
  recall_accuracy_percent: number;
  recall_latency_ms: number;
  pattern_recognition_score: number;
  sequence_memory_score: number;
  false_positive_rate_percent: number;
}

export interface VoiceMetrics {
  speech_rate_wpm: number;
  pause_frequency_per_minute: number;
  mean_pause_duration_ms: number;
  pitch_variation_coefficient: number;
  articulation_score: number;
}

export interface SessionMetrics {
  typing: TypingMetrics | null;
  reaction: ReactionMetrics | null;
  memory: MemoryMetrics | null;
  voice: VoiceMetrics | null;
}

export interface DomainScore {
  score: number | null;
  trend: DomainTrend;
  flags: string[];
  key_observation: string;
}

export interface Analysis {
  session_id: string;
  user_id: string;
  analysis_timestamp: string;
  session_number: number;
  baseline_available: boolean;
  overall_risk_score: number;
  risk_level: RiskLevel;
  risk_color: string;
  risk_label: string;
  domain_scores: Record<DomainName, DomainScore>;
  strongest_signal: DomainName | "none";
  session_compared_to_baseline: "better" | "similar" | "worse" | "no_baseline";
  personalized_summary: string;
  positive_indicators: string[];
  areas_to_watch: string[];
  lifestyle_recommendations: string[];
  should_alert_caregiver: boolean;
  alert_message: string | null;
  next_session_focus: string;
  data_quality_notes: string | null;
  sessions_until_stable_baseline: number;
  disclaimer: string;
}

export interface SessionRecord {
  id: string;
  number: number;
  created_at: string;
  raw_metrics: SessionMetrics;
  analysis: Analysis;
}

export interface TrendsPoint {
  label: string;
  overall: number;
  typing: number;
  reaction: number;
  memory: number;
  voice: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface DoctorReportSection {
  title: string;
  points: string[];
}

export interface DoctorReport {
  session_id: string;
  user_id: string;
  generated_at: string;
  title: string;
  summary: string;
  sections: DoctorReportSection[];
  email_subject: string;
  share_text: string;
}
