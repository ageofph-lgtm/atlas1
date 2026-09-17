import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { audienciasDoPerfil } from "@/components/atlas/mensagens";

const POLL_INTERVAL = 60000;
const LIMITE = 200;

/**
 * Caixa de mensagens do utilizador atual: o que é dirigido às audiências do
 * seu perfil mais o que é dirigido a ele em concreto.
 *
 * O estado de leitura vive em `lida_por`, uma lista de IDs, para que uma
 * mensagem dirigida a toda a logística possa ser lida por cada pessoa sem
 * desaparecer da caixa das outras.
 */
export function useMensagens(currentUser) {
  const [mensagens, setMensagens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const carregando = useRef(false);

  const userId = currentUser?.id;
  const perfil = currentUser?.perfil;

  const load = useCallback(async () => {
    if (!userId || carregando.current) return;
    const audiencias = audienciasDoPerfil(perfil);
    if (audiencias.length === 0) { setMensagens([]); return; }

    carregando.current = true;
    setIsLoading(true);
    try {
      const listas = await Promise.all([
        ...audiencias.map((a) => base44.entities.Mensagem.filter({ destino: a }).catch(() => [])),
        base44.entities.Mensagem.filter({ destino_user_id: userId }).catch(() => []),
      ]);
      // Uma mensagem pode chegar por mais do que uma via (um admin lê duas
      // audiências); o Map deixa-a aparecer só uma vez.
      const unicas = [...new Map(listas.flat().map((m) => [m.id, m])).values()];
      unicas.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setMensagens(unicas.slice(0, LIMITE));
    } catch (_e) {
      // caixa indisponível — não vale a pena partir o ecrã por causa disso
    }
    setIsLoading(false);
    carregando.current = false;
  }, [userId, perfil]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [load]);

  const naoLida = useCallback((m) => !(m.lida_por || []).includes(userId), [userId]);
  const porLer = mensagens.filter(naoLida).length;

  const marcarLida = async (mensagem) => {
    if (!userId || !naoLida(mensagem)) return;
    const lidaPor = [...(mensagem.lida_por || []), userId];
    setMensagens((prev) => prev.map((m) => (m.id === mensagem.id ? { ...m, lida_por: lidaPor } : m)));
    try {
      await base44.entities.Mensagem.update(mensagem.id, { lida_por: lidaPor });
    } catch (_e) {
      load(); // falhou a gravar: repõe o que está mesmo no servidor
    }
  };

  const marcarTodasLidas = async () => {
    if (!userId) return;
    const porMarcar = mensagens.filter(naoLida);
    if (porMarcar.length === 0) return;
    setMensagens((prev) => prev.map((m) => (naoLida(m) ? { ...m, lida_por: [...(m.lida_por || []), userId] } : m)));
    try {
      await Promise.all(
        porMarcar.map((m) => base44.entities.Mensagem.update(m.id, { lida_por: [...(m.lida_por || []), userId] }))
      );
    } catch (_e) {
      load();
    }
  };

  return { mensagens, porLer, isLoading, naoLida, marcarLida, marcarTodasLidas, recarregar: load };
}
