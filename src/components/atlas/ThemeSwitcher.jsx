import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const OPTIONS = [
  { id: "still-light", label: "Still · Light" },
  { id: "still-dark", label: "Still · Dark" },
  { id: "retro-light", label: "Retro · Light" },
  { id: "retro-dark", label: "Retro · Dark" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Tema"
        aria-label="Mudar tema"
        className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 flex items-center transition-colors"
      >
        <Palette className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 glass border border-slate-700 rounded-lg py-1 z-[120]">
          <p className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wide text-slate-500">Tema</p>
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => { setTheme(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                theme === o.id ? "text-amber-400 bg-amber-500/10" : "text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              {o.label}
              {theme === o.id && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}