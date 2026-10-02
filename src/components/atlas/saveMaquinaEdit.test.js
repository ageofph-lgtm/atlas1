import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import { saveMaquinaEdit } from "@/components/atlas/saveMaquinaEdit";
import { planearCorrecao } from "@/components/atlas/corrigirSaida";

const maquina = { id: "m1", serie: "NS-1", modelo: "RX 20-16" };
const emAluguer = { id: "c1", maquina_id: "m1", serie: "NS-1", estado: "em_aluguer", tipo_saida: "alugada", data_saida: "2026-10-02T09:36:00Z" };

const eventos = () => registo.criados.filter((c) => c.entidade === "EventoCiclo").map((c) => c.dados);

beforeEach(() => {
  instalarBase44({ Maquina: [{ ...maquina }], Ciclo: [{ ...emAluguer }] });
});

describe("saveMaquinaEdit — tipo de saída", () => {
  it("passar a venda no modal fecha o aluguer e a história diz que foi uma correção", async () => {
    const { atualizar } = planearCorrecao(emAluguer, [], "vendida");
    await saveMaquinaEdit({ maquina, ciclo: emAluguer, specs: {}, cicloUpdates: atualizar, autor: "Admin" });

    expect(registo.atualizados.find((u) => u.entidade === "Ciclo").dados).toMatchObject({ tipo_saida: "vendida", estado: "fechado" });
    expect(eventos()).toEqual([
      expect.objectContaining({ de_estado: "em_aluguer", para_estado: "fechado", nota: "Saída corrigida: aluguer → venda" }),
    ]);
  });

  it("uma mudança de estado sem mexer no tipo continua a ser uma alteração manual", async () => {
    await saveMaquinaEdit({ maquina, ciclo: emAluguer, specs: {}, cicloUpdates: { estado: "retorno" }, autor: "Admin" });
    expect(eventos()[0].nota).toBe("Estado alterado manualmente");
  });
});
