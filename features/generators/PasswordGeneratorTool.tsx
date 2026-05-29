"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  estimateEntropy,
  generatePassword,
  strengthLabel,
  type PasswordMode,
} from "@/lib/password-gen";
import { copyToClipboard } from "@/lib/clipboard";

export default function PasswordGeneratorTool() {
  const [mode, setMode] = useState<PasswordMode>("random");
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [wordCount, setWordCount] = useState(5);
  const [count, setCount] = useState(1);
  const [passwords, setPasswords] = useState<string[]>([]);

  const opts = useMemo(
    () => ({
      mode,
      length,
      uppercase,
      lowercase,
      numbers,
      symbols,
      wordCount,
    }),
    [mode, length, uppercase, lowercase, numbers, symbols, wordCount],
  );

  const entropy = estimateEntropy(opts);
  const strength = strengthLabel(entropy);

  const generate = () => {
    const n = Math.max(1, Math.min(20, count));
    const next: string[] = [];
    for (let i = 0; i < n; i++) next.push(generatePassword(opts));
    setPasswords(next);
  };

  const copyAll = async () => {
    if (passwords.length === 0) return;
    await copyToClipboard(passwords.join("\n"));
  };

  return (
    <div className="tool-ui">
      <div className="editbar">
        <Button variant={mode === "random" ? "default" : "secondary"} size="sm" onClick={() => setMode("random")}>
          Random
        </Button>
        <Button variant={mode === "memorable" ? "default" : "secondary"} size="sm" onClick={() => setMode("memorable")}>
          Memorable (Diceware)
        </Button>
      </div>

      <div className="settings">
        {mode === "random" ? (
          <>
            <div className="field">
              <Label>Length ({length})</Label>
              <Slider value={[length]} onValueChange={(v) => setLength(Array.isArray(v) ? v[0]! : v)} min={8} max={128} />
            </div>
            <div className="field duo">
              <label className="field">
                <Checkbox checked={lowercase} onCheckedChange={(c) => setLowercase(c === true)} />
                <span className="field-label">Lowercase</span>
              </label>
              <label className="field">
                <Checkbox checked={uppercase} onCheckedChange={(c) => setUppercase(c === true)} />
                <span className="field-label">Uppercase</span>
              </label>
              <label className="field">
                <Checkbox checked={numbers} onCheckedChange={(c) => setNumbers(c === true)} />
                <span className="field-label">Numbers</span>
              </label>
              <label className="field">
                <Checkbox checked={symbols} onCheckedChange={(c) => setSymbols(c === true)} />
                <span className="field-label">Symbols</span>
              </label>
            </div>
          </>
        ) : (
          <div className="field">
            <Label>Word count ({wordCount})</Label>
            <Slider value={[wordCount]} onValueChange={(v) => setWordCount(Array.isArray(v) ? v[0]! : v)} min={4} max={6} />
          </div>
        )}

        <div className="field">
          <Label>Generate count ({count})</Label>
          <Slider value={[count]} onValueChange={(v) => setCount(Array.isArray(v) ? v[0]! : v)} min={1} max={20} />
        </div>

        <p className={`strength strength--${strength.level}`}>
          Strength: {strength.label} (~{Math.round(entropy)} bits)
        </p>

        <div className="actionbar">
          <Button type="button" onClick={generate}>
            Generate password{count > 1 ? "s" : ""}
          </Button>
          {passwords.length > 1 && (
            <Button type="button" variant="outline" onClick={() => void copyAll()}>
              Copy all
            </Button>
          )}
        </div>
      </div>

      {passwords.length > 0 && (
        <ul className="password-list">
          {passwords.map((p, i) => (
            <li key={`${i}-${p.slice(0, 4)}`}>
              <code>{p}</code>
              <CopyButton getText={() => p} label="Copy" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
