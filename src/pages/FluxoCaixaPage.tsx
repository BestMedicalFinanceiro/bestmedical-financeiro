import { useEffect, useMemo, useState } from "react";
import { TrendingUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Block, Input, Select } from "../components/ui";
import { formatBRL, formatDataBR } from "../lib/format";
import type { ClienteFinanceiro, FluxoCaixaLancamento } from "../lib/api";

type Granularidade = "semana" | "mes" | "ano";

function hojeLocalISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}
function paraDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function paraISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function inicioSemana(d: Date): Date {
  const dia = d.getDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  const seg = new Date(d);
  seg.setDate(d.getDate() + deslocamento);
  return seg;
}
function calcularIntervalo(
  granularidade: Granularidade,
  referencia: string,
): { inicio: string; fim: string; label: string } {
  const ref = paraDate(referencia);
  if (granularidade === "semana") {
    const ini = inicioSemana(ref);
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6);
    return {
      inicio: paraISO(ini),
      fim: paraISO(fim),
      label: `${formatDataBR(paraISO(ini))} a ${formatDataBR(paraISO(fim))}`,
    };
  }
  if (granularidade === "mes") {
    const ini = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    const nomes = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return {
      inicio: paraISO(ini),
      fim: paraISO(fim),
      label: `${nomes[ref.getMonth()]}/${ref.getFullYear()}`,
    };
  }
  const ini = new Date(ref.getFullYear(), 0, 1);
  const fim = new Date(ref.getFullYear(), 11, 31);
  return { inicio: paraISO(ini), fim: paraISO(fim), label: String(ref.getFullYear()) };
}
function deslocarReferencia(g: Granularidade, referencia: string, passo: number): string {
  const d = paraDate(referencia);
  if (g === "semana") d.setDate(d.getDate() + passo * 7);
  else if (g === "mes") d.setMonth(d.getMonth() + passo);
  else d.setFullYear(d.getFullYear() + passo);
  return paraISO(d);
}

export function FluxoCaixaPage({ titulo, cliente }: { titulo: string; cliente: ClienteFinanceiro }) {
  const [lancamentos, setLancamentos] = useState<FluxoCaixaLancamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [granularidade, setGranularidade] = useState<Granularidade>("mes");
  const [referencia, setReferencia] = useState(hojeLocalISO());
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "entrada" | "saida">("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setCarregando(true);
    cliente
      .fluxoCaixa()
      .then(setLancamentos)
      .catch(() => setLancamentos([]))
      .finally(() => setCarregando(false));
  }, [cliente]);

  const intervalo = useMemo(() => calcularIntervalo(granularidade, referencia), [granularidade, referencia]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lancamentos
      .filter((l) => l.data >= intervalo.inicio && l.data <= intervalo.fim)
      .filter((l) => tipoFiltro === "todos" || l.tipo === tipoFiltro)
      .filter(
        (l) =>
          !q ||
          l.origem.toLowerCase().includes(q) ||
          l.descricao.toLowerCase().includes(q) ||
          l.categoria.toLowerCase().includes(q),
      )
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [lancamentos, intervalo, tipoFiltro, busca]);

  const totais = useMemo(() => {
    const entrada = filtrados.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
    const saida = filtrados.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
    const entradaPrevista = filtrados
      .filter((l) => l.tipo === "entrada" && l.previsto)
      .reduce((s, l) => s + l.valor, 0);
    return { entrada, saida, saldo: entrada - saida, entradaPrevista };
  }, [filtrados]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-text">{titulo}</h1>
        <p className="text-sm text-text-muted">
          Entradas e saídas realizadas e previstas — filtre por semana, mês ou ano.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Entradas</div>
          <div className="mt-1 text-xl font-semibold text-success">{formatBRL(totais.entrada)}</div>
          {totais.entradaPrevista > 0 && (
            <div className="mt-0.5 text-xs text-text-faint">
              dos quais {formatBRL(totais.entradaPrevista)} previsto
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Saídas</div>
          <div className="mt-1 text-xl font-semibold text-danger">{formatBRL(totais.saida)}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Saldo</div>
          <div className={`mt-1 text-xl font-semibold ${totais.saldo >= 0 ? "text-success" : "text-danger"}`}>
            {formatBRL(totais.saldo)}
          </div>
        </div>
      </div>

      <Block title="Lançamentos" icon={<TrendingUp size={18} />}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border p-1">
            {(
              [
                { valor: "semana", label: "Semanal" },
                { valor: "mes", label: "Mensal" },
                { valor: "ano", label: "Anual" },
              ] as { valor: Granularidade; label: string }[]
            ).map((g) => (
              <button
                key={g.valor}
                onClick={() => setGranularidade(g.valor)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  granularidade === g.valor ? "bg-primary text-text-inverse" : "text-text-muted hover:bg-surface-offset"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setReferencia((r) => deslocarReferencia(granularidade, r, -1))}
              className="rounded p-1.5 text-text-muted hover:bg-surface-offset hover:text-text"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-text">{intervalo.label}</span>
            <button
              onClick={() => setReferencia((r) => deslocarReferencia(granularidade, r, 1))}
              className="rounded p-1.5 text-text-muted hover:bg-surface-offset hover:text-text"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setReferencia(hojeLocalISO())}
              className="ml-1 rounded-md border border-border px-2 py-1 text-xs text-text-muted hover:bg-surface-offset hover:text-text"
            >
              Hoje
            </button>
          </div>

          <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)} className="!w-auto">
            <option value="todos">Todos</option>
            <option value="entrada">Só entradas</option>
            <option value="saida">Só saídas</option>
          </Select>

          <div className="max-w-xs flex-1">
            <Input
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Origem</th>
                <th className="px-2 py-2">Descrição</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id} className="border-b border-border/60 hover:bg-surface-offset/40">
                  <td className="whitespace-nowrap px-2 py-2">{formatDataBR(l.data)}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.tipo === "entrada" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {l.tipo === "entrada" ? "Entrada" : "Saída"}
                      </span>
                      {l.previsto && (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                          Previsto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 font-medium text-text">{l.origem}</td>
                  <td className="px-2 py-2 text-text-muted">{l.descricao}</td>
                  <td className="px-2 py-2">{l.categoria}</td>
                  <td
                    className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${
                      l.tipo === "entrada" ? "text-success" : "text-danger"
                    }`}
                  >
                    {l.tipo === "saida" ? "− " : ""}
                    {formatBRL(l.valor)}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-text-muted">
                    {carregando ? "Carregando..." : "Nenhum lançamento no período selecionado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Block>
    </div>
  );
}
