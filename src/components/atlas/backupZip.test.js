import { describe, it, expect } from "vitest";
import { construirZip, lerZip, pareceZip } from "@/components/atlas/backupZip";

const payload = {
  app: "ATLAS", version: 2, exportedAt: "2026-09-23T00:00:00Z",
  entities: { Maquina: [{ serie: "NS-1", foto_url: "https://s.co/a.jpg" }], Ciclo: [] },
  fotos: { "https://s.co/a.jpg": "fotos/0001-a.jpg" },
};
const imagem = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]);

describe("ida e volta pelo ZIP", () => {
  it("o que entra é o que sai — registos e imagem, byte a byte", async () => {
    const zip = await construirZip(payload, { "fotos/0001-a.jpg": imagem });
    const lido = await lerZip(zip);

    expect(lido.payload).toEqual(payload);
    expect(Array.from(lido.ficheiros["fotos/0001-a.jpg"])).toEqual(Array.from(imagem));
  });

  it("os endereços originais ficam nos registos, não caminhos para dentro do ZIP", async () => {
    // Assim o dados.json continua a ser um backup válido dos registos mesmo que
    // as imagens se percam, em vez de ficar a apontar para um ZIP que ninguém tem.
    const { payload: p } = await lerZip(await construirZip(payload, {}));
    expect(p.entities.Maquina[0].foto_url).toBe("https://s.co/a.jpg");
    expect(p.fotos["https://s.co/a.jpg"]).toBe("fotos/0001-a.jpg");
  });

  it("um ZIP sem dados.json é recusado com uma razão", async () => {
    const zip = await construirZip(payload, {});
    const { unzipSync, zipSync, strToU8 } = await import("fflate");
    const semDados = zipSync({ "fotos/x.jpg": strToU8("nada") });
    expect(unzipSync(zip)["dados.json"]).toBeTruthy();
    await expect(lerZip(semDados)).rejects.toThrow(/dados\.json/);
  });

  it("comprime: o ZIP é menor do que a soma do que lá foi posto", async () => {
    const repetido = new Uint8Array(20000).fill(65);
    const zip = await construirZip(payload, { "fotos/0001-a.jpg": repetido });
    expect(zip.byteLength).toBeLessThan(repetido.byteLength);
  });

  it("aguenta várias imagens sem as trocar", async () => {
    const ficheiros = {
      "fotos/0001-a.jpg": new Uint8Array([1, 1, 1]),
      "fotos/0002-b.jpg": new Uint8Array([2, 2, 2]),
      "fotos/0003-c.jpg": new Uint8Array([3, 3, 3]),
    };
    const lido = await lerZip(await construirZip(payload, ficheiros));
    for (const [nome, bytes] of Object.entries(ficheiros)) {
      expect(Array.from(lido.ficheiros[nome]), nome).toEqual(Array.from(bytes));
    }
  });
});

describe("pareceZip", () => {
  it("reconhece um ZIP pela assinatura PK", async () => {
    expect(pareceZip(await construirZip(payload, {}))).toBe(true);
  });

  it("um JSON não passa por ZIP", () => {
    const json = new TextEncoder().encode('{"app":"ATLAS"}');
    expect(pareceZip(json)).toBe(false);
  });

  it("vazio ou quase vazio não rebenta", () => {
    expect(pareceZip(new Uint8Array([]))).toBe(false);
    expect(pareceZip(new Uint8Array([0x50]))).toBe(false);
  });
});
