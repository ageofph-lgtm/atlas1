import { strToU8, strFromU8 } from "fflate";

/**
 * O ficheiro de backup com fotos é um ZIP, não um JSON com imagens lá dentro.
 *
 * Meter as imagens em base64 dentro do JSON custava mais 33% de tamanho e
 * obrigava a ter tudo — registos e imagens — numa única string em memória antes
 * de gravar. Com algumas centenas de fotos isso mata o separador do browser.
 * Num ZIP as imagens vão como ficheiros, comprimidas, e vêem-se com qualquer
 * programa sem precisar deste código para nada.
 *
 * Dentro:
 *   dados.json   os registos, iguais aos do backup sem fotos
 *   fotos/…      as imagens
 *
 * O `dados.json` guarda os **endereços originais** nos registos e a
 * correspondência endereço→ficheiro à parte, em `fotos`. Assim o ficheiro
 * continua a ser um backup válido dos registos mesmo que as imagens se percam,
 * em vez de ficar com caminhos para dentro de um ZIP que já ninguém tem.
 */

/** O `fflate` só é descarregado quando alguém carrega no botão. */
const carregar = async () => import("fflate");

export async function construirZip(payload, ficheiros = {}) {
  const { zip } = await carregar();
  const conteudo = { "dados.json": strToU8(JSON.stringify(payload, null, 2)), ...ficheiros };
  return new Promise((resolve, reject) => {
    zip(conteudo, { level: 6 }, (err, dados) => (err ? reject(err) : resolve(dados)));
  });
}

export async function lerZip(bytes) {
  const { unzip } = await carregar();
  const conteudo = await new Promise((resolve, reject) => {
    unzip(new Uint8Array(bytes), (err, dados) => (err ? reject(err) : resolve(dados)));
  });

  const bruto = conteudo["dados.json"];
  if (!bruto) throw new Error("O ficheiro não tem dados.json lá dentro.");

  return { payload: JSON.parse(strFromU8(bruto)), ficheiros: conteudo };
}

/** Um ZIP começa sempre por PK — evita tentar ler um JSON como ZIP e vice-versa. */
export const pareceZip = (bytes) => {
  const b = new Uint8Array(bytes);
  return b.length > 1 && b[0] === 0x50 && b[1] === 0x4b;
};

export { strToU8, strFromU8 };
