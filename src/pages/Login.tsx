import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createSubmitGuard } from "../lib/security";

const Login = () => {
  const { entrar, cadastrar } = useAuth();
  const navigate = useNavigate();

  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const submitGuard = useRef(createSubmitGuard());

  const handleSubmit = async () => {
    await submitGuard.current(async () => {
      setErro("");
      if (!email.trim() || !senha.trim()) {
        setErro("Preencha e-mail e senha.");
        return;
      }
      if (modo === "cadastro" && !nome.trim()) {
        setErro("Preencha seu nome.");
        return;
      }
      setCarregando(true);
      try {
        if (modo === "login") {
          await entrar(email.trim(), senha);
        } else {
          await cadastrar(email.trim(), senha, nome.trim());
        }
        navigate("/");
      } catch (e: any) {
        const code = e?.code || "";
        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
          setErro("E-mail ou senha incorretos.");
        } else if (code === "auth/email-already-in-use") {
          setErro("Este e-mail já está cadastrado.");
        } else if (code === "auth/weak-password") {
          setErro("Senha muito fraca. Use pelo menos 6 caracteres.");
        } else if (code === "auth/invalid-email") {
          setErro("E-mail inválido.");
        } else {
          setErro("Ocorreu um erro. Tente novamente.");
        }
      } finally {
        setCarregando(false);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Background decorations */}
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 opacity-90" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 blur-xl opacity-50 animate-pulse" />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-2xl" style={{ fontFamily: "Syne, sans-serif" }}>S</span>
          </div>
          <h1 className="text-2xl font-bold text-gradient" style={{ fontFamily: "Syne, sans-serif" }}>
            Estudo Inteligente
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {modo === "login" ? "Acesse sua conta" : "Crie sua conta gratuita"}
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8" style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
          {/* Tabs */}
          <div className="flex gap-1 glass rounded-xl p-1 mb-6">
            <button
              onClick={() => { setModo("login"); setErro(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                modo === "login"
                  ? "bg-violet-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setModo("cadastro"); setErro(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                modo === "cadastro"
                  ? "bg-violet-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <div className="space-y-4">
            {/* Nome (apenas no cadastro) */}
            {modo === "cadastro" && (
              <div className="animate-fade-in-up">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Seu nome completo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="seu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={modo === "cadastro" ? "Mínimo 6 caracteres" : "••••••••"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5 animate-fade-in">
                <svg className="w-4 h-4 text-destructive shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-destructive">{erro}</p>
              </div>
            )}

            {/* Botão */}
            <button
              onClick={handleSubmit}
              disabled={carregando}
              className="btn-primary w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              {carregando ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {modo === "login" ? "Entrando..." : "Criando conta..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {modo === "login" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Entrar
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Criar Conta
                    </>
                  )}
                </span>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Estude de forma inteligente com IA 🧠
        </p>
      </div>
    </div>
  );
};

export default Login;