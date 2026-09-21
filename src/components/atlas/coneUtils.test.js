import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44 } from "@/test/base44Duplo";
import { validateConeNumber } from "@/components/atlas/coneUtils";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

const noPatio = (extra) => ({ id: "x", serie: "NS-OCUPA", cone_cor: "amarelo", cone_numero: "7", estado: "pronta", ...extra });

describe("validateConeNumber", () => {
  it("recusa um cone que outra máquina no pátio já tem, e diz qual", async () => {
    base44.entities.Ciclo.linhas.push(noPatio());
    const r = await validateConeNumber("str", "7");
    expect(r.free).toBe(false);
    expect(r.conflito.serie).toBe("NS-OCUPA");
  });

  it("liberta o cone quando a máquina sai para aluguer ou o ciclo fecha", async () => {
    base44.entities.Ciclo.linhas.push(noPatio({ estado: "em_aluguer" }));
    expect((await validateConeNumber("str", "7")).free).toBe(true);

    base44.entities.Ciclo.linhas[0].estado = "fechado";
    expect((await validateConeNumber("str", "7")).free).toBe(true);
  });

  it("não entra em conflito com o próprio ciclo ao editá-lo", async () => {
    base44.entities.Ciclo.linhas.push(noPatio({ id: "eu" }));
    expect((await validateConeNumber("str", "7", "eu")).free).toBe(true);
  });

  it("compara como texto — 7 e '7' são o mesmo cone", async () => {
    base44.entities.Ciclo.linhas.push(noPatio({ cone_numero: 7 }));
    expect((await validateConeNumber("str", "7")).free).toBe(false);
  });

  it("categorias sem cone passam sempre", async () => {
    base44.entities.Ciclo.linhas.push(noPatio());
    expect((await validateConeNumber("sucata", "7")).free).toBe(true);
    expect((await validateConeNumber("str", "")).free).toBe(true);
  });

  it("o mesmo número em cores diferentes não colide", async () => {
    base44.entities.Ciclo.linhas.push(noPatio({ cone_cor: "verde" }));
    // str usa amarelo; o verde ocupado não lhe diz respeito.
    expect((await validateConeNumber("str", "7")).free).toBe(true);
  });
});
