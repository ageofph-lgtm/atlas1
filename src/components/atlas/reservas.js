/**
 * Porta de entrada da app para as regras da reserva.
 *
 * A regra em si vive em `base44/shared/reservasExpiradas.js`, porque a função
 * que limpa as reservas antigas corre no backend e não pode importar de `src/`.
 * Aqui só se reexporta, para que a app tenha um caminho de import previsível e
 * para que os testes cubram o mesmo ficheiro que a função usa.
 */
export {
  PRAZO_RESERVA_DIAS,
  reservaAtiva,
  reservaCriadaEm,
  diasDeReserva,
  diasParaExpirar,
  reservaExpirada,
  avisoDoPrazo,
  notaDaExpiracao,
  corpoDoAviso,
} from "../../../base44/shared/reservasExpiradas.js";
