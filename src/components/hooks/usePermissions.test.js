import { describe, it, expect } from "vitest";
import { canEditMaquinaRecord, podeEditarCategoria, podeEditarEstado } from "@/components/hooks/usePermissions";
import { podeGerirEstadoOficina } from "@/components/atlas/cicloUtils";

const u = (perfil) => ({ id: "u1", perfil });
const ciclo = (estado, categoria = "str") => ({ id: "c1", estado, categoria });

describe("quem abre a ficha de uma máquina", () => {
  it("gestão, logística e administração editam", () => {
    for (const p of ["administrador", "gestor_frota", "logistica"]) {
      expect(canEditMaquinaRecord(u(p)), p).toBe(true);
    }
  });

  it("comercial e visitante não editam", () => {
    for (const p of ["comercial", "visitante"]) {
      expect(canEditMaquinaRecord(u(p)), p).toBe(false);
    }
  });

  it("sem utilizador não edita", () => {
    expect(canEditMaquinaRecord(null)).toBe(false);
    expect(canEditMaquinaRecord({})).toBe(false);
  });

  it("a logística edita qualquer máquina, não só as que registou", () => {
    // A regra antiga prendia-a a `created_by_id === user.id`. Quem regista a
    // máquina raramente é quem lhe mexe depois, e os registos das sessões
    // anónimas de antes não pertencem a ninguém que hoje entre na aplicação.
    expect(canEditMaquinaRecord(u("logistica"))).toBe(true);
  });
});

describe("categoria", () => {
  it("quem edita a ficha edita a categoria — a logística já a escolhe no registo", () => {
    for (const p of ["administrador", "gestor_frota", "logistica"]) {
      expect(podeEditarCategoria(u(p)), p).toBe(true);
    }
    for (const p of ["comercial", "visitante", null]) {
      expect(podeEditarCategoria(p ? u(p) : null), String(p)).toBe(false);
    }
  });
});

describe("estado", () => {
  const podeEditar = (perfil, c) => podeEditarEstado(u(perfil), c, podeGerirEstadoOficina);

  it("o administrador mexe em qualquer estado, porque corrige registos", () => {
    for (const e of ["entrada", "classificada", "autorizada", "em_execucao", "pronta", "em_aluguer", "retorno", "fechado"]) {
      expect(podeEditar("administrador", ciclo(e)), e).toBe(true);
    }
  });

  it("gestão e logística mexem dentro do circuito da oficina", () => {
    for (const perfil of ["gestor_frota", "logistica"]) {
      for (const e of ["classificada", "manutencao", "pronta"]) {
        expect(podeEditar(perfil, ciclo(e)), `${perfil}/${e}`).toBe(true);
      }
    }
  });

  it("não mexem no que é do Watcher nem no que sai dos ecrãs de saída", () => {
    // `autorizada` e `em_execucao` são do Watcher e o sync sobrepõe-se a
    // qualquer alteração feita aqui; as outras ficam registadas na Saída com
    // data e fotografia, e mudá-las à mão perderia isso.
    for (const perfil of ["gestor_frota", "logistica"]) {
      for (const e of ["autorizada", "em_execucao", "em_aluguer", "retorno", "fechado"]) {
        expect(podeEditar(perfil, ciclo(e)), `${perfil}/${e}`).toBe(false);
      }
    }
  });

  it("uma sucata não tem estado de fluxo, por isso ninguém lho muda daqui", () => {
    for (const perfil of ["gestor_frota", "logistica"]) {
      expect(podeEditar(perfil, ciclo("classificada", "sucata")), perfil).toBe(false);
      expect(podeEditar(perfil, ciclo("classificada", "indefinida")), perfil).toBe(false);
    }
  });

  it("comercial e visitante não mexem em estado nenhum", () => {
    for (const perfil of ["comercial", "visitante"]) {
      expect(podeEditar(perfil, ciclo("pronta")), perfil).toBe(false);
    }
  });

  it("sem utilizador não mexe em nada", () => {
    expect(podeEditarEstado(null, ciclo("pronta"), podeGerirEstadoOficina)).toBe(false);
  });
});
