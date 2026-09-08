import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import { usePessoalAuth } from "../pessoalAuth";

const DURACAO_PRESSIONAR_MS = 1100;

// O cadeado tem duas faces:
// - Clique normal: sempre "sai" (comportamento chato e previsível, como
//   qualquer botão de lock/logout — inclusive na primeiríssima vez que a
//   senha secreta ainda não existe, quando abre o cadastro dela).
// - Pressionar e segurar (só depois que a secreta já foi configurada e a
//   sessão ainda está no escopo comum): dispara uma caixinha de texto solta,
//   sem rótulo, mal posicionada — como um resíduo de renderização — que
//   some sozinha se ninguém interagir. Digitar a senha secreta ali dentro
//   tenta elevar a sessão; qualquer outra coisa (ou nada) e ela só some,
//   sem nenhuma mensagem.
export function Cadeado({
  onAbrirCadastroSecreta,
}: {
  onAbrirCadastroSecreta: () => void;
}) {
  const { escopo, precisaConfigurarSecreta, logout, tentarSecreta } = usePessoalAuth();
  const [glitch, setGlitch] = useState(false);
  const [valor, setValor] = useState("");
  const timerRef = useRef<number | null>(null);
  const disparouRef = useRef(false);

  const cancelarTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const podeGlitch = escopo === "pessoal" && !precisaConfigurarSecreta;

  const onPointerDown = () => {
    if (!podeGlitch) return;
    disparouRef.current = false;
    timerRef.current = window.setTimeout(() => {
      disparouRef.current = true;
      setGlitch(true);
      setValor("");
      window.setTimeout(() => setGlitch((g) => (valorAtualVazio() ? false : g)), 2200);
    }, DURACAO_PRESSIONAR_MS);
  };

  // Evita capturar `valor` desatualizado no fechamento acima.
  const valorRef = useRef("");
  valorRef.current = valor;
  function valorAtualVazio() {
    return valorRef.current.trim().length === 0;
  }

  const onPointerUp = () => {
    cancelarTimer();
    if (disparouRef.current) return; // já virou glitch, não trata como clique
    if (escopo === "nenhum") return;
    if (precisaConfigurarSecreta) {
      onAbrirCadastroSecreta();
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
    await tentarSecreta(senha); // nunca lança; sucesso já atualiza o escopo
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
