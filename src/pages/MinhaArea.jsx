import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { RefreshCw, Handshake, Truck, Tag, MessageSquare, Info, Package } from "lucide-react";
import { listarTudo } from "@/components/atlas/carregarTudo";
import AvisoTruncado from "@/components/atlas/AvisoTruncado";
import { ESTADO_CONFIG } from "@/components/atlas/constants";
import {
  minhasReservas, meusPedidos, contarPorEstado, kpisComercial,
  PERIODOS, inicioDoPeriodo, pedidosComEstado,
} from "@/components/atlas/minhasCoisas";

const ESTADO_PEDIDO = {
  aberto: { label: "ABERTO", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  em_execucao: { label: "EM CURSO", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40" },
  concluido: { label: "CONCLUÍDO", cls: "bg-green-500/15 text-green-300 border-green-500/40" },
  cancelado: { label: "CANCELADO", cls: "bg-slate-600/20 text-slate-400 border-slate-600/40" },
};

const data = (d) => (d ? format(new Date(d), "dd/MM/yy") : "—");

const Vazio = ({ texto }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-500">
    <Package className="w-8 h-8 mb-2 opacity-30" />
    <p className="text-sm">{texto}</p>
  </div>
);

const Seccao = ({ titulo, contagem, children }) => (
  <div>
    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300 mb-3">
      {titulo} <span className="num text-slate-500">({contagem})</span>
    </h3>
    {children}
  </div>
);

/**
 * O que é meu: as minhas reservas, os meus pedidos e as minhas contas.
 *
 * Um comercial não quer percorrer o inventário inteiro à procura das máquinas
 * que prometeu a clientes — quer a sua lista, com o andamento de cada uma, e
 * quer saber quantas colocou.
 */
export default function MinhaArea({ currentUser }) {
  const [ciclos, setCiclos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [truncado, setTruncado] = useState(false);
  const [dias, setDias] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const lidos = await listarTudo(base44.entities.Ciclo);
      setCiclos(lidos.registos);
      setTruncado(lidos.truncado);
      setMaquinas((await listarTudo(base44.entities.Maquina)).registos);
      try {
        setPedidos((await listarTudo(base44.entities.PedidoMaquina)).registos);
      } catch (_e) {
        setPedidos([]);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const porId = useMemo(() => new Map(maquinas.map((m) => [m.id, m])), [maquinas]);
  const modeloDe = (c) => porId.get(c.maquina_id)?.modelo || "—";

  const reservas = useMemo(() => minhasReservas(ciclos, currentUser), [ciclos, currentUser]);
  // O estado gravado no pedido é uma cópia do andamento da máquina, e as cópias
  // soltam-se: durante meses nada fechava um pedido quando a oficina acabava.
  // Vale o estado efetivo, e mostra-se a máquina ao lado para nunca mais haver
  // dúvida sobre qual dos dois é a verdade.
  const pedidosMeus = useMemo(
    () => pedidosComEstado(meusPedidos(pedidos, currentUser), ciclos),
    [pedidos, ciclos, currentUser],
  );
  const estados = useMemo(
    () => contarPorEstado(pedidosMeus.map(({ pedido, estado }) => ({ ...pedido, estado }))),
    [pedidosMeus],
  );
  // Os pedidos entram nos KPIs: na prática a reserva quase não é usada, e é no
  // pedido que fica a marca de quem tratou daquela máquina.
  const kpis = useMemo(
    () => kpisComercial(ciclos, currentUser, { desde: inicioDoPeriodo(dias), pedidos }),
    [ciclos, currentUser, dias, pedidos],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cartoes = [
    { label: "Alugadas", valor: kpis.alugadas, Icone: Truck, cor: "text-purple-400", fundo: "bg-purple-500/10" },
    { label: "Vendidas", valor: kpis.vendidas, Icone: Tag, cor: "text-green-400", fundo: "bg-green-500/10" },
    { label: "Total colocado", valor: kpis.total, Icone: Handshake, cor: "text-amber-400", fundo: "bg-amber-500/10" },
    { label: "Reservas ativas", valor: reservas.length, Icone: Package, cor: "text-cyan-400", fundo: "bg-cyan-500/10" },
    { label: "Pedidos por responder", valor: estados.aberto, Icone: MessageSquare, cor: "text-slate-300", fundo: "bg-slate-500/10" },
  ];

  return (
    <div className="space-y-6">
      <AvisoTruncado truncado={truncado} />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {PERIODOS.map((p) => (
            <button
              key={String(p.chave)}
              onClick={() => setDias(p.chave)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                dias === p.chave ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={loadData} title="Recarregar" className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-amber-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cartoes.map(({ label, valor, Icone, cor, fundo }) => (
          <div key={label} className="glass border border-slate-700 rounded-lg p-4">
            <div className={`w-8 h-8 rounded-lg ${fundo} flex items-center justify-center mb-2`}>
              <Icone className={`w-4 h-4 ${cor}`} />
            </div>
            <p className="kpi-num text-slate-100">{valor}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Um total que esconde o que não conseguiu contar é pior do que não haver
          total: quem vir "2 vendas" e souber que saíram 5 máquinas tem de poder
          perceber onde está a diferença, sem ir perguntar. */}
      {kpis.semComercial > 0 && (
        <div className="flex items-start gap-2 glass border border-slate-700 rounded-lg p-3">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400">
            No período saíram <span className="num font-bold text-slate-200">{kpis.saidasNoPeriodo}</span> máquinas, das quais{" "}
            <span className="num font-bold text-slate-200">{kpis.semComercial}</span> sem comercial atribuído — ninguém lhes tocou, nem por reserva
            nem por pedido, por isso não entram na conta de ninguém.
          </p>
        </div>
      )}

      <Seccao titulo="As minhas reservas" contagem={reservas.length}>
        {reservas.length === 0 ? (
          <Vazio texto="Ainda não tem reservas." />
        ) : (
          <div className="space-y-1.5">
            {reservas.map(({ ciclo, estado }) => {
              const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.entrada;
              return (
                <div key={ciclo.id} className={`glass cat-${ciclo.categoria} border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap`}>
                  <span className="num text-sm font-bold text-slate-100">{ciclo.serie}</span>
                  <span className="text-xs text-slate-500">{modeloDe(ciclo)}</span>
                  <span className="text-xs text-cyan-400 truncate">{ciclo.reserva_cliente}</span>
                  <span className="ml-auto flex items-center gap-3 flex-shrink-0">
                    <span className="text-[11px] text-slate-500">prevista {data(ciclo.reserva_data)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full state-dot ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Seccao>

      <Seccao titulo="Os meus pedidos" contagem={pedidosMeus.length}>
        {pedidosMeus.length === 0 ? (
          <Vazio texto="Ainda não fez pedidos." />
        ) : (
          <div className="space-y-1.5">
            {pedidosMeus.map(({ pedido: p, estado, estadoMaquina, derivado }) => {
              const cfg = ESTADO_PEDIDO[estado] || ESTADO_PEDIDO.aberto;
              const maq = estadoMaquina ? ESTADO_CONFIG[estadoMaquina] : null;
              return (
                <div key={p.id} className="glass border border-slate-700 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="num text-sm font-bold text-slate-100">{p.serie}</span>
                    <span className="text-xs text-slate-400 flex-1 min-w-0">{p.texto}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-600">{data(p.created_date)}</span>
                      {/* O estado da máquina ao lado do estado do pedido: é a
                          máquina que manda, e assim vê-se logo qual é qual. */}
                      {maq && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 ${maq.bg} ${maq.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full state-dot ${maq.dot}`} />
                          {maq.label}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg.cls}`}>{cfg.label}</span>
                    </span>
                  </div>
                  {p.resposta && (
                    <p className="text-xs text-slate-400 mt-1.5 pl-2 border-l-2 border-slate-700">
                      <span className="text-slate-500">{p.respondido_por || "Gestão"}:</span> {p.resposta}
                    </p>
                  )}
                  {/* Sem esta linha, o estado e a última mensagem parecem
                      contradizer-se: "CONCLUÍDO" por cima de "passou à oficina". */}
                  {derivado && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Concluído com a preparação da máquina.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Seccao>
    </div>
  );
}
