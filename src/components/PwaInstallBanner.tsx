// src/components/PwaInstallBanner.tsx
import { useState } from "react";
import { usePwaInstall } from "../contexts/PwaInstallContext";

const PwaInstallBanner = () => {
  const { canInstall, isInstalledOnThisDevice, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalledOnThisDevice || dismissed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 mb-6 border border-violet-500/30 shadow-lg bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-background backdrop-blur-md animate-fade-in-up">
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xl shadow-md shrink-0">
            📱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                Instalar Aplicativo neste Dispositivo
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tenha acesso rápido direto da sua tela inicial ou desktop com desempenho otimizado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => promptInstall()}
            className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Instalar App
          </button>
          
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dispensar banner"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
