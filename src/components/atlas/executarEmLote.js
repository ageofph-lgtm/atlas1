/**
 * Motor das ações em massa.
 *
 * Três regras, e são o ponto todo:
 *
 *  1. **Sequencial, nunca `Promise.all`.** Cada autorização é uma chamada ao
 *     Watcher; quinze ao mesmo tempo é pedir para ser recusado.
 *  2. **Uma falha a meio não aborta o resto.** A máquina 7 falhar não pode
 *     impedir a 8 de passar.
 *  3. **Nada é silencioso.** O que não se aplica conta como ignorado, com
 *     motivo, e vai para o relatório. Um sucesso que escondeu metade do
 *     trabalho por fazer é pior do que um erro à vista.
 *
 * Separado da interface de propósito: assim testa-se sem browser.
 */
export async function executarEmLote(itens, { aplicavel, executar, onProgresso } = {}) {
  const feitas = [];
  const ignoradas = [];
  const falhadas = [];
  const total = itens?.length || 0;

  for (let i = 0; i < total; i++) {
    const item = itens[i];
    onProgresso?.({ feito: i, total, atual: item });

    const veredicto = aplicavel ? aplicavel(item) : true;
    // `aplicavel` pode devolver só `false` ou uma razão legível para o relatório.
    if (veredicto !== true) {
      ignoradas.push({ item, motivo: typeof veredicto === "string" ? veredicto : "não se aplica" });
      continue;
    }

    try {
      await executar(item);
      feitas.push(item);
    } catch (erro) {
      falhadas.push({ item, erro: erro?.message || String(erro) });
    }
  }

  onProgresso?.({ feito: total, total, atual: null });
  return { feitas, ignoradas, falhadas };
}

/** O relatório em palavras, para o aviso no fim. Só diz o que aconteceu mesmo. */
export function resumirLote({ feitas, ignoradas, falhadas }, verbo = "atualizada") {
  const partes = [];
  if (feitas.length) partes.push(`${feitas.length} ${verbo}${feitas.length === 1 ? "" : "s"}`);
  if (ignoradas.length) {
    const motivos = [...new Set(ignoradas.map((i) => i.motivo))].join("; ");
    partes.push(`${ignoradas.length} ignorada${ignoradas.length === 1 ? "" : "s"} (${motivos})`);
  }
  if (falhadas.length) {
    const nomes = falhadas.slice(0, 2).map((f) => f.item?.serie || "?").join(", ");
    const resto = falhadas.length > 2 ? ` e mais ${falhadas.length - 2}` : "";
    partes.push(`${falhadas.length} falhou${falhadas.length === 1 ? "" : "ram"} (${nomes}${resto})`);
  }
  return partes.join(" · ") || "Nada a fazer";
}
