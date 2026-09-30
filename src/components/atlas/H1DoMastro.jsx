import React from "react";
import { SPEC_OPTIONS } from "@/components/atlas/constants";
import { resolverH1, h3Disponiveis } from "@/components/atlas/tabelaMastros";

const nomeDoMastro = (tipo) => SPEC_OPTIONS.mastro.find((o) => o.value === tipo)?.label || tipo;

/**
 * Por baixo do campo H3: o H1 que a tabela de mastros dá, e os H3 da ficha
 * como sugestões do campo (o input liga-se pela `listaId`).
 *
 * Um H3 que não está na ficha avisa em vez de calar: ou é um mastro especial,
 * ou a placa foi mal lida — e é na hora do registo que se consegue confirmar.
 */
export default function H1DoMastro({ modelo, mastro, h3, listaId }) {
  const sugestoes = h3Disponiveis(modelo, mastro);
  const r = resolverH1({ modelo, mastro, h3 });

  let aviso = null;
  if (r.origem === "tabela") {
    aviso = (
      <p className="text-xs text-green-400">
        H1 — recolhido: <span className="num font-bold">{r.h1} mm</span>
        <span className="text-slate-500"> · ficha {r.fonte}</span>
        {r.igoIndisponivel && <span className="text-amber-400"> · sem iGo nesta altura</span>}
      </p>
    );
  } else if (r.origem === "estimado") {
    aviso = (
      <p className="text-xs text-amber-400">
        H1 ≈ <span className="num font-bold">{r.h1} mm</span>, estimado: este H3 não está na ficha (fica entre {r.entre[0]} e {r.entre[1]}). Confirme a leitura da placa.
      </p>
    );
  } else if (r.origem === "fora_da_tabela") {
    aviso = (
      <p className="text-xs text-amber-400">
        H3 fora da ficha deste modelo ({r.intervalo[0]}–{r.intervalo[1]} mm): sem H1. Confirme a leitura da placa.
      </p>
    );
  } else if (r.origem === "tipo_indisponivel") {
    aviso = (
      <p className="text-xs text-slate-500">
        A ficha deste modelo não tem mastro {nomeDoMastro(mastro)} — só {r.tiposDisponiveis.map(nomeDoMastro).join(", ")}. Sem H1.
      </p>
    );
  } else if (r.origem === "modelo_desconhecido") {
    aviso = <p className="text-xs text-slate-500">Este modelo ainda não tem tabela de mastros: sem H1.</p>;
  }

  return (
    <>
      {sugestoes.length > 0 && (
        <datalist id={listaId}>
          {sugestoes.map((v) => <option key={v} value={v} />)}
        </datalist>
      )}
      {aviso && <div className="mt-1.5">{aviso}</div>}
    </>
  );
}
