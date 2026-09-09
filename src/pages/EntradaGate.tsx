import { useState, type FormEvent } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { Button, Input } from "../components/ui";
import { RecuperarModal } from "../components/RecuperarModal";
import { useFinanceiroAuth } from "../financeiroAuth";

export function EntradaGate() {
  const { entradaConfigurada, cadastrarEntrada, entrar } = useFinanceiroAuth();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);

  if (entradaConfigurada === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-text-muted">Carregando...</p>
      </div>
    );
  }

  // Primeiríssimo acesso: ainda não existe nenhuma senha cadastrada.
  if (!entradaConfigurada) {
    const onSubmit = async (e: FormEvent) => {
      e.preventDefault();
      setErro(null);
      if (senha.length < 6) {
        setErro("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (senha !== confirmacao) {
        setErro("As senhas não coincidem.");
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        setErro("O PIN de recuperação tem 6 números.");
        return;
      }
      setEnviando(true);
      try {
        await cadastrarEntrada(senha, pin);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível cadastrar.");
      } finally {
        setEnviando(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-md">
          <div className="mb-4 flex items-center gap-2 text-text">
            <KeyRound size={20} />
            <h1 className="text-xl font-semibold">Definir acesso</h1>
          </div>
          <p className="mb-5 text-sm text-text-muted">
            Primeiro acesso ao Financeiro — defina a senha e um PIN de recuperação.
          </p>
          <div className="space-y-3">
            <Input label="Usuário" value="paulodick" disabled />
            <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
            <Input
              label="Confirme a senha"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
            <Input
              label="PIN de recuperação (6 números)"
              hint="Guarde bem — é a única forma de recuperar o acesso se esquecer alguma senha."
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
          <Button type="submit" className="mt-5 w-full" disabled={enviando}>
            {enviando ? "Cadastrando..." : "Definir e entrar"}
          </Button>
        </form>
      </div>
    );
  }

  // Acesso normal.
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Credenciais inválidas.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-md">
        <h1 className="mb-1 text-xl font-semibold text-text">Financeiro</h1>
        <p className="mb-5 text-sm text-text-muted">Entre para continuar.</p>
        <div className="space-y-3">
          <Input label="Usuário" value="paulodick" disabled />
          <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
        </div>
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
        <Button type="submit" className="mt-5 w-full" icon={<LogIn size={16} />} disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </Button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setMostrarRecuperar(true)}
            className="text-xs text-text-muted underline hover:text-text"
          >
            Esqueci minha senha
          </button>
        </div>
      </form>

      {mostrarRecuperar && <RecuperarModal onFechar={() => setMostrarRecuperar(false)} />}
    </div>
  );
}
