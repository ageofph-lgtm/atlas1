import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch (_e) {
      return Response.json({ error: 'Body inválido' }, { status: 400 });
    }

    const { action, ciclo_id, autor, tarefas, isVps, isExpress } = body;

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
            isExpress: isExpress || false
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

      // Map Watcher estado string → ATLAS estado + extra update fields
      const mapEstado = (watcherEstado) => {
        const estado = (watcherEstado || '').toLowerCase();
        if (estado.startsWith('concluida')) {
          return { novoEstado: 'pronta', updateData: { data_pronta: new Date().toISOString() } };
        }
        if (estado.startsWith('em-execucao') || estado.startsWith('em_execucao') ||
            estado.startsWith('em-preparacao') || estado.startsWith('em_preparacao')) {
          return { novoEstado: 'em_execucao', updateData: {} };
        }
        return { novoEstado: null, updateData: {} };
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
          const { novoEstado, updateData } = mapEstado(watcherResult.estado);

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
          const { novoEstado, updateData } = mapEstado(adopted.estado);
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

    } else {
      return Response.json({ error: 'Ação desconhecida: ' + action }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});