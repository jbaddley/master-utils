"use client";

/**
 * CsvImporter — a stepped CSV upload experience.
 *
 * Steps:
 *  idle        → large dropzone + paste option
 *  previewing  → spinner while calling the preview API
 *  mapping     → column-mapping table (dropdowns)
 *  ready       → summary + preview table + "Import" button
 *  importing   → spinner while committing
 *  success     → imported count + rollback option
 *  rolledback  → confirmation message
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuFileUp,
  LuFileText,
  LuCircleCheck,
  LuTriangleAlert,
  LuLoader,
  LuChevronDown,
  LuChevronUp,
  LuX,
  LuRotateCcw,
  LuArrowRight,
  LuClipboard,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { FieldKey } from "@/lib/swim/column-mapper";
import { FIELD_TO_CANONICAL } from "@/lib/swim/column-mapper";
import type { SwimProgramRow } from "@/lib/swim/parse-meet-program";

// ── Types ────────────────────────────────────────────────────────────────────

type PreviewResult = {
  rows: SwimProgramRow[];
  issues: { row: number; message: string }[];
  hasHeaderRow?: boolean;
};

type MapResult = {
  rows: SwimProgramRow[];
  issues: { row: number; message: string }[];
  mapping: Partial<Record<FieldKey, string>>;
  headers?: string[];
  detectedHeaders?: string[];
};

type Step = "idle" | "previewing" | "mapping" | "ready" | "importing" | "success" | "rolledback";

const ALL_FIELDS: FieldKey[] = [
  "lastName", "firstName", "age", "teamCode", "eventLabel", "eventNumber", "eventTitle", "heatLabel", "lane", "seedTimeDisplay",
];

const SKIP_VALUE = "__skip__";

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="csv-spinner"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function FileCard({
  name,
  size,
  onClear,
}: {
  name: string;
  size: number;
  onClear: () => void;
}) {
  const kb = (size / 1024).toFixed(1);
  return (
    <div className="csv-file-card">
      <LuFileText className="csv-file-icon" aria-hidden />
      <div className="csv-file-info">
        <span className="csv-file-name">{name}</span>
        <span className="csv-file-size">{kb} KB</span>
      </div>
      <button type="button" className="csv-file-clear" onClick={onClear} aria-label="Remove file">
        <LuX aria-hidden />
      </button>
    </div>
  );
}

function SummaryBadge({
  count,
  issues,
}: {
  count: number;
  issues: number;
}) {
  if (issues === 0) {
    return (
      <div className="csv-summary csv-summary--ok">
        <LuCircleCheck aria-hidden />
        <strong>{count} entries</strong> ready to import
      </div>
    );
  }
  return (
    <div className="csv-summary csv-summary--warn">
      <LuTriangleAlert aria-hidden />
      <strong>{count} entries</strong> ready · <strong>{issues}</strong> row{issues === 1 ? "" : "s"} skipped
    </div>
  );
}

function IssuesList({ issues }: { issues: { row: number; message: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 0) return null;
  const shown = expanded ? issues : issues.slice(0, 3);
  return (
    <div className="csv-issues">
      <div className="csv-issues-header">
        <LuTriangleAlert aria-hidden />
        <span>{issues.length} row{issues.length === 1 ? "" : "s"} had problems and will be skipped</span>
        {issues.length > 3 && (
          <button type="button" className="csv-issues-toggle" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <><LuChevronUp aria-hidden /> Show less</> : <><LuChevronDown aria-hidden /> Show all</>}
          </button>
        )}
      </div>
      <ul className="csv-issues-list">
        {shown.map((issue, i) => (
          <li key={i}>Row {issue.row}: {issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

function MappingTable({
  detectedHeaders,
  mapping,
  onChange,
}: {
  detectedHeaders: string[];
  mapping: Partial<Record<FieldKey, string>>;
  onChange: (m: Partial<Record<FieldKey, string>>) => void;
}) {
  // Build reverse map: csvColumn → fieldKey
  const reverseMap = Object.fromEntries(
    Object.entries(mapping).map(([field, col]) => [col, field as FieldKey]),
  );

  function handleChange(csvCol: string, fieldVal: string) {
    // Remove the old binding for this csv column
    const next = { ...mapping };
    const prevField = reverseMap[csvCol];
    if (prevField) delete next[prevField];

    if (fieldVal !== SKIP_VALUE) {
      // Remove any other csv column already bound to this field
      const existingCol = next[fieldVal as FieldKey];
      if (existingCol && existingCol !== csvCol) {
        // reassign: remove old entry
        delete next[fieldVal as FieldKey];
      }
      next[fieldVal as FieldKey] = csvCol;
    }
    onChange(next);
  }

  const mappedFields = new Set(Object.keys(mapping));
  const unmappedRequired = ALL_FIELDS.filter((f) => !mappedFields.has(f));

  return (
    <div className="csv-mapping">
      <div className="csv-mapping-header">
        <h3 className="csv-mapping-title">Map columns</h3>
        <p className="csv-mapping-hint">
          We couldn&apos;t auto-detect your column names. Match each CSV column to the right field.
        </p>
      </div>
      <div className="csv-mapping-table">
        <div className="csv-mapping-row csv-mapping-row--head">
          <span>Your CSV column</span>
          <span></span>
          <span>Swim field</span>
        </div>
        {detectedHeaders.map((col) => {
          const bound = reverseMap[col];
          return (
            <div key={col} className="csv-mapping-row">
              <span className="csv-mapping-col">{col}</span>
              <LuArrowRight className="csv-mapping-arrow" aria-hidden />
              <select
                className="csv-mapping-select"
                value={bound ?? SKIP_VALUE}
                onChange={(e) => handleChange(col, e.target.value)}
              >
                <option value={SKIP_VALUE}>— skip —</option>
                {ALL_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {FIELD_TO_CANONICAL[f]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {unmappedRequired.length > 0 && (
        <p className="csv-mapping-warn">
          <LuTriangleAlert aria-hidden />
          Still unmapped: {unmappedRequired.map((f) => FIELD_TO_CANONICAL[f]).join(", ")}
        </p>
      )}
    </div>
  );
}

function PreviewTable({ rows }: { rows: SwimProgramRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, 8);
  return (
    <div className="csv-preview-table-wrap">
      <div className="csv-preview-table-header">
        <span className="csv-preview-table-title">Preview</span>
        <span className="csv-preview-table-count">{rows.length} rows</span>
      </div>
      <div className="csv-preview-scroll">
        <table className="csv-preview-table">
          <thead>
            <tr>
              {["Last Name", "First Name", "Age", "Team", "Event", "Heat", "Lane", "Seed Time"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                <td>{row.lastName}</td>
                <td>{row.firstName}</td>
                <td>{row.age}</td>
                <td>{row.teamCode}</td>
                <td className="csv-preview-event">{row.eventLabel}</td>
                <td>{row.heatLabel}</td>
                <td>{row.lane}</td>
                <td>{row.seedTimeDisplay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && (
        <button type="button" className="csv-preview-expand" onClick={() => setExpanded((v) => !v)}>
          {expanded ? (
            <><LuChevronUp aria-hidden /> Show fewer rows</>
          ) : (
            <><LuChevronDown aria-hidden /> Show all {rows.length} rows</>
          )}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CsvImporter({ meetId, onImported }: { meetId: string; onImported: () => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [csvText, setCsvText] = useState("");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mapResult, setMapResult] = useState<MapResult | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  // Auto-preview after text is set
  useEffect(() => {
    if (!csvText) return;
    void runPreview(csvText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvText]);

  async function loadFile(f: File) {
    const text = await f.text();
    setFile({ name: f.name, size: f.size });
    setCsvText(text);
    setPasteOpen(false);
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv") && f.type !== "text/csv" && f.type !== "text/plain") {
      setError("Please drop a CSV file.");
      return;
    }
    void loadFile(f);
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void loadFile(f);
    e.target.value = "";
  }

  function handlePasteText(text: string) {
    setCsvText(text);
    setFile(null);
    setError("");
  }

  function reset() {
    setStep("idle");
    setCsvText("");
    setFile(null);
    setPreview(null);
    setMapResult(null);
    setMapping({});
    setImportedCount(0);
    setError("");
    setPasteOpen(false);
  }

  async function runPreview(text: string) {
    setStep("previewing");
    setError("");
    try {
      const res = await fetch(`/api/swim/meets/${meetId}/import/?preview=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: PreviewResult & { needsMapping?: boolean } = await res.json();

      // Check if mapping mode is needed
      const needsMapping = data.rows?.length === 0 &&
        data.issues?.some((i) => i.message.includes("Missing headers"));

      if (needsMapping) {
        const mapRes = await fetch(`/api/swim/meets/${meetId}/import/map`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const mapData: MapResult = await mapRes.json();
        setMapResult(mapData);
        setMapping(mapData.mapping ?? {});
        setStep("mapping");
      } else {
        setPreview(data);
        setStep("ready");
      }
    } catch {
      setError("Failed to parse the CSV. Please check the file and try again.");
      setStep("idle");
    }
  }

  async function applyMapping(newMapping: Partial<Record<FieldKey, string>>) {
    setMapping(newMapping);
    if (!csvText) return;
    try {
      const res = await fetch(`/api/swim/meets/${meetId}/import/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: csvText, mapping: newMapping }),
      });
      const data: MapResult = await res.json();
      setMapResult(data);
    } catch {
      // ignore — stale mapping, user is still editing
    }
  }

  function proceedFromMapping() {
    if (mapResult) {
      setPreview({ rows: mapResult.rows, issues: mapResult.issues });
      setStep("ready");
    }
  }

  async function confirmImport() {
    setStep("importing");
    setError("");
    try {
      const body =
        step === "ready" && preview?.rows
          ? { rows: preview.rows }
          : { text: csvText };
      const res = await fetch(`/api/swim/meets/${meetId}/import/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data: {
        entries?: number;
        participants?: number;
        error?: string;
        errors?: string[];
      };
      try {
        data = await res.json();
      } catch {
        setError("Import failed. Please try again.");
        setStep("ready");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Import failed. Please try again.");
        setStep("ready");
        return;
      }
      const count = data.entries ?? data.participants ?? 0;
      if (count === 0) {
        const detail = data.errors?.length
          ? data.errors.slice(0, 2).join(" ")
          : "No entries were imported.";
        setError(detail);
        setStep("ready");
        return;
      }
      setImportedCount(count);
      setStep("success");
      onImported();
    } catch {
      setError("Import failed. Please try again.");
      setStep("ready");
    }
  }

  async function rollback() {
    await fetch(`/api/swim/meets/${meetId}/import/`, { method: "DELETE" });
    setStep("rolledback");
    onImported();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="csv-success">
        <div className="csv-success-icon"><LuCircleCheck aria-hidden /></div>
        <h3 className="csv-success-title">Import complete</h3>
        <p className="csv-success-body">{importedCount} entries added to this meet.</p>
        <div className="csv-success-actions">
          <Button onClick={reset} variant="outline">Import another file</Button>
          <button type="button" className="csv-rollback-link" onClick={rollback}>
            <LuRotateCcw aria-hidden /> Undo this import
          </button>
        </div>
      </div>
    );
  }

  if (step === "rolledback") {
    return (
      <div className="csv-success csv-success--neutral">
        <div className="csv-success-icon"><LuRotateCcw aria-hidden /></div>
        <h3 className="csv-success-title">Import rolled back</h3>
        <p className="csv-success-body">The entries from the last import have been removed.</p>
        <Button onClick={reset} variant="outline">Start over</Button>
      </div>
    );
  }

  return (
    <div className="csv-importer">
      {/* ── Step: idle ── */}
      {step === "idle" && !csvText && (
        <>
          {error && (
            <div className="csv-error-banner">
              <LuTriangleAlert aria-hidden />
              {error}
              <button type="button" onClick={() => setError("")} aria-label="Dismiss"><LuX aria-hidden /></button>
            </div>
          )}

          {/* Dropzone */}
          <div
            className={`csv-dropzone${dragging ? " csv-dropzone--active" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            aria-label="Upload CSV file"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              hidden
              onChange={handleFilePick}
            />
            <div className="csv-dropzone-inner">
              <div className="csv-dropzone-icon-wrap">
                <LuFileUp aria-hidden />
              </div>
              <strong className="csv-dropzone-title">Drop your CSV file here</strong>
              <span className="csv-dropzone-sub">or <u>click to browse</u></span>
            </div>
          </div>

          {/* Format hint */}
          <div className="csv-format-hint">
            <strong>Expected columns:</strong> Last Name, First Name, Age, Team, Event, Heat, Lane, Seed Time.
            {" "}Non-standard headers are mapped automatically.
          </div>

          {/* Paste option */}
          <div className="csv-paste-section">
            <button
              type="button"
              className="csv-paste-toggle"
              onClick={() => {
                setPasteOpen((v) => !v);
                if (!pasteOpen) setTimeout(() => pasteRef.current?.focus(), 50);
              }}
            >
              <LuClipboard aria-hidden />
              {pasteOpen ? "Hide paste area" : "Paste CSV instead"}
              {pasteOpen ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}
            </button>
            {pasteOpen && (
              <div className="csv-paste-body">
                <textarea
                  ref={pasteRef}
                  className="csv-paste-textarea"
                  placeholder="Paste your CSV data here…"
                  rows={6}
                  onChange={(e) => {
                    if (e.target.value.includes("\n")) {
                      handlePasteText(e.target.value);
                    }
                  }}
                />
                <p className="csv-paste-hint">Import starts automatically once you paste.</p>
              </div>
            )}
          </div>

          {/* Rollback link */}
          <div className="csv-danger-zone">
            <button type="button" className="csv-rollback-link" onClick={rollback}>
              <LuRotateCcw aria-hidden /> Undo last import
            </button>
          </div>
        </>
      )}

      {/* ── Step: previewing (loading) ── */}
      {step === "previewing" && (
        <div className="csv-loading-state">
          {file && <FileCard name={file.name} size={file.size} onClear={reset} />}
          <div className="csv-loading-body">
            <Spinner size={24} />
            <span>Parsing CSV…</span>
          </div>
        </div>
      )}

      {/* ── Step: mapping ── */}
      {step === "mapping" && mapResult && (
        <div className="csv-step-body">
          {file && <FileCard name={file.name} size={file.size} onClear={reset} />}
          <MappingTable
            detectedHeaders={mapResult.headers ?? mapResult.detectedHeaders ?? Object.values(mapping)}
            mapping={mapping}
            onChange={(m) => void applyMapping(m)}
          />
          {mapResult.rows.length > 0 && <SummaryBadge count={mapResult.rows.length} issues={mapResult.issues.length} />}
          <div className="csv-step-actions">
            <Button
              onClick={proceedFromMapping}
              disabled={mapResult.rows.length === 0}
            >
              Continue with {mapResult.rows.length} rows
            </Button>
            <Button variant="outline" onClick={reset}>Start over</Button>
          </div>
        </div>
      )}

      {/* ── Step: ready ── */}
      {step === "ready" && preview && (
        <div className="csv-step-body">
          {file && <FileCard name={file.name} size={file.size} onClear={reset} />}

          {error && (
            <div className="csv-error-banner">
              <LuTriangleAlert aria-hidden />
              {error}
            </div>
          )}

          <SummaryBadge count={preview.rows.length} issues={preview.issues.length} />
          {preview.hasHeaderRow === false && (
            <p className="csv-info-note">No header row detected — columns read in order: Last Name, First Name, Age, Team, Event, Heat, Lane, Seed Time.</p>
          )}
          <IssuesList issues={preview.issues} />
          {preview.rows.length > 0 && <PreviewTable rows={preview.rows} />}

          <div className="csv-step-actions">
            <Button onClick={confirmImport} disabled={preview.rows.length === 0}>
              Import {preview.rows.length} entries
            </Button>
            <Button variant="outline" onClick={reset}>Start over</Button>
          </div>
        </div>
      )}

      {/* ── Step: importing ── */}
      {step === "importing" && (
        <div className="csv-loading-state">
          {file && <FileCard name={file.name} size={file.size} onClear={() => {}} />}
          <div className="csv-loading-body">
            <Spinner size={24} />
            <span>Importing entries…</span>
          </div>
        </div>
      )}
    </div>
  );
}
