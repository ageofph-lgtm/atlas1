import { vi } from "vitest";

/**
 * Duplo do cliente Base44 para os testes.
 *
 * Guarda o que foi escrito em `registo`, para os testes poderem afirmar não só
 * o que a função devolveu mas o que ela mandou gravar — que é onde os bugs
 * desta aplicação têm aparecido.
 */
export const registo = {
  criados: [],
  atualizados: [],
  apagados: [],
  limpar() {
    this.criados = [];
    this.atualizados = [];
    this.apagados = [];
  },
};

/** Tabela em memória. `linhas` é a fonte de verdade e pode ser trocada por teste. */
export const tabela = (nome, linhas = []) => ({
  nome,
  linhas,
  list: vi.fn(async () => [...linhas]),
  filter: vi.fn(async (q) => linhas.filter((l) => Object.entries(q).every(([k, v]) => l[k] === v))),
  get: vi.fn(async (id) => linhas.find((l) => l.id === id) || null),
  create: vi.fn(async (dados) => {
    const novo = { id: `${nome}-${linhas.length + 1}`, ...dados };
    linhas.push(novo);
    registo.criados.push({ entidade: nome, dados });
    return novo;
  }),
  update: vi.fn(async (id, dados) => {
    registo.atualizados.push({ entidade: nome, id, dados });
    const i = linhas.findIndex((l) => l.id === id);
    if (i >= 0) linhas[i] = { ...linhas[i], ...dados };
    return linhas[i];
  }),
  delete: vi.fn(async (id) => {
    registo.apagados.push({ entidade: nome, id });
    const i = linhas.findIndex((l) => l.id === id);
    if (i >= 0) linhas.splice(i, 1);
  }),
  updateMany: vi.fn(async () => {}),
  deleteMany: vi.fn(async () => {}),
});

/** Cria um duplo completo. `dados` traz as linhas iniciais de cada entidade. */
export const criarBase44 = (dados = {}) => ({
  entities: {
    Ciclo: tabela("Ciclo", dados.Ciclo || []),
    Maquina: tabela("Maquina", dados.Maquina || []),
    EventoCiclo: tabela("EventoCiclo", dados.EventoCiclo || []),
    PedidoMaquina: tabela("PedidoMaquina", dados.PedidoMaquina || []),
    Mensagem: tabela("Mensagem", dados.Mensagem || []),
  },
  functions: { invoke: vi.fn(async () => ({ data: {} })) },
  integrations: { Core: {} },
});

/**
 * Instala o duplo para o ficheiro de teste atual e limpa o registo.
 * Chamar num `beforeEach` dá a cada teste dados intocados.
 */
export const instalarBase44 = (dados = {}) => {
  registo.limpar();
  globalThis.__base44 = criarBase44(dados);
  return globalThis.__base44;
};
