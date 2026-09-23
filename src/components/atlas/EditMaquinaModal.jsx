import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { SPEC_OPTIONS, CATEGORIA_CONFIG, CATEGORIA_CONE_MAP, CONE_COLORS, ESTADO_CONFIG } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";
import { isCategoriaSemEstado, estadoEfetivo, ESTADOS_OFICINA, podeGerirEstadoOficina } from "@/components/atlas/cicloUtils";
import { podeEditarCategoria, podeEditarEstado } from "@/components/hooks/usePermissions";

const OptionButton = ({ option, isSelected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(option.value)}
    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[64px] ${
      isSelected
        ? "border-amber-500 bg-amber-500/10 text-amber-400"
        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
    }`}
  >
    <span className="text-xl mb-1">{option.icon}</span>
    <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
  </button>
);

export default function EditMaquinaModal({ maquina, ciclo, currentUser, open, onClose, onSave, canDeleteMaquina, onDelete }) {
  const [specs, setSpecs] = useState({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "", horimetro: "" });
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [tipoSaida, setTipoSaida] = useState("");
  const [clienteSaida, setClienteSaida] = useState("");
  const [diasAlugada, setDiasAlugada] = useState("");
  const [coneNumero, setConeNumero] = useState("");
  const [coneError, setConeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [serie, setSerie] = useState("");

  const isAdmin = currentUser?.perfil === "administrador";
  const canEditCategoria = podeEditarCategoria(currentUser);
  // A gestão e a logística mexem no estado dentro do circuito da oficina; o
  // administrador em todos, porque é ele que corrige registos.
  const canEditEstado = podeEditarEstado(currentUser, ciclo, podeGerirEstadoOficina);
  // Quem pode editar mas está fora do circuito vê o estado e a razão de não lhe
  // poder mexer — em branco pareceria um campo que se esqueceram de pôr.
  const explicaEstadoBloqueado = !isAdmin && !canEditEstado;
  const serieChanged = serie.trim().length > 0 && serie.trim() !== (maquina?.serie || "");
  const effectiveConeCor = CATEGORIA_CONE_MAP[categoria] || null;
  const needsCone = !!effectiveConeCor;
  // Sucata/indefinida não têm estado de fluxo — ficam sempre em "indefinido".
  const semEstado = isCategoriaSemEstado(categoria);

  useEffect(() => {
    if (maquina) {
      setSpecs({
        mastro: maquina.mastro || "",
        vias_mastro: maquina.vias_mastro || "",
        joystick: maquina.joystick || "",
        tipo_pneu: maquina.tipo_pneu || "",
        acessorios: maquina.acessorios || [],
        h3: maquina.h3 || "",
        bateria: maquina.bateria || "",
        horimetro: maquina.horimetro || "",
      });
      setCategoria(ciclo?.categoria || "");
      setEstado(estadoEfetivo(ciclo) || "");
      setTipoSaida(ciclo?.tipo_saida || "");
      setClienteSaida(ciclo?.reserva_cliente || "");
      setDiasAlugada(ciclo?.dias_alugada ?? "");
      setConeNumero(ciclo?.cone_numero || "");
      setSerie(maquina?.serie || "");
      setConeError("");
    }
  }, [maquina, ciclo]);

  const handleSpecSelect = (field, value) => {
    setSpecs((prev) => ({ ...prev, [field]: prev[field] === value ? "" : value }));
  };

  const handleAcessorioToggle = (value) => {
    setSpecs((prev) => {
      const arr = prev.acessorios || [];
      return { ...prev, acessorios: arr.includes(value) ? arr.filter((a) => a !== value) : [...arr, value] };
    });
  };

  const validateCone = async () => {
    if (!needsCone || !coneNumero) { setConeError(""); return; }
    const result = await validateConeNumber(categoria, coneNumero, ciclo?.id);
    if (!result.free) {
      setConeError(`Cone ${coneNumero} ${effectiveConeCor} já está em uso — NS ${result.conflito.serie}`);
    } else {
      setConeError("");
    }
  };

  const handleSave = async () => {
    if (coneError || !serie.trim()) return;
    setSaving(true);
    try {
      // Trava: o cone (cor + nº) tem de ser único entre as máquinas no pátio.
      if (needsCone && coneNumero) {
        const result = await validateConeNumber(categoria, coneNumero, ciclo?.id);
        if (!result.free) {
          setConeError(`Cone ${coneNumero} ${effectiveConeCor} já está em uso — NS ${result.conflito.serie}`);
          setSaving(false);
          return;
        }
      }
      const cicloUpdates = {};
      if (categoria !== (ciclo?.categoria || "")) {
        cicloUpdates.categoria = categoria;
        cicloUpdates.cone_cor = effectiveConeCor;
        cicloUpdates.cone_numero = needsCone ? coneNumero : null;
      } else if (canEditCategoria && coneNumero !== (ciclo?.cone_numero || "")) {
        // Antes só o administrador gravava aqui: quem mudasse o número sem
        // mudar a categoria via o campo aceitar o que escreveu e a alteração
        // desaparecer sem aviso. Quem troca o cone à máquina é quem anda no
        // pátio, e a unicidade já está travada na validação acima.
        cicloUpdates.cone_numero = coneNumero || null;
        cicloUpdates.cone_cor = effectiveConeCor;
      }
      // A categoria manda no estado: sucata/indefinida ficam sempre em "indefinido",
      // e ao sair dessas categorias a máquina volta ao fluxo como "classificada".
      const categoriaMudou = categoria !== (ciclo?.categoria || "");
      const estadoFinal = semEstado
        ? "indefinido"
        : estado && estado !== "indefinido"
          ? estado
          : "classificada";
      if (estadoFinal !== (ciclo?.estado || "") && (canEditEstado || categoriaMudou)) {
        cicloUpdates.estado = estadoFinal;
        // Deixou de estar pronta: a data de conclusão já não descreve nada. Sem
        // a limpar, a Saída continuava a anunciar "Pronta desde…" numa máquina
        // que voltou à oficina, e o tempo de prateleira contava a partir dela.
        if (ciclo?.estado === "pronta" && estadoFinal !== "pronta") {
          cicloUpdates.data_pronta = null;
        }
      }
      if (isAdmin) {
        if (tipoSaida !== (ciclo?.tipo_saida || "")) cicloUpdates.tipo_saida = tipoSaida || null;
        if (clienteSaida !== (ciclo?.reserva_cliente || "")) cicloUpdates.reserva_cliente = clienteSaida;
        if (diasAlugada !== (ciclo?.dias_alugada ?? "")) cicloUpdates.dias_alugada = diasAlugada === "" ? null : Number(diasAlugada);
      }
      await onSave(specs, cicloUpdates, serieChanged ? serie.trim() : null);
      onClose();
    } catch (e) {
      // error handled by parent
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Editar Máquina — {maquina?.serie}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Número de Série (NS) <span className="text-amber-400">· chave de ligação</span></label>
            <input
              type="text"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              placeholder="NS da máquina"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm font-mono tracking-wider"
            />
            {serieChanged && (
              <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                NS alterado — será atualizado em todos os registos ligados
              </p>
            )}
          </div>

          {canEditCategoria && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Categoria <span className="text-amber-400">· define o caminho</span></h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {Object.entries(CATEGORIA_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setCategoria(key); setConeError(""); }}
                    className={`py-2 rounded-lg border-2 font-bold text-xs transition-all ${
                      categoria === key
                        ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                        : "border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600"
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsCone && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">CONE:</span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 text-slate-200 text-sm font-bold uppercase">
                  <span className={`w-3 h-3 rounded-full ${CONE_COLORS.find((c) => c.value === effectiveConeCor)?.bg}`} />
                  {effectiveConeCor}
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Nº do cone (número físico)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={coneNumero}
                  onChange={(e) => { setConeNumero(e.target.value); setConeError(""); }}
                  onBlur={validateCone}
                  placeholder="Nº do cone"
                  className={`w-full px-3 py-2.5 bg-slate-900 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none text-sm ${coneError ? "border-red-500" : "border-slate-700 focus:border-amber-500"}`}
                />
                {coneError && <p className="text-xs text-red-400 mt-1">{coneError}</p>}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Mastro</h3>
            <div className="grid grid-cols-3 gap-2">
              {SPEC_OPTIONS.mastro.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.mastro === o.value} onClick={(v) => handleSpecSelect("mastro", v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">H3 — Altura (mm)</h3>
            <input
              type="text"
              inputMode="numeric"
              value={specs.h3}
              onChange={(e) => setSpecs((prev) => ({ ...prev, h3: e.target.value }))}
              placeholder="ex. 4455"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          {/* Pode entrar aqui em qualquer altura: as máquinas já registadas não
              o têm, e obrigar a repetir o registo para o acrescentar não faria
              sentido nenhum. */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">
              Horímetro (horas) <span className="text-slate-600 font-normal">(opcional)</span>
            </h3>
            <input
              type="text"
              inputMode="numeric"
              value={specs.horimetro}
              onChange={(e) => setSpecs((prev) => ({ ...prev, horimetro: e.target.value }))}
              placeholder="ex. 3420"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Vias do Mastro</h3>
            <div className="grid grid-cols-3 gap-2">
              {SPEC_OPTIONS.vias_mastro.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.vias_mastro === o.value} onClick={(v) => handleSpecSelect("vias_mastro", v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Joystick</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SPEC_OPTIONS.joystick.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.joystick === o.value} onClick={(v) => handleSpecSelect("joystick", v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Tipo de Pneu</h3>
            <div className="grid grid-cols-2 gap-2">
              {SPEC_OPTIONS.tipo_pneu.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.tipo_pneu === o.value} onClick={(v) => handleSpecSelect("tipo_pneu", v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Bateria</h3>
            <div className="grid grid-cols-2 gap-2">
              {SPEC_OPTIONS.bateria.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.bateria === o.value} onClick={(v) => handleSpecSelect("bateria", v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Acessórios</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPEC_OPTIONS.acessorios.map((o) => {
                const isSelected = (specs.acessorios || []).includes(o.value);
                return (
                  <OptionButton key={o.value} option={o} isSelected={isSelected} onClick={() => handleAcessorioToggle(o.value)} />
                );
              })}
            </div>
          </div>

          {/* Estado — a gestão mexe no circuito da oficina, o admin em tudo */}
          {canEditEstado && (
            <div className="space-y-2 border-t border-slate-700 pt-4">
              <label className="text-sm font-medium text-slate-300 block">Estado</label>
              <select
                value={semEstado ? "indefinido" : estado}
                onChange={(e) => setEstado(e.target.value)}
                disabled={semEstado}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm disabled:opacity-60"
              >
                {isAdmin ? (
                  <>
                    <option value="indefinido">Indefinido</option>
                    <option value="entrada">Entrada</option>
                    <option value="classificada">Classificada</option>
                    <option value="autorizada">Autorizada</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="pronta">Pronta</option>
                    <option value="em_aluguer">Em Aluguer</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="retorno">Retorno</option>
                    <option value="fechado">Fechado</option>
                  </>
                ) : (
                  ESTADOS_OFICINA.map((e) => (
                    <option key={e} value={e}>{ESTADO_CONFIG[e]?.label || e}</option>
                  ))
                )}
              </select>
              {semEstado ? (
                <p className="text-xs text-slate-500">
                  Categoria sem fluxo de preparação — o estado fica INDEFINIDO.
                </p>
              ) : !isAdmin && (
                <p className="text-xs text-slate-500">
                  Para devolver uma máquina pronta à oficina, ponha-a em <span className="font-medium text-slate-400">Classificada</span>:
                  volta à fila de autorização e segue com os pedidos que tiver.
                </p>
              )}
            </div>
          )}

          {/* Vê o estado mas não lhe pode mexer — vale a pena dizer porquê */}
          {explicaEstadoBloqueado && !semEstado && (
            <div className="border-t border-slate-700 pt-4">
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Estado</label>
              <div className="px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-400 text-sm">
                {ESTADO_CONFIG[estadoEfetivo(ciclo)]?.label || "—"}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Este estado não se muda daqui: está nas mãos do Watcher ou do movimento do pátio.
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-4 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-bold text-amber-400">Controlo de registo (admin)</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Tipo de Saída</label>
                  <select
                    value={tipoSaida}
                    onChange={(e) => setTipoSaida(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm"
                  >
                    <option value="">—</option>
                    <option value="alugada">Alugada</option>
                    <option value="vendida">Vendida</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Dias Alugada</label>
                  <input
                    type="number"
                    value={diasAlugada}
                    onChange={(e) => setDiasAlugada(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Cliente da Saída</label>
                <input
                  type="text"
                  value={clienteSaida}
                  onChange={(e) => setClienteSaida(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {canDeleteMaquina && onDelete && (
            <Button
              variant="destructive"
              onClick={() => { onClose(); onDelete(maquina); }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Eliminar
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !!coneError || !serie.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}