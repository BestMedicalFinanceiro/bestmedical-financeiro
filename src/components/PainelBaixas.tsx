import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Input, Select } from "./ui";
import { formatBRL, formatDataBR, hojeISO, moedaParaInput, parseMoedaInput } from "../lib/format";
import { FORMAS_PAGAMENTO, type Baixa, type NovaBaixa } from "../lib/api";

export function PainelBaixas({
  baixas,
  saldoDevedor,
  acaoLabel,
  podeEditar,
  onRegistrar,
  onRemover,
}: {
  baixas: Baixa[];
  saldoDevedor: number;
  acaoLabel: string;
  podeEditar: boolean;
  onRegistrar: (b: NovaBaixa) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
}) {
  const [data, setData] = useState(hojeISO());
  const [valor, setValor] = useState(moedaParaInput(saldoDevedor));
  const [forma, setForma] = useState<string>(FORMAS_PAGAMENTO[0]);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const registrar = async () => {
    const v = parseMoedaInput(valor);
    if (v <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await onRegistrar({ data, valor: v, formaPagamento: forma, observacao: observacao || undefined });
      setValor(moedaParaInput(Math.max(0, saldoDevedor - v)));
      setObservacao("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Histórico de baixas
      </div>
      {baixas.length === 0 ? (
        <p className="mb-3 text-sm text-text-faint">Nenhuma baixa registrada ainda.</p>
      ) : (
        <div className="mb-3 overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-offset text-xs uppercase text-text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Forma</th>
                <th className="px-3 py-2 text-right">Valor</th>
                {podeEditar && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {baixas.map((b) => (
                <tr key={b.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{formatDataBR(b.data)}</td>
                  <td className="px-3 py-2">{b.formaPagamento}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatBRL(b.valor)}</td>
                  {podeEditar && (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemover(b.id)}
                        className="text-text-faint hover:text-danger"
                        title="Remover baixa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {podeEditar && saldoDevedor > 0 && (
        <div className="rounded-md border border-border bg-surface-offset/50 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input
              type="date"
              label="Data"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
            <Input
              label={`Valor (R$)`}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={moedaParaInput(saldoDevedor)}
            />
            <Select label="Forma" value={forma} onChange={(e) => setForma(e.target.value)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
          {erro && <p className="mt-2 text-xs text-danger">{erro}</p>}
          <Button
            type="button"
            className="mt-3"
            disabled={salvando}
            onClick={registrar}
          >
            {salvando ? "Registrando..." : acaoLabel}
          </Button>
        </div>
      )}
      {podeEditar && saldoDevedor <= 0 && (
        <p className="text-sm text-success">Quitado — nenhum saldo em aberto.</p>
      )}
    </div>
  );
}
