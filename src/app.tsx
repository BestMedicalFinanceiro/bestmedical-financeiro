import { useState, type ReactNode } from "react";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { StaffAuthProvider, useStaffAuth } from "./staffAuth";
import { PessoalAuthProvider, usePessoalAuth } from "./pessoalAuth";
import { LoginStaff } from "./pages/LoginStaff";
import { PessoalGate } from "./pages/PessoalGate";
import { RedefinirSenha } from "./pages/RedefinirSenha";
import { DespesasPage } from "./pages/DespesasPage";
import { RecebiveisPage } from "./pages/RecebiveisPage";
import { FluxoCaixaPage } from "./pages/FluxoCaixaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { Cadeado } from "./components/Cadeado";
import { CadastrarSecretaModal } from "./components/CadastrarSecretaModal";
import { apiBest, apiPadu, apiPessoal, apiReservado, type ClienteFinanceiro } from "./lib/api";

type Workspace = "best" | "padu" | "pessoal";
type Pagina = "dashboard" | "despesas" | "recebiveis" | "fluxo";

export default function App() {
  const path = window.location.pathname;
  if (path === "/redefinir-senha") {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    return <RedefinirSenha token={token} />;
  }

  return (
    <StaffAuthProvider>
      <PessoalAuthProvider>
        <Shell />
      </PessoalAuthProvider>
    </StaffAuthProvider>
  );
}

function Shell() {
  const [workspace, setWorkspace] = useState<Workspace>("best");
  const staff = useStaffAuth();
  const pessoal = usePessoalAuth();

  if (workspace === "pessoal") {
    if (!pessoal.autenticado) return <PessoalGate />;
    return <WorkspacePessoal onTrocarWorkspace={setWorkspace} />;
  }

  // best ou padu — mesmo login de staff
  if (staff.carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-text-muted">Carregando...</p>
      </div>
    );
  }
  if (!staff.autenticado) {
    return <LoginStaff titulo={workspace === "best" ? "Financeiro — Best Medical" : "Financeiro — Padu Studios"} />;
  }
  return <WorkspaceStaff workspace={workspace} onTrocarWorkspace={setWorkspace} />;
}

// ===================== Seletor de workspace (topo) =====================

function SeletorWorkspace({
  atual,
  onTrocar,
}: {
  atual: Workspace;
  onTrocar: (w: Workspace) => void;
}) {
  const opcoes: { valor: Workspace; label: string; icon: ReactNode }[] = [
    { valor: "best", label: "Best Medical", icon: <Building2 size={15} /> },
    { valor: "padu", label: "Padu Studios", icon: <Building2 size={15} /> },
    { valor: "pessoal", label: "Pessoal", icon: <Wallet size={15} /> },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          onClick={() => onTrocar(o.valor)}
          className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium ${
            atual === o.valor ? "bg-primary text-text-inverse" : "text-text-muted hover:bg-surface-offset"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
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
  podeEditar: boolean,
  mostrarPessoa: boolean,
) {
  switch (pagina) {
    case "despesas":
      return (
        <DespesasPage titulo={`Despesas — ${titulo}`} cliente={cliente} podeEditar={podeEditar} mostrarPessoa={mostrarPessoa} />
      );
    case "recebiveis":
      return (
        <RecebiveisPage
          titulo={`Recebíveis — ${titulo}`}
          rotuloContraparte={rotuloContraparte}
          cliente={cliente}
          podeEditar={podeEditar}
          mostrarPessoa={mostrarPessoa}
        />
      );
    case "fluxo":
      return <FluxoCaixaPage titulo={`Fluxo de Caixa — ${titulo}`} cliente={cliente} />;
    case "dashboard":
      return <DashboardPage titulo={`Dashboard — ${titulo}`} cliente={cliente} />;
  }
}

// ===================== Workspace Best / Padu =====================

function WorkspaceStaff({
  workspace,
  onTrocarWorkspace,
}: {
  workspace: "best" | "padu";
  onTrocarWorkspace: (w: Workspace) => void;
}) {
  const { logout, user } = useStaffAuth();
  const [pagina, setPagina] = useState<Pagina>("dashboard");

  const cliente = workspace === "best" ? apiBest : apiPadu;
  const titulo = workspace === "best" ? "Best Medical" : "Padu Studios";

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface p-4">
        <div className="mb-6">
          <div className="text-sm font-semibold text-text">Financeiro</div>
          <div className="text-xs text-text-faint">{titulo}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITENS.map((n) => (
            <button
              key={n.valor}
              onClick={() => setPagina(n.valor)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                pagina === n.valor ? "bg-primary text-text-inverse" : "text-text-muted hover:bg-surface-offset"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-3 text-xs text-text-faint">{user?.usuario}</div>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-offset"
        >
          <LogOut size={16} />
          Sair
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <SeletorWorkspace atual={workspace} onTrocar={onTrocarWorkspace} />
        </div>
        {conteudoPagina(pagina, cliente, titulo, "Empresa", true, false)}
      </main>
    </div>
  );
}

// ===================== Workspace Pessoal (+ reservado) =====================

function WorkspacePessoal({ onTrocarWorkspace }: { onTrocarWorkspace: (w: Workspace) => void }) {
  const { escopo, precisaConfigurarSecreta } = usePessoalAuth();
  const [pagina, setPagina] = useState<Pagina>("dashboard");
  const [areaReservada, setAreaReservada] = useState(false);
  const [modalCadastroSecreta, setModalCadastroSecreta] = useState(false);

  const naReservada = areaReservada && escopo === "reservado";
  const cliente = naReservada ? apiReservado : apiPessoal;
  const titulo = "Pessoal";

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface p-4">
        <div className="mb-6">
          <div className="text-sm font-semibold text-text">Financeiro</div>
          <div className="text-xs text-text-faint">Pessoal</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITENS.map((n) => (
            <button
              key={n.valor}
              onClick={() => {
                setAreaReservada(false);
                setPagina(n.valor);
              }}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                pagina === n.valor && !naReservada
                  ? "bg-primary text-text-inverse"
                  : "text-text-muted hover:bg-surface-offset"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}

          {escopo === "reservado" && (
            <>
              <div className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                Reservado
              </div>
              {NAV_ITENS.map((n) => (
                <button
                  key={`r-${n.valor}`}
                  onClick={() => {
                    setAreaReservada(true);
                    setPagina(n.valor);
                  }}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    pagina === n.valor && naReservada
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
          <span className="text-xs text-text-faint">Pessoal</span>
          <Cadeado onAbrirCadastroSecreta={() => setModalCadastroSecreta(true)} />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <SeletorWorkspace atual="pessoal" onTrocar={onTrocarWorkspace} />
        </div>
        {conteudoPagina(pagina, cliente, naReservada ? `${titulo} · Reservado` : titulo, "Origem", true, !naReservada)}
      </main>

      {modalCadastroSecreta && precisaConfigurarSecreta && (
        <CadastrarSecretaModal onFechar={() => setModalCadastroSecreta(false)} />
      )}
    </div>
  );
}
