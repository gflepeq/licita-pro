"use client";

import { Check } from "lucide-react";

export function ChipSelect({
  name,
  options,
  selected,
  onChange,
}: {
  name: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((x) => x !== opt)
        : [...selected, opt]
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {on && <Check size={14} />}
              {opt}
            </button>
          );
        })}
      </div>
      {/* Inputs ocultos para el envío del formulario */}
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
