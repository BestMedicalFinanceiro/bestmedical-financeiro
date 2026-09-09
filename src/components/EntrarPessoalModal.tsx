import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button, Input } from "./ui";
import { useFinanceiroAuth } from "../financeiroAuth";

export function EntrarPessoalModal({
  onFechar,
  onSucesso,
}: {
  onFechar: () => void;
  onSucesso: () => void;
}) {
  const { entrarPessoal } = useFinanceiroAuth();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrarPessoal(senha);
      onSucesso();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Senha incorreta.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg bg-surface p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Financeiro Pessoal</h2>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X size={20} />
          </button>
        </div>
        <Input
          label="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
        />
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
