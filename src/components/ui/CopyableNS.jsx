import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  alternarNS,
  copiarTexto,
  instalarCopiaNS,
  nsSelecionados,
  subscreverNS,
  textoDosNS,
} from "@/lib/nsClipboard";

// Uma vez por sessão: o ouvinte de cópia é do documento, não de um componente.
instalarCopiaNS();

/**
 * O NS de uma máquina, com cópia à mão cheia.
 *
 * Não traz estilo próprio — recebe a classe de cada sítio, para o número
 * continuar a ser o protagonista como sempre foi. O que acrescenta é
 * comportamento: Ctrl+clique (Cmd no Mac) junta o NS a uma lista e copia-a.
 *
 * Sem Ctrl, o clique segue o caminho de sempre (abrir o card, navegar, etc.):
 * só se trava a propagação quando há Ctrl, para não roubar o clique normal.
 */
export default function CopyableNS({ serie, className = "", as: Etiqueta = "span", title, fallback, ...resto }) {
  const { toast } = useToast();
  const [escolhidos, setEscolhidos] = useState(nsSelecionados);

  useEffect(() => subscreverNS(setEscolhidos), []);

  const ns = String(serie ?? "").trim();
  // Sem NS não há nada para copiar; `fallback` é texto de recurso (ex.: "Máquina").
  if (!ns) return fallback ? <Etiqueta className={className}>{fallback}</Etiqueta> : null;

  const escolhido = escolhidos.includes(ns);

  const aoClique = async (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    e.stopPropagation();
    const lista = alternarNS(ns);
    if (!lista.length) return;
    await copiarTexto(textoDosNS(lista));
    toast({
      title: lista.length === 1 ? "NS copiado" : `${lista.length} NS copiados`,
      duration: 1800,
    });
  };

  return (
    <Etiqueta
      {...resto}
      data-ns={ns}
      onClick={aoClique}
      title={title || "Ctrl+clique para copiar o NS"}
      className={`${className} cursor-copy ${escolhido ? "ns-escolhido" : ""}`}
    >
      {serie}
    </Etiqueta>
  );
}