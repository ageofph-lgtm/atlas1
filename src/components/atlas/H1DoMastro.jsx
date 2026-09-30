import React from "react";
import { SPEC_OPTIONS } from "@/components/atlas/constants";
import { resolverH1, h3Disponiveis } from "@/components/atlas/tabelaMastros";

const nomeDoMastro = (tipo) => SPEC_OPTIONS.mastro.find((o) => o.value === tipo)?.label || tipo;

/**
 * O campo H1 do registo e da edição, logo a seguir ao H3.
 *
 * Não se escreve: preenche-se sozinho pela tabela de mastros, a partir do
 * modelo, do mastro e do H3 — que é o que se consegue ler no pátio. Leva
 * também os H3 da ficha como sugestões do campo H3 (o input liga-se pela
 * `listaId`).
 *
 * Um H3 que não está na ficha avisa em vez de calar: ou é um mastro especial,
 * ou a placa foi mal lida — e é na hora do registo que se consegue confirmar.
 */
export default function H1DoMastro({ modelo, mastro, h3, listaId }) {
  const sugestoes = h3Disponiveis(modelo, mastro);
  const r = resolverH1({ modelo, mastro, h3 });

  let valor = <span className="text-slate-600">—</span>;
  let nota = <span className="text-slate-500">Preenche-se sozinho com o modelo, o mastro e o H3.</span>;
  if (r.origem === "tabela") {
    valor = <span className="num font-bold text-green-400">{r.h1}</span>;
    nota = (
      <span className="text-slate-500">
        Da ficha {r.fonte}.
        {r.igoIndisponivel && <span className="text-amber-400"> Sem iGo nesta altura.</span>}
      </span>
    );
  } else if (r.origem === "estimado") {
    valor = <span className="num font-bold text-amber-400">≈ {r.h1}</span>;
    nota = (
      <span className="text-amber-400">
        Estimado: este H3 não está na ficha (fica entre {r.entre[0]} e {r.entre[1]}). Confirme a leitura da placa.
      </span>
    );
  } else if (r.origem === "fora_da_tabela") {
    nota = (
      <span className="text-amber-400">
        H3 fora da ficha deste modelo ({r.intervalo[0]}–{r.intervalo[1]} mm). Confirme a leitura da placa.
      </span>
    );
  } else if (r.origem === "tipo_indisponivel") {
    nota = (
      <span className="text-slate-500">
        A ficha deste modelo não tem mastro {nomeDoMastro(mastro)} — só {r.tiposDisponiveis.map(nomeDoMastro).join(", ")}.
      </span>
    );
  } else if (r.origem === "modelo_desconhecido") {
    nota = <span className="text-slate-500">Este modelo ainda não tem tabela de mastros.</span>;
  }

  return (
    <div>
      {sugestoes.length > 0 && (
        <datalist id={listaId}>
          {sugestoes.map((v) => <option key={v} value={v} />)}
        </datalist>
      )}
      <h3 className="text-sm font-medium text-slate-300 mb-2">
        H1 — Mastro recolhido (mm) <span className="text-slate-600 font-normal">(pela tabela de mastros)</span>
      </h3>
      <div
        role="status"
        aria-label="H1 — altura do mastro recolhido"
        className="w-full px-3 py-2.5 border border-dashed border-slate-700 rounded-lg text-sm"
      >
        {valor}
      </div>
      <p className="text-xs mt-1.5">{nota}</p>
    </div>
  );
}
