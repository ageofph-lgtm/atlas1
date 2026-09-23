import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { RotateCcw } from "lucide-react";
import EntradaPassoRegisto from "@/components/atlas/EntradaPassoRegisto";
import EntradaPassoCaracteristicas from "@/components/atlas/EntradaPassoCaracteristicas";
import EntradaPassoClassificacao from "@/components/atlas/EntradaPassoClassificacao";
import { CATEGORIA_CONE_MAP } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";
import { isCategoriaSemEstado } from "@/components/atlas/cicloUtils";
import { registarEntrada } from "@/components/atlas/registarEntrada";
import { procurarMaquina } from "@/components/atlas/procurarMaquina";
import { guardarRascunho, lerRascunho, apagarRascunho } from "@/components/atlas/rascunho";

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
  const [specs, setSpecs] = useState({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "", horimetro: "" });
  const [categoria, setCategoria] = useState("");
  const [estadoInicial, setEstadoInicial] = useState("classificada");
  const [coneNumero, setConeNumero] = useState("");
  const [coneError, setConeError] = useState("");
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // O prejuízo de um registo feito no pátio com mau sinal não é a falha — é
  // escrever tudo outra vez. O que está no formulário fica guardado no
  // aparelho e volta ao abrir.
  const [rascunhoReposto, setRascunhoReposto] = useState(false);

  useEffect(() => {
    const r = lerRascunho("entrada");
    if (!r) return;
    if (r.serie) setSerie(r.serie);
    if (r.modelo) setModelo(r.modelo);
    if (r.ano) setAno(r.ano);
    if (r.specs) setSpecs(r.specs);
    if (r.categoria) setCategoria(r.categoria);
    if (r.estadoInicial) setEstadoInicial(r.estadoInicial);
    if (r.coneNumero) setConeNumero(r.coneNumero);
    if (r.notas) setNotas(r.notas);
    if (r.step) setStep(r.step);
    setRascunhoReposto(true);
  }, []);

  useEffect(() => {
    // Só vale a pena guardar a partir do momento em que há série.
    if (!serie) return;
    guardarRascunho("entrada", { serie, modelo, ano, specs, categoria, estadoInicial, coneNumero, notas, step });
  }, [serie, modelo, ano, specs, categoria, estadoInicial, coneNumero, notas, step]);

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

  // Procura ao vivo: meia segundo depois de parar de escrever, vê o que já se
  // sabe desta série. As regras estão em `procurarMaquina`; aqui só se arruma
  // o resultado no ecrã.
  useEffect(() => {
    const limpar = () => {
      setExistingMaquina(null);
      setPassagens(0);
      setUltimaSaida(null);
      setCicloNoPatio(null);
      setCicloFora(null);
      setReentradaConfirmada(false);
    };

    if (serie.length < 3) {
      limpar();
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const r = await procurarMaquina(serie);
        limpar();
        if (r.maquina) {
          setExistingMaquina(r.maquina);
          setSpecs(r.specs);
          if (r.maquina.modelo) setModelo(r.maquina.modelo);
          if (r.maquina.ano) setAno(r.maquina.ano);
          setPassagens(r.passagens);
          setUltimaSaida(r.ultimaSaida);
          setCicloNoPatio(r.cicloNoPatio);
          setCicloFora(r.cicloFora);
          setNotas(r.notas);
        }
      } catch (_e) {
        // uma procura que falhou não pode travar o registo — segue-se em branco
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
    try {
      const result = await validateConeNumber(categoria, coneNumero);
      setConeError(result.free ? "" : `Cone ${coneNumero} ${coneCor} já está em uso — NS ${result.conflito.serie}`);
    } catch (_e) {
      // Sem rede não se consegue saber se o cone está livre. Não se inventa uma
      // resposta: deixa-se seguir e a mesma verificação corre no registo, que
      // sem rede também não passa.
      setConeError("");
    }
  };

  const limparFormulario = () => {
    apagarRascunho("entrada");
    setRascunhoReposto(false);
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
  };

  // Cada tipo de recusa tem o seu aviso e o seu efeito no ecrã — a decisão de
  // o que mostrar é da página; as regras estão em `registarEntrada`.
  const mostrarRecusa = (r) => {
    if (r.tipoErro === "no_patio") {
      toast({ variant: "destructive", title: "Máquina já no pátio", description: r.erro });
    } else if (r.tipoErro === "fora_do_patio") {
      setCicloFora(r.ciclo);
      toast({ variant: "destructive", title: "Máquina em aluguer", description: r.erro });
    } else if (r.tipoErro === "cone_ocupado") {
      setConeError(r.erro);
    } else {
      toast({ variant: "destructive", title: "Erro ao fechar o aluguer", description: r.erro });
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const r = await registarEntrada({
        serie, modelo, ano, fotoUrl, specs, categoria,
        estadoInicial, coneNumero, notas,
        existingMaquina, reentradaConfirmada, autor,
      });

      if (!r.ok) {
        mostrarRecusa(r);
        setIsSubmitting(false);
        return;
      }

      toast({
        title: reentradaConfirmada ? "✓ Reentrada concluída" : "✓ Registo concluído",
        description: reentradaConfirmada && r.diasDoAluguer != null
          ? `NS: ${serie} — aluguer anterior fechado com ${r.diasDoAluguer} dias`
          : `NS: ${serie}`,
      });
      limparFormulario();
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

      {rascunhoReposto && (
        <div className="flex items-center gap-2 text-xs glass border border-cyan-500/40 rounded-lg px-3 py-2">
          <RotateCcw className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-slate-300">Repusemos o que tinha escrito da última vez.</span>
          <button
            onClick={() => { apagarRascunho("entrada"); limparFormulario(); }}
            className="ml-auto text-cyan-400 hover:text-cyan-300 font-medium flex-shrink-0"
          >
            Começar de novo
          </button>
        </div>
      )}

      {step === 1 && (
        <EntradaPassoRegisto
          serie={serie} setSerie={setSerie} searching={searching}
          modelo={modelo} setModelo={setModelo} ano={ano} setAno={setAno}
          existingMaquina={existingMaquina} passagens={passagens} ultimaSaida={ultimaSaida}
          cicloNoPatio={cicloNoPatio} cicloFora={cicloFora}
          reentradaConfirmada={reentradaConfirmada} setReentradaConfirmada={setReentradaConfirmada}
          notas={notas} canProceedStep1={canProceedStep1}
          handlePhotoSuccess={handlePhotoSuccess} setStep={setStep}
        />
      )}

      {step === 2 && (
        <EntradaPassoCaracteristicas
          specs={specs} setSpecs={setSpecs}
          handleSpecSelect={handleSpecSelect} handleAcessorioToggle={handleAcessorioToggle}
          notas={notas} setNotas={setNotas}
          NOTA_LABELS={NOTA_LABELS} toggleNotaLabel={toggleNotaLabel}
          setStep={setStep}
        />
      )}

      {step === 3 && (
        <EntradaPassoClassificacao
          serie={serie} modelo={modelo}
          categoria={categoria} setCategoria={setCategoria}
          estadoInicial={estadoInicial} setEstadoInicial={setEstadoInicial}
          canChooseEstado={canChooseEstado} semEstado={semEstado}
          coneCor={coneCor} needsCone={needsCone}
          coneNumero={coneNumero} setConeNumero={setConeNumero}
          coneError={coneError} setConeError={setConeError} validateCone={validateCone}
          reentradaConfirmada={reentradaConfirmada}
          canSubmit={canSubmit} isSubmitting={isSubmitting}
          handleSubmit={handleSubmit} setStep={setStep}
        />
      )}
    </div>
  );
}