import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { COLUNAS, construirLinhas, nomeFicheiro } from "@/components/atlas/exportarCiclos";

const ciclos = [
  {
    id: "c1", serie: "F20321Y00397", categoria: "str", estado: "pronta",
    cone_cor: "amarelo", cone_numero: "7", prioridade: true,
    reserva_cliente: "Transportes Águia", reserva_comercial: "Ana Silva",
    data_entrada: "2026-09-01T08:00:00Z", data_pronta: "2026-09-10T08:00:00Z",
  },
  {
    id: "c2", serie: "516221N00582", categoria: "sucata", estado: "classificada",
    cone_cor: null, cone_numero: null,
    data_entrada: "2026-08-15T08:00:00Z", data_saida: "2026-09-05T08:00:00Z",
    tipo_saida: "vendida", dias_alugada: 21,
  },
];
const maquinas = { c1: { modelo: "RX 60-25", mastro: "triplex", joystick: "sim" }, c2: { modelo: "FM-X 14" } };
const getMaquina = (c) => maquinas[c.id];

const linhas = () => construirLinhas(ciclos, getMaquina);

describe("colunas", () => {
  it("não leva nenhuma especificação técnica — foi o que foi pedido", () => {
    const rotulos = COLUNAS.map((c) => c.label.toLowerCase()).join(" ");
    for (const fora of ["mastro", "vias", "joystick", "pneu", "h3", "bateria", "acessório"]) {
      expect(rotulos).not.toContain(fora);
    }
  });

  it("leva o que se vê no programa", () => {
    const rotulos = COLUNAS.map((c) => c.label);
    expect(rotulos).toContain("Série");
    expect(rotulos).toContain("Modelo");
    expect(rotulos).toContain("Estado");
    expect(rotulos).toContain("Cliente");
  });
});

describe("construirLinhas", () => {
  it("escreve rótulos legíveis, não os valores da base de dados", () => {
    const [l] = linhas();
    expect(l["Estado"]).toBe("Pronta");
    expect(l["Categoria"]).toBe("STR");
    expect(l["Cone (cor)"]).toBe("Amarelo");
  });

  it("aplica o estado efetivo — sucata sai como Indefinido, como aparece no ecrã", () => {
    const [, l] = linhas();
    expect(l["Estado"]).toBe("Indefinido");
  });

  it("datas saem como datas, para o Excel as poder ordenar", () => {
    const [l] = linhas();
    expect(l["Entrada"]).toBeInstanceOf(Date);
    expect(l["Pronta"]).toBeInstanceOf(Date);
    expect(l["Saída"]).toBe(null);
  });

  it("números saem como números, não como texto", () => {
    const [a, b] = linhas();
    expect(a["Cone nº"]).toBe(7);
    expect(b["Dias alugada"]).toBe(21);
    expect(b["Cone nº"]).toBe(null);
  });

  it("traduz o tipo de saída", () => {
    const [a, b] = linhas();
    expect(b["Tipo de saída"]).toBe("Venda");
    expect(a["Tipo de saída"]).toBe("");
  });

  it("marca a prioridade de forma legível", () => {
    const [a, b] = linhas();
    expect(a["Prioridade"]).toBe("Sim");
    expect(b["Prioridade"]).toBe("");
  });

  it("aguenta não haver máquina associada", () => {
    const [l] = construirLinhas([ciclos[0]], () => null);
    expect(l["Modelo"]).toBe("");
  });
});

describe("o ficheiro que sai", () => {
  // Não basta gerar sem rebentar: o que interessa é o que o Excel vai ler.
  const folhaGerada = () => {
    const folha = XLSX.utils.json_to_sheet(linhas(), {
      header: COLUNAS.map((c) => c.label),
      cellDates: true,
    });
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, folha, "Máquinas");
    const buffer = XLSX.write(livro, { type: "buffer", bookType: "xlsx" });
    return XLSX.read(buffer, { cellDates: true });
  };

  it("reabre com a folha e o número de linhas certos", () => {
    const lido = folhaGerada();
    expect(lido.SheetNames).toEqual(["Máquinas"]);
    const dados = XLSX.utils.sheet_to_json(lido.Sheets["Máquinas"]);
    expect(dados).toHaveLength(2);
  });

  it("tem os cabeçalhos pela ordem definida", () => {
    const lido = folhaGerada();
    const [cabecalho] = XLSX.utils.sheet_to_json(lido.Sheets["Máquinas"], { header: 1 });
    expect(cabecalho).toEqual(COLUNAS.map((c) => c.label));
  });

  it("o Excel recebe mesmo uma data, e não o texto de uma data", () => {
    const lido = folhaGerada();
    const [primeira] = XLSX.utils.sheet_to_json(lido.Sheets["Máquinas"], { raw: true });
    expect(primeira["Entrada"]).toBeInstanceOf(Date);
    expect(primeira["Entrada"].toISOString().slice(0, 10)).toBe("2026-09-01");
  });

  it("os valores chegam intactos ao outro lado", () => {
    const lido = folhaGerada();
    const [a, b] = XLSX.utils.sheet_to_json(lido.Sheets["Máquinas"]);
    expect(a["Série"]).toBe("F20321Y00397");
    expect(a["Modelo"]).toBe("RX 60-25");
    expect(a["Cliente"]).toBe("Transportes Águia");
    expect(a["Cone nº"]).toBe(7);
    expect(b["Estado"]).toBe("Indefinido");
    expect(b["Dias alugada"]).toBe(21);
  });

  it("nenhuma célula carrega uma especificação técnica", () => {
    const lido = folhaGerada();
    const tudo = JSON.stringify(XLSX.utils.sheet_to_json(lido.Sheets["Máquinas"])).toLowerCase();
    expect(tudo).not.toContain("triplex");
    expect(tudo).not.toContain("joystick");
  });
});

describe("nomeFicheiro", () => {
  it("leva a página e o dia", () => {
    expect(nomeFicheiro("inventario", new Date("2026-09-21T10:00:00Z"))).toBe("atlas-inventario-2026-09-21.xlsx");
  });
});
