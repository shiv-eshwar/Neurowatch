import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DomainCard } from "../components/DomainCard";
import { InsightsPanel } from "../components/InsightsPanel";
import { RiskIndicator } from "../components/RiskIndicator";
import { downloadSessionReportPdf, generateSessionReport, getSessionById } from "../lib/api";
import type { DoctorReport, DomainName, SessionRecord } from "../lib/types";

export function SessionResultPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

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

  async function handleGenerateReport() {
    if (!id || generatingReport) {
      return;
    }
    setGeneratingReport(true);
    setReportError(null);
    try {
      const response = await generateSessionReport(id);
      setDoctorReport(response.report);
    } catch (reportGenerationError) {
      setReportError(
        reportGenerationError instanceof Error
          ? reportGenerationError.message
          : "Unable to generate a detailed report."
      );
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleCopyReport() {
    if (!doctorReport) {
      return;
    }
    try {
      await navigator.clipboard.writeText(doctorReport.share_text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  async function handleDownloadReportPdf() {
    if (!id || downloadingPdf) {
      return;
    }
    setDownloadingPdf(true);
    setReportError(null);
    try {
      const { blob, filename } = await downloadSessionReportPdf(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setReportError(downloadError instanceof Error ? downloadError.message : "Unable to download report PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

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
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingReport ? "Generating report..." : doctorReport ? "Regenerate detailed report" : "Generate detailed report"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Use the detailed report to support doctor consultations and care planning.
        </p>
        {reportError ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {reportError}
          </p>
        ) : null}
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

      {doctorReport ? (
        <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-indigo-600">Detailed Report For Doctor</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">{doctorReport.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{doctorReport.summary}</p>
          <p className="mt-2 text-xs text-slate-500">
            Generated at {new Date(doctorReport.generated_at).toLocaleString()}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopyReport}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                ? "Copy failed"
                : "Copy report"}
            </button>
            <button
              type="button"
              onClick={handleDownloadReportPdf}
              disabled={downloadingPdf}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {downloadingPdf ? "Preparing PDF..." : "Download PDF report"}
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(doctorReport.email_subject)}&body=${encodeURIComponent(
                doctorReport.share_text
              )}`}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
            >
              Send to doctor (email)
            </a>
          </div>

          <div className="mt-6 space-y-4">
            {doctorReport.sections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {section.title}
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  {section.points.map((point) => (
                    <li key={point}>- {point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Disclaimer</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">{analysis.disclaimer}</p>
      </section>
    </div>
  );
}
