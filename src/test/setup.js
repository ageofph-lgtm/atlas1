import { vi } from "vitest";

/**
 * O cliente Base44 é substituído por um duplo em todos os testes.
 *
 * A leitura é indireta — `globalThis.__base44` — para cada ficheiro de teste
 * poder instalar o seu duplo, com os seus dados, sem que a substituição tenha
 * de ser repetida em todos eles.
 */
vi.mock("@/api/base44Client", () => ({
  get base44() {
    if (!globalThis.__base44) {
      throw new Error("Nenhum duplo instalado: chame instalarBase44() no início do teste.");
    }
    return globalThis.__base44;
  },
}));
