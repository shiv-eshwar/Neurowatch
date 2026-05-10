import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BarChart3, Brain, History, Lightbulb, Mic, X } from "lucide-react";
import { DomainCard } from "../components/DomainCard";
import { InsightsPanel } from "../components/InsightsPanel";
import { MetricDetail } from "../components/MetricDetail";
import { RiskIndicator } from "../components/RiskIndicator";
import { SessionHistory } from "../components/SessionHistory";
import { TrendChart } from "../components/TrendChart";
import { getSessionTrends, getSessions } from "../lib/api";
import type { Analysis, DomainName, SessionRecord, TrendsPoint } from "../lib/types";
import { mockAnalysisData, memoryMetrics, reactionMetrics, sessionHistory, trendData, typingMetrics, voiceMetrics } from "../data/mockData";

type View = "dashboard" | "trends" | "history" | "insights" | DomainName;

function metricRowsFromRaw(raw: SessionRecord["raw_metrics"], domain: DomainName) {
  if (domain === "typing" && raw.typing) {
    return [
      { name: "Words Per Minute", value: `${raw.typing.wpm} WPM`, status: "neutral", description: "Current typing pace." },
      {
        name: "Keystroke Timing Variance",
        value: `${raw.typing.keystroke_interval_variance_ms} ms`,
        status: raw.typing.keystroke_interval_variance_ms > 150 ? "watch" : "good",
        description: "Consistency of inter-key timing."
      },
      {
        name: "Error Rate",
        value: `${raw.typing.error_rate_percent}%`,
        status: raw.typing.error_rate_percent > 7 ? "watch" : "good",
        description: "Percentage of mismatched characters."
      },
      {
        name: "Backspace Frequency",
        value: `${raw.typing.backspace_frequency_per_100chars} per 100 chars`,
        status: "neutral",
        description: "Correction pressure during typing."
      },
      {
        name: "Key Hold Duration",
        value: `${raw.typing.key_hold_duration_mean_ms} ms`,
        status: "neutral",
        description: "Average key press duration."
      }
    ] as const;
  }

  if (domain === "reaction" && raw.reaction) {
    return [
      {
        name: "Mean Reaction Time",
        value: `${raw.reaction.mean_reaction_time_ms} ms`,
        status: raw.reaction.mean_reaction_time_ms > 350 ? "watch" : "good",
        description: "Average response delay."
      },
      {
        name: "Reaction Variance",
        value: `${raw.reaction.reaction_time_variance_ms} ms`,
        status: raw.reaction.reaction_time_variance_ms > 100 ? "watch" : "good",
        description: "Response consistency."
      },
      {
        name: "Miss Rate",
        value: `${raw.reaction.miss_rate_percent}%`,
        status: raw.reaction.miss_rate_percent > 8 ? "watch" : "good",
        description: "Missed stimuli proportion."
      },
      {
        name: "Anticipation Errors",
        value: raw.reaction.anticipation_errors,
        status: raw.reaction.anticipation_errors > 2 ? "watch" : "good",
        description: "Taps before the signal appears."
      }
    ] as const;
  }

  if (domain === "memory" && raw.memory) {
    return [
      {
        name: "Recall Accuracy",
        value: `${raw.memory.recall_accuracy_percent}%`,
        status: raw.memory.recall_accuracy_percent < 70 ? "watch" : "good",
        description: "Immediate recall success."
      },
      {
        name: "Recall Latency",
        value: `${raw.memory.recall_latency_ms} ms`,
        status: raw.memory.recall_latency_ms > 2500 ? "watch" : "neutral",
        description: "Time to recall information."
      },
      {
        name: "Pattern Recognition",
        value: raw.memory.pattern_recognition_score,
        status: raw.memory.pattern_recognition_score < 65 ? "watch" : "good",
        description: "Pattern recognition task score."
      },
      {
        name: "Sequence Memory",
        value: raw.memory.sequence_memory_score,
        status: raw.memory.sequence_memory_score < 65 ? "watch" : "neutral",
        description: "Sequence recall score."
      },
      {
        name: "False Positive Rate",
        value: `${raw.memory.false_positive_rate_percent}%`,
        status: "neutral",
        description: "Incorrect recognitions proportion."
      }
    ] as const;
  }

  if (domain === "voice" && raw.voice) {
    return [
      { name: "Speech Rate", value: `${raw.voice.speech_rate_wpm} WPM`, status: "good", description: "Average speaking pace." },
      {
        name: "Pause Frequency",
        value: `${raw.voice.pause_frequency_per_minute} / min`,
        status: "neutral",
        description: "Number of pauses per minute."
      },
      {
        name: "Mean Pause Duration",
        value: `${raw.voice.mean_pause_duration_ms} ms`,
        status: "neutral",
        description: "Average pause length."
      },
      {
        name: "Pitch Variation",
        value: raw.voice.pitch_variation_coefficient,
        status: "neutral",
        description: "Relative pitch variability."
      },
      {
        name: "Articulation Score",
        value: raw.voice.articulation_score,
        status: raw.voice.articulation_score < 70 ? "watch" : "good",
        description: "Pronunciation clarity estimate."
      }
    ] as const;
  }

  return [];
}

export function DashboardPage() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [trends, setTrends] = useState<TrendsPoint[]>([]);
  const [latest, setLatest] = useState<Analysis | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [sessionsResponse, trendResponse] = await Promise.all([getSessions(), getSessionTrends()]);
        setSessions(sessionsResponse.sessions);
        setTrends(trendResponse.trends);
        setLatest(trendResponse.latest);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasLiveData = sessions.length > 0 && latest !== null;
  const activeAnalysis = hasLiveData ? latest : (mockAnalysisData as unknown as Analysis);
  const activeTrends = hasLiveData
    ? trends.map((point, index) => ({
        session: index + 1,
        overall: point.overall,
        typing: point.typing,
        reaction: point.reaction,
        memory: point.memory,
        voice: point.voice
      }))
    : trendData;
  const activeHistory = hasLiveData
    ? sessions.map((session) => ({
        session_number: session.analysis.session_number,
        date: new Date(session.created_at).toLocaleDateString(),
        overall_score: session.analysis.overall_risk_score,
        risk_level: session.analysis.risk_level,
        trend: session.analysis.session_compared_to_baseline === "worse" ? "declining" : "stable"
      }))
    : sessionHistory;

  const latestRawMetrics = useMemo(() => {
    if (!hasLiveData) {
      return null;
    }
    return sessions[0]?.raw_metrics ?? null;
  }, [hasLiveData, sessions]);

  const renderDomainDetail = (domain: DomainName) => {
    const metrics = latestRawMetrics ? metricRowsFromRaw(latestRawMetrics, domain) : domain === "typing" ? typingMetrics : domain === "reaction" ? reactionMetrics : domain === "memory" ? memoryMetrics : voiceMetrics;
    const detailsTitle = domain === "typing"
      ? "Typing Dynamics Analysis"
      : domain === "reaction"
      ? "Reaction Time Analysis"
      : domain === "memory"
      ? "Memory Performance Analysis"
      : "Voice Characteristics Analysis";

    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setCurrentView("dashboard")} className="text-slate-600 hover:text-slate-900 mb-4">
            ← Back to Dashboard
          </button>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">{detailsTitle}</h2>
        </div>
        <MetricDetail domain={domain} metrics={metrics as any} flags={activeAnalysis.domain_scores[domain].flags} />
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Loading your dashboard...</div>;
    }

    if (!hasLiveData && currentView === "dashboard") {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            You do not have live sessions yet. Showing sample data preview so the dashboard experience remains clear.
            <div className="mt-3">
              <Link to="/session" className="rounded-full bg-emerald-700 px-4 py-2 text-white text-xs">
                Start first session
              </Link>
            </div>
          </div>
          <RiskIndicator
            score={activeAnalysis.overall_risk_score}
            level={activeAnalysis.risk_level}
            label={activeAnalysis.risk_label}
            trend={activeAnalysis.session_compared_to_baseline === "worse" ? "declining" : activeAnalysis.session_compared_to_baseline === "better" ? "improving" : "stable"}
            sessionNumber={activeAnalysis.session_number}
          />
        </div>
      );
    }

    switch (currentView) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <RiskIndicator
              score={activeAnalysis.overall_risk_score}
              level={activeAnalysis.risk_level}
              label={activeAnalysis.risk_label}
              trend={activeAnalysis.session_compared_to_baseline === "worse" ? "declining" : activeAnalysis.session_compared_to_baseline === "better" ? "improving" : "stable"}
              sessionNumber={activeAnalysis.session_number}
            />

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <p className="text-sm text-slate-900 leading-relaxed">{activeAnalysis.personalized_summary}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Behavioral Domains</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["typing", "reaction", "memory", "voice"] as DomainName[]).map((domain) => (
                  <DomainCard
                    key={domain}
                    domain={domain}
                    score={activeAnalysis.domain_scores[domain].score}
                    trend={activeAnalysis.domain_scores[domain].trend}
                    flags={activeAnalysis.domain_scores[domain].flags}
                    observation={activeAnalysis.domain_scores[domain].key_observation}
                    onClick={() => setCurrentView(domain)}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-600 italic text-center">{activeAnalysis.disclaimer}</p>
          </div>
        );
      case "trends":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-slate-900">Progress Analysis</h2>
            <TrendChart data={activeTrends} showDomains={false} />
            <TrendChart data={activeTrends} showDomains />
          </div>
        );
      case "history":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-slate-900">Session History</h2>
            <SessionHistory sessions={activeHistory} />
          </div>
        );
      case "insights":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-slate-900">Personalized Insights</h2>
            <InsightsPanel
              summary={activeAnalysis.personalized_summary}
              positiveIndicators={activeAnalysis.positive_indicators}
              areasToWatch={activeAnalysis.areas_to_watch}
              recommendations={activeAnalysis.lifestyle_recommendations}
              shouldAlert={activeAnalysis.should_alert_caregiver}
              nextFocus={activeAnalysis.next_session_focus}
            />
          </div>
        );
      case "typing":
      case "reaction":
      case "memory":
      case "voice":
        return renderDomainDetail(currentView);
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[70vh] bg-transparent">
      <header className="bg-white border border-slate-200 rounded-2xl sticky top-3 z-20 mb-4">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">NeuroWatch Dashboard</h1>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <button onClick={() => setCurrentView("dashboard")} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${currentView === "dashboard" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <Activity className="w-4 h-4" />
                Dashboard
              </button>
              <button onClick={() => setCurrentView("trends")} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${currentView === "trends" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <BarChart3 className="w-4 h-4" />
                Trends
              </button>
              <button onClick={() => setCurrentView("history")} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${currentView === "history" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <History className="w-4 h-4" />
                History
              </button>
              <button onClick={() => setCurrentView("insights")} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${currentView === "insights" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <Lightbulb className="w-4 h-4" />
                Insights
              </button>
            </nav>

            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100">
              {menuOpen ? <X className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white rounded-b-2xl">
            <nav className="px-4 py-3 space-y-1">
              {(["dashboard", "trends", "history", "insights"] as View[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setCurrentView(item);
                    setMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg text-left capitalize ${currentView === item ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main>{renderContent()}</main>
    </div>
  );
}
