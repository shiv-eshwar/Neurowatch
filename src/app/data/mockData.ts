export const mockAnalysisData = {
  session_id: "session_2026_05_10_001",
  user_id: "user_12345",
  analysis_timestamp: "2026-05-10T14:30:00Z",
  session_number: 12,
  baseline_available: true,

  overall_risk_score: 35,
  risk_level: "moderate" as const,
  risk_color: "#eab308",
  risk_label: "Some patterns need attention",

  domain_scores: {
    typing: {
      score: 42,
      trend: "declining" as const,
      flags: [
        "Motor speed decline detected",
        "Rhythmic disruption in typing",
        "Increased error frequency"
      ],
      key_observation: "Typing speed has decreased by 22% from baseline, with noticeable rhythm inconsistency suggesting potential motor coordination changes."
    },
    reaction: {
      score: 28,
      trend: "stable" as const,
      flags: [],
      key_observation: "Reaction times remain consistent with baseline. Processing speed is within expected range for your age group."
    },
    memory: {
      score: 45,
      trend: "declining" as const,
      flags: [
        "Memory recall degradation",
        "Increased recall latency"
      ],
      key_observation: "Recall accuracy has declined by 18% compared to baseline, with increased time needed to retrieve information."
    },
    voice: {
      score: 22,
      trend: "improving" as const,
      flags: [],
      key_observation: "Speech patterns show improvement with clearer articulation and consistent pacing compared to previous sessions."
    }
  },

  strongest_signal: "memory" as const,
  session_compared_to_baseline: "worse" as const,

  personalized_summary: "This session shows some changes in typing rhythm and memory recall compared to your recent baseline. However, your reaction time remains steady and your speech patterns are actually improving. These variations can be influenced by sleep, stress, or daily activities.",

  positive_indicators: [
    "Speech articulation showing consistent improvement over last 3 sessions",
    "Reaction time variability remains low, indicating stable attention",
    "Pattern recognition scores above 75th percentile for age group",
    "Typing error correction speed remains efficient",
    "Overall engagement and task completion rate is excellent"
  ],

  areas_to_watch: [
    "Typing rhythm consistency - consider checking for fatigue or stress factors",
    "Memory recall speed - ensure adequate sleep and mental rest between sessions"
  ],

  lifestyle_recommendations: [
    "Prioritize 7-8 hours of quality sleep, especially before monitoring sessions",
    "Engage in daily mental stimulation activities like puzzles, reading, or learning new skills",
    "Stay well-hydrated throughout the day and maintain regular meal times"
  ],

  should_alert_caregiver: false,
  alert_message: null,
  next_session_focus: "Memory domain - we'll include additional recall exercises to better understand the recent patterns and establish a clearer trend.",

  data_quality_notes: null,
  sessions_until_stable_baseline: 0,

  disclaimer: "NeuroWatch provides early behavioral awareness only. This is not a medical diagnosis. Please consult a qualified healthcare professional for any health concerns."
};

export const trendData = [
  { session: 1, overall: 18, typing: 15, reaction: 20, memory: 22, voice: 16 },
  { session: 2, overall: 20, typing: 18, reaction: 22, memory: 24, voice: 18 },
  { session: 3, overall: 19, typing: 16, reaction: 21, memory: 23, voice: 17 },
  { session: 4, overall: 22, typing: 20, reaction: 23, memory: 26, voice: 20 },
  { session: 5, overall: 24, typing: 22, reaction: 24, memory: 28, voice: 22 },
  { session: 6, overall: 23, typing: 21, reaction: 23, memory: 27, voice: 21 },
  { session: 7, overall: 26, typing: 25, reaction: 25, memory: 30, voice: 23 },
  { session: 8, overall: 28, typing: 28, reaction: 26, memory: 32, voice: 24 },
  { session: 9, overall: 30, typing: 32, reaction: 27, memory: 35, voice: 25 },
  { session: 10, overall: 32, typing: 35, reaction: 28, memory: 38, voice: 26 },
  { session: 11, overall: 33, typing: 38, reaction: 27, memory: 40, voice: 24 },
  { session: 12, overall: 35, typing: 42, reaction: 28, memory: 45, voice: 22 }
];

export const sessionHistory = [
  { session_number: 1, date: "2026-01-15", overall_score: 18, risk_level: "low", trend: "stable" },
  { session_number: 2, date: "2026-01-22", overall_score: 20, risk_level: "low", trend: "stable" },
  { session_number: 3, date: "2026-01-29", overall_score: 19, risk_level: "low", trend: "improving" },
  { session_number: 4, date: "2026-02-05", overall_score: 22, risk_level: "low", trend: "declining" },
  { session_number: 5, date: "2026-02-12", overall_score: 24, risk_level: "low", trend: "declining" },
  { session_number: 6, date: "2026-02-19", overall_score: 23, risk_level: "low", trend: "improving" },
  { session_number: 7, date: "2026-02-26", overall_score: 26, risk_level: "moderate", trend: "declining" },
  { session_number: 8, date: "2026-03-05", overall_score: 28, risk_level: "moderate", trend: "declining" },
  { session_number: 9, date: "2026-03-12", overall_score: 30, risk_level: "moderate", trend: "declining" },
  { session_number: 10, date: "2026-03-19", overall_score: 32, risk_level: "moderate", trend: "declining" },
  { session_number: 11, date: "2026-03-26", overall_score: 33, risk_level: "moderate", trend: "declining" },
  { session_number: 12, date: "2026-05-10", overall_score: 35, risk_level: "moderate", trend: "declining" }
];

export const typingMetrics = [
  {
    name: "Words Per Minute",
    value: "52 WPM",
    baseline: "67 WPM",
    status: "watch" as const,
    description: "22% decline from baseline - may indicate motor slowing or fatigue"
  },
  {
    name: "Keystroke Timing Variance",
    value: "145 ms",
    baseline: "108 ms",
    status: "concern" as const,
    description: "35% increase in timing inconsistency - rhythmic disruption detected"
  },
  {
    name: "Error Rate",
    value: "4.2%",
    baseline: "2.8%",
    status: "watch" as const,
    description: "50% increase in typing errors compared to baseline"
  },
  {
    name: "Backspace Frequency",
    value: "8.5 per 100 chars",
    baseline: "6.2 per 100 chars",
    status: "neutral" as const,
    description: "Slightly elevated but within acceptable range"
  },
  {
    name: "Key Hold Duration",
    value: "92 ms",
    baseline: "85 ms",
    status: "neutral" as const,
    description: "Average time keys are pressed - minimal change from baseline"
  }
];

export const reactionMetrics = [
  {
    name: "Mean Reaction Time",
    value: "285 ms",
    baseline: "278 ms",
    status: "good" as const,
    description: "Processing speed remains stable and within normal range"
  },
  {
    name: "Reaction Time Variance",
    value: "42 ms",
    baseline: "40 ms",
    status: "good" as const,
    description: "Consistent response timing indicates stable attention"
  },
  {
    name: "Miss Rate",
    value: "2.1%",
    baseline: "2.3%",
    status: "good" as const,
    description: "Excellent attention and focus - slightly improved"
  },
  {
    name: "Anticipation Errors",
    value: "1",
    baseline: "1",
    status: "good" as const,
    description: "Minimal impulsivity - response control is good"
  }
];

export const memoryMetrics = [
  {
    name: "Recall Accuracy",
    value: "73%",
    baseline: "89%",
    status: "watch" as const,
    description: "18% decline in memory recall - monitoring recommended"
  },
  {
    name: "Recall Latency",
    value: "2.8 sec",
    baseline: "2.0 sec",
    status: "watch" as const,
    description: "40% increase in time to recall information"
  },
  {
    name: "Pattern Recognition",
    value: "78/100",
    baseline: "82/100",
    status: "neutral" as const,
    description: "Slight decrease but still within normal range"
  },
  {
    name: "Sequence Memory",
    value: "71/100",
    baseline: "85/100",
    status: "watch" as const,
    description: "Working memory showing some decline from baseline"
  },
  {
    name: "False Positive Rate",
    value: "5.2%",
    baseline: "3.8%",
    status: "neutral" as const,
    description: "Minimal increase in incorrect recognitions"
  }
];

export const voiceMetrics = [
  {
    name: "Speech Rate",
    value: "145 WPM",
    baseline: "142 WPM",
    status: "good" as const,
    description: "Speech rate is improving and within healthy range"
  },
  {
    name: "Pause Frequency",
    value: "8.2 per min",
    baseline: "8.5 per min",
    status: "good" as const,
    description: "Natural speech flow with appropriate pausing"
  },
  {
    name: "Mean Pause Duration",
    value: "850 ms",
    baseline: "880 ms",
    status: "good" as const,
    description: "Pause lengths remain consistent and natural"
  },
  {
    name: "Pitch Variation",
    value: "0.68",
    baseline: "0.65",
    status: "good" as const,
    description: "Vocal prosody showing improvement - more expressive speech"
  },
  {
    name: "Articulation Score",
    value: "86/100",
    baseline: "83/100",
    status: "good" as const,
    description: "Clear speech with improving articulation quality"
  }
];
