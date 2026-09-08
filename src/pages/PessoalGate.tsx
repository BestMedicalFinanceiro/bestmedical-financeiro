import { useState, type FormEvent } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { Button, Input } from "../components/ui";
import { usePessoalAuth } from "../pessoalAuth";
import { authPessoal } from "../lib/api";

export function PessoalGate() {
  const { configurado, cadastrar, entrar } = usePessoalAuth();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pediuReset, setPediuReset] = useState(false);

  if (configurado === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-text-muted">Carregando...</p>
      </div>
    );
  }

  // Primeiríssimo acesso: ainda não existe nenhuma senha cadastrada.
  if (!configurado) {
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
      setEnviando(true);
      try {
        await cadastrar(senha);
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
            <h1 className="text-xl font-semibold">Definir senha</h1>
          </div>
          <p className="mb-5 text-sm text-text-muted">
            Primeiro acesso ao Controle Financeiro Pessoal — defina uma senha.
          </p>
          <div className="space-y-3">
            <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
            <Input
              label="Confirme a senha"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
          {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
          <Button type="submit" className="mt-5 w-full" disabled={enviando}>
            {enviando ? "Cadastrando..." : "Definir senha e entrar"}
          </Button>
        </form>
      </div>
    );
  }

  // Acesso normal — tela de senha comum, sempre igual, sem nenhum sinal de
  // que uma segunda senha existe.
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Senha incorreta.");
    } finally {
      setEnviando(false);
    }
  };

  const pedirReset = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await authPessoal.esqueciSenha();
      setPediuReset(true);
    } catch {
      setPediuReset(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-md">
        <h1 className="mb-1 text-xl font-semibold text-text">Controle Financeiro Pessoal</h1>
        <p className="mb-5 text-sm text-text-muted">Digite a senha para continuar.</p>
        <Input
          label="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
        />
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
        <Button type="submit" className="mt-5 w-full" icon={<LogIn size={16} />} disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </Button>

        <div className="mt-4 text-center">
          {pediuReset ? (
            <p className="text-xs text-text-faint">Se o e-mail estiver configurado, você vai receber um link.</p>
          ) : (
            <button
              type="button"
              onClick={pedirReset}
              className="text-xs text-text-muted underline hover:text-text"
            >
              Esqueci minha senha
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
