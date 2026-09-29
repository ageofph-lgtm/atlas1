import React from "react";

/**
 * Badge "UTS" para máquinas UTS com cone não-vermelho.
 *
 * Com a falta de cones vermelhos físicos, máquinas UTS estão no pátio com cone
 * amarelo — igual às STR. O badge é a única distinção visual. Quando os cones
 * vermelhos chegarem e forem trocados, o badge desaparece sozinho (a regra
 * auto-resolve quando cone_cor volta a 'vermelho').
 */
export default function UtsBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border border-kv/40 text-kv bg-kv/10 ${className}`}
      title="UTS com cone não-vermelho — distinga das STR"
    >
      UTS
    </span>
  );
}