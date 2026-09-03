// src/components/PwaInstallModal.tsx
import { usePwaInstall } from "../contexts/PwaInstallContext";

const PwaInstallModal = () => {
  const { showIosModal, setShowIosModal, isIOS, isInstalledOnThisDevice } = usePwaInstall();

  if (!showIosModal || isInstalledOnThisDevice) return null;

  const handleMarcarComoInstalado = () => {
    localStorage.setItem("pwa_installed_on_this_device", "true");
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md glass-strong rounded-3xl p-6 border border-violet-500/30 shadow-2xl animate-scale-in"
        style={{ background: "linear-gradient(135deg, rgba(20,20,30,0.95), rgba(15,15,25,0.98))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              S
            </div>
            <div>
              <h3 className="font-bold text-white text-base" style={{ fontFamily: "Syne, sans-serif" }}>
                Instalar no Dispositivo
              </h3>
              <p className="text-xs text-muted-foreground">Estudo Inteligente como Aplicativo</p>
            </div>
          </div>
          <button
            onClick={() => setShowIosModal(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Instale o app diretamente neste aparelho para abrir em tela cheia, sem barra de navegação e com acesso instantâneo:
          </p>

          {isIOS ? (
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-xs text-white">
                  No Safari, toque no ícone de <strong className="text-violet-400">Compartilhar</strong> (o quadrado com uma seta para cima <span className="inline-block px-1.5 py-0.5 bg-white/10 rounded text-[11px]">⎋</span>) na barra inferior.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-xs text-white">
                  Role a lista para baixo e toque em <strong className="text-violet-400">"Adicionar à Tela de Início"</strong> (<span className="inline-block px-1.5 py-0.5 bg-white/10 rounded text-[11px]">➕</span>).
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-xs text-white">
                  Toque em <strong className="text-violet-400">"Adicionar"</strong> no canto superior direito para finalizar.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-xs text-white">
                  Clique no menu do seu navegador (<strong className="text-violet-400">⋮</strong> ou ícone de instalação na barra de endereços).
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-xs text-white">
                  Selecione <strong className="text-violet-400">"Instalar Estudo Inteligente"</strong> ou <strong className="text-violet-400">"Adicionar à tela inicial"</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <p className="text-[11px] text-violet-300 leading-normal">
              🔒 <strong>Atenção:</strong> A instalação é individual por aparelho. Ao instalar aqui, o aplicativo estará pronto neste dispositivo sem afetar seus outros computadores ou celulares.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setShowIosModal(false)}
            className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-lg"
          >
            Entendi
          </button>
          <button
            onClick={handleMarcarComoInstalado}
            className="w-full py-2 text-[11px] text-muted-foreground hover:text-white transition-colors"
          >
            Já instalei neste aparelho (não mostrar mais aqui)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallModal;
