"use client";

import { useState } from "react";
import { LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  PRESETS,
  SIMPLIFY_LEVELS,
  type PresetKey,
  type SimplifyLevel,
} from "@/lib/tracer";

export type SvgTraceSettings = {
  preset: PresetKey;
  simplify: SimplifyLevel;
  cleanup: boolean;
};

export const DEFAULT_SVG_SETTINGS: SvgTraceSettings = {
  preset: "default",
  simplify: "light",
  cleanup: true,
};

/**
 * One-time settings for image → SVG tracing. Saved to the user's
 * preferences (account or localStorage) so conversion is one click
 * afterwards.
 */
export function SvgSettingsModal({
  initial,
  onSave,
  onClose,
}: {
  initial: SvgTraceSettings | null;
  onSave: (settings: SvgTraceSettings) => void;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState<PresetKey>(initial?.preset ?? DEFAULT_SVG_SETTINGS.preset);
  const [simplify, setSimplify] = useState<SimplifyLevel>(
    initial?.simplify ?? DEFAULT_SVG_SETTINGS.simplify,
  );
  const [cleanup, setCleanup] = useState(initial?.cleanup ?? DEFAULT_SVG_SETTINGS.cleanup);

  return (
    <div className="auth-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="auth-modal studio-svg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Image to SVG settings"
      >
        <div className="studio-svg-modal-head">
          <h2>Image → SVG settings</h2>
          <button type="button" className="studio-svg-modal-close" onClick={onClose} aria-label="Close">
            <LuX />
          </button>
        </div>
        <p className="studio-hint">
          Set these once — they&apos;re saved to your account (or this browser) and used for every
          conversion. You can change them any time.
        </p>

        <h3 className="studio-card-title">Tracing style</h3>
        <div className="studio-presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              title={p.hint}
              className={`studio-chip${preset === p.key ? " is-active" : ""}`}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <h3 className="studio-card-title">Simplification</h3>
        <div className="studio-presets">
          {SIMPLIFY_LEVELS.map((s) => (
            <button
              key={s.key}
              type="button"
              title={s.hint}
              className={`studio-chip${simplify === s.key ? " is-active" : ""}`}
              onClick={() => setSimplify(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label className="studio-check">
          <input type="checkbox" checked={cleanup} onChange={(e) => setCleanup(e.target.checked)} />
          Optimize output (SVGO — smaller files)
        </label>

        <div className="studio-tool-actions">
          <Button size="sm" onClick={() => onSave({ preset, simplify, cleanup })}>
            Save settings
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
