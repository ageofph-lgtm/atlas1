import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44 } from "@/test/base44Duplo";
import { procurarMaquina } from "@/components/atlas/procurarMaquina";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

const maquina = (extra) => ({
  id: "m1", serie: "NS-1", modelo: "RX 60-25", ano: "2020",
  mastro: "triplex", acessorios: ["sideshift"], observacoes: "Chegou riscada", ...extra,
});

describe("série desconhecida", () => {
  it("devolve tudo vazio, sem inventar nada", async () => {
    const r = await procurarMaquina("NS-INEXISTENTE");
    expect(r.maquina).toBe(null);
    expect(r.passagens).toBe(0);
    expect(r.ultimaSaida).toBe(null);
    expect(r.cicloNoPatio).toBe(null);
    expect(r.cicloFora).toBe(null);
    expect(r.notas).toBe("");
    expect(r.specs.acessorios).toEqual([]);
  });

  it("nem sequer vai buscar ciclos quando a máquina não existe", async () => {
    await procurarMaquina("NS-INEXISTENTE");
    expect(base44.entities.Ciclo.filter).not.toHaveBeenCalled();
  });
});

describe("série conhecida", () => {
  it("traz as características para o formulário não ter de ser preenchido outra vez", async () => {
    base44.entities.Maquina.linhas.push(maquina());
    const r = await procurarMaquina("NS-1");
    expect(r.maquina.id).toBe("m1");
    expect(r.specs.mastro).toBe("triplex");
    expect(r.specs.acessorios).toEqual(["sideshift"]);
    expect(r.notas).toBe("Chegou riscada");
  });

  it("conta todas as passagens, incluindo os ciclos fechados", async () => {
    base44.entities.Maquina.linhas.push(maquina());
    base44.entities.Ciclo.linhas.push(
      { id: "c1", serie: "NS-1", estado: "fechado", data_saida: "2026-01-10T00:00:00Z" },
      { id: "c2", serie: "NS-1", estado: "fechado", data_saida: "2026-05-20T00:00:00Z" },
    );
    const r = await procurarMaquina("NS-1");
    expect(r.passagens).toBe(2);
  });

  it("dá a saída mais recente, não a primeira que encontrar", async () => {
    base44.entities.Maquina.linhas.push(maquina());
    base44.entities.Ciclo.linhas.push(
      { id: "c1", serie: "NS-1", estado: "fechado", data_saida: "2026-01-10T00:00:00Z" },
      { id: "c2", serie: "NS-1", estado: "fechado", data_saida: "2026-05-20T00:00:00Z" },
    );
    const r = await procurarMaquina("NS-1");
    expect(r.ultimaSaida).toBe("2026-05-20T00:00:00Z");
  });

  it("assinala a máquina que ainda está no pátio", async () => {
    base44.entities.Maquina.linhas.push(maquina());
    base44.entities.Ciclo.linhas.push({ id: "c1", serie: "NS-1", estado: "pronta", data_entrada: "2026-09-01T00:00:00Z" });
    const r = await procurarMaquina("NS-1");
    expect(r.cicloNoPatio.id).toBe("c1");
    expect(r.cicloFora).toBe(null);
  });

  it("assinala a máquina que está em aluguer — é a que pede reentrada", async () => {
    base44.entities.Maquina.linhas.push(maquina());
    base44.entities.Ciclo.linhas.push({ id: "c1", serie: "NS-1", estado: "em_aluguer", data_saida: "2026-09-01T00:00:00Z" });
    const r = await procurarMaquina("NS-1");
    expect(r.cicloFora.id).toBe("c1");
    expect(r.cicloNoPatio).toBe(null);
  });

  it("uma máquina sem características não traz lixo", async () => {
    base44.entities.Maquina.linhas.push({ id: "m1", serie: "NS-1" });
    const r = await procurarMaquina("NS-1");
    expect(r.specs).toEqual({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "" });
    expect(r.notas).toBe("");
  });
});
