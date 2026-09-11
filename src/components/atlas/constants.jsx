// ATLAS shared constants — dark industrial theme

export const ESTADO_CONFIG = {
  entrada:       { label: 'Entrada',       short: 'ENT',    dot: 'bg-kn',   text: 'text-kn',   bg: 'bg-kn/10',   border: 'border-kn/30' },
  classificada:  { label: 'Classificada',  short: 'CLS',    dot: 'bg-ccla', text: 'text-ccla', bg: 'bg-ccla/10', border: 'border-ccla/30' },
  autorizada:    { label: 'Autorizada',    short: 'AUT',    dot: 'bg-caut', text: 'text-caut', bg: 'bg-caut/10', border: 'border-caut/30' },
  em_execucao:   { label: 'Em Execução',   short: 'EXEC',   dot: 'bg-cexe', text: 'text-cexe', bg: 'bg-cexe/10', border: 'border-cexe/30' },
  pronta:        { label: 'Pronta',        short: 'PRONTA',  dot: 'bg-cpro', text: 'text-cpro', bg: 'bg-cpro/10', border: 'border-cpro/30' },
  em_aluguer:    { label: 'Em Aluguer',    short: 'ALUG',   dot: 'bg-calu', text: 'text-calu', bg: 'bg-calu/10', border: 'border-calu/30' },
  manutencao:    { label: 'Manutenção',    short: 'MANUT',   dot: 'bg-ccla', text: 'text-ccla', bg: 'bg-ccla/10', border: 'border-ccla/30' },
  retorno:       { label: 'Retorno',       short: 'RET',     dot: 'bg-ka',   text: 'text-ka',   bg: 'bg-ka/10',   border: 'border-ka/30' },
  fechado:       { label: 'Fechado',       short: 'FECH',    dot: 'bg-kn',   text: 'text-kn',   bg: 'bg-kn/10',   border: 'border-kn/30' },
};

export const ESTADO_ORDER = [
  'entrada', 'classificada', 'autorizada', 'em_execucao', 'manutencao', 'pronta', 'em_aluguer'
];

export const CATEGORIA_CONFIG = {
  str:        { label: 'STR',        text: 'text-ka',  bg: 'bg-ka/15',  border: 'border-ka/40' },
  uts:        { label: 'UTS',        text: 'text-kv',  bg: 'bg-kv/15',  border: 'border-kv/40' },
  recon:      { label: 'RECON',      text: 'text-kz',  bg: 'bg-kz/15',  border: 'border-kz/40' },
  indefinida: { label: 'INDEFINIDA', text: 'text-kn',  bg: 'bg-kn/15',  border: 'border-kn/40' },
  sucata:     { label: 'SUCATA',     text: 'text-kn',  bg: 'bg-kn/15',  border: 'border-kn/40' },
};

export const CATEGORIA_CONE_MAP = {
  str: 'amarelo',
  uts: 'vermelho',
  recon: 'azul',
  indefinida: null,
  sucata: null,
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
  bateria: [
    { value: 'chumbo', label: 'Chumbo', icon: '🔋' },
    { value: 'litio',  label: 'Lítio',  icon: '⚡' }
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
  bateria: { chumbo: 'Chumbo', litio: 'Lítio' },
  acessorios: {
    posicionador_2_garfos: 'Pos2G',
    posicionador_4_garfos: 'Pos4G',
    sideshift: 'SideS',
    pinca: 'Pinça',
    volteador: 'Volt.'
  }
};

export const FILTER_OPTIONS = {
  categoria: [
    { value: 'all', label: 'Todas' },
    { value: 'str', label: 'STR' },
    { value: 'uts', label: 'UTS' },
    { value: 'recon', label: 'RECON' },
    { value: 'indefinida', label: 'INDEFINIDA' },
    { value: 'sucata', label: 'SUCATA' }
  ],
  estado: [
    { value: 'all', label: 'Todos' },
    { value: 'entrada', label: 'Entrada' },
    { value: 'classificada', label: 'Classificada' },
    { value: 'autorizada', label: 'Autorizada' },
    { value: 'em_execucao', label: 'Em Execução' },
    { value: 'manutencao', label: 'Manutenção' },
    { value: 'pronta', label: 'Pronta' },
    { value: 'em_aluguer', label: 'Em Aluguer' }
  ],
  mastro: [
    { value: 'all', label: 'Todos' },
    ...SPEC_OPTIONS.mastro.map(o => ({ value: o.value, label: o.label }))
  ],
  vias_mastro: [
    { value: 'all', label: 'Todos' },
    ...SPEC_OPTIONS.vias_mastro.map(o => ({ value: o.value, label: o.label }))
  ],
  tipo_pneu: [
    { value: 'all', label: 'Todos' },
    ...SPEC_OPTIONS.tipo_pneu.map(o => ({ value: o.value, label: o.label }))
  ]
};

export const INVENTARIO_TABS = [
  { key: 'por_fazer', label: 'POR FAZER' },
  { key: 'prontas', label: 'PRONTAS' },
  { key: 'recon', label: 'RECON' },
  { key: 'uts', label: 'UTS' },
  { key: 'sucata', label: 'SUCATA' },
  { key: 'em_aluguer', label: 'EM ALUGUER' },
  { key: 'fechados', label: 'FECHADOS', adminOnly: true }
];