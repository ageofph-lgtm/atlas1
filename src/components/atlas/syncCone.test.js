import { describe, it, expect, beforeEach, vi } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import { coneDoCiclo, deveSincronizarCiclo, sincronizarConeNoWatcher } from "@/components/atlas/syncCone";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

describe("coneDoCiclo", () => {
  it("envia cor/número quando está em_execucao com cone", () => {
    expect(coneDoCiclo({ estado: "em_execucao", cone_cor: "amarelo", cone_numero: "7" }))
      .toEqual({ cone_cor: "amarelo", cone_numero: "7" });
  });

  it("envia null/null quando o ciclo está em_aluguer (fora do pátio)", () => {
    expect(coneDoCiclo({ estado: "em_aluguer", cone_cor: "amarelo", cone_numero: "7" }))
      .toEqual({ cone_cor: null, cone_numero: null });
  });

  it("envia null/null quando o ciclo está fechado", () => {
    expect(coneDoCiclo({ estado: "fechado", cone_cor: "amarelo", cone_numero: "7" }))
      .toEqual({ cone_cor: null, cone_numero: null });
  });

  it("envia null/null quando não tem número de cone", () => {
    expect(coneDoCiclo({ estado: "autorizada", cone_cor: "amarelo", cone_numero: "" }))
      .toEqual({ cone_cor: null, cone_numero: null });
  });
});

describe("deveSincronizarCiclo", () => {
  it("é verdadeiro quando o ciclo tem watcher_os_id (O.S. aberta no Watcher)", () => {
    expect(deveSincronizarCiclo({ watcher_os_id: "w1" })).toBe(true);
  });

  it("não chama o Watcher quando não há watcher_os_id", () => {
    // Sem watcher_os_id não há O.S. onde atualizar o cone — o sync_cone no
    // backend devolve skipped:'sem_os' sem fazer POST nenhum.
    expect(deveSincronizarCiclo({ watcher_os_id: null })).toBe(false);
    expect(deveSincronizarCiclo({})).toBe(false);
    expect(deveSincronizarCiclo(null)).toBe(false);
  });
});

describe("sincronizarConeNoWatcher", () => {
  it("dispara o sync_cone no backend com o ciclo_id (fire-and-forget)", () => {
    sincronizarConeNoWatcher("c1");
    expect(base44.functions.invoke).toHaveBeenCalledWith("atlasToWatcher", {
      action: "sync_cone",
      ciclo_id: "c1",
    });
  });

  it("não faz nada sem ciclo_id", () => {
    sincronizarConeNoWatcher(null);
    sincronizarConeNoWatcher("");
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });

  it("não lança quando o invoke rejeita — é silencioso", async () => {
    base44.functions.invoke.mockRejectedValueOnce(new Error("rede down"));
    expect(() => sincronizarConeNoWatcher("c1")).not.toThrow();
  });
});