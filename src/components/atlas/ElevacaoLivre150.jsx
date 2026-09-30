import React from "react";
import { CheckSquare, Square } from "lucide-react";
import { temElevacaoLivre150 } from "@/components/atlas/tabelaMastros";

/**
 * A opção de elevação livre de 150 mm, logo a seguir à escolha do mastro.
 *
 * Só aparece quando a ficha tem essa versão para o modelo e mastro (os EXV com
 * mastro telescópico): nos outros não existe, e perguntar só confundia. Muda o
 * H1 — com ela, o mastro fica mais alto recolhido.
 */
export default function ElevacaoLivre150({ modelo, mastro, valor, onChange }) {
  if (!temElevacaoLivre150(modelo, mastro)) return null;
  const Icone = valor ? CheckSquare : Square;
  return (
    <button
      type="button"
      onClick={() => onChange(!valor)}
      aria-pressed={!!valor}
      className={`mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm transition-all ${
        valor
          ? "border-amber-500 bg-amber-500/10 text-amber-400"
          : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
      }`}
    >
      <Icone className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium">Elevação livre de 150 mm</span>
      <span className="text-xs text-slate-500 ml-auto">muda o H1</span>
    </button>
  );
}
