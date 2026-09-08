import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Block, Button, Input, Select, Textarea } from "../components/ui";
import { PainelBaixas } from "../components/PainelBaixas";
import { formatBRL, formatDataBR, hojeISO, moedaParaInput, parseMoedaInput } from "../lib/format";
import type { Baixa, ClienteFinanceiro, Recebivel } from "../lib/api";

type Situacao = "recebido" | "parcial" | "atrasado" | "areceber";

function situacao(r: Recebivel, hoje: string): Situacao {
  if (r.pago) return "recebido";
  if (r.valorPago > 0) return "parcial";
  if (r.dataPagamento && r.dataPagamento < hoje) return "atrasado";
  return "areceber";
}

const SITUACAO_LABEL: Record<Situacao, string> = {
  recebido: "Recebido",
  parcial: "Parcial",
  atrasado: "Atrasado",
  areceber: "A receber",
};
const SITUACAO_COR: Record<Situacao, string> = {
  recebido: "bg-success-soft text-success",
  parcial: "bg-warning-soft text-warning",
  atrasado: "bg-danger-soft text-danger",
  areceber: "bg-info-soft text-info",
};

interface FormState {
  data: string;
  pessoa: string;
  contraparte: string;
  descricao: string;
  valor: string;
  condicaoPagamento: string;
  observacoes: string;
}

const formVazio = (): FormState => ({
  data: hojeISO(),
  pessoa: "Paulo",
  contraparte: "",
  descricao: "",
  valor: "",
  condicaoPagamento: "",
  observacoes: "",
});

export function RecebiveisPage({
  titulo,
  rotuloContraparte,
  cliente,
  podeEditar,
  mostrarPessoa,
}: {
  titulo: string;
  rotuloContraparte: string;
  cliente: ClienteFinanceiro;
  podeEditar: boolean;
  mostrarPessoa?: boolean;
}) {
  const [lista, setLista] = useState<Recebivel[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState<FormState>(formVazio());
  const [baixas, setBaixas] = useState<Baixa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    cliente
      .listarRecebiveis({ busca: busca || undefined, pageSize: 200 })
      .then((r) => setLista(r.data))
      .catch(() => setLista([]))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, [busca]);

  const hoje = hojeISO();
  const totais = lista.reduce(
    (acc, r) => {
      acc.total += r.valor;
      acc.recebido += r.pago ? r.valor : r.valorPago;
      if (situacao(r, hoje) === "atrasado") acc.atrasado += r.saldoDevedor;
      return acc;
    },
    { total: 0, recebido: 0, atrasado: 0 },
  );

  const abrirEdicao = (r: Recebivel) => {
    setEditId(r.id);
    setForm({
      data: r.data,
      pessoa: r.pessoa || "Paulo",
      contraparte: r.contraparte,
      descricao: r.descricao || "",
      valor: moedaParaInput(r.valor),
      condicaoPagamento: r.dataPagamento ? formatDataBR(r.dataPagamento) : r.condicaoPagamento || "",
      observacoes: r.observacoes || "",
    });
    setErro(null);
    cliente.listarBaixasRecebivel(r.id).then(setBaixas).catch(() => setBaixas([]));
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
    if (!form.contraparte.trim() || !form.valor) {
      setErro(`Preencha ${rotuloContraparte.toLowerCase()} e valor.`);
      return;
    }
    setSalvando(true);
    setErro(null);

    // Campo único "Data Pagamento": aceita dd/mm/aaaa (vira dataPagamento)
    // ou texto livre (vira condicaoPagamento) — mutuamente exclusivos.
    const texto = form.condicaoPagamento.trim();
    const matchData = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const dataPagamento = matchData ? `${matchData[3]}-${matchData[2]}-${matchData[1]}` : undefined;
    const condicaoPagamento = matchData ? undefined : texto || undefined;

    const dto: Record<string, unknown> = {
      data: form.data,
      descricao: form.descricao.trim() || undefined,
      valor: parseMoedaInput(form.valor),
      dataPagamento,
      condicaoPagamento,
      observacoes: form.observacoes.trim() || undefined,
    };
    // Campo "quem paga" — nome varia por contexto (empresa/origem/fornecedor
    // no backend), mas o cliente genérico só entende "contraparte" mapeado
    // pelo lib/api.ts; aqui reenviamos com o nome cru esperado pelo backend
    // é feito via chave genérica "contraparte" — o backend de cada contexto
    // aceita o campo próprio (empresa/origem), então mandamos ambos por
    // segurança.
    dto.empresa = form.contraparte.trim();
    dto.origem = form.contraparte.trim();
    if (mostrarPessoa) dto.pessoa = form.pessoa;

    try {
      if (editId) {
        await cliente.atualizarRecebivel(editId, dto);
      } else {
        await cliente.criarRecebivel(dto);
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
    if (!confirm("Excluir este recebível? Esta ação não pode ser desfeita.")) return;
    await cliente.removerRecebivel(id);
    fechar();
    carregar();
  };

  const editando = lista.find((r) => r.id === editId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{titulo}</h1>
          <p className="text-sm text-text-muted">Contas a receber, com baixa parcial e histórico.</p>
        </div>
        {podeEditar && (
          <Button icon={<Plus size={16} />} onClick={abrirCriacao}>
            Novo recebível
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Total</div>
          <div className="mt-1 text-xl font-semibold text-text">{formatBRL(totais.total)}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Recebido</div>
          <div className="mt-1 text-xl font-semibold text-success">{formatBRL(totais.recebido)}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Atrasado</div>
          <div className="mt-1 text-xl font-semibold text-danger">{formatBRL(totais.atrasado)}</div>
        </div>
      </div>

      <Block title="Lançamentos">
        <div className="mb-4 max-w-xs">
          <Input
            placeholder={`Buscar por ${rotuloContraparte.toLowerCase()}...`}
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
                <th className="px-2 py-2">{rotuloContraparte}</th>
                <th className="px-2 py-2 text-right">Valor</th>
                <th className="px-2 py-2">Data Pagamento</th>
                <th className="px-2 py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const s = situacao(r, hoje);
                return (
                  <tr
                    key={r.id}
                    onClick={() => abrirEdicao(r)}
                    className="cursor-pointer border-b border-border/60 hover:bg-surface-offset/40"
                  >
                    <td className="whitespace-nowrap px-2 py-2">{formatDataBR(r.data)}</td>
                    {mostrarPessoa && <td className="px-2 py-2">{r.pessoa}</td>}
                    <td className="px-2 py-2 font-medium text-text">{r.contraparte}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                      {formatBRL(r.valor)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-text-muted">
                      {r.dataPagamento ? formatDataBR(r.dataPagamento) : r.condicaoPagamento || "—"}
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
                    {carregando ? "Carregando..." : "Nenhum recebível cadastrado."}
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
                {editId ? "Editar recebível" : "Novo recebível"}
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
                label={rotuloContraparte}
                required
                value={form.contraparte}
                onChange={(e) => setForm({ ...form, contraparte: e.target.value })}
              />
              <Input
                label="Valor (R$)"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
              <Input
                label="Data Pagamento (estimada)"
                hint='Uma data (dd/mm/aaaa) ou um texto livre, ex.: "30 dias"'
                value={form.condicaoPagamento}
                onChange={(e) => setForm({ ...form, condicaoPagamento: e.target.value })}
              />
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
                      await cliente.registrarBaixaRecebivel(editId, b);
                      const novasBaixas = await cliente.listarBaixasRecebivel(editId);
                      carregar();
                      setBaixas(novasBaixas);
                    }}
                    onRemover={async (baixaId) => {
                      await cliente.removerBaixaRecebivel(editId, baixaId);
                      const novasBaixas = await cliente.listarBaixasRecebivel(editId);
                      carregar();
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
