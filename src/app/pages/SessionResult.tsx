import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DomainCard } from "../components/DomainCard";
import { InsightsPanel } from "../components/InsightsPanel";
import { RiskIndicator } from "../components/RiskIndicator";
import { getSessionById } from "../lib/api";
import type { DomainName, SessionRecord } from "../lib/types";

export function SessionResultPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const response = await getSessionById(id);
        setRecord(response.session);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load session.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6">Loading session report...</div>;
  }

  if (error || !record) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {error ?? "Session not found."}
      </div>
    );
  }

  const analysis = record.analysis;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Session detail</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Session {analysis.session_number}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Recorded on {new Date(record.created_at).toLocaleString()}.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/dashboard" className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-700">
            Back to dashboard
          </Link>
          <Link to="/session" className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white">
            Start another session
          </Link>
        </div>
      </section>

      <RiskIndicator
        score={analysis.overall_risk_score}
        level={analysis.risk_level}
        label={analysis.risk_label}
        trend={
          analysis.session_compared_to_baseline === "better"
            ? "improving"
            : analysis.session_compared_to_baseline === "worse"
            ? "declining"
            : "stable"
        }
        sessionNumber={analysis.session_number}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["typing", "reaction", "memory", "voice"] as DomainName[]).map((domain) => (
          <DomainCard
            key={domain}
            domain={domain}
            score={analysis.domain_scores[domain].score}
            trend={analysis.domain_scores[domain].trend}
            flags={analysis.domain_scores[domain].flags}
            observation={analysis.domain_scores[domain].key_observation}
          />
        ))}
      </div>

      <InsightsPanel
        summary={analysis.personalized_summary}
        positiveIndicators={analysis.positive_indicators}
        areasToWatch={analysis.areas_to_watch}
        recommendations={analysis.lifestyle_recommendations}
        shouldAlert={analysis.should_alert_caregiver}
        nextFocus={analysis.next_session_focus}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Disclaimer</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">{analysis.disclaimer}</p>
      </section>
    </div>
  );
}
