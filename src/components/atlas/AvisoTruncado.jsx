import React from "react";
import { AlertTriangle } from "lucide-react";
import { MAXIMO_PADRAO } from "@/components/atlas/carregarTudo";

/**
 * Diz quando a leitura bateu no travão.
 *
 * Existe por uma razão só: um limite calado faz os números mentirem sem
 * ninguém dar por isso. Enquanto não aparecer, é porque está tudo à vista.
 */
export default function AvisoTruncado({ truncado, maximo = MAXIMO_PADRAO }) {
  if (!truncado) return null;
  return (
    <div className="flex items-start gap-2 text-xs glass border border-amber-500/40 rounded-lg px-3 py-2">
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <span className="text-slate-300">
        A mostrar os <span className="num font-bold text-slate-100">{maximo}</span> registos mais recentes — há mais
        do que isso. As contagens e as médias desta página referem-se só a estes.
      </span>
    </div>
  );
}
