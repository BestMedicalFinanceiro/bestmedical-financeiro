import { useState, type FormEvent } from "react";
import { Button, Input } from "../components/ui";
import { authPessoal } from "../lib/api";

export function RedefinirSenha({ token }: { token: string }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

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
      await authPessoal.redefinirSenha(token, senha);
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Link inválido ou expirado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-md">
        <h1 className="mb-1 text-xl font-semibold text-text">Redefinir senha</h1>
        {ok ? (
          <>
            <p className="mt-4 text-sm text-success">
              Senha redefinida. Você já pode voltar e entrar com a nova senha.
            </p>
            <Button className="mt-5 w-full" onClick={() => (window.location.href = "/")}>
              Ir para o login
            </Button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="mb-5 text-sm text-text-muted">Defina a nova senha do Controle Financeiro Pessoal.</p>
            <div className="space-y-3">
              <Input label="Nova senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
              <Input
                label="Confirme a nova senha"
                type="password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </div>
            {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
            <Button type="submit" className="mt-5 w-full" disabled={enviando}>
              {enviando ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
