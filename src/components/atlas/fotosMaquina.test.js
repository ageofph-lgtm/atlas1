import { describe, it, expect } from "vitest";
import {
  MAX_FOTOS, fotosDe, podeAdicionar, lugaresLivres, juntarFotos, removerFoto, podeGerirFotos,
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
