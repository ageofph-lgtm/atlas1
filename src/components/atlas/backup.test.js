import { describe, it, expect } from "vitest";
import {
  BACKUP_ENTITIES, NATURAL_KEYS, entidadesDoBackup, semCamposDoSistema,
  recolherBackup, novosRegistos, ficheiroValido,
} from "@/components/atlas/backup";

const entidadeCom = (registos) => ({ list: async () => registos.map((r) => ({ ...r })) });
const clienteCom = (mapa) => ({ entities: Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, entidadeCom(v)])) });
const clienteCompleto = (porNome = {}) =>
  clienteCom(Object.fromEntries(BACKUP_ENTITIES.map((n) => [n, porNome[n] || []])));

describe("a lista de entidades", () => {
  it("só tem as que existem mesmo no modelo", () => {
    // Estas quatro foram apagadas há muito e continuavam na lista. Era o bug.
    for (const morta of ["Pedido", "OrdemServico", "FrotaACP", "Notificacao"]) {
      expect(BACKUP_ENTITIES).not.toContain(morta);
    }
    expect(BACKUP_ENTITIES).toEqual(["Maquina", "Ciclo", "EventoCiclo", "Mensagem", "PedidoMaquina"]);
  });

  it("todas têm chave natural, senão o restauro duplicava tudo", () => {
    for (const nome of BACKUP_ENTITIES) expect(typeof NATURAL_KEYS[nome]).toBe("function");
  });
});

describe("entidadesDoBackup", () => {
  it("separa o que existe do que já não existe", () => {
    const cliente = clienteCom({ Maquina: [], Ciclo: [] });
    const r = entidadesDoBackup(cliente, ["Maquina", "Ciclo", "Fantasma"]);
    expect(r.existentes).toEqual(["Maquina", "Ciclo"]);
    expect(r.emFalta).toEqual(["Fantasma"]);
  });

  it("um cliente sem entidades nenhumas não rebenta", () => {
    expect(entidadesDoBackup(null, ["Maquina"]).emFalta).toEqual(["Maquina"]);
    expect(entidadesDoBackup({}, ["Maquina"]).existentes).toEqual([]);
  });
});

describe("recolherBackup", () => {
  it("junta tudo e conta os registos", async () => {
    const cliente = clienteCompleto({
      Maquina: [{ id: "m1", serie: "NS-1" }],
      Ciclo: [{ id: "c1" }, { id: "c2" }],
    });
    const r = await recolherBackup(cliente);
    expect(r.total).toBe(3);
    expect(r.payload.app).toBe("ATLAS");
    expect(Object.keys(r.payload.entities)).toEqual(BACKUP_ENTITIES);
    expect(r.emFalta).toEqual([]);
  });

  it("uma entidade que desapareceu NÃO trava o backup das outras", async () => {
    // O comportamento antigo: `base44.entities.Pedido` era undefined, rebentava
    // logo na primeira, e não saía backup nenhum — nem das que existiam.
    const cliente = clienteCom({ Maquina: [{ id: "m1", serie: "NS-1" }], Ciclo: [{ id: "c1" }] });
    const r = await recolherBackup(cliente, { nomes: ["Maquina", "Ciclo", "Pedido", "FrotaACP"] });
    expect(r.total).toBe(2);
    expect(r.emFalta).toEqual(["Pedido", "FrotaACP"]);
  });

  it("recusa-se a devolver um backup truncado", async () => {
    // Um ficheiro que parece completo e não é só se descobre no dia em que é
    // preciso — o pior dia possível para o descobrir.
    const muitos = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}` }));
    const cliente = clienteCompleto({ Ciclo: muitos });
    await expect(recolherBackup(cliente, { maximo: 10 })).rejects.toThrow(/incompleto/i);
  });

  it("o erro diz qual entidade estourou, para se poder agir", async () => {
    const muitos = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}` }));
    const cliente = clienteCompleto({ Ciclo: muitos });
    await expect(recolherBackup(cliente, { maximo: 10 })).rejects.toThrow(/Ciclo/);
  });

  it("um parque vazio dá um backup vazio, não um erro", async () => {
    const r = await recolherBackup(clienteCompleto());
    expect(r.total).toBe(0);
    expect(r.payload.entities.Maquina).toEqual([]);
  });
});

describe("semCamposDoSistema", () => {
  it("tira os campos que o Base44 gera sozinho", () => {
    const r = semCamposDoSistema({
      id: "1", created_date: "x", updated_date: "y", created_by_id: "z", serie: "NS-1",
    });
    expect(r).toEqual({ serie: "NS-1" });
  });

  it("não mexe no registo original", () => {
    const original = { id: "1", serie: "NS-1" };
    semCamposDoSistema(original);
    expect(original.id).toBe("1");
  });
});

describe("novosRegistos", () => {
  it("ignora o que já existe, pela chave natural", () => {
    const ficheiro = [{ serie: "NS-1" }, { serie: "NS-2" }];
    const app = [{ serie: "NS-1" }];
    expect(novosRegistos(ficheiro, app, "Maquina")).toEqual([{ serie: "NS-2" }]);
  });

  it("um registo sem chave passa — mais vale um duplicado do que uma perda", () => {
    expect(novosRegistos([{ serie: null }], [], "Maquina")).toHaveLength(1);
  });

  it("uma entidade sem chave conhecida importa tudo, sem rebentar", () => {
    expect(novosRegistos([{ a: 1 }], [], "Desconhecida")).toEqual([{ a: 1 }]);
  });

  it("limpa os campos do sistema do que vai importar", () => {
    expect(novosRegistos([{ id: "velho", serie: "NS-9" }], [], "Maquina")).toEqual([{ serie: "NS-9" }]);
  });
});

describe("ficheiroValido", () => {
  it("aceita um backup com entidades", () => {
    expect(ficheiroValido({ entities: {} })).toBe(true);
  });

  it("recusa tudo o resto", () => {
    for (const mau of [null, undefined, "texto", 42, {}, { entities: null }, { entities: "x" }, []]) {
      expect(ficheiroValido(mau), JSON.stringify(mau)).toBe(false);
    }
  });
});
