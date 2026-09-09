import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import { useFinanceiroAuth } from "../financeiroAuth";

const DURACAO_PRESSIONAR_MS = 1100;

// O cadeado guia toda a cascata de níveis, e tem duas faces:
// - Clique normal: comportamento sempre visível e "chato" — abre o próximo
//   cadastro pendente (pessoal ou secreto), ou pede a senha pessoal (se já
//   cadastrada mas a sessão ainda está só em 'entrada'), ou simplesmente
//   desloga (se não há mais nada pendente no nível atual).
// - Pressionar e segurar (só ativo quando nível === 'pessoal' e a secreta
//   já foi configurada): dispara uma caixinha de texto solta, sem rótulo,
//   mal posicionada — como um resíduo de renderização — que some sozinha
//   se ninguém interagir. Digitar a senha secreta ali dentro tenta elevar
//   a sessão; qualquer outra coisa (ou nada) e ela só some, sem mensagem.
export function Cadeado({
  onAbrirCadastroPessoal,
  onAbrirEntrarPessoal,
  onAbrirCadastroSecreto,
}: {
  onAbrirCadastroPessoal: () => void;
  onAbrirEntrarPessoal: () => void;
  onAbrirCadastroSecreto: () => void;
}) {
  const { nivel, pessoalConfigurada, secretaConfigurada, logout, tentarSecreto } =
    useFinanceiroAuth();
  const [glitch, setGlitch] = useState(false);
  const [valor, setValor] = useState("");
  const timerRef = useRef<number | null>(null);
  const disparouRef = useRef(false);
  const valorRef = useRef("");
  valorRef.current = valor;

  const cancelarTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const podeGlitch = nivel === "pessoal" && secretaConfigurada;

  const onPointerDown = () => {
    if (!podeGlitch) return;
    disparouRef.current = false;
    timerRef.current = window.setTimeout(() => {
      disparouRef.current = true;
      setGlitch(true);
      setValor("");
      window.setTimeout(
        () => setGlitch((g) => (valorRef.current.trim().length === 0 ? false : g)),
        2200,
      );
    }, DURACAO_PRESSIONAR_MS);
  };

  const onPointerUp = () => {
    cancelarTimer();
    if (disparouRef.current) return; // já virou glitch, não trata como clique
    if (nivel === "nenhum") return;
    if (nivel === "entrada" && !pessoalConfigurada) {
      onAbrirCadastroPessoal();
    } else if (nivel === "entrada" && pessoalConfigurada) {
      onAbrirEntrarPessoal();
    } else if (nivel === "pessoal" && !secretaConfigurada) {
      onAbrirCadastroSecreto();
    } else {
      logout();
    }
  };

  const onPointerLeave = () => {
    cancelarTimer();
  };

  const submeter = async () => {
    const senha = valor;
    setGlitch(false);
    setValor("");
    if (!senha) return;
    await tentarSecreto(senha); // nunca lança; sucesso já atualiza o nível
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        title="Sair"
        className="rounded p-1.5 text-text-muted hover:bg-surface-offset hover:text-text"
      >
        <Lock size={18} />
      </button>

      {glitch && (
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={submeter}
          onKeyDown={(e) => {
            if (e.key === "Enter") submeter();
            if (e.key === "Escape") {
              setGlitch(false);
              setValor("");
            }
          }}
          style={{
            position: "absolute",
            top: 26,
            left: -3,
            width: 74,
            fontSize: 11,
            padding: "1px 3px",
            border: "1px solid #999",
            outline: "none",
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
}
