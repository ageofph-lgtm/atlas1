import { describe, it, expect } from "vitest";
import {
  BACKUP_ENTITIES, NATURAL_KEYS, entidadesDoBackup, semCamposDoSistema,
  recolherBackup, novosRegistos, ficheiroValido,
  urlsDeFotos, nomeDeFoto, recolherFotos, trocarEnderecosDeFoto, contarFotos,
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

describe("fotos: que campos e que endereços", () => {
  const entities = {
    Maquina: [
      // `foto_url` é a placa do NS: serve para ler a série no registo e não
      // volta a fazer falta. Guardá-la multiplicava o ficheiro por nada.
      { serie: "NS-1", foto_url: "https://s.co/placa.jpg", fotos: ["https://s.co/m1.jpg", "https://s.co/m2.jpg"] },
      { serie: "NS-2", fotos: [] },
      { serie: "NS-3" },
    ],
    Ciclo: [
      { id: "c1", foto_saida: "https://s.co/saida.jpg", bateria_foto_url: "https://s.co/bat.jpg", carregador_foto_url: "https://s.co/car.jpg" },
      { id: "c2", bateria_foto_url: "https://s.co/bat.jpg" },
    ],
    Mensagem: [{ titulo: "x" }],
  };

  it("guarda o que vive no cartão: fotos da máquina, bateria e carregador", () => {
    expect(urlsDeFotos(entities).sort())
      .toEqual(["https://s.co/bat.jpg", "https://s.co/car.jpg", "https://s.co/m1.jpg", "https://s.co/m2.jpg"]);
  });

  it("deixa de fora as placas do número de série", () => {
    // Lêem-se uma vez, no registo, e não voltam a fazer falta.
    const urls = urlsDeFotos(entities);
    expect(urls).not.toContain("https://s.co/placa.jpg");
    expect(urls).not.toContain("https://s.co/saida.jpg");
  });

  it("lê o campo em lista da máquina, não só os campos soltos do ciclo", () => {
    expect(urlsDeFotos({ Maquina: [{ fotos: ["https://s.co/a.jpg", "https://s.co/b.jpg"] }] }))
      .toEqual(["https://s.co/a.jpg", "https://s.co/b.jpg"]);
  });

  it("não repete o mesmo endereço usado em dois sítios", () => {
    // bat.jpg aparece em dois ciclos: descarrega-se uma vez só.
    expect(urlsDeFotos(entities).filter((u) => u.endsWith("bat.jpg"))).toHaveLength(1);
  });

  it("ignora campos vazios, nulos e o que não é endereço", () => {
    expect(urlsDeFotos({ Maquina: [{ fotos: ["", null, "fotos/local.jpg", 42] }, { fotos: null }] })).toEqual([]);
    expect(urlsDeFotos({ Ciclo: [{ bateria_foto_url: "" }, { bateria_foto_url: null }] })).toEqual([]);
  });

  it("entidades sem fotos não contribuem", () => {
    expect(urlsDeFotos({ Mensagem: [{ titulo: "x" }], EventoCiclo: [{ nota: "y" }] })).toEqual([]);
  });

  it("conta as fotos antes de começar, para se poder avisar", () => {
    expect(contarFotos(entities)).toBe(4);
    expect(contarFotos({})).toBe(0);
  });
});

describe("nomeDeFoto", () => {
  it("vai para a pasta fotos e leva um índice à frente", () => {
    expect(nomeDeFoto("https://s.co/placa.jpg", 0)).toBe("fotos/0001-placa.jpg");
  });

  it("dois ficheiros com o mesmo nome no servidor não se sobrepõem", () => {
    // Perder uma foto por colisão de nomes seria um modo de falhar parvo.
    expect(nomeDeFoto("https://a.co/foto.jpg", 0)).not.toBe(nomeDeFoto("https://b.co/foto.jpg", 1));
  });

  it("deita fora a query e o fragmento do endereço", () => {
    expect(nomeDeFoto("https://s.co/p.jpg?token=abc#x", 0)).toBe("fotos/0001-p.jpg");
  });

  it("aguenta endereços estranhos sem produzir um nome inválido", () => {
    for (const url of ["https://s.co/", "https://s.co/ç é.jpg", "", null]) {
      const n = nomeDeFoto(url, 0);
      expect(n.startsWith("fotos/0001-")).toBe(true);
      expect(n).not.toMatch(/[/\\]fotos|\s/);
    }
  });
});

describe("recolherFotos", () => {
  const bytes = (n) => new Uint8Array(n).buffer;
  const buscarOk = async () => bytes(10);

  it("descarrega tudo e devolve o mapa endereço→ficheiro", async () => {
    const r = await recolherFotos(["https://s.co/a.jpg", "https://s.co/b.jpg"], { buscar: buscarOk });
    expect(Object.keys(r.ficheiros)).toHaveLength(2);
    expect(r.mapa["https://s.co/a.jpg"]).toBe("fotos/0001-a.jpg");
    expect(r.falhadas).toEqual([]);
    expect(r.bytes).toBe(20);
  });

  it("uma foto que não responde não trava as outras, e é nomeada", async () => {
    const buscar = async (u) => { if (u.includes("mau")) throw new Error("404"); return bytes(10); };
    const r = await recolherFotos(["https://s.co/a.jpg", "https://s.co/mau.jpg", "https://s.co/c.jpg"], { buscar });
    expect(Object.keys(r.ficheiros)).toHaveLength(2);
    expect(r.falhadas).toEqual([{ url: "https://s.co/mau.jpg", motivo: "404" }]);
  });

  it("uma resposta vazia conta como falha, não como foto", async () => {
    const r = await recolherFotos(["https://s.co/a.jpg"], { buscar: async () => bytes(0) });
    expect(Object.keys(r.ficheiros)).toHaveLength(0);
    expect(r.falhadas).toHaveLength(1);
  });

  it("para no limite de tamanho e diz o que ficou de fora", async () => {
    // Nunca truncar em silêncio: é a mesma regra da leitura por páginas.
    const r = await recolherFotos(
      ["https://s.co/a.jpg", "https://s.co/b.jpg", "https://s.co/c.jpg"],
      { buscar: async () => bytes(100), limiteBytes: 150 },
    );
    expect(Object.keys(r.ficheiros)).toHaveLength(1);
    expect(r.paradoNoLimite).toBe(true);
    expect(r.falhadas.map((f) => f.motivo)).toEqual(["limite", "limite"]);
  });

  it("comunica o progresso, para o ecrã não parecer pendurado", async () => {
    const passos = [];
    await recolherFotos(["a", "b"], { buscar: buscarOk, onProgresso: (p) => passos.push(p.feitas) });
    expect(passos).toEqual([0, 1, 2]);
  });

  it("sem fotos nenhumas não faz nada", async () => {
    const r = await recolherFotos([], { buscar: buscarOk });
    expect(r.bytes).toBe(0);
    expect(r.falhadas).toEqual([]);
  });
});

describe("trocarEnderecosDeFoto", () => {
  const mapa = { "https://s.co/a.jpg": "https://novo.co/a.jpg", "https://s.co/b.jpg": "https://novo.co/b.jpg" };

  it("troca os endereços dentro da lista de fotos da máquina", () => {
    const r = trocarEnderecosDeFoto({ serie: "NS-1", fotos: ["https://s.co/a.jpg", "https://s.co/b.jpg"] }, "Maquina", mapa);
    expect(r.fotos).toEqual(["https://novo.co/a.jpg", "https://novo.co/b.jpg"]);
  });

  it("dentro da lista, o que não foi recarregado fica como estava", () => {
    // Melhor o endereço antigo, que ainda funciona enquanto a app de origem
    // existir, do que um buraco no meio da lista.
    const r = trocarEnderecosDeFoto({ fotos: ["https://s.co/a.jpg", "https://s.co/z.jpg"] }, "Maquina", mapa);
    expect(r.fotos).toEqual(["https://novo.co/a.jpg", "https://s.co/z.jpg"]);
  });

  it("mexe nos dois campos de foto do ciclo", () => {
    const r = trocarEnderecosDeFoto(
      { bateria_foto_url: "https://s.co/a.jpg", carregador_foto_url: "https://s.co/b.jpg" }, "Ciclo", mapa,
    );
    expect(r).toMatchObject({ bateria_foto_url: "https://novo.co/a.jpg", carregador_foto_url: "https://novo.co/b.jpg" });
  });

  it("não toca na placa do NS, que não entra no backup", () => {
    const r = trocarEnderecosDeFoto({ foto_saida: "https://s.co/a.jpg" }, "Ciclo", mapa);
    expect(r.foto_saida).toBe("https://s.co/a.jpg");
  });

  it("uma entidade sem fotos passa intacta", () => {
    const original = { titulo: "x" };
    expect(trocarEnderecosDeFoto(original, "Mensagem", mapa)).toBe(original);
  });

  it("não modifica o registo original", () => {
    const original = { fotos: ["https://s.co/a.jpg"] };
    trocarEnderecosDeFoto(original, "Maquina", mapa);
    expect(original.fotos).toEqual(["https://s.co/a.jpg"]);
  });
});
