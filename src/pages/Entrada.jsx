import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Search, Check, ArrowRight, ArrowLeft, Package, Info } from "lucide-react";
import { format } from "date-fns";
import PhotoCapture from "@/components/atlas/PhotoCapture";
import { SPEC_OPTIONS, CATEGORIA_CONFIG, CATEGORIA_CONE_MAP, CONE_COLORS } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";

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
  const [searching, setSearching] = useState(false);
  const [specs, setSpecs] = useState({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "" });
  const [categoria, setCategoria] = useState("");
  const [estadoInicial, setEstadoInicial] = useState("classificada");
  const [coneNumero, setConeNumero] = useState("");
  const [coneError, setConeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live search when serie changes
  useEffect(() => {
    if (serie.length < 3) {
      setExistingMaquina(null);
      setPassagens(0);
      setUltimaSaida(null);
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
        } else {
          setExistingMaquina(null);
          setPassagens(0);
          setUltimaSaida(null);
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

  const canProceedStep1 = serie.length >= 3;
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
        });
      }

      const now = new Date().toISOString();
      const cicloData = {
        maquina_id: maquinaId,
        serie,
        categoria,
        cone_cor: coneCor,
        cone_numero: needsCone ? coneNumero : null,
        estado: estadoInicial,
        data_entrada: now,
        data_classificacao: now,
        prioridade: false,
      };
      if (estadoInicial === "pronta") {
        cicloData.data_pronta = now;
      }
      const newCiclo = await base44.entities.Ciclo.create(cicloData);

      await base44.entities.EventoCiclo.create({
        ciclo_id: newCiclo.id,
        serie,
        de_estado: null,
        para_estado: "entrada",
        autor,
        nota: "Registo de entrada",
      });
      await base44.entities.EventoCiclo.create({
        ciclo_id: newCiclo.id,
        serie,
        de_estado: "entrada",
        para_estado: estadoInicial,
        autor,
        nota:
          estadoInicial === "pronta"
            ? "Entrada direta — pronta"
            : estadoInicial === "manutencao"
            ? "Entrada direta — manutenção"
            : "Classificação",
      });

      toast({ title: "✓ Registo concluído", description: `NS: ${serie}` });
      // Reset
      setStep(1);
      setSerie("");
      setModelo("");
      setAno("");
      setFotoUrl("");
      setExistingMaquina(null);
      setPassagens(0);
      setUltimaSaida(null);
      setSpecs({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "" });
      setCategoria("");
      setEstadoInicial("classificada");
      setConeNumero("");
      setConeError("");
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

          {serie.length >= 3 && !searching && existingMaquina && (
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

          {canChooseEstado && (
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