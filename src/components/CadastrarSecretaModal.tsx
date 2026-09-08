import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button, Input } from "./ui";
import { usePessoalAuth } from "../pessoalAuth";

export function CadastrarSecretaModal({ onFechar }: { onFechar: () => void }) {
  const { cadastrarSecreta } = usePessoalAuth();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
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
      await cadastrarSecreta(senha);
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg bg-surface p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Definir segunda senha</h2>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X size={20} />
          </button>
        </div>
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
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Salvando..." : "Definir"}
          </Button>
        </div>
      </form>
    </div>
  );
}
