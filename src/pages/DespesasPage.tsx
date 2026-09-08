import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Block, Button, Input, Select, Textarea } from "../components/ui";
import { PainelBaixas } from "../components/PainelBaixas";
import { formatBRL, formatDataBR, hojeISO, moedaParaInput, parseMoedaInput } from "../lib/format";
import type { ClienteFinanceiro, Despesa } from "../lib/api";

type Situacao = "pago" | "parcial" | "atrasado" | "apagar";

function situacao(d: Despesa, hoje: string): Situacao {
  if (d.pago) return "pago";
  if (d.valorPago > 0) return "parcial";
  if (d.dataPagamento && d.dataPagamento < hoje) return "atrasado";
  return "apagar";
}

const SITUACAO_LABEL: Record<Situacao, string> = {
  pago: "Pago",
  parcial: "Parcial",
  atrasado: "Atrasado",
  apagar: "A pagar",
};
const SITUACAO_COR: Record<Situacao, string> = {
  pago: "bg-success-soft text-success",
  parcial: "bg-warning-soft text-warning",
  atrasado: "bg-danger-soft text-danger",
  apagar: "bg-surface-offset text-text-muted",
};

interface FormState {
  data: string;
  pessoa: string;
  fornecedor: string;
  categoria: string;
  descricao: string;
  valor: string;
  observacoes: string;
}

const formVazio = (): FormState => ({
  data: hojeISO(),
  pessoa: "Paulo",
  fornecedor: "",
  categoria: "",
  descricao: "",
  valor: "",
  observacoes: "",
});

export function DespesasPage({
  titulo,
  cliente,
  podeEditar,
  mostrarPessoa,
}: {
  titulo: string;
  cliente: ClienteFinanceiro;
  podeEditar: boolean;
  mostrarPessoa?: boolean;
}) {
  const [lista, setLista] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState<FormState>(formVazio());
  const [baixas, setBaixas] = useState<Awaited<ReturnType<ClienteFinanceiro["listarBaixasDespesa"]>>>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    cliente
      .listarDespesas({ busca: busca || undefined, pageSize: 200 })
      .then((r) => setLista(r.data))
      .catch(() => setLista([]))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, [busca]);

  const hoje = hojeISO();
  const totais = lista.reduce(
    (acc, d) => {
      acc.total += d.valor;
      acc.pago += d.pago ? d.valor : d.valorPago;
      if (situacao(d, hoje) === "atrasado") acc.atrasado += d.saldoDevedor;
      return acc;
    },
    { total: 0, pago: 0, atrasado: 0 },
  );

  const abrirEdicao = (d: Despesa) => {
    setEditId(d.id);
    setForm({
      data: d.data,
      pessoa: d.pessoa || "Paulo",
      fornecedor: d.fornecedor,
      categoria: d.categoria || "",
      descricao: d.descricao || "",
      valor: moedaParaInput(d.valor),
      observacoes: d.observacoes || "",
    });
    setErro(null);
    cliente.listarBaixasDespesa(d.id).then(setBaixas).catch(() => setBaixas([]));
  };

  const abrirCriacao = () => {
    setCriando(true);
    setForm(formVazio());
    setErro(null);
  };

  const fechar = () => {
    setEditId(null);
    setCriando(false);
    setBaixas([]);
  };

  const salvar = async () => {
    if (!form.fornecedor.trim() || !form.valor) {
      setErro("Preencha fornecedor e valor.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const dto: Record<string, unknown> = {
      data: form.data,
      fornecedor: form.fornecedor.trim(),
      categoria: form.categoria.trim() || undefined,
      descricao: form.descricao.trim() || undefined,
      valor: parseMoedaInput(form.valor),
      observacoes: form.observacoes.trim() || undefined,
    };
    if (mostrarPessoa) dto.pessoa = form.pessoa;
    try {
      if (editId) {
        await cliente.atualizarDespesa(editId, dto);
      } else {
        await cliente.criarDespesa(dto);
      }
      fechar();
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta despesa? Esta ação não pode ser desfeita.")) return;
    await cliente.removerDespesa(id);
    fechar();
    carregar();
  };

  const editando = lista.find((d) => d.id === editId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{titulo}</h1>
          <p className="text-sm text-text-muted">Contas a pagar, com baixa parcial e histórico.</p>
        </div>
        {podeEditar && (
          <Button icon={<Plus size={16} />} onClick={abrirCriacao}>
            Nova despesa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Total</div>
          <div className="mt-1 text-xl font-semibold text-text">{formatBRL(totais.total)}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Pago</div>
          <div className="mt-1 text-xl font-semibold text-success">{formatBRL(totais.pago)}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Atrasado</div>
          <div className="mt-1 text-xl font-semibold text-danger">{formatBRL(totais.atrasado)}</div>
        </div>
      </div>

      <Block title="Lançamentos">
        <div className="mb-4 max-w-xs">
          <Input
            placeholder="Buscar por fornecedor, categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <th className="px-2 py-2">Data</th>
                {mostrarPessoa && <th className="px-2 py-2">Pessoa</th>}
                <th className="px-2 py-2">Fornecedor</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2 text-right">Valor</th>
                <th className="px-2 py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => {
                const s = situacao(d, hoje);
                return (
                  <tr
                    key={d.id}
                    onClick={() => abrirEdicao(d)}
                    className="cursor-pointer border-b border-border/60 hover:bg-surface-offset/40"
                  >
                    <td className="whitespace-nowrap px-2 py-2">{formatDataBR(d.data)}</td>
                    {mostrarPessoa && <td className="px-2 py-2">{d.pessoa}</td>}
                    <td className="px-2 py-2 font-medium text-text">{d.fornecedor}</td>
                    <td className="px-2 py-2 text-text-muted">{d.categoria || "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                      {formatBRL(d.valor)}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SITUACAO_COR[s]}`}>
                        {SITUACAO_LABEL[s]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-text-muted">
                    {carregando ? "Carregando..." : "Nenhuma despesa cadastrada."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Block>

      {(editId || criando) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">
                {editId ? "Editar despesa" : "Nova despesa"}
              </h2>
              <button onClick={fechar} className="text-text-faint hover:text-text">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  label="Data"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
                {mostrarPessoa && (
                  <Select
                    label="Pessoa"
                    value={form.pessoa}
                    onChange={(e) => setForm({ ...form, pessoa: e.target.value })}
                  >
                    <option value="Paulo">Paulo</option>
                    <option value="Luisa">Luisa</option>
                  </Select>
                )}
              </div>
              <Input
                label="Fornecedor"
                required
                value={form.fornecedor}
                onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Categoria"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
                <Input
                  label="Valor (R$)"
                  required
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </div>
              <Input
                label="Descrição"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
              <Textarea
                label="Observações"
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
              {erro && <p className="text-sm text-danger">{erro}</p>}

              <div className="flex items-center justify-between pt-2">
                <div>
                  {editId && (
                    <Button variant="outline" onClick={() => excluir(editId)}>
                      Excluir
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={fechar}>
                    Cancelar
                  </Button>
                  <Button onClick={salvar} disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>

              {editId && editando && (
                <div className="border-t border-border pt-4">
                  <PainelBaixas
                    baixas={baixas}
                    saldoDevedor={editando.saldoDevedor}
                    acaoLabel="Registrar baixa"
                    podeEditar={podeEditar}
                    onRegistrar={async (b) => {
                      await cliente.registrarBaixaDespesa(editId, b);
                      const [novasBaixas] = await Promise.all([
                        cliente.listarBaixasDespesa(editId),
                        carregar(),
                      ]);
                      setBaixas(novasBaixas);
                    }}
                    onRemover={async (baixaId) => {
                      await cliente.removerBaixaDespesa(editId, baixaId);
                      const [novasBaixas] = await Promise.all([
                        cliente.listarBaixasDespesa(editId),
                        carregar(),
                      ]);
                      setBaixas(novasBaixas);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
