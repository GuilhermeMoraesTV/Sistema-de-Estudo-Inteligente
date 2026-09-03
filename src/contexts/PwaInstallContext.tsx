// src/contexts/PwaInstallContext.tsx
// Gerenciador de instalação PWA estritamente POR DISPOSITIVO.
// O estado é mantido exclusivamente no localStorage local e verificado via display-mode,
// garantindo que NUNCA seja sincronizado com a conta do usuário ou banco de dados.

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "pwa_installed_on_this_device";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaInstallContextType {
  isInstalledOnThisDevice: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  showIosModal: boolean;
  setShowIosModal: (show: boolean) => void;
  promptInstall: () => Promise<boolean>;
}

const PwaInstallContext = createContext<PwaInstallContextType | null>(null);

export const usePwaInstall = () => {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall deve ser usado dentro de um PwaInstallProvider");
  }
  return context;
};

export const PwaInstallProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalledOnThisDevice, setIsInstalledOnThisDevice] = useState<boolean>(() => {
    // 1. Verifica se já está gravado no armazenamento local deste aparelho
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") return true;

      // 2. Verifica se a aplicação já está rodando em modo standalone (já instalada)
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      if (isStandaloneMode) {
        localStorage.setItem(STORAGE_KEY, "true");
        return true;
      }
    }
    return false;
  });

  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // Detecta plataforma iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Registra Service Worker se suportado
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("./sw.js")
          .then((reg) => {
            console.log("Service Worker registrado com sucesso:", reg.scope);
          })
          .catch((err) => {
            console.warn("Falha ao registrar Service Worker:", err);
          });
      });
    }

    // Monitora modo de exibição standalone
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const standalone = e.matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
      if (standalone) {
        // Se estiver aberto como aplicativo instalado neste aparelho, marca como instalado
        localStorage.setItem(STORAGE_KEY, "true");
        setIsInstalledOnThisDevice(true);
      }
    };

    handleDisplayModeChange(mediaQuery);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    // Captura evento de prompt nativo de instalação do navegador
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Evento disparado quando o app foi instalado com sucesso NESTE aparelho
    const handleAppInstalled = () => {
      console.log("PWA instalado com sucesso neste dispositivo.");
      localStorage.setItem(STORAGE_KEY, "true");
      setIsInstalledOnThisDevice(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Pode instalar se ainda não estiver instalado NESTE dispositivo
  const canInstall = !isInstalledOnThisDevice && !isStandalone;

  const promptInstall = async (): Promise<boolean> => {
    // Se for iOS e não instalado, exibe modal com o passo-a-passo do Safari
    if (isIOS) {
      setShowIosModal(true);
      return false;
    }

    // Se tivermos o evento nativo interceptado (Chrome, Edge, Android, etc.)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          localStorage.setItem(STORAGE_KEY, "true");
          setIsInstalledOnThisDevice(true);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.warn("Erro ao disparar prompt de instalação:", err);
      }
    } else {
      // Fallback para navegadores sem deferredPrompt disponível
      setShowIosModal(true);
    }
    return false;
  };

  return (
    <PwaInstallContext.Provider
      value={{
        isInstalledOnThisDevice,
        canInstall,
        isIOS,
        isStandalone,
        showIosModal,
        setShowIosModal,
        promptInstall,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
};
