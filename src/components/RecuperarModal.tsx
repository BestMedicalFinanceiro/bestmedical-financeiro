import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button, Input } from "./ui";
import { useFinanceiroAuth } from "../financeiroAuth";

export function RecuperarModal({ onFechar }: { onFechar: () => void }) {
  const { recuperar } = useFinanceiroAuth();
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!/^\d{6}$/.test(pin)) {
      setErro("O PIN tem 6 números.");
      return;
    }
    setEnviando(true);
    try {
      await recuperar(pin);
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "PIN incorreto.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Recuperar acesso</h2>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X size={20} />
          </button>
        </div>
        {ok ? (
          <>
            <p className="text-sm text-success">
              Senhas redefinidas. Cadastre uma nova senha de entrada pra continuar.
            </p>
            <Button className="mt-4 w-full" onClick={onFechar}>
              Entendi
            </Button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="mb-4 text-sm text-text-muted">
              Digite o PIN de 6 números para redefinir o acesso.
            </p>
            <Input
              label="PIN"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
            {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Verificando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
