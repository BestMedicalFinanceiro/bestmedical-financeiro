import { useState, type ReactNode } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { FinanceiroAuthProvider, useFinanceiroAuth } from "./financeiroAuth";
import { EntradaGate } from "./pages/EntradaGate";
import { DespesasPage } from "./pages/DespesasPage";
import { RecebiveisPage } from "./pages/RecebiveisPage";
import { FluxoCaixaPage } from "./pages/FluxoCaixaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { Cadeado } from "./components/Cadeado";
import { CadastrarPessoalModal } from "./components/CadastrarPessoalModal";
import { EntrarPessoalModal } from "./components/EntrarPessoalModal";
import { CadastrarSecretoModal } from "./components/CadastrarSecretoModal";
import { apiBest, apiPessoal, apiReservado, type ClienteFinanceiro } from "./lib/api";

type Secao = "best" | "pessoal" | "secreto";
type Pagina = "dashboard" | "despesas" | "recebiveis" | "fluxo";

export default function App() {
  return (
    <FinanceiroAuthProvider>
      <Shell />
    </FinanceiroAuthProvider>
  );
}

function Shell() {
  const { autenticado, carregando } = useFinanceiroAuth();

  if (!autenticado) {
    if (carregando) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <p className="text-text-muted">Carregando...</p>
        </div>
      );
    }
    return <EntradaGate />;
  }
  return <Painel />;
}

const NAV_ITENS: { valor: Pagina; label: string; icon: ReactNode }[] = [
  { valor: "despesas", label: "Despesas", icon: <Receipt size={16} /> },
  { valor: "recebiveis", label: "Recebíveis", icon: <ClipboardList size={16} /> },
  { valor: "fluxo", label: "Fluxo de Caixa", icon: <TrendingUp size={16} /> },
  { valor: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
];

function conteudoPagina(
  pagina: Pagina,
  cliente: ClienteFinanceiro,
  titulo: string,
  rotuloContraparte: string,
  mostrarPessoa: boolean,
) {
  switch (pagina) {
    case "despesas":
      return (
        <DespesasPage titulo={`Despesas — ${titulo}`} cliente={cliente} podeEditar mostrarPessoa={mostrarPessoa} />
      );
    case "recebiveis":
      return (
        <RecebiveisPage
          titulo={`Recebíveis — ${titulo}`}
          rotuloContraparte={rotuloContraparte}
          cliente={cliente}
          podeEditar
          mostrarPessoa={mostrarPessoa}
        />
      );
    case "fluxo":
      return <FluxoCaixaPage titulo={`Fluxo de Caixa — ${titulo}`} cliente={cliente} />;
    case "dashboard":
      return <DashboardPage titulo={`Dashboard — ${titulo}`} cliente={cliente} />;
  }
}

function Painel() {
  const { nivel, secretaConfigurada } = useFinanceiroAuth();
  const [secao, setSecao] = useState<Secao>("best");
  const [pagina, setPagina] = useState<Pagina>("dashboard");
  const [modalCadastroPessoal, setModalCadastroPessoal] = useState(false);
  const [modalEntrarPessoal, setModalEntrarPessoal] = useState(false);
  const [modalCadastroSecreto, setModalCadastroSecreto] = useState(false);

  const cliente = secao === "secreto" ? apiReservado : secao === "pessoal" ? apiPessoal : apiBest;
  const titulo = secao === "secreto" ? "Top Secret" : secao === "pessoal" ? "Pessoal" : "Best Medical";
  const rotuloContraparte = secao === "best" ? "Empresa" : "Origem";
  const mostrarPessoa = secao === "pessoal";

  const irPara = (s: Secao, p: Pagina) => {
    setSecao(s);
    setPagina(p);
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface p-4">
        <div className="mb-6">
          <div className="text-sm font-semibold text-text">Financeiro</div>
          <div className="text-xs text-text-faint">Best Medical</div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint">Best</div>
          {NAV_ITENS.map((n) => (
            <button
              key={`best-${n.valor}`}
              onClick={() => irPara("best", n.valor)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                secao === "best" && pagina === n.valor
                  ? "bg-primary text-text-inverse"
                  : "text-text-muted hover:bg-surface-offset"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}

          {(nivel === "pessoal" || nivel === "secreto") && (
            <>
              <div className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                Pessoal
              </div>
              {NAV_ITENS.map((n) => (
                <button
                  key={`pessoal-${n.valor}`}
                  onClick={() => irPara("pessoal", n.valor)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    secao === "pessoal" && pagina === n.valor
                      ? "bg-primary text-text-inverse"
                      : "text-text-muted hover:bg-surface-offset"
                  }`}
                >
                  {n.icon}
                  {n.label}
                </button>
              ))}
            </>
          )}

          {nivel === "secreto" && (
            <>
              <div className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                Top Secret
              </div>
              {NAV_ITENS.map((n) => (
                <button
                  key={`secreto-${n.valor}`}
                  onClick={() => irPara("secreto", n.valor)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    secao === "secreto" && pagina === n.valor
                      ? "bg-primary text-text-inverse"
                      : "text-text-muted hover:bg-surface-offset"
                  }`}
                >
                  {n.icon}
                  {n.label}
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-text-faint">paulodick</span>
          <Cadeado
            onAbrirCadastroPessoal={() => setModalCadastroPessoal(true)}
            onAbrirEntrarPessoal={() => setModalEntrarPessoal(true)}
            onAbrirCadastroSecreto={() => setModalCadastroSecreto(true)}
          />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {conteudoPagina(pagina, cliente, titulo, rotuloContraparte, mostrarPessoa)}
      </main>

      {modalCadastroPessoal && (
        <CadastrarPessoalModal
          onFechar={() => setModalCadastroPessoal(false)}
          onSucesso={() => {
            setModalCadastroPessoal(false);
            irPara("pessoal", "dashboard");
          }}
        />
      )}
      {modalEntrarPessoal && (
        <EntrarPessoalModal
          onFechar={() => setModalEntrarPessoal(false)}
          onSucesso={() => {
            setModalEntrarPessoal(false);
            irPara("pessoal", "dashboard");
          }}
        />
      )}
      {modalCadastroSecreto && !secretaConfigurada && (
        <CadastrarSecretoModal
          onFechar={() => setModalCadastroSecreto(false)}
          onSucesso={() => {
            setModalCadastroSecreto(false);
            irPara("secreto", "dashboard");
          }}
        />
      )}
    </div>
  );
}
