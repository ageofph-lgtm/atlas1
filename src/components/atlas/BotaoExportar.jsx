import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { exportarCiclos } from "@/components/atlas/exportarCiclos";

/**
 * Exporta para Excel o que está no ecrã — já filtrado, pesquisado e ordenado.
 *
 * A contagem no botão é para não haver surpresas: quem vê 12 máquinas não
 * espera abrir uma folha com 500.
 */
export default function BotaoExportar({ ciclos, getMaquina, pagina, titulo = "Exportar para Excel" }) {
  const { toast } = useToast();
  const [aExportar, setAExportar] = useState(false);
  const total = ciclos?.length || 0;

  const exportar = async () => {
    setAExportar(true);
    try {
      const r = await exportarCiclos(ciclos, { getMaquina, pagina });
      if (!r.ok) toast({ variant: "destructive", title: "Nada a exportar", description: r.erro });
      else toast({ title: "✓ Folha gerada", description: `${r.linhas} máquina(s) exportada(s)` });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao exportar", description: err.message });
    }
    setAExportar(false);
  };

  return (
    <button
      onClick={exportar}
      disabled={aExportar || total === 0}
      title={total === 0 ? "Não há máquinas para exportar" : titulo}
      className="flex items-center gap-1.5 px-2.5 py-1.5 glass border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 hover:border-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700"
    >
      {aExportar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      <span className="hidden sm:inline">Exportar</span>
      {total > 0 && <span className="num text-slate-500">{total}</span>}
    </button>
  );
}
