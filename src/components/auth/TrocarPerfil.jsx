import React, { useState } from "react";
import { Repeat, Check } from "lucide-react";
import { PERFIS, perfisDe } from "@/components/atlas/acessos";

const ROTULOS = {
  administrador: "Administrador",
  gestor_frota: "Gestor de Frota",
  logistica: "Logística",
  comercial: "Comercial",
  visitante: "Visitante",
};

export const rotuloPerfil = (perfil) => ROTULOS[perfil] || perfil;

/**
 * Troca de perfil, para quem a lista dá mais do que um.
 *
 * Existe para poder ver o programa pelos olhos de quem o usa, sem ter de pedir
 * a senha a ninguém — que era como se fazia antes. Não dá permissões novas: só
 * aparecem os perfis que `acessos.js` já atribui a este email, e a escolha é
 * filtrada outra vez ao gravar.
 */
export default function TrocarPerfil({ email, perfil, onTrocar }) {
  const [aberto, setAberto] = useState(false);
  const disponiveis = perfisDe(email);
  if (disponiveis.length < 2) return null;

  const ordenados = PERFIS.filter((p) => disponiveis.includes(p));

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        title="Trocar de perfil"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 transition-colors"
      >
        <Repeat className="w-3 h-3" />
        {rotuloPerfil(perfil)}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          {/* Fundo opaco do tema, não `glass`: um menu translúcido por cima da
              barra de filtros fica ilegível — as etiquetas de trás leem-se
              através das opções. O `--surface` existe nos quatro temas. */}
          <div
            className="absolute right-0 mt-1 z-50 border border-slate-700 rounded-lg py-1 min-w-[180px] shadow-xl"
            style={{ background: "rgb(var(--surface))" }}
          >
            <p className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500">Ver o ATLAS como</p>
            {ordenados.map((p) => (
              <button
                key={p}
                onClick={() => { setAberto(false); if (p !== perfil) onTrocar(p); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                  p === perfil ? "text-amber-400" : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                {rotuloPerfil(p)}
                {p === perfil && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
