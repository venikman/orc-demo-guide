import { FormEvent, useEffect, useMemo, useState } from "react";

import type {
  FilterType,
  SearchMatch,
  SearchResponseEnvelope,
  TraceStep,
} from "../../validation-schema";
import { PUBLIC_DATA_DEFAULT_QUERY, PUBLIC_DATASET_LABEL } from "../shared/public-dataset-meta";

const DEFAULT_QUERY = PUBLIC_DATA_DEFAULT_QUERY;
const FILTER_ORDER: FilterType[] = [
  "condition",
  "location",
  "encounter",
];

const FILTER_LABELS: Record<FilterType, string> = {
  condition: "Condition",
  location: "Location",
  encounter: "Encounter",
};

type ApiError = {
  error: string;
};

function LogoMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1L2 5v6l6 4 6-4V5L8 1z" stroke="white" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2" fill="white" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M14 14l-3.5-3.5M11 6.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TraceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 3v10M5 6l3-3 3 3M5 10l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResultCard({
  result,
  expanded,
  onToggle,
}: {
  result: SearchMatch;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`result-card${expanded ? " expanded" : ""}`}
      onClick={onToggle}
    >
      <div className="rc-top">
        <div className={`avatar ${["avatar-blue", "avatar-teal", "avatar-amber"][result.name.length % 3]}`}>
          {result.initials}
        </div>
        <div className="rc-copy">
          <div className="rc-name">{result.name}</div>
          <div className="rc-meta">
            Patient ID {result.patientIdentifier} | DOB {result.dob}
          </div>
          <div className="rc-meta rc-meta-secondary">
            {result.locationName} | {result.organizationName}
          </div>
        </div>
        <div className="rc-badges">
          {result.badges.map((badge) => (
            <span key={badge.label} className={`badge badge-${badge.tone}`}>
              {badge.label}
            </span>
          ))}
        </div>
      </div>
      <div className={`explain${expanded ? " open" : ""}`}>
        <div className="explain-inner">
          {result.explanations.map((item) => (
            <div key={`${result.id}-${item.text}`} className="ev-row">
              <div className={`ev-dot ev-${item.tone}`} />
              <div>
                {item.text}
                <span className="source-tag">{item.source}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

function TraceStepItem({
  step,
  open,
  onToggle,
}: {
  step: TraceStep;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className={`step ${step.state}`} onClick={onToggle}>
      <div className="rail">
        <div className="node-dot" />
        <div className="rail-line" />
      </div>
      <div className="step-card">
        <div className="step-title">
          {step.title}
          <span className={`step-agent sa-${step.agentTone}`}>{step.agent}</span>
          <span className="step-time">{step.timeLabel}</span>
        </div>
        <div className="step-desc">{step.description}</div>
        <div className={`step-detail${open ? " open" : ""}`}>
          <div className="step-detail-inner">{step.detail}</div>
        </div>
      </div>
    </button>
  );
}

export function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [response, setResponse] = useState<SearchResponseEnvelope | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowOpen, setFlowOpen] = useState(true);
  const [openSteps, setOpenSteps] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  const [showAllResults, setShowAllResults] = useState(false);
  const [chipState, setChipState] = useState<Record<FilterType, boolean>>({
    condition: true,
    location: true,
    encounter: false,
  });

  async function runSearch(nextQuery = query) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: nextQuery,
          presetId: "provider",
        }),
      });

      const data = (await res.json()) as SearchResponseEnvelope | ApiError;
      if (!res.ok) {
        throw new Error("error" in data ? data.error : "Request failed");
      }

      const searchResponse = data as SearchResponseEnvelope;
      setResponse(searchResponse);
      setOpenSteps([]);
      setExpandedCards([]);
      setShowAllResults(false);
      setChipState((current) => ({
        ...current,
        condition: searchResponse.chips.includes("condition"),
        location: searchResponse.chips.includes("location"),
        encounter: searchResponse.chips.includes("encounter"),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- boot from the canonical dataset query once on mount.
  useEffect(() => {
    void runSearch(DEFAULT_QUERY);
  }, []);

  const visibleResults = useMemo(() => {
    if (!response) {
      return [];
    }

    return showAllResults ? response.results : response.results.slice(0, response.previewCount);
  }, [response, showAllResults]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  function toggleChip(filter: FilterType) {
    setChipState((current) => ({
      ...current,
      [filter]: !current[filter],
    }));
  }

  function toggleStep(stepId: string) {
    setOpenSteps((current) =>
      current.includes(stepId) ? current.filter((item) => item !== stepId) : [...current, stepId],
    );
  }

  function toggleResult(resultId: string) {
    setExpandedCards((current) =>
      current.includes(resultId)
        ? current.filter((item) => item !== resultId)
        : [...current, resultId],
    );
  }

  return (
    <main className="page-shell">
      <section className="shell">
        <header className="topbar">
          <div className="logo">
            <LogoMark />
          </div>
          <span className="topbar-title">Encounter cohort copilot</span>
          <span className="topbar-sub">{PUBLIC_DATASET_LABEL}</span>
          <div className="dot" />
        </header>

        <section className="search-area">
          <form className="search-row" onSubmit={onSubmit}>
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search de-identified encounter cohorts"
            />
            <button className="search-btn" type="submit" aria-label="Run search">
              <SearchIcon />
            </button>
          </form>
          <div className="chips">
            {FILTER_ORDER.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`chip${chipState[filter] ? " active" : ""}`}
                onClick={() => toggleChip(filter)}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
        </section>

        <section className="flow-panel">
          <button className="flow-header" type="button" onClick={() => setFlowOpen((open) => !open)}>
            <span className="flow-label">
              <TraceIcon />
              Agent execution trace
              <span className="flow-tag">{response?.trace.length ?? 0} steps</span>
            </span>
            <span className={`flow-toggle${flowOpen ? " open" : ""}`}>▼</span>
          </button>
          <div className={`flow-body${flowOpen ? " open" : ""}`}>
            <div className="timeline">
              {(response?.trace ?? []).map((step) => (
                <TraceStepItem
                  key={step.id}
                  step={step}
                  open={openSteps.includes(step.id)}
                  onToggle={() => toggleStep(step.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="stat">
            <div className="stat-label">Matched</div>
            <div className="stat-val">{response?.stats.matched ?? 0}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Sources</div>
            <div className="stat-val">{response?.stats.sources ?? 0}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Latency</div>
            <div className="stat-val">{response?.stats.latencyMs ?? 0} ms</div>
          </div>
        </section>

        <section className="results">
          {loading && <div className="notice-card">Running de-identified FHIR retrieval…</div>}
          {error && <div className="notice-card notice-error">{error}</div>}
          {!loading && !error && response?.status === "clarify" && (
            <div className="notice-card">
              <div className="notice-title">Clarification needed</div>
              <div className="notice-body">{response.clarificationQuestion}</div>
            </div>
          )}
          {!loading && !error && response?.status === "deny" && (
            <div className="notice-card notice-error">
              <div className="notice-title">Request denied</div>
              <div className="notice-body">{response.denialReason}</div>
            </div>
          )}
          {!loading &&
            !error &&
            visibleResults.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                expanded={expandedCards.includes(result.id)}
                onToggle={() => toggleResult(result.id)}
              />
            ))}
        </section>

        {!loading &&
          !error &&
          response &&
          response.status === "success" &&
          response.totalResults > response.previewCount && (
            <div className="more-wrap">
              <button
                type="button"
                className="more-btn"
                onClick={() => setShowAllResults((current) => !current)}
              >
                {showAllResults ? "↑" : "↓"}
              </button>
            </div>
          )}
      </section>
    </main>
  );
}
