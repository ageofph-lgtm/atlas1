import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import { marcarPedidosNaOS, textoTarefaDoPedido, PEDIDO_ESTADOS_POR_FAZER } from "@/components/atlas/pedidosOS";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

describe("textoTarefaDoPedido", () => {
  it("leva o nome de quem pediu — na oficina, saber a quem perguntar vale mais que a descrição", () => {
    expect(textoTarefaDoPedido({ texto: "Bluespot frontal", comercial: "Ana Silva" }))
      .toBe("Bluespot frontal (Ana Silva)");
  });

  it("sem comercial fica só o texto", () => {
    expect(textoTarefaDoPedido({ texto: "Sideshift" })).toBe("Sideshift");
    expect(textoTarefaDoPedido(null)).toBe("");
  });
});

describe("PEDIDO_ESTADOS_POR_FAZER", () => {
  it("só os pedidos por fazer podem ir para a O.S.", () => {
    expect(PEDIDO_ESTADOS_POR_FAZER).toContain("aberto");
    expect(PEDIDO_ESTADOS_POR_FAZER).toContain("em_execucao");
    expect(PEDIDO_ESTADOS_POR_FAZER).not.toContain("concluido");
    expect(PEDIDO_ESTADOS_POR_FAZER).not.toContain("cancelado");
  });
});

describe("marcarPedidosNaOS", () => {
  const pedidos = [
    { id: "p1", texto: "Bluespot", serie: "NS-1", ciclo_id: "c1", comercial_user_id: "u-ana" },
    { id: "p2", texto: "Sideshift", serie: "NS-1", ciclo_id: "c1", comercial_user_id: "u-rui" },
  ];

  it("põe os pedidos em curso e diz em que O.S. entraram", async () => {
    const n = await marcarPedidosNaOS(pedidos, { autor: "Gestor", osId: "OS-42" });

    expect(n).toBe(2);
    const atualizados = registo.atualizados.filter((u) => u.entidade === "PedidoMaquina");
    expect(atualizados).toHaveLength(2);
    expect(atualizados.every((u) => u.dados.estado === "em_execucao")).toBe(true);
    expect(atualizados[0].dados.resposta).toContain("OS-42");
    expect(atualizados[0].dados.respondido_por).toBe("Gestor");
  });

  it("avisa cada comercial no seu próprio endereço", async () => {
    await marcarPedidosNaOS(pedidos, { autor: "Gestor", osId: "OS-42" });

    const msgs = registo.criados.filter((c) => c.entidade === "Mensagem");
    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.dados.destino_user_id).sort()).toEqual(["u-ana", "u-rui"]);
  });

  it("sem O.S. ainda assim explica o que aconteceu ao pedido", async () => {
    await marcarPedidosNaOS([pedidos[0]], { autor: "Gestor" });
    const u = registo.atualizados.find((x) => x.entidade === "PedidoMaquina");
    expect(u.dados.resposta).toContain("oficina");
  });

  it("lista vazia não faz nem grava nada", async () => {
    expect(await marcarPedidosNaOS([], { autor: "X" })).toBe(0);
    expect(await marcarPedidosNaOS(undefined, { autor: "X" })).toBe(0);
    expect(registo.atualizados).toHaveLength(0);
    expect(registo.criados).toHaveLength(0);
  });

  it("não anuncia ao comercial algo que não chegou a ser gravado", async () => {
    base44.entities.PedidoMaquina.update.mockRejectedValueOnce(new Error("sem permissão"));

    const n = await marcarPedidosNaOS([pedidos[0]], { autor: "X", osId: "OS-1" });

    expect(n).toBe(0);
    expect(registo.criados.filter((c) => c.entidade === "Mensagem")).toHaveLength(0);
  });

  it("uma falha a meio não impede os restantes de seguir", async () => {
    base44.entities.PedidoMaquina.update.mockRejectedValueOnce(new Error("falhou"));

    const n = await marcarPedidosNaOS(pedidos, { autor: "X", osId: "OS-1" });

    expect(n).toBe(1);
    expect(registo.criados.filter((c) => c.entidade === "Mensagem")).toHaveLength(1);
  });
});
