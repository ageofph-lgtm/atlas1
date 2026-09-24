import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { executarSyncCone } from '../../shared/syncCone.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch (_e) {
      return Response.json({ error: 'Body inválido' }, { status: 400 });
    }

    const { action, ciclo_id, autor, tarefas, isVps, isExpress, batch } = body;

    const bridgeSecret = Deno.env.get("ATLAS_BRIDGE_SECRET");
    const watcherUrl = Deno.env.get("WATCHER_ATLAS_URL");

    if (!bridgeSecret || !watcherUrl) {
      return Response.json({ error: 'Bridge not configured' }, { status: 503 });
    }

    // Identify the calling user from session, fall back to body autor
    let autorName = autor || 'system';
    try {
      const user = await base44.auth.me();
      if (user && user.full_name) {
        autorName = user.full_name;
      }
    } catch (_e) {
      // Not authenticated — use body autor
    }

    // ── AUTHORIZE ──────────────────────────────────────────────
    if (action === 'authorize') {
      if (!ciclo_id) {
        return Response.json({ error: 'ciclo_id obrigatório' }, { status: 400 });
      }

      const ciclo = await base44.asServiceRole.entities.Ciclo.get(ciclo_id);
      if (!ciclo) {
        return Response.json({ error: 'Ciclo não encontrado' }, { status: 404 });
      }

      if (ciclo.estado !== 'classificada' && ciclo.estado !== 'manutencao') {
        return Response.json({ error: 'Ciclo deve estar classificada ou em manutenção' }, { status: 400 });
      }

      if (ciclo.categoria === 'sucata' || ciclo.categoria === 'indefinida') {
        return Response.json({ error: 'Categoria indefinida — a gestora tem de definir o caminho da máquina' }, { status: 400 });
      }

      // Load the Maquina for modelo/ano
      let maquina = null;
      if (ciclo.maquina_id) {
        maquina = await base44.asServiceRole.entities.Maquina.get(ciclo.maquina_id);
      }

      // Map categoria → Watcher tipo
      const tipoMap = { str: 'aluguer', uts: 'usada', recon: 'recon' };
      const tipo = tipoMap[ciclo.categoria];

      // POST to Watcher
      const watcherResponse = await fetch(watcherUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-atlas-secret': bridgeSecret
        },
        body: JSON.stringify({
          action: 'create_a_fazer',
          data: {
            serie: ciclo.serie,
            modelo: maquina?.modelo || '',
            ano: maquina?.ano || '',
            tipo: tipo,
            prioridade: ciclo.prioridade || false,
            tarefas: tarefas || [],
            isVps: isVps || false,
            isExpress: isExpress || false,
            cone_cor: ciclo.cone_cor ?? null,
            cone_numero: ciclo.cone_numero ?? null,
            atlas_ciclo_id: ciclo.id
          }
        })
      });

      if (!watcherResponse.ok) {
        const errorText = await watcherResponse.text();
        return Response.json(
          { error: 'Watcher rejeitou: ' + errorText },
          { status: 502 }
        );
      }

      const watcherResult = await watcherResponse.json();

      // Watcher atlasBridge responds { ok: true, result: { ...record } } — id lives under result
      const watcherId = watcherResult.result?.id ?? watcherResult.id;

      // Update Ciclo
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Ciclo.update(ciclo_id, {
        estado: 'autorizada',
        data_autorizacao: now,
        watcher_os_id: watcherId,
        tarefas: tarefas || []
      });

      // Create EventoCiclo
      await base44.asServiceRole.entities.EventoCiclo.create({
        ciclo_id: ciclo_id,
        serie: ciclo.serie,
        de_estado: ciclo.estado,
        para_estado: 'autorizada',
        autor: autorName,
        nota: 'O.S. criada no Watcher'
      });

      return Response.json({
        success: true,
        ciclo_id: ciclo_id,
        watcher_os_id: watcherId,
        estado: 'autorizada'
      });

    // ── SYNC STATUS ────────────────────────────────────────────
    } else if (action === 'sync_status') {
      const autorizadas = await base44.asServiceRole.entities.Ciclo.filter({ estado: 'autorizada' });
      const emExecucao = await base44.asServiceRole.entities.Ciclo.filter({ estado: 'em_execucao' });
      const allCiclos = [...autorizadas, ...emExecucao];
      const linked = allCiclos.filter(c => c.watcher_os_id);
      const unlinked = allCiclos.filter(c => !c.watcher_os_id);

      const updates = [];
      const healed = [];

      // Map Watcher estado string → ATLAS estado + extra update fields.
      // `record` is the full FrotaACP record from the Watcher (used for real completion dates).
      const mapEstado = (watcherEstado, record = null) => {
        const estado = (watcherEstado || '').toLowerCase();
        if (estado.startsWith('concluida')) {
          const updateData = {
            // Use the Watcher's real completion date, not the sync moment
            data_pronta: record?.dataConclusao || new Date().toISOString()
          };
          // Fill data_autorizacao if missing and the Watcher has a real atribuicao date
          if (record?.dataAtribuicao && !record._ciclo_data_autorizacao) {
            updateData.data_autorizacao = record.dataAtribuicao;
          }
          return { novoEstado: 'pronta', updateData };
        }
        if (estado.startsWith('em-execucao') || estado.startsWith('em_execucao') ||
            estado.startsWith('em-preparacao') || estado.startsWith('em_preparacao')) {
          return { novoEstado: 'em_execucao', updateData: {} };
        }
        return { novoEstado: null, updateData: {} };
      };

      // Comerciais com interesse na máquina: quem a reservou e quem lhe fez pedidos.
      const comerciaisInteressados = async (ciclo) => {
        const ids = new Set();
        if (ciclo.reserva_comercial_id) ids.add(ciclo.reserva_comercial_id);
        try {
          const pedidos = await base44.asServiceRole.entities.PedidoMaquina.filter({ ciclo_id: ciclo.id });
          pedidos.forEach(p => p.comercial_user_id && ids.add(p.comercial_user_id));
        } catch (_e) {
          // sem pedidos legíveis — a reserva sozinha continua a valer
        }
        return [...ids];
      };

      // Estas transições vêm da oficina, via Watcher. São o único sítio onde o
      // ATLAS fica a saber que o trabalho começou ou acabou, por isso é daqui
      // que saem as mensagens para a logística, a gestão e os comerciais à espera.
      const avisarDaOficina = async (ciclo, novoEstado) => {
        if (novoEstado !== 'pronta' && novoEstado !== 'em_execucao') return;
        const pronta = novoEstado === 'pronta';
        const criar = (m) => base44.asServiceRole.entities.Mensagem.create({
          destino: '',
          destino_user_id: '',
          tipo: 'estado',
          serie: ciclo.serie,
          ciclo_id: ciclo.id,
          autor: 'Oficina',
          lida_por: [],
          ...m
        });
        try {
          const interessados = await comerciaisInteressados(ciclo);
          const titulo = pronta ? `Máquina pronta — ${ciclo.serie}` : `Em manutenção — ${ciclo.serie}`;
          const corpo = pronta
            ? `A máquina ${ciclo.serie} mudou de estado para PRONTA.`
            : `A oficina começou a trabalhar em ${ciclo.serie}.`;
          const envios = [criar({ destino: 'gestao', titulo, corpo })];
          if (pronta) envios.push(criar({ destino: 'logistica', titulo, corpo }));
          interessados.forEach(id => envios.push(criar({
            destino_user_id: id,
            titulo: pronta
              ? `A sua máquina está pronta — ${ciclo.serie}`
              : `A sua máquina entrou em manutenção — ${ciclo.serie}`,
            corpo: pronta
              ? `${ciclo.serie} concluiu a preparação e está disponível.`
              : `${ciclo.serie} está a ser preparada na oficina.`
          })));
          await Promise.all(envios);
        } catch (_e) {
          // uma notificação que não saiu não pode travar o sync do estado
        }
      };

      /**
       * Fecha os pedidos dos comerciais quando a oficina acaba o trabalho.
       *
       * A autorização punha o pedido em "em_execucao" e mais nada lhe tocava.
       * Como é por aqui — e só por aqui — que o ATLAS fica a saber que a O.S.
       * foi concluída, era aqui que faltava fechar o circuito: sem isto o
       * pedido ficava "EM CURSO" no ecrã do comercial com a máquina já pronta,
       * e até já alugada.
       *
       * Só se fecha o que estava por fazer; um pedido cancelado fica cancelado.
       */
      const fecharPedidosDoCiclo = async (ciclo) => {
        try {
          const pedidos = await base44.asServiceRole.entities.PedidoMaquina.filter({ ciclo_id: ciclo.id });
          const porFazer = pedidos.filter(p => ['aberto', 'em_execucao'].includes(p.estado || 'aberto'));
          const resposta = 'Concluído: a máquina ficou pronta.';
          for (const pedido of porFazer) {
            await base44.asServiceRole.entities.PedidoMaquina.update(pedido.id, {
              estado: 'concluido',
              resposta,
              respondido_por: autorName
            });
            if (pedido.comercial_user_id) {
              await base44.asServiceRole.entities.Mensagem.create({
                destino: '',
                destino_user_id: pedido.comercial_user_id,
                tipo: 'pedido',
                serie: ciclo.serie,
                ciclo_id: ciclo.id,
                autor: autorName,
                lida_por: [],
                titulo: `Pedido concluído — ${ciclo.serie}`,
                corpo: `${pedido.texto} — ${resposta}`
              });
            }
          }
        } catch (_e) {
          // a máquina está pronta; um pedido por fechar não desfaz o sync
        }
      };

      // Apply a estado transition + audit event if the estado actually changes
      const applyTransition = async (ciclo, novoEstado, updateData, nota) => {
        if (!novoEstado || novoEstado === ciclo.estado) return false;
        await base44.asServiceRole.entities.Ciclo.update(ciclo.id, {
          estado: novoEstado,
          ...updateData
        });
        await base44.asServiceRole.entities.EventoCiclo.create({
          ciclo_id: ciclo.id,
          serie: ciclo.serie,
          de_estado: ciclo.estado,
          para_estado: novoEstado,
          autor: autorName,
          nota: nota
        });
        await avisarDaOficina(ciclo, novoEstado);
        if (novoEstado === 'pronta') await fecharPedidosDoCiclo(ciclo);
        return true;
      };

      // ── Pass 1: linked ciclos — normal sync by watcher_os_id ──
      for (const ciclo of linked) {
        try {
          const watcherResponse = await fetch(watcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-atlas-secret': bridgeSecret },
            body: JSON.stringify({ action: 'get_status', query: { id: ciclo.watcher_os_id } })
          });
          if (!watcherResponse.ok) continue;

          const watcherResult = await watcherResponse.json();
          const record = watcherResult.result ?? watcherResult;
          // Pass current data_autorizacao so mapEstado knows whether to fill it
          record._ciclo_data_autorizacao = ciclo.data_autorizacao;
          const { novoEstado, updateData } = mapEstado(record.estado, record);

          if (await applyTransition(ciclo, novoEstado, updateData, 'Sync com Watcher')) {
            updates.push({
              ciclo_id: ciclo.id,
              serie: ciclo.serie,
              de_estado: ciclo.estado,
              para_estado: novoEstado
            });
          }
        } catch (_e) {
          // Skip this ciclo on error, continue with next
        }
      }

      // ── Pass 2: healing for ciclos that lost the watcher link ──
      // Query by serie, adopt the most recent record created at/after data_autorizacao,
      // write watcher_os_id back, then apply the normal estado mapping.
      for (const ciclo of unlinked) {
        try {
          const watcherResponse = await fetch(watcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-atlas-secret': bridgeSecret },
            body: JSON.stringify({ action: 'get_status', query: { serie: ciclo.serie } })
          });
          if (!watcherResponse.ok) continue;

          const watcherResult = await watcherResponse.json();
          const records = Array.isArray(watcherResult) ? watcherResult
            : Array.isArray(watcherResult.result) ? watcherResult.result
            : Array.isArray(watcherResult.records) ? watcherResult.records
            : [];
          if (records.length === 0) continue;

          // Tolerance window: the Watcher record is created moments before data_autorizacao is
          // written (race in authorize), so allow records created up to 30s before autorizacao.
          const autorizacaoTs = ciclo.data_autorizacao ? new Date(ciclo.data_autorizacao).getTime() : 0;
          const windowStart = autorizacaoTs - 30000;
          const candidates = records
            .filter(r => r.created_date && new Date(r.created_date).getTime() >= windowStart)
            .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
          if (candidates.length === 0) continue;

          const adopted = candidates[0];
          const adoptedId = adopted.id ?? adopted._id;
          if (!adoptedId) continue;

          // Recover the link
          await base44.asServiceRole.entities.Ciclo.update(ciclo.id, {
            watcher_os_id: adoptedId
          });

          // Apply normal estado mapping with the recovered record
          adopted._ciclo_data_autorizacao = ciclo.data_autorizacao;
          const { novoEstado, updateData } = mapEstado(adopted.estado, adopted);
          if (await applyTransition(ciclo, novoEstado, updateData, 'Sync com Watcher — vínculo recuperado')) {
            updates.push({
              ciclo_id: ciclo.id,
              serie: ciclo.serie,
              de_estado: ciclo.estado,
              para_estado: novoEstado,
              healed: true
            });
          } else {
            healed.push({ ciclo_id: ciclo.id, serie: ciclo.serie, watcher_os_id: adoptedId });
          }
        } catch (_e) {
          // Skip this ciclo on error, continue with next
        }
      }

      return Response.json({
        success: true,
        synced: allCiclos.length,
        updated: updates.length,
        healed: healed.length,
        updates: updates
      });

    // ── BACKFILL DATES ─────────────────────────────────────────
    } else if (action === 'backfill_dates') {
      const batchSize = Math.max(1, Math.min(500, Number(batch) || 50));

      // Read ALL ciclos (limit 500)
      const allCiclos = await base44.asServiceRole.entities.Ciclo.list('-created_date', 500);

      // Candidate ciclos: has serie, categoria not sucata/indefinida
      const candidates = allCiclos.filter(c =>
        c.serie &&
        c.categoria !== 'sucata' &&
        c.categoria !== 'indefinida'
      );

      // Priority: watcher_os_id empty OR data_pronta empty OR estado not yet pronta-with-dates
      const needsLinkOrDates = (c) =>
        !c.watcher_os_id || !c.data_pronta || c.estado !== 'pronta';

      // Partition: prioritize those needing work, then the rest (idempotent re-check)
      const prioritized = candidates.filter(needsLinkOrDates);
      const rest = candidates.filter(c => !needsLinkOrDates(c));

      // Also count total_remaining across ALL candidates (for the caller to know when done)
      const totalRemaining = prioritized.length;

      const toProcess = [...prioritized, ...rest].slice(0, batchSize);

      let processed = 0;
      let changed = 0;
      let linked = 0;
      let skippedNoWatcher = 0;
      const details = [];

      for (const ciclo of toProcess) {
        processed++;
        try {
          // Query Watcher by serie
          const watcherResponse = await fetch(watcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-atlas-secret': bridgeSecret },
            body: JSON.stringify({ action: 'get_status', query: { serie: ciclo.serie } })
          });
          if (!watcherResponse.ok) {
            skippedNoWatcher++;
            continue;
          }

          const watcherResult = await watcherResponse.json();
          const records = Array.isArray(watcherResult) ? watcherResult
            : Array.isArray(watcherResult.result) ? watcherResult.result
            : Array.isArray(watcherResult.records) ? watcherResult.records
            : [];
          if (records.length === 0) {
            skippedNoWatcher++;
            continue;
          }

          // Adopt the MOST RECENT record by created_date
          const adopted = records
            .slice()
            .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())[0];
          if (!adopted) {
            skippedNoWatcher++;
            continue;
          }

          const adoptedId = adopted.id ?? adopted._id;
          const adoptedEstado = (adopted.estado || '').toLowerCase();
          const historicoCriacoes = Array.isArray(adopted.historicoCriacoes) ? adopted.historicoCriacoes : [];

          // Build the update for the Ciclo
          const updateData = {};
          const changes = [];
          let estadoChanged = null;

          // a) Link watcher_os_id if empty
          if (!ciclo.watcher_os_id && adoptedId) {
            updateData.watcher_os_id = adoptedId;
            linked++;
            changes.push('linked');
          }

          // b) data_pronta from real completion (concluida-* estado)
          const isConcluida = adoptedEstado.startsWith('concluida');
          const isAFazer = adoptedEstado.startsWith('a-fazer');
          const isEmExec = adoptedEstado.startsWith('em-execucao') ||
                           adoptedEstado.startsWith('em_execucao') ||
                           adoptedEstado.startsWith('em-preparacao') ||
                           adoptedEstado.startsWith('em_preparacao');

          if (isConcluida && adopted.dataConclusao) {
            // ALWAYS overwrite — existing values came from sync "new Date()" and are wrong
            updateData.data_pronta = adopted.dataConclusao;
            changes.push('data_pronta=' + adopted.dataConclusao);
            // estado → pronta if not already pronta/fechado/em_aluguer/retorno
            if (['entrada', 'classificada', 'autorizada', 'em_execucao', 'manutencao'].includes(ciclo.estado)) {
              estadoChanged = 'pronta';
            }
          } else if (isAFazer && ['entrada', 'classificada'].includes(ciclo.estado)) {
            estadoChanged = 'autorizada';
          } else if (isEmExec && ['entrada', 'classificada', 'autorizada'].includes(ciclo.estado)) {
            estadoChanged = 'em_execucao';
          }

          // c) data_autorizacao if missing
          if (!ciclo.data_autorizacao) {
            const attrDate = adopted.dataAtribuicao || adopted.created_date;
            if (attrDate) {
              updateData.data_autorizacao = attrDate;
              changes.push('data_autorizacao=' + attrDate);
            }
          }

          // Only write if something actually changed
          const hasUpdate = Object.keys(updateData).length > 0 || estadoChanged !== null;
          if (!hasUpdate) continue;

          const oldEstado = ciclo.estado;
          const newEstado = estadoChanged || ciclo.estado;

          // Write the update (estado + other fields together)
          const finalUpdate = { ...updateData };
          if (estadoChanged) finalUpdate.estado = estadoChanged;
          await base44.asServiceRole.entities.Ciclo.update(ciclo.id, finalUpdate);

          // ONE audit event: for estado changes use the transition note; otherwise a data-only note
          const historicoNote = historicoCriacoes.length > 0
            ? ` — máquina com ${historicoCriacoes.length} ciclo(s) anterior(es)`
            : '';
          const nota = `Datas e vínculo retro-preenchidos do Watcher${historicoNote}`;
          await base44.asServiceRole.entities.EventoCiclo.create({
            ciclo_id: ciclo.id,
            serie: ciclo.serie,
            de_estado: oldEstado,
            para_estado: newEstado,
            autor: 'backfill',
            nota: nota
          });

          changed++;
          if (details.length < 25) {
            details.push({
              serie: ciclo.serie,
              changes: changes.join(', ') + (estadoChanged ? `, estado: ${oldEstado}→${estadoChanged}` : '')
            });
          }
        } catch (_e) {
          // Skip this ciclo on error, continue with next
        }
      }

      return Response.json({
        success: true,
        processed,
        changed,
        linked,
        skipped_no_watcher: skippedNoWatcher,
        total_remaining: totalRemaining,
        details
      });

    // ── SYNC CONE ─────────────────────────────────────────────
    } else if (action === 'sync_cone') {
      if (!ciclo_id) {
        return Response.json({ error: 'ciclo_id obrigatório' }, { status: 400 });
      }

      const result = await executarSyncCone({ ciclo_id, base44, watcherUrl, bridgeSecret });
      return Response.json(result);

    } else {
      return Response.json({ error: 'Ação desconhecida: ' + action }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});