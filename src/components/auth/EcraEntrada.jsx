import React from "react";
import { ShieldX, LogIn, Clock, MailWarning, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeSwitcher from "@/components/atlas/ThemeSwitcher";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png";

const Moldura = ({ children }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
    <div className="fixed top-4 right-4"><ThemeSwitcher /></div>
    <img src={LOGO} alt="ATLAS" className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-xl" />
    <div className="w-full max-w-sm text-center">{children}</div>
  </div>
);

/**
 * O que se vê antes de entrar.
 *
 * Não há aqui escolha de perfil nem senha. O ecrã antigo tinha as duas coisas —
 * e as senhas estavam escritas no código que o browser descarrega, todas iguais
 * a "1". Quem entra é quem a conta diz que é, e o perfil vem da lista em
 * `acessos.js`, não de um botão.
 */
export default function EcraEntrada({ estado, email, onEntrar, onSair }) {
  if (estado === "a_carregar") {
    return (
      <Moldura>
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
      </Moldura>
    );
  }

  if (estado === "nao_confirmado") {
    return (
      <Moldura>
        <MailWarning className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-slate-100 mb-2">Falta confirmar o email</h1>
        <p className="text-sm text-slate-400 mb-1">
          Foi enviado um código para <span className="num text-slate-200 break-all">{email}</span>.
        </p>
        {/* O email por confirmar é só uma alegação: sem ele, qualquer pessoa
            podia registar-se com o endereço de outra e ficar com o perfil dela. */}
        <p className="text-xs text-slate-500 mb-6">
          Abra esse email e confirme a conta. Só depois disso o ATLAS o deixa entrar.
        </p>
        <Button onClick={onSair} variant="outline" className="w-full border-slate-700 text-slate-300">
          Sair e usar outra conta
        </Button>
      </Moldura>
    );
  }

  if (estado === "desativado") {
    return (
      <Moldura>
        <UserX className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-slate-100 mb-2">Conta desativada</h1>
        <p className="text-sm text-slate-400 mb-6">
          A conta <span className="num text-slate-200 break-all">{email}</span> está desativada. Fale com quem gere o ATLAS.
        </p>
        <Button onClick={onSair} variant="outline" className="w-full border-slate-700 text-slate-300">
          Sair
        </Button>
      </Moldura>
    );
  }

  if (estado === "sem_acesso") {
    return (
      <Moldura>
        <ShieldX className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-slate-100 mb-2">Sem acesso ao ATLAS</h1>
        {/* Dizer qual a conta poupa a volta inteira a quem tem duas e entrou
            com a errada — que é o engano mais provável, não a intrusão. */}
        <p className="text-sm text-slate-400 mb-1">
          A conta <span className="num text-slate-200 break-all">{email}</span> não consta da lista de utilizadores.
        </p>
        <p className="text-xs text-slate-500 mb-6">
          Se tem outra conta da STILL, saia e entre com essa. Caso contrário, peça para ser adicionado.
        </p>
        <Button onClick={onSair} variant="outline" className="w-full border-slate-700 text-slate-300">
          Sair e usar outra conta
        </Button>
      </Moldura>
    );
  }

  return (
    <Moldura>
      {estado === "expirada" && (
        <div className="flex items-start gap-2 text-left bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90">
            A sessão neste aparelho chegou aos 60 dias. Entre outra vez para continuar.
          </p>
        </div>
      )}
      <h1 className="text-xl font-black text-slate-100 tracking-wide mb-1">ATLAS</h1>
      <p className="text-xs text-slate-500 mb-8">Gestão do pátio de empilhadores</p>
      <Button onClick={onEntrar} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
        <LogIn className="w-4 h-4 mr-2" />
        Entrar
      </Button>
      <p className="text-[11px] text-slate-600 mt-4">Acesso reservado aos utilizadores autorizados.</p>
    </Moldura>
  );
}
