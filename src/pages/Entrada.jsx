import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Search, Check, ArrowRight, ArrowLeft, Package, Info, AlertTriangle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import PhotoCapture from "@/components/atlas/PhotoCapture";
import { SPEC_OPTIONS, CATEGORIA_CONFIG, CATEGORIA_CONE_MAP, CONE_COLORS } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";
import { isCategoriaSemEstado, classificarCiclosAbertos } from "@/components/atlas/cicloUtils";
import { registarRetorno, diasAlugada } from "@/components/atlas/registarRetorno";

const OptionButton = ({ option, isSelected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(option.value)}
    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[72px] ${
      isSelected
        ? "border-amber-500 bg-amber-500/10 text-amber-400"
        : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
    }`}
  >
    <span className="text-2xl mb-1">{option.icon}</span>
    <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
  </button>
);

export default function Entrada({ currentUser }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";
  const canChooseEstado = currentUser?.perfil === "logistica" || currentUser?.perfil === "administrador";

  const [step, setStep] = useState(1);
  const [serie, setSerie] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [existingMaquina, setExistingMaquina] = useState(null);
  const [passagens, setPassagens] = useState(0);
  const [ultimaSaida, setUltimaSaida] = useState(null);
  const [cicloNoPatio, setCicloNoPatio] = useState(null);
  const [cicloFora, setCicloFora] = useState(null);
  const [reentradaConfirmada, setReentradaConfirmada] = useState(false);
  const [searching, setSearching] = useState(false);
  const [specs, setSpecs] = useState({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "" });
  const [categoria, setCategoria] = useState("");
  const [estadoInicial, setEstadoInicial] = useState("classificada");
  const [coneNumero, setConeNumero] = useState("");
  const [coneError, setConeError] = useState("");
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const NOTA_LABELS = ["Duplicada", "Não funciona", "Garfos 2400", "Mau estado"];
  const toggleNotaLabel = (label) => {
    setNotas((prev) => {
      const text = prev || "";
      const idx = text.toLowerCase().indexOf(label.toLowerCase());
      if (idx !== -1) {
        const before = text.slice(0, idx).replace(/[,\s]+$/, "");
        const after = text.slice(idx + label.length).replace(/^[,\s]+/, "");
        return (before + (after ? " " + after : "")).trim();
      }
      const sep = text && !text.endsWith(" ") ? " " : "";
      return (text + sep + label).trim();
    });
  };

  // Live search when serie changes
  useEffect(() => {
    if (serie.length < 3) {
      setExistingMaquina(null);
      setPassagens(0);
      setUltimaSaida(null);
      setCicloNoPatio(null);
      setCicloFora(null);
      setReentradaConfirmada(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await base44.entities.Maquina.filter({ serie });
        if (results.length > 0) {
          const m = results[0];
          setExistingMaquina(m);
          setSpecs({
            mastro: m.mastro || "",
            vias_mastro: m.vias_mastro || "",
            joystick: m.joystick || "",
            tipo_pneu: m.tipo_pneu || "",
            acessorios: m.acessorios || [],
            h3: m.h3 || "",
            bateria: m.bateria || "",
          });
          if (m.modelo) setModelo(m.modelo);
          if (m.ano) setAno(m.ano);
          const ciclos = await base44.entities.Ciclo.filter({ serie });
          setPassagens(ciclos.length);
          const saidas = ciclos
            .filter((c) => c.data_saida)
            .sort((a, b) => new Date(b.data_saida) - new Date(a.data_saida));
          setUltimaSaida(saidas[0]?.data_saida || null);
          const { noPatio, fora } = classificarCiclosAbertos(ciclos);
          setCicloNoPatio(noPatio);
          setCicloFora(fora);
          setReentradaConfirmada(false);
          // Notas da máquina ficam editáveis — na reentrada podem ter de mudar.
          setNotas(m.observacoes || "");
        } else {
          setExistingMaquina(null);
          setPassagens(0);
          setUltimaSaida(null);
          setCicloNoPatio(null);
          setCicloFora(null);
          setReentradaConfirmada(false);
        }
      } catch (_e) {
        // ignore
      }
      setSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [serie]);

  const handlePhotoSuccess = (data) => {
    if (data.serie) setSerie(data.serie);
    if (data.modelo) setModelo(data.modelo);
    if (data.ano) setAno(data.ano);
    if (data.foto_url) setFotoUrl(data.foto_url);
  };

  const handleSpecSelect = (field, value) => {
    setSpecs((prev) => ({ ...prev, [field]: prev[field] === value ? "" : value }));
  };

  const handleAcessorioToggle = (value) => {
    setSpecs((prev) => {
      const arr = prev.acessorios || [];
      return {
        ...prev,
        acessorios: arr.includes(value) ? arr.filter((a) => a !== value) : [...arr, value],
      };
    });
  };

  // Fora do pátio só avança depois de confirmar que é uma reentrada.
  const canProceedStep1 = serie.length >= 3 && !cicloNoPatio && (!cicloFora || reentradaConfirmada);
  // Sucata e indefinida não seguem o fluxo de preparação — ficam em "indefinido".
  const semEstado = isCategoriaSemEstado(categoria);
  const estadoFinal = semEstado ? "indefinido" : estadoInicial;
  const coneCor = CATEGORIA_CONE_MAP[categoria] || null;
  const needsCone = !!coneCor;
  const canSubmit = categoria && (!needsCone || (coneNumero && !coneError));

  const validateCone = async () => {
    if (!needsCone || !coneNumero) { setConeError(""); return; }
    const result = await validateConeNumber(categoria, coneNumero);
    if (!result.free) {
      setConeError(`Cone ${coneNumero} ${coneCor} já está em uso — NS ${result.conflito.serie}`);
    } else {
      setConeError("");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      // Trava: uma série não pode ter dois ciclos abertos ao mesmo tempo.
      // Ter data_saida não basta para dar o ciclo por encerrado — uma máquina
      // em aluguer continua com o ciclo aberto até ao retorno.
      const ciclosCheck = await base44.entities.Ciclo.filter({ serie });
      const { noPatio, fora } = classificarCiclosAbertos(ciclosCheck);
      if (noPatio) {
        toast({ variant: "destructive", title: "Máquina já no pátio", description: `NS ${serie} ainda não deu saída.` });
        setIsSubmitting(false);
        return;
      }
      if (fora && !reentradaConfirmada) {
        setCicloFora(fora);
        toast({
          variant: "destructive",
          title: "Máquina em aluguer",
          description: `NS ${serie} ainda está fora. Confirme a reentrada no passo 1.`,
        });
        setIsSubmitting(false);
        return;
      }
      // Trava: o cone (cor + nº) tem de ser único entre as máquinas no pátio.
      if (needsCone && coneNumero) {
        const result = await validateConeNumber(categoria, coneNumero);
        if (!result.free) {
          setConeError(`Cone ${coneNumero} ${coneCor} já está em uso — NS ${result.conflito.serie}`);
          setIsSubmitting(false);
          return;
        }
      }
      // Reentrada: fecha o aluguer anterior como retorno. É isto que impede o
      // ciclo antigo de ficar para trás em aluguer e a máquina aparecer em duplicado.
      let diasDoAluguer = null;
      if (fora && reentradaConfirmada) {
        const res = await registarRetorno(fora, {
          autor,
          limparCone: true,
          nota: "Retorno registado na reentrada da máquina",
        });
        if (!res.ok) {
          toast({ variant: "destructive", title: "Erro ao fechar o aluguer", description: res.erro });
          setIsSubmitting(false);
          return;
        }
        diasDoAluguer = res.dias;
      }

      let maquinaId = existingMaquina?.id;

      if (!maquinaId) {
        const newMaquina = await base44.entities.Maquina.create({
          serie,
          modelo,
          ano,
          foto_url: fotoUrl,
          mastro: specs.mastro || "",
          vias_mastro: specs.vias_mastro || "",
          joystick: specs.joystick || "",
          tipo_pneu: specs.tipo_pneu || "",
          acessorios: specs.acessorios || [],
          h3: specs.h3 || "",
          bateria: specs.bateria || "",
          observacoes: notas || "",
        });
        maquinaId = newMaquina.id;
      } else {
        await base44.entities.Maquina.update(maquinaId, {
          modelo: modelo || existingMaquina.modelo,
          ano: ano || existingMaquina.ano,
          foto_url: fotoUrl || existingMaquina.foto_url,
          mastro: specs.mastro || existingMaquina.mastro,
          vias_mastro: specs.vias_mastro || existingMaquina.vias_mastro,
          joystick: specs.joystick || existingMaquina.joystick,
          tipo_pneu: specs.tipo_pneu || existingMaquina.tipo_pneu,
          acessorios: specs.acessorios?.length ? specs.acessorios : existingMaquina.acessorios,
          h3: specs.h3 || existingMaquina.h3 || "",
          bateria: specs.bateria || existingMaquina.bateria || "",
          observacoes: notas,
        });
      }

      const now = new Date().toISOString();
      const cicloData = {
        maquina_id: maquinaId,
        serie,
        categoria,
        cone_cor: coneCor,
        cone_numero: needsCone ? coneNumero : null,
        estado: estadoFinal,
        data_entrada: now,
        data_classificacao: now,
        prioridade: false,
      };
      if (estadoFinal === "pronta") {
        cicloData.data_pronta = now;
      }
      const newCiclo = await base44.entities.Ciclo.create(cicloData);

      await base44.entities.EventoCiclo.create({
        ciclo_id: newCiclo.id,
        serie,
        de_estado: null,
        para_estado: "entrada",
        autor,
        nota: reentradaConfirmada ? "Reentrada no pátio" : "Registo de entrada",
      });
      await base44.entities.EventoCiclo.create({
        ciclo_id: newCiclo.id,
        serie,
        de_estado: "entrada",
        para_estado: estadoFinal,
        autor,
        nota: reentradaConfirmada
          ? `Reentrada após aluguer${diasDoAluguer != null ? ` de ${diasDoAluguer} dias` : ""}`
          : estadoFinal === "indefinido"
            ? "Sem estado de preparação (sucata/indefinida)"
            : estadoFinal === "pronta"
            ? "Entrada direta — pronta"
            : estadoFinal === "manutencao"
            ? "Entrada direta — manutenção"
            : "Classificação",
      });

      toast({
        title: reentradaConfirmada ? "✓ Reentrada concluída" : "✓ Registo concluído",
        description: reentradaConfirmada && diasDoAluguer != null
          ? `NS: ${serie} — aluguer anterior fechado com ${diasDoAluguer} dias`
          : `NS: ${serie}`,
      });
      // Reset
      setStep(1);
      setSerie("");
      setModelo("");
      setAno("");
      setFotoUrl("");
      setExistingMaquina(null);
      setPassagens(0);
      setUltimaSaida(null);
      setCicloNoPatio(null);
      setCicloFora(null);
      setReentradaConfirmada(false);
      setSpecs({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "" });
      setCategoria("");
      setEstadoInicial("classificada");
      setConeNumero("");
      setConeError("");
      setNotas("");
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${s <= step ? "bg-amber-500" : "bg-slate-700"}`} />
            <p className={`text-xs mt-1 ${s === step ? "text-amber-400" : "text-slate-500"}`}>Passo {s}</p>
          </div>
        ))}
      </div>

      {/* Step 1: REGISTO */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Registo</h2>
            <p className="text-sm text-slate-400">Fotografe a placa ou digite a série</p>
          </div>

          <PhotoCapture onSuccess={handlePhotoSuccess} />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">OU</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Número de Série (NS)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="Digite a série..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-lg font-bold tracking-wider"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {serie.length >= 3 && !searching && existingMaquina && cicloNoPatio && (
            <div className="bg-red-500/15 border-2 border-red-500/50 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-red-300">Máquina já existe e não deu saída</p>
                  <p className="text-sm text-red-400/80 mt-1">
                    NS <span className="font-bold">{serie}</span> ainda se encontra no pátio
                    {cicloNoPatio.estado ? ` (${cicloNoPatio.estado.replace(/_/g, " ")})` : ""}.
                    Não é possível registar novamente enquanto não tiver saída.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Máquina fora em aluguer: é reentrada, não um registo novo */}
          {serie.length >= 3 && !searching && existingMaquina && cicloFora && !cicloNoPatio && (
            reentradaConfirmada ? (
              <div className="bg-green-500/10 border-2 border-green-500/40 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-green-300">Reentrada confirmada</p>
                    <p className="text-sm text-green-400/80 mt-0.5">
                      O aluguer anterior será fechado ({diasAlugada(cicloFora)} dias) e a máquina volta ao pátio
                      com as características que já tinha. Categoria, cone e notas podem ser alterados a seguir.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReentradaConfirmada(false)}
                      className="text-xs text-green-400/70 hover:text-green-300 underline underline-offset-2 mt-2"
                    >
                      Cancelar reentrada
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-lg font-bold text-cyan-300">Esta máquina está a retornar?</p>
                    <p className="text-sm text-cyan-400/80 mt-1">
                      NS <span className="font-bold">{serie}</span> saiu para aluguer
                      {cicloFora.data_saida && ` a ${format(new Date(cicloFora.data_saida), "dd/MM/yyyy")}`}
                      {cicloFora.reserva_cliente && ` · ${cicloFora.reserva_cliente}`}
                      {" "}e continua fora há {diasAlugada(cicloFora)} dias.
                    </p>
                    <p className="text-xs text-cyan-400/60 mt-1.5">
                      Ao confirmar, esse aluguer é fechado como retorno e a máquina reentra no pátio —
                      em vez de ficar registada em duplicado.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReentradaConfirmada(true)}
                      className="mt-3 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      CONFIRMAR REENTRADA
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {serie.length >= 3 && !searching && existingMaquina && !cicloNoPatio && !cicloFora && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium">
                  Máquina já registada — {passagens} {passagens === 1 ? "passagem" : "passagens"}
                </p>
                {ultimaSaida && (
                  <p className="text-xs text-blue-400/70 mt-0.5">
                    Última saída: {format(new Date(ultimaSaida), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>
          )}
          {serie.length >= 3 && !searching && !existingMaquina && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <Package className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300 font-medium">Nova máquina</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Modelo</label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Modelo"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Ano</label>
              <input
                type="text"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                placeholder="Ano"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <button
            onClick={() => canProceedStep1 && setStep(2)}
            disabled={!canProceedStep1}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: CARACTERÍSTICAS */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Características</h2>
            <p className="text-sm text-slate-400">Selecione as specs da máquina</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Mastro</h3>
            <div className="grid grid-cols-3 gap-2">
              {SPEC_OPTIONS.mastro.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.mastro === o.value} onClick={(v) => handleSpecSelect("mastro", v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">H3 — Altura máxima (mm) <span className="text-slate-600 font-normal">(opcional)</span></h3>
            <input
              type="text"
              inputMode="numeric"
              value={specs.h3}
              onChange={(e) => setSpecs((prev) => ({ ...prev, h3: e.target.value }))}
              placeholder="ex. 4455"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
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
            <h3 className="text-sm font-medium text-slate-300 mb-2">Bateria <span className="text-slate-600 font-normal">(opcional)</span></h3>
            <div className="grid grid-cols-2 gap-2">
              {SPEC_OPTIONS.bateria.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.bateria === o.value} onClick={(v) => handleSpecSelect("bateria", v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Acessórios (múltiplos)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPEC_OPTIONS.acessorios.map((o) => {
                const isSelected = (specs.acessorios || []).includes(o.value);
                return (
                  <OptionButton key={o.value} option={o} isSelected={isSelected} onClick={() => handleAcessorioToggle(o.value)} />
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Notas / Observações <span className="text-slate-600 font-normal">(opcional)</span></h3>
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-slate-600">Rótulos:</span>
              {NOTA_LABELS.map((label) => {
                const active = (notas || "").toLowerCase().includes(label.toLowerCase());
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleNotaLabel(label)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      active ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas visíveis no card da máquina..."
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm resize-y"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-3 border border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: CLASSIFICAÇÃO */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Classificação</h2>
            <p className="text-sm text-slate-400">Categoria e cone de identificação</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Categoria</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORIA_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCategoria(key)}
                  className={`py-4 rounded-lg border-2 font-bold text-lg transition-all ${
                    categoria === key
                      ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                      : "border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {needsCone ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">CONE:</span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 text-slate-200 text-sm font-bold uppercase">
                  <span className={`w-3 h-3 rounded-full ${CONE_COLORS.find((c) => c.value === coneCor)?.bg}`} />
                  {coneCor}
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Nº do cone (digite o número físico)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={coneNumero}
                  onChange={(e) => { setConeNumero(e.target.value); setConeError(""); }}
                  onBlur={validateCone}
                  placeholder="Nº do cone"
                  className={`w-full px-3 py-2.5 bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none text-sm ${coneError ? "border-red-500" : "border-slate-700 focus:border-amber-500"}`}
                />
                {coneError && <p className="text-xs text-red-400 mt-1">{coneError}</p>}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Sem cone para esta categoria.
            </div>
          )}

          {semEstado && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Categoria sem estado de preparação — fica como <span className="font-bold text-slate-300">INDEFINIDO</span> (não entra em POR FAZER nem PRONTAS).
            </div>
          )}

          {canChooseEstado && !semEstado && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Estado inicial</h3>
              <div className="space-y-2">
                {[
                  { value: "classificada", label: "A FAZER", hint: "aguarda autorização da gestora" },
                  { value: "pronta", label: "PRONTA", hint: "disponível de imediato" },
                  { value: "manutencao", label: "EM MANUTENÇÃO", hint: "em manutenção, sem O.S. no Watcher" },
                ].map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setEstadoInicial(o.value)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      estadoInicial === o.value
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <span className={`text-sm font-bold ${estadoInicial === o.value ? "text-amber-400" : "text-slate-300"}`}>
                      {o.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{o.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-1 text-sm">
            <p className="text-slate-400">NS: <span className="text-slate-100 font-bold">{serie}</span></p>
            <p className="text-slate-400">Modelo: <span className="text-slate-300">{modelo || "—"}</span></p>
            <p className="text-slate-400">Categoria: <span className="text-amber-400 font-bold">{CATEGORIA_CONFIG[categoria]?.label || "—"}</span></p>
            {reentradaConfirmada && (
              <p className="text-cyan-400 flex items-center gap-1.5 pt-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Reentrada — o aluguer anterior será fechado
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-3 border border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <><div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> A registar...</>
              ) : (
                <><Check className="w-5 h-5" /> Registar</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}