import { base44 } from "@/api/base44Client";
import { classificarCiclosAbertos, isCategoriaSemEstado } from "@/components/atlas/cicloUtils";
import { CATEGORIA_CONE_MAP } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";
import { registarRetorno } from "@/components/atlas/registarRetorno";
import { notificarEntrada } from "@/components/atlas/mensagens";
import { exigirRede } from "@/components/atlas/rede";

/**
 * Registo de entrada de uma máquina no pátio.
 *
 * Isto vivia dentro do `Entrada.jsx`, num `handleSubmit` de 160 linhas. Foi
 * daqui que saíram os dois piores bugs do projeto — a máquina duplicada e a
 * máquina fantasma — e enquanto esteve preso a um componente não houve forma de
 * o cobrir com testes. Agora é uma função, e as regras de entrada e de
 * reentrada têm um sítio só.
 *
 * Devolve `{ ok, tipoErro, erro, ... }` em vez de mostrar avisos: quem decide o
 * que aparece no ecrã é a página, que sabe que campo destacar.
 */
export async function registarEntrada({
  serie,
  modelo = "",
  ano = "",
  fotoUrl = "",
  specs = {},
  categoria,
  estadoInicial = "classificada",
  coneNumero = "",
  notas = "",
  existingMaquina = null,
  reentradaConfirmada = false,
  autor,
}) {
  exigirRede("Registar a entrada");
  const semEstado = isCategoriaSemEstado(categoria);
  const estadoFinal = semEstado ? "indefinido" : estadoInicial;
  const coneCor = CATEGORIA_CONE_MAP[categoria] || null;
  const needsCone = !!coneCor;

  // Trava: uma série não pode ter dois ciclos abertos ao mesmo tempo. Ter
  // data_saida não basta para dar o ciclo por encerrado — uma máquina em
  // aluguer continua com o ciclo aberto até ao retorno.
  const ciclosCheck = await base44.entities.Ciclo.filter({ serie });
  const { noPatio, fora } = classificarCiclosAbertos(ciclosCheck);

  if (noPatio) {
    return { ok: false, tipoErro: "no_patio", erro: `NS ${serie} ainda não deu saída.`, ciclo: noPatio };
  }
  if (fora && !reentradaConfirmada) {
    return { ok: false, tipoErro: "fora_do_patio", erro: `NS ${serie} ainda está fora. Confirme a reentrada no passo 1.`, ciclo: fora };
  }

  // Trava: o cone (cor + nº) tem de ser único entre as máquinas no pátio.
  if (needsCone && coneNumero) {
    const result = await validateConeNumber(categoria, coneNumero);
    if (!result.free) {
      return {
        ok: false,
        tipoErro: "cone_ocupado",
        erro: `Cone ${coneNumero} ${coneCor} já está em uso — NS ${result.conflito.serie}`,
      };
    }
  }

  // Reentrada: fecha o aluguer anterior como retorno. É isto que impede o ciclo
  // antigo de ficar para trás em aluguer e a máquina aparecer em duplicado.
  // `reabrir: false` porque é esta função que abre o ciclo novo, com categoria,
  // cone e notas recolhidos de raiz.
  let diasDoAluguer = null;
  if (fora && reentradaConfirmada) {
    const res = await registarRetorno(fora, {
      autor,
      reabrir: false,
      nota: "Retorno registado na reentrada da máquina",
    });
    if (!res.ok) {
      return { ok: false, tipoErro: "retorno_falhou", erro: res.erro };
    }
    diasDoAluguer = res.dias;
  }

  let maquinaId = existingMaquina?.id;
  if (!maquinaId) {
    const nova = await base44.entities.Maquina.create({
      serie,
      modelo,
      ano,
      foto_url: fotoUrl,
      mastro: specs.mastro || "",
      vias_mastro: specs.vias_mastro || "",
      joystick: specs.joystick || "",
      tipo_pneu: specs.tipo_pneu || "",
      acessorios: specs.acessorios || [],
      h3: specs.h3 || "",
      bateria: specs.bateria || "",
      observacoes: notas || "",
    });
    maquinaId = nova.id;
  } else {
    // Máquina conhecida: o que vier em branco não apaga o que já lá estava.
    await base44.entities.Maquina.update(maquinaId, {
      modelo: modelo || existingMaquina.modelo,
      ano: ano || existingMaquina.ano,
      foto_url: fotoUrl || existingMaquina.foto_url,
      mastro: specs.mastro || existingMaquina.mastro,
      vias_mastro: specs.vias_mastro || existingMaquina.vias_mastro,
      joystick: specs.joystick || existingMaquina.joystick,
      tipo_pneu: specs.tipo_pneu || existingMaquina.tipo_pneu,
      acessorios: specs.acessorios?.length ? specs.acessorios : existingMaquina.acessorios,
      h3: specs.h3 || existingMaquina.h3 || "",
      bateria: specs.bateria || existingMaquina.bateria || "",
      observacoes: notas,
    });
  }

  const now = new Date().toISOString();
  const cicloData = {
    maquina_id: maquinaId,
    serie,
    categoria,
    cone_cor: coneCor,
    cone_numero: needsCone ? coneNumero : null,
    estado: estadoFinal,
    data_entrada: now,
    data_classificacao: now,
    prioridade: false,
  };
  if (estadoFinal === "pronta") cicloData.data_pronta = now;

  const novoCiclo = await base44.entities.Ciclo.create(cicloData);

  await base44.entities.EventoCiclo.create({
    ciclo_id: novoCiclo.id,
    serie,
    de_estado: null,
    para_estado: "entrada",
    autor,
    nota: reentradaConfirmada ? "Reentrada no pátio" : "Registo de entrada",
  });
  await base44.entities.EventoCiclo.create({
    ciclo_id: novoCiclo.id,
    serie,
    de_estado: "entrada",
    para_estado: estadoFinal,
    autor,
    nota: notaDaClassificacao({ reentradaConfirmada, diasDoAluguer, estadoFinal }),
  });

  await notificarEntrada({ ...cicloData, id: novoCiclo.id }, { autor, reentrada: reentradaConfirmada });

  return { ok: true, cicloId: novoCiclo.id, maquinaId, diasDoAluguer, estadoFinal };
}

/** O porquê da classificação, para quem ler o histórico do ciclo meses depois. */
function notaDaClassificacao({ reentradaConfirmada, diasDoAluguer, estadoFinal }) {
  if (reentradaConfirmada) {
    return `Reentrada após aluguer${diasDoAluguer != null ? ` de ${diasDoAluguer} dias` : ""}`;
  }
  if (estadoFinal === "indefinido") return "Sem estado de preparação (sucata/indefinida)";
  if (estadoFinal === "pronta") return "Entrada direta — pronta";
  if (estadoFinal === "manutencao") return "Entrada direta — manutenção";
  return "Classificação";
}
