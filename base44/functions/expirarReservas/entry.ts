import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/* Regras da reserva: quando é que ela ainda vale e quando expira por não ter
   sido usada. O prazo conta desde reserva_criada_em, não desde a data prevista
   de saída. */
const DIA_MS = 24 * 60 * 60 * 1000;

/** Três semanas. É o prazo combinado para uma reserva ser usada. */
const PRAZO_RESERVA_DIAS = 21;

const isHistorico = (ciclo) => ciclo?.estado === "fechado";

const dataValida = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Tem reserva de pé: há cliente e o ciclo não fechou.
 *
 * Uma máquina que já saiu (tem `data_saida`) conta como reserva usada — é o que
 * a saída significa. Por isso `reservaAtiva` e o motor de expiração usam a mesma
 * condição: o que aparece na aba RESERVADAS é exatamente o que pode expirar.
 */
const reservaAtiva = (ciclo) => !!ciclo?.reserva_cliente && !isHistorico(ciclo) && !ciclo?.data_saida;

/** Quando a reserva foi feita. Nulo nos registos antigos, anteriores a este campo. */
const reservaCriadaEm = (ciclo) => dataValida(ciclo?.reserva_criada_em);

/** Dias inteiros desde que a reserva foi feita. Nulo quando não há relógio. */
function diasDeReserva(ciclo, agora = new Date()) {
  const inicio = reservaCriadaEm(ciclo);
  if (!inicio) return null;
  return Math.max(0, Math.floor((agora.getTime() - inicio.getTime()) / DIA_MS));
}

/** Dias que faltam para o prazo acabar. Negativo = já passou. Nulo sem relógio. */
function diasParaExpirar(ciclo, agora = new Date()) {
  const dias = diasDeReserva(ciclo, agora);
  if (dias === null) return null;
  return PRAZO_RESERVA_DIAS - dias;
}

/** A reserva passou o prazo sem a máquina ter saído. */
function reservaExpirada(ciclo, agora = new Date()) {
  if (!reservaAtiva(ciclo)) return false;
  return diasDeReserva(ciclo, agora) >= PRAZO_RESERVA_DIAS;
}

/** O que vai para o histórico da máquina quando a reserva cai. */
function notaDaExpiracao(ciclo, agora = new Date()) {
  const dias = diasDeReserva(ciclo, agora);
  const cliente = ciclo?.reserva_cliente || "cliente";
  return `Reserva de ${cliente} expirou: ${dias} dias sem saída (prazo ${PRAZO_RESERVA_DIAS} dias).`;
}

/** Texto do aviso à gestão e ao comercial. */
function corpoDoAviso(ciclo, agora = new Date()) {
  const dias = diasDeReserva(ciclo, agora);
  const cliente = ciclo?.reserva_cliente || "—";
  const comercial = ciclo?.reserva_comercial || "—";
  return `A reserva de ${ciclo?.serie} para ${cliente} expirou ao fim de ${dias} dias sem saída (comercial: ${comercial}). A máquina volta a estar disponível.`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_e) {
      user = null;
    }
    if (!user) return Response.json({ error: 'Precisa de sessão' }, { status: 401 });
    const ehAdmin = user.role === 'admin' || (user.email || '').toLowerCase() === 'raphael.toledo@still.pt';
    if (!ehAdmin) return Response.json({ error: 'Só o administrador pode fechar reservas' }, { status: 403 });

    let body = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }
    const simular = body.simular === true;
    const prazoDias = Number(body.prazo_dias) > 0 ? Number(body.prazo_dias) : PRAZO_RESERVA_DIAS;
    // Travão de segurança: um erro de dados não pode limpar o pátio inteiro de uma vez.
    const limite = Number(body.limite) > 0 ? Number(body.limite) : 50;
    const agora = new Date();
    const agoraIso = agora.toISOString();

    // Ler os ciclos todos, página a página.
    const ciclos: any[] = [];
    for (let skip = 0; ; skip += 500) {
      const pagina = await base44.asServiceRole.entities.Ciclo.list('-created_date', 500, skip);
      const lista = Array.isArray(pagina) ? pagina : [];
      ciclos.push(...lista);
      if (lista.length < 500) break;
      if (skip > 20000) break;
    }

    const semRelogio: string[] = [];
    const expiradas: any[] = [];
    const falhas: any[] = [];

    for (const ciclo of ciclos) {
      if (!reservaAtiva(ciclo)) continue;

      // Reserva sem relógio: arranca agora. Não expira por um prazo que nunca foi contado.
      if (!ciclo.reserva_criada_em) {
        semRelogio.push(ciclo.serie);
        if (!simular) {
          try {
            await base44.asServiceRole.entities.Ciclo.update(ciclo.id, { reserva_criada_em: agoraIso });
          } catch (e) {
            falhas.push({ serie: ciclo.serie, erro: `relógio: ${e.message}` });
          }
        }
        continue;
      }

      const dias = diasDeReserva(ciclo, agora);
      if (dias === null || dias < prazoDias) continue;
      if (expiradas.length >= limite) {
        falhas.push({ serie: ciclo.serie, erro: `travão de ${limite} reservas por passagem` });
        continue;
      }

      const registo = {
        serie: ciclo.serie,
        cliente: ciclo.reserva_cliente || '',
        comercial: ciclo.reserva_comercial || '',
        comercial_id: ciclo.reserva_comercial_id || '',
        dias,
        ciclo_id: ciclo.id,
      };
      expiradas.push(registo);
      if (simular) continue;

      try {
        await base44.asServiceRole.entities.Ciclo.update(ciclo.id, {
          reserva_cliente: null,
          reserva_data: null,
          reserva_comercial: null,
          reserva_comercial_id: '',
          reserva_criada_em: null,
        });

        // Histórico da máquina: a reserva que caiu fica registada, não desaparece.
        await base44.asServiceRole.entities.EventoCiclo.create({
          ciclo_id: ciclo.id,
          serie: ciclo.serie,
          de_estado: ciclo.estado || '',
          para_estado: ciclo.estado || '',
          autor: 'ATLAS (automático)',
          nota: notaDaExpiracao(ciclo, agora),
          ocorrido_em: agoraIso,
        });

        // Gestão (gestor de frota + administração).
        await base44.asServiceRole.entities.Mensagem.create({
          destino: 'gestao',
          tipo: 'reserva',
          titulo: `Reserva expirada — ${ciclo.serie}`,
          corpo: corpoDoAviso(ciclo, agora),
          serie: ciclo.serie,
          ciclo_id: ciclo.id,
          autor: 'ATLAS (automático)',
          lida_por: [],
        });

        // O comercial que a fez, se ainda estiver identificado.
        if (ciclo.reserva_comercial_id) {
          await base44.asServiceRole.entities.Mensagem.create({
            destino: 'comercial',
            destino_user_id: ciclo.reserva_comercial_id,
            tipo: 'reserva',
            titulo: `A sua reserva expirou — ${ciclo.serie}`,
            corpo: corpoDoAviso(ciclo, agora),
            serie: ciclo.serie,
            ciclo_id: ciclo.id,
            autor: 'ATLAS (automático)',
            lida_por: [],
          });
        }
      } catch (e) {
        falhas.push({ serie: ciclo.serie, erro: e.message });
      }
    }

    return Response.json({
      ok: true,
      simulado: simular,
      prazo_dias: prazoDias,
      lidos: ciclos.length,
      com_reserva: ciclos.filter(reservaAtiva).length,
      com_cliente_fora: ciclos.filter((c: any) => !!c.reserva_cliente && !reservaAtiva(c)).length,
      expiradas,
      sem_relogio: semRelogio,
      falhas,
      em: agoraIso,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});