import React from "react";
import { WifiOff } from "lucide-react";
import { useEstadoRede } from "@/components/atlas/rede";

/**
 * Diz que não há rede, antes de alguém tentar gravar.
 *
 * Aparece por cima de tudo, fixo, porque o pátio tem zonas de mau sinal e
 * descobrir a falta de rede só depois de preencher três passos é o pior sítio
 * para a descobrir.
 */
export default function AvisoSemRede() {
  const online = useEstadoRede();
  if (online) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white text-xs font-bold px-3 py-1.5 flex items-center justify-center gap-2 shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      Sem ligação — pode consultar, mas não é possível registar nada. O que escrever fica guardado.
    </div>
  );
}
