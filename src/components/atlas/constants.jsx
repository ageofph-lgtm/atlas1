// ATLAS shared constants — dark industrial theme

export const ESTADO_CONFIG = {
  entrada:       { label: 'Entrada',       short: 'ENT',   dot: 'bg-blue-500',    text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  classificada:  { label: 'Classificada',  short: 'CLS',   dot: 'bg-amber-500',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  autorizada:    { label: 'Autorizada',    short: 'AUT',   dot: 'bg-purple-500',  text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30' },
  em_execucao:   { label: 'Em Execução',   short: 'EXEC',  dot: 'bg-orange-500',  text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30' },
  pronta:        { label: 'Pronta',        short: 'PRONTA',dot: 'bg-green-500',   text: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/30' },
  em_aluguer:    { label: 'Em Aluguer',    short: 'ALUG',  dot: 'bg-cyan-500',    text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30' },
  retorno:       { label: 'Retorno',       short: 'RET',   dot: 'bg-yellow-500',  text: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30' },
  fechado:       { label: 'Fechado',       short: 'FECH',  dot: 'bg-slate-500',   text: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30' },
};

export const ESTADO_ORDER = [
  'entrada', 'classificada', 'autorizada', 'em_execucao', 'pronta', 'em_aluguer'
];

export const CATEGORIA_CONFIG = {
  str:    { label: 'STR',    text: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/40' },
  nts:    { label: 'NTS',    text: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/40' },
  uts:    { label: 'UTS',    text: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/40' },
  sucata: { label: 'SUCATA', text: 'text-slate-400',  bg: 'bg-slate-500/15',  border: 'border-slate-500/40' },
};

export const CONE_COLORS = [
  { value: 'vermelho', label: 'Vermelho', bg: 'bg-red-500',   ring: 'ring-red-500' },
  { value: 'azul',     label: 'Azul',     bg: 'bg-blue-500',  ring: 'ring-blue-500' },
  { value: 'verde',    label: 'Verde',    bg: 'bg-green-500', ring: 'ring-green-500' },
  { value: 'amarelo',  label: 'Amarelo',  bg: 'bg-yellow-500',ring: 'ring-yellow-500' },
  { value: 'branco',   label: 'Branco',  bg: 'bg-white',     ring: 'ring-white' },
  { value: 'preto',    label: 'Preto',    bg: 'bg-gray-800',  ring: 'ring-gray-600' },
];

export const SPEC_OPTIONS = {
  mastro: [
    { value: 'triplex',     label: 'Triplex',     icon: '🏗️' },
    { value: 'telescopico', label: 'Telescópico', icon: '📏' },
    { value: 'niho',        label: 'Niho',        icon: '🔧' }
  ],
  vias_mastro: [
    { value: '3', label: '3 Vias', icon: '3️⃣' },
    { value: '4', label: '4 Vias', icon: '4️⃣' },
    { value: '5', label: '5 Vias', icon: '5️⃣' }
  ],
  joystick: [
    { value: 'alavanca',   label: 'Alavanca',   icon: '🕹️' },
    { value: 'minilever',  label: 'Minilever',  icon: '🎮' },
    { value: '4plus',      label: '4Plus',      icon: '🎯' },
    { value: 'fingertrip', label: 'Fingertrip', icon: '👆' }
  ],
  tipo_pneu: [
    { value: 'preto',  label: 'Preto',  icon: '⚫' },
    { value: 'branco', label: 'Branco', icon: '⚪' }
  ],
  acessorios: [
    { value: 'posicionador_2_garfos', label: 'Pos. 2 Garfos', icon: '🔀' },
    { value: 'posicionador_4_garfos', label: 'Pos. 4 Garfos', icon: '🔁' },
    { value: 'sideshift',             label: 'Sideshift',     icon: '↔️' },
    { value: 'pinca',                  label: 'Pinça',          icon: '🦀' },
    { value: 'volteador',              label: 'Volteador',      icon: '🔄' }
  ]
};

export const SPEC_LABELS = {
  mastro: { triplex: 'Triplex', telescopico: 'Telesc.', niho: 'Niho' },
  vias_mastro: { '3': '3V', '4': '4V', '5': '5V' },
  joystick: { alavanca: 'Alav.', minilever: 'Mini.', '4plus': '4+', fingertrip: 'Fing.' },
  tipo_pneu: { preto: 'Pn.Preto', branco: 'Pn.Branco' },
  acessorios: {
    posicionador_2_garfos: 'Pos2G',
    posicionador_4_garfos: 'Pos4G',
    sideshift: 'SideS',
    pinca: 'Pinça',
    volteador: 'Volt.'
  }
};