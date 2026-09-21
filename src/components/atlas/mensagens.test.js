import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import {
  AUDIENCIAS,
  audienciasDoPerfil,
  podeUsarMensagens,
  enviarMensagem,
  comerciaisInteressados,
} from "@/components/atlas/mensagens";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

describe("audiências", () => {
  it("a gestão é o gestor de frota mais o administrador — não é um perfil só", () => {
    expect(audienciasDoPerfil("gestor_frota")).toEqual([AUDIENCIAS.GESTAO]);
    expect(audienciasDoPerfil("administrador")).toContain(AUDIENCIAS.GESTAO);
  });

  it("o administrador vê também o que é da logística", () => {
    expect(audienciasDoPerfil("administrador")).toContain(AUDIENCIAS.LOGISTICA);
  });

  it("a logística e os comerciais ficam cada um na sua", () => {
    expect(audienciasDoPerfil("logistica")).toEqual([AUDIENCIAS.LOGISTICA]);
    expect(audienciasDoPerfil("comercial")).toEqual([AUDIENCIAS.COMERCIAL]);
  });

  it("um visitante ou um perfil desconhecido não tem caixa", () => {
    expect(audienciasDoPerfil("visitante")).toEqual([]);
    expect(audienciasDoPerfil(undefined)).toEqual([]);
    expect(podeUsarMensagens("visitante")).toBe(false);
    expect(podeUsarMensagens("logistica")).toBe(true);
  });
});

describe("enviarMensagem", () => {
  it("grava a mensagem por ler", async () => {
    await enviarMensagem({ titulo: "Entrada — NS-1", destino: AUDIENCIAS.GESTAO, serie: "NS-1" });
    const m = registo.criados.find((c) => c.entidade === "Mensagem");
    expect(m.dados.titulo).toBe("Entrada — NS-1");
    expect(m.dados.lida_por).toEqual([]);
  });

  it("sem título não grava nada — não há mensagem para mostrar", async () => {
    expect(await enviarMensagem({ corpo: "só corpo" })).toBe(null);
    expect(registo.criados).toHaveLength(0);
  });

  it("falha em silêncio: uma notificação que não saiu não pode derrubar o registo", async () => {
    base44.entities.Mensagem.create.mockRejectedValueOnce(new Error("sem rede"));
    await expect(enviarMensagem({ titulo: "X" })).resolves.toBe(null);
  });
});

describe("comerciaisInteressados", () => {
  it("junta quem reservou a quem fez pedidos, sem repetir", async () => {
    base44.entities.PedidoMaquina.linhas.push(
      { id: "p1", ciclo_id: "c1", comercial_user_id: "u-ana" },
      { id: "p2", ciclo_id: "c1", comercial_user_id: "u-rui" },
      { id: "p3", ciclo_id: "c1", comercial_user_id: "u-ana" },
    );

    const ids = await comerciaisInteressados({ id: "c1", reserva_comercial_id: "u-ana" });

    expect(ids.sort()).toEqual(["u-ana", "u-rui"]);
  });

  it("sem pedidos legíveis, a reserva sozinha continua a valer", async () => {
    base44.entities.PedidoMaquina.filter.mockRejectedValueOnce(new Error("sem acesso"));
    expect(await comerciaisInteressados({ id: "c1", reserva_comercial_id: "u-ana" })).toEqual(["u-ana"]);
  });

  it("sem ninguém interessado devolve lista vazia", async () => {
    expect(await comerciaisInteressados({ id: "c1" })).toEqual([]);
    expect(await comerciaisInteressados(null)).toEqual([]);
  });
});
