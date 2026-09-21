/**
 * Leitura completa de uma entidade, em páginas.
 *
 * Antes cada página pedia `list("-created_date", 500)` e ficava por aí. Quando
 * o pátio passasse os 500 ciclos — e passa, porque cada entrada e cada retorno
 * cria um —, os mais antigos deixavam de existir para a aplicação **sem erro e
 * sem aviso**. Os relatórios continuavam a mostrar médias, calculadas sobre uma
 * fatia, a dizer que eram médias de tudo.
 *
 * O SDK do Base44 sabe paginar: `list(sort, limit, skip)`. Pede-se página a
 * página até uma vir incompleta.
 *
 * `maximo` é um travão para o dia em que algo corra mal do outro lado e as
 * páginas nunca acabem. Quando bate, devolve `truncado: true` — e quem chama
 * **tem de o dizer no ecrã**. O objetivo não é nunca haver limite; é nunca
 * haver limite calado.
 */
export const PAGINA_PADRAO = 500;
export const MAXIMO_PADRAO = 5000;

export async function listarTudo(entidade, { sort = "-created_date", pagina = PAGINA_PADRAO, maximo = MAXIMO_PADRAO } = {}) {
  const registos = [];
  let salto = 0;

  while (registos.length < maximo) {
    const lote = await entidade.list(sort, pagina, salto);
    if (!lote?.length) break;
    registos.push(...lote);
    // Lote incompleto significa que não há mais nada do outro lado.
    if (lote.length < pagina) break;
    salto += pagina;
  }

  const truncado = registos.length >= maximo;
  return {
    registos: truncado ? registos.slice(0, maximo) : registos,
    truncado,
    total: truncado ? maximo : registos.length,
  };
}
