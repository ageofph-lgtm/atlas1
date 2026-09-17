import React, { useState, useMemo } from "react";
import { X, Inbox, CheckCheck, Loader2, ArrowRightLeft, LogIn, LogOut, CalendarClock, MessageSquarePlus, Bell, ChevronRight } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

const ICONE = {
  entrada: LogIn,
  saida: LogOut,
  estado: ArrowRightLeft,
  categoria: ArrowRightLeft,
  reserva: CalendarClock,
  pedido: MessageSquarePlus,
  aviso: Bell,
};

const COR = {
  entrada: "text-green-400",
  saida: "text-cyan-400",
  estado: "text-amber-400",
  categoria: "text-purple-400",
  reserva: "text-cyan-400",
  pedido: "text-purple-400",
  aviso: "text-slate-400",
};

/**
 * Cada assunto tem o seu sítio. A gestão recebe dezenas de mensagens por dia e
 * sem isto tudo se mistura: movimento do pátio, oficina, comercial.
 */
const ABAS = [
  { key: "todas", label: "Todas", tipos: null },
  { key: "movimento", label: "Pátio", tipos: ["entrada", "saida"] },
  { key: "oficina", label: "Oficina", tipos: ["estado"] },
  { key: "classificacao", label: "Classificação", tipos: ["categoria"] },
  { key: "reservas", label: "Reservas", tipos: ["reserva"] },
  { key: "pedidos", label: "Pedidos", tipos: ["pedido"] },
];

const quando = (d) => {
  if (!d) return "—";
  const data = new Date(d);
  if (isToday(data)) return format(data, "HH:mm");
  if (isYesterday(data)) return `ontem ${format(data, "HH:mm")}`;
  return format(data, "dd/MM HH:mm");
};

/** Painel da caixa de mensagens, aberto a partir do sino do cabeçalho. */
export default function CaixaMensagens({ open, onClose, mensagens, porLer, isLoading, naoLida, onMarcarLida, onMarcarTodasLidas, onAbrirMaquina }) {
  const [aba, setAba] = useState("todas");
  const [soPorLer, setSoPorLer] = useState(false);

  const daAba = (m, key) => {
    const cfg = ABAS.find((a) => a.key === key);
    return !cfg?.tipos || cfg.tipos.includes(m.tipo);
  };

  const contagens = useMemo(() => {
    const c = {};
    ABAS.forEach((a) => { c[a.key] = mensagens.filter((m) => daAba(m, a.key) && naoLida(m)).length; });
    return c;
  }, [mensagens, naoLida]);

  const visiveis = useMemo(
    () => mensagens.filter((m) => daAba(m, aba) && (!soPorLer || naoLida(m))),
    [mensagens, aba, soPorLer, naoLida]
  );

  // Ler a mensagem e ir para a máquina são a mesma intenção: quem clica quer ver o caso.
  const abrir = (m) => {
    onMarcarLida(m);
    if (m.serie && onAbrirMaquina) onAbrirMaquina(m);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Caixa de mensagens">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute top-0 right-0 w-full sm:w-[26rem] h-full glass-2 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-slate-700">
          <Inbox className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-slate-100">Mensagens</h2>
          {porLer > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{porLer}</span>
          )}
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
          <div className="ml-auto flex items-center gap-1">
            {porLer > 0 && (
              <button
                onClick={onMarcarTodasLidas}
                title="Marcar todas como lidas"
                className="p-2 text-slate-400 hover:text-amber-400 rounded-lg"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Abas por assunto */}
        <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto no-scrollbar border-b border-slate-800">
          {ABAS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={`px-2.5 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${
                aba === a.key ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {a.label}
              {contagens[a.key] > 0 && (
                <span className="bg-red-500/90 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                  {contagens[a.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-b border-slate-800">
          <button
            onClick={() => setSoPorLer((v) => !v)}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              soPorLer
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
            }`}
          >
            {soPorLer ? "a mostrar só por ler" : "mostrar só por ler"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visiveis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Inbox className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">{soPorLer ? "Nada por ler aqui" : "Sem mensagens"}</p>
            </div>
          ) : (
            visiveis.map((m) => {
              const Icon = ICONE[m.tipo] || Bell;
              const porLerEsta = naoLida(m);
              return (
                <button
                  key={m.id}
                  onClick={() => abrir(m)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-800 transition-colors ${
                    porLerEsta ? "bg-amber-500/[0.06] hover:bg-amber-500/10" : "hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${COR[m.tipo] || "text-slate-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className={`text-sm truncate ${porLerEsta ? "font-bold text-slate-100" : "font-medium text-slate-300"}`}>
                        {m.titulo}
                      </p>
                      <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">{quando(m.created_date)}</span>
                    </div>
                    {m.corpo && <p className="text-xs text-slate-400 mt-0.5 break-words">{m.corpo}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                      {m.autor && <p className="text-[10px] text-slate-600">{m.autor}</p>}
                      {m.serie && onAbrirMaquina && (
                        <span className="text-[10px] text-amber-400/70 flex items-center gap-0.5 ml-auto">
                          ver máquina <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  {porLerEsta && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
