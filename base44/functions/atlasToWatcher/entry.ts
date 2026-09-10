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

    const { action, ciclo_id, autor } = body;

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
            prioridade: ciclo.prioridade || false
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

      // Update Ciclo
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Ciclo.update(ciclo_id, {
        estado: 'autorizada',
        data_autorizacao: now,
        watcher_os_id: watcherResult.id
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
        watcher_os_id: watcherResult.id,
        estado: 'autorizada'
      });

    // ── SYNC STATUS ────────────────────────────────────────────
    } else if (action === 'sync_status') {
      const autorizadas = await base44.asServiceRole.entities.Ciclo.filter({ estado: 'autorizada' });
      const emExecucao = await base44.asServiceRole.entities.Ciclo.filter({ estado: 'em_execucao' });
      const ciclos = [...autorizadas, ...emExecucao].filter(c => c.watcher_os_id);

      const updates = [];

      for (const ciclo of ciclos) {
        try {
          const watcherResponse = await fetch(watcherUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-atlas-secret': bridgeSecret
            },
            body: JSON.stringify({
              action: 'get_status',
              query: { id: ciclo.watcher_os_id }
            })
          });

          if (!watcherResponse.ok) continue;

          const watcherResult = await watcherResponse.json();
          const watcherEstado = (watcherResult.estado || '').toLowerCase();

          let novoEstado = null;
          const updateData = {};

          if (watcherEstado.startsWith('concluida')) {
            novoEstado = 'pronta';
            updateData.data_pronta = new Date().toISOString();
          } else if (watcherEstado.startsWith('em-preparacao') || watcherEstado.startsWith('em_preparacao')) {
            novoEstado = 'em_execucao';
          }

          if (novoEstado && novoEstado !== ciclo.estado) {
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
              nota: 'Sync com Watcher'
            });

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

      return Response.json({
        success: true,
        synced: ciclos.length,
        updated: updates.length,
        updates: updates
      });

    } else {
      return Response.json({ error: 'Ação desconhecida: ' + action }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});