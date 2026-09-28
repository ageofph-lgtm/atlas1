import { describe, it, expect } from "vitest";
import {
  MAX_FOTOS, fotosDe, podeAdicionar, lugaresLivres, juntarFotos, removerFoto, podeGerirFotos,
  subirFotos, avisoDeFotos,
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
