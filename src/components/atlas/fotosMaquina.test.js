import { describe, it, expect } from "vitest";
import {
  MAX_FOTOS, fotosDe, podeAdicionar, lugaresLivres, juntarFotos, removerFoto, podeGerirFotos,
  subirFotos, avisoDeFotos, rodarFotos, camposDoMovimento, fotosAnterioresDe, miniaturaDe, podarMiniaturas, descreverConjunto,
  camposDaSubstituicao, conjuntoAtual,
} from "@/components/atlas/fotosMaquina";

const u = (n) => `https://s.co/${n}.jpg`;

describe("fotosDe", () => {
  it("devolve as fotos de uma máquina", () => {
    expect(fotosDe({ fotos: [u(1), u(2)] })).toEqual([u(1), u(2)]);
  });

  it("uma máquina sem fotos dá lista vazia, não rebenta", () => {
    for (const m of [{}, null, undefined, { fotos: null }, { fotos: "não é lista" }]) {
      expect(fotosDe(m)).toEqual([]);
    }
  });

  it("ignora o que não é endereço", () => {
    expect(fotosDe({ fotos: [u(1), "", null, "ficheiro.jpg", 42] })).toEqual([u(1)]);
  });

  it("não repete o mesmo endereço", () => {
    expect(fotosDe({ fotos: [u(1), u(1), u(2)] })).toEqual([u(1), u(2)]);
  });

  it("nunca devolve mais do que o limite, mesmo que estejam gravadas mais", () => {
    // Defesa contra dados escritos por outra via: o ecrã não pode crescer
    // porque alguém meteu dez fotos no registo pela API.
    expect(fotosDe({ fotos: [u(1), u(2), u(3), u(4), u(5), u(6)] })).toHaveLength(MAX_FOTOS);
  });
});

describe("quantas cabem", () => {
  it("conta os lugares livres", () => {
    expect(lugaresLivres({})).toBe(4);
    expect(lugaresLivres({ fotos: [u(1), u(2)] })).toBe(2);
    expect(lugaresLivres({ fotos: [u(1), u(2), u(3), u(4)] })).toBe(0);
  });

  it("com quatro já não se pode adicionar", () => {
    expect(podeAdicionar({ fotos: [u(1), u(2), u(3)] })).toBe(true);
    expect(podeAdicionar({ fotos: [u(1), u(2), u(3), u(4)] })).toBe(false);
  });
});

describe("juntarFotos", () => {
  it("acrescenta às que já existem", () => {
    expect(juntarFotos({ fotos: [u(1)] }, [u(2)]).fotos).toEqual([u(1), u(2)]);
  });

  it("para no limite e diz quantas recusou", () => {
    // Quem escolhe seis de uma vez tem de saber que só entraram as que cabiam.
    const r = juntarFotos({ fotos: [u(1), u(2)] }, [u(3), u(4), u(5), u(6)]);
    expect(r.fotos).toHaveLength(4);
    expect(r.recusadas).toBe(2);
  });

  it("não repete uma foto que já lá está", () => {
    const r = juntarFotos({ fotos: [u(1)] }, [u(1), u(2)]);
    expect(r.fotos).toEqual([u(1), u(2)]);
    expect(r.recusadas).toBe(0);
  });

  it("com a máquina cheia recusa tudo", () => {
    const r = juntarFotos({ fotos: [u(1), u(2), u(3), u(4)] }, [u(5)]);
    expect(r.fotos).toHaveLength(4);
    expect(r.recusadas).toBe(1);
  });

  it("nada para juntar deixa tudo como estava", () => {
    expect(juntarFotos({ fotos: [u(1)] }, [])).toEqual({ fotos: [u(1)], recusadas: 0 });
    expect(juntarFotos({}, []).fotos).toEqual([]);
  });
});

describe("removerFoto", () => {
  it("tira a foto indicada e deixa as outras pela mesma ordem", () => {
    expect(removerFoto({ fotos: [u(1), u(2), u(3)] }, u(2))).toEqual([u(1), u(3)]);
  });

  it("um endereço que não está lá deixa tudo como estava", () => {
    expect(removerFoto({ fotos: [u(1)] }, u(9))).toEqual([u(1)]);
  });
});

describe("podeGerirFotos", () => {
  it("a logística e o administrador tiram fotos; mais ninguém", () => {
    expect(podeGerirFotos("logistica")).toBe(true);
    expect(podeGerirFotos("administrador")).toBe(true);
    for (const p of ["comercial", "gestor_frota", "visitante", null, undefined, ""]) {
      expect(podeGerirFotos(p), String(p)).toBe(false);
    }
  });
});

describe("subirFotos", () => {
  const comprimir = async (f) => ({ ...f, comprimido: true });
  const upload = async (f) => ({ file_url: `https://s.co/${f.name}` });
  const f = (nome) => ({ name: nome });

  it("comprime antes de subir — uma foto de telemóvel tem megabytes a mais", async () => {
    const vistos = [];
    await subirFotos([f("a.jpg")], { comprimir: async (x) => { vistos.push(x.name); return x; }, upload });
    expect(vistos).toEqual(["a.jpg"]);
  });

  it("devolve os endereços pela ordem em que foram escolhidas", async () => {
    const r = await subirFotos([f("a.jpg"), f("b.jpg")], { comprimir, upload });
    expect(r.urls).toEqual(["https://s.co/a.jpg", "https://s.co/b.jpg"]);
    expect(r.recusadas).toBe(0);
  });

  it("sobe só as que cabem, contando as que a máquina já tem", async () => {
    // Subir seis para descartar duas gastaria os dados de quem está no pátio.
    const r = await subirFotos([f("a"), f("b"), f("c")], { jaTem: 2, comprimir, upload });
    expect(r.urls).toHaveLength(2);
    expect(r.recusadas).toBe(1);
  });

  it("com a máquina cheia não sobe nada", async () => {
    let subiu = 0;
    await subirFotos([f("a")], { jaTem: MAX_FOTOS, comprimir, upload: async () => { subiu += 1; return {}; } });
    expect(subiu).toBe(0);
  });

  it("uma que falhe não trava as outras, e é contada", async () => {
    const upload2 = async (x) => { if (x.name === "mau") throw new Error("413"); return { file_url: `https://s.co/${x.name}` }; };
    const r = await subirFotos([f("a"), f("mau"), f("c")], { comprimir, upload: upload2 });
    expect(r.urls).toEqual(["https://s.co/a", "https://s.co/c"]);
    expect(r.falhadas).toEqual(["mau"]);
  });

  it("uma subida sem endereço conta como falha, não como foto", async () => {
    const r = await subirFotos([f("a")], { comprimir, upload: async () => ({}) });
    expect(r.urls).toEqual([]);
    expect(r.falhadas).toEqual(["a"]);
  });

  it("sem ficheiros não faz nada", async () => {
    expect(await subirFotos([], { comprimir, upload })).toMatchObject({ urls: [], recusadas: 0 });
    expect(await subirFotos(undefined, { comprimir, upload })).toMatchObject({ urls: [] });
  });
});

describe("avisoDeFotos", () => {
  it("cala-se quando entrou tudo", () => {
    expect(avisoDeFotos({ recusadas: 0, falhadas: [] })).toBe(null);
    expect(avisoDeFotos()).toBe(null);
  });

  it("diz quantas não couberam, com a concordância certa", () => {
    expect(avisoDeFotos({ recusadas: 1 })).toContain("1 não coube");
    expect(avisoDeFotos({ recusadas: 3 })).toContain("3 não couberam");
  });

  it("diz quantas não subiram", () => {
    expect(avisoDeFotos({ falhadas: ["a"] })).toContain("1 não subiu");
    expect(avisoDeFotos({ falhadas: ["a", "b"] })).toContain("2 não subiram");
  });

  it("junta os dois motivos quando ambos acontecem", () => {
    const aviso = avisoDeFotos({ recusadas: 1, falhadas: ["a"] });
    expect(aviso).toMatch(/não coube.*não subiu/);
    expect(aviso.endsWith(".")).toBe(true);
  });
});


describe("rodarFotos — as atuais no cartão, as anteriores guardadas", () => {
  const D1 = "2026-09-02T09:00:00.000Z";
  const D2 = "2026-09-30T15:00:00.000Z";

  it("a primeira vez, as fotos novas entram no cartão e não há anteriores", () => {
    expect(rodarFotos({}, [u(1), u(2)], { momento: "entrada", agora: D1 }))
      .toEqual({ fotos: [u(1), u(2)], fotos_momento: "entrada", fotos_data: D1 });
  });

  it("à saída, as da chegada passam a anteriores — dá para comparar como saiu com como voltou", () => {
    const maquina = { fotos: [u(1), u(2)], fotos_momento: "entrada", fotos_data: D1 };
    expect(rodarFotos(maquina, [u(3), u(4), u(5)], { momento: "saida", agora: D2 })).toEqual({
      fotos: [u(3), u(4), u(5)], fotos_momento: "saida", fotos_data: D2,
      fotos_anteriores: [u(1), u(2)], fotos_anteriores_momento: "entrada", fotos_anteriores_data: D1,
    });
  });

  it("na volta seguinte guarda-se só o último conjunto: o mais antigo sai", () => {
    let m = {};
    m = { ...m, ...rodarFotos(m, [u(1)], { momento: "entrada", agora: "d1" }) };
    m = { ...m, ...rodarFotos(m, [u(2)], { momento: "saida", agora: "d2" }) };
    m = { ...m, ...rodarFotos(m, [u(3)], { momento: "entrada", agora: "d3" }) };
    expect(fotosDe(m)).toEqual([u(3)]);
    expect(fotosAnterioresDe(m)).toEqual([u(2)]);
    expect(m.fotos_anteriores_momento).toBe("saida");
    expect(JSON.stringify(m)).not.toContain(u(1));
  });

  it("um movimento sem fotos novas não roda nada", () => {
    // Senão uma saída sem fotografias apagava as da chegada.
    expect(rodarFotos({ fotos: [u(1)] }, [], { momento: "saida" })).toEqual({});
    expect(rodarFotos({ fotos: [u(1)] }, ["", null], { momento: "saida" })).toEqual({});
  });

  it("com o cartão vazio, o arquivo que existia fica", () => {
    const r = rodarFotos({ fotos: [], fotos_anteriores: [u(9)] }, [u(1)], { momento: "entrada" });
    expect(r.fotos).toEqual([u(1)]);
    expect(r).not.toHaveProperty("fotos_anteriores");
  });

  it("no máximo quatro novas, sem repetições", () => {
    expect(rodarFotos({}, [u(1), u(1), u(2), u(3), u(4), u(5)], { momento: "saida" }).fotos).toEqual([u(1), u(2), u(3), u(4)]);
  });

  it("fotos de antes da rotação (sem momento) passam a anteriores sem rótulo", () => {
    const r = rodarFotos({ fotos: [u(1)] }, [u(2)], { momento: "entrada", agora: D2 });
    expect(r).toMatchObject({ fotos_anteriores: [u(1)], fotos_anteriores_momento: null, fotos_anteriores_data: null });
  });
});

describe("miniaturas", () => {
  it("usa a miniatura quando existe, senão a própria foto", () => {
    const m = { miniaturas: { [u(1)]: u("1-mini") } };
    expect(miniaturaDe(m, u(1))).toBe(u("1-mini"));
    expect(miniaturaDe(m, u(2))).toBe(u(2));
    expect(miniaturaDe(null, u(3))).toBe(u(3));
  });

  it("ficam só as das fotos que a máquina ainda mostra", () => {
    const mapa = { [u(1)]: u("m1"), [u(2)]: u("m2"), [u(3)]: "lixo" };
    expect(podarMiniaturas(mapa, [u(1), u(3)])).toEqual({ [u(1)]: u("m1") });
    expect(podarMiniaturas(null, [u(1)])).toEqual({});
  });
});

describe("descreverConjunto", () => {
  it("diz de que movimento e de que dia são as fotos", () => {
    expect(descreverConjunto("entrada", "2026-09-30T15:00:00")).toBe("Chegada · 30/09");
    expect(descreverConjunto("saida", "2026-09-02T09:00:00")).toBe("Saída · 02/09");
  });

  it("sem saber nada, não inventa", () => {
    expect(descreverConjunto(null, null)).toBe(null);
    expect(descreverConjunto(undefined, "não é data")).toBe(null);
  });
});

describe("subirFotos com miniaturas", () => {
  const ficheiros = (n) => Array.from({ length: n }, (_, i) => ({ name: `f${i}.jpg`, i }));
  let contador = 0;
  const upload = async (f) => ({ file_url: `https://s.co/${f.tipo}-${f.i}-${contador++}.jpg` });

  it("sobe a foto e a miniatura, e diz qual é de qual", async () => {
    const r = await subirFotos(ficheiros(2), {
      comprimir: async (f) => ({ ...f, tipo: "foto" }),
      miniatura: async (f) => ({ ...f, tipo: "mini" }),
      upload,
    });
    expect(r.urls).toHaveLength(2);
    expect(Object.keys(r.miniaturas)).toEqual(r.urls);
    expect(Object.values(r.miniaturas).every((m) => m.includes("/mini-"))).toBe(true);
  });

  it("se a miniatura falhar, a foto entra na mesma", async () => {
    const r = await subirFotos(ficheiros(1), {
      comprimir: async (f) => ({ ...f, tipo: "foto" }),
      miniatura: async () => { throw new Error("canvas"); },
      upload,
    });
    expect(r.urls).toHaveLength(1);
    expect(r.falhadas).toEqual([]);
    expect(r.miniaturas).toEqual({});
  });
});

describe("camposDoMovimento — o que a entrada, a saída e o retorno gravam", () => {
  it("roda e leva só as miniaturas das fotos que ficam", () => {
    const maquina = { fotos: [u(1)], fotos_anteriores: [u(0)], miniaturas: { [u(0)]: u("m0"), [u(1)]: u("m1") } };
    const r = camposDoMovimento(maquina, [u(2)], { [u(2)]: u("m2") }, { momento: "saida", agora: "d" });
    expect(r.fotos).toEqual([u(2)]);
    expect(r.fotos_anteriores).toEqual([u(1)]);
    // u(0) saiu do arquivo: a miniatura dela também sai.
    expect(r.miniaturas).toEqual({ [u(1)]: u("m1"), [u(2)]: u("m2") });
  });

  it("repetir uma saída que falhou a meio, com as mesmas fotos, não roda outra vez", () => {
    // Se rodasse, as fotos novas iam para o arquivo e as anteriores verdadeiras perdiam-se.
    const depois = { fotos: [u(2)], fotos_anteriores: [u(1)] };
    expect(camposDoMovimento(depois, [u(2)], {}, { momento: "saida" })).toEqual({});
  });

  it("sem fotos novas não grava nada", () => {
    expect(camposDoMovimento({ fotos: [u(1)] }, [], {}, { momento: "entrada" })).toEqual({});
    expect(camposDoMovimento(null, [], {}, {})).toEqual({});
  });
});

describe("camposDaSubstituicao — substituir à mão, no cartão", () => {
  const u = (n) => `https://x.app/f${n}.jpg`;
  const cheia = {
    fotos: [u(1), u(2), u(3), u(4)], fotos_momento: "saida", fotos_data: "2026-10-02T09:44:58Z",
    fotos_anteriores: [u(9)], fotos_anteriores_momento: "entrada", fotos_anteriores_data: "2026-09-14T10:00:00Z",
    miniaturas: { [u(1)]: u("1m"), [u(9)]: u("9m") },
  };

  it("um cartão cheio recebe fotos novas sem apagar nada à mão: as atuais passam a anteriores", () => {
    const c = camposDaSubstituicao(cheia, [u(5), u(6)], { [u(5)]: u("5m") }, { agora: "2026-10-07T11:00:00Z" });
    expect(c.fotos).toEqual([u(5), u(6)]);
    expect(c.fotos_momento).toBe("atualizacao");
    expect(c.fotos_data).toBe("2026-10-07T11:00:00Z");
    expect(c.fotos_anteriores).toEqual([u(1), u(2), u(3), u(4)]);
    expect(c.fotos_anteriores_momento).toBe("saida");
    // A miniatura de uma foto que saiu do arquivo também sai.
    expect(c.miniaturas).toEqual({ [u(5)]: u("5m"), [u(1)]: u("1m") });
  });

  it("sem fotos novas não mexe em nada", () => {
    expect(camposDaSubstituicao(cheia, [])).toEqual({});
  });

  it("o conjunto fica descrito como atualização", () => {
    expect(descreverConjunto("atualizacao", "2026-10-07T11:00:00")).toBe("Atualização · 07/10");
  });
});

describe("conjuntoAtual — o que um movimento vai substituir", () => {
  it("as fotos do cartão, com as miniaturas e de quando são", () => {
    const m = { fotos: ["https://x.app/a.jpg", "lixo"], miniaturas: { "https://x.app/a.jpg": "https://x.app/am.jpg" }, fotos_momento: "saida", fotos_data: "2026-10-02T09:44:58" };
    expect(conjuntoAtual(m)).toEqual({
      fotos: ["https://x.app/a.jpg"],
      miniaturas: { "https://x.app/a.jpg": "https://x.app/am.jpg" },
      rotulo: "Saída · 02/10",
    });
  });

  it("máquina nova: nada a substituir", () => {
    expect(conjuntoAtual(null)).toEqual({ fotos: [], miniaturas: {}, rotulo: null });
  });
});
