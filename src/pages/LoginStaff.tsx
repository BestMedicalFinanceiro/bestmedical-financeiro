import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { Button, Input } from "../components/ui";
import { useStaffAuth } from "../staffAuth";

export function LoginStaff({ titulo }: { titulo: string }) {
  const { login } = useStaffAuth();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      await login(usuario, senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-md">
        <h1 className="mb-1 text-xl font-semibold text-text">{titulo}</h1>
        <p className="mb-5 text-sm text-text-muted">Login de usuário da Best Medical.</p>
        <div className="space-y-3">
          <Input label="Usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
          <Input
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
        <Button type="submit" className="mt-5 w-full" icon={<LogIn size={16} />} disabled={entrando}>
          {entrando ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
