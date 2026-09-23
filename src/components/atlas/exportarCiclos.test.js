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
  it("leva as quatro specs que se perguntam ao telefone, e mais nenhumas", () => {
    // H3, horímetro, bateria e joystick decidem se a máquina serve o cliente.
    // O mastro, as vias, os pneus e os acessórios são ficha técnica: quem abre
    // a folha quer saber o que está no pátio.
    const rotulos = COLUNAS.map((c) => c.label.toLowerCase()).join(" ");
    for (const dentro of ["h3", "horímetro", "bateria", "joystick"]) {
      expect(rotulos, dentro).toContain(dentro);
    }
    for (const fora of ["mastro", "vias", "pneu", "acessório"]) {
      expect(rotulos, fora).not.toContain(fora);
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

  it("nenhuma célula carrega a ficha técnica completa", () => {
    const lido = folhaGerada();
    const tudo = JSON.stringify(XLSX.utils.sheet_to_json(lido.Sheets["Máquinas"])).toLowerCase();
    // O mastro continua de fora; o joystick agora é uma coluna, por isso o que
    // se verifica é o valor do mastro e não a palavra "joystick".
    expect(tudo).not.toContain("triplex");
    expect(tudo).not.toContain("telesc");
  });
});

describe("nomeFicheiro", () => {
  it("leva a página e o dia", () => {
    expect(nomeFicheiro("inventario", new Date("2026-09-21T10:00:00Z"))).toBe("atlas-inventario-2026-09-21.xlsx");
  });
});

describe("as quatro colunas técnicas que decidem se a máquina serve", () => {
  const maquina = { modelo: "RX20-16", h3: "4455", horimetro: "3420", bateria: "litio", joystick: "minilever" };
  const linha = (m) => construirLinhas([{ id: "c1", serie: "NS-1", categoria: "str", estado: "pronta" }], () => m)[0];

  it("H3 e horímetro saem como números, para o Excel poder filtrar por eles", () => {
    // Em texto, o Excel punha 10000 antes de 4455 — inútil para quem procura
    // uma máquina acima de certa altura.
    const l = linha(maquina);
    expect(l["H3 (mm)"]).toBe(4455);
    expect(l["Horímetro (h)"]).toBe(3420);
  });

  it("bateria e joystick saem com o nome que se usa, não o código interno", () => {
    const l = linha(maquina);
    expect(l["Bateria"]).toBe("Lítio");
    expect(l["Joystick"]).toBe("Mini.");
  });

  it("uma máquina sem estes dados deixa as células vazias, não zeros", () => {
    // Um zero no horímetro seria lido como máquina nova, que é outra coisa.
    const l = linha({ modelo: "X" });
    expect(l["H3 (mm)"]).toBe(null);
    expect(l["Horímetro (h)"]).toBe(null);
    expect(l["Bateria"]).toBe("");
    expect(l["Joystick"]).toBe("");
  });

  it("um valor que não é número não vira NaN na folha", () => {
    expect(linha({ h3: "cerca de 4m", horimetro: "—" })["H3 (mm)"]).toBe(null);
    expect(linha({ horimetro: "—" })["Horímetro (h)"]).toBe(null);
  });

  it("um código desconhecido sai como está, em vez de desaparecer", () => {
    const l = linha({ bateria: "hidrogenio", joystick: "novo_tipo" });
    expect(l["Bateria"]).toBe("hidrogenio");
    expect(l["Joystick"]).toBe("novo_tipo");
  });

  it("sem máquina ligada não rebenta", () => {
    const l = linha(null);
    expect(l["H3 (mm)"]).toBe(null);
    expect(l["Bateria"]).toBe("");
  });

  it("continuam de fora as specs que não se perguntam ao telefone", () => {
    const rotulos = COLUNAS.map((c) => c.label);
    for (const fora of ["Mastro", "Vias", "Pneus", "Acessórios"]) {
      expect(rotulos).not.toContain(fora);
    }
  });
});
