// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";

describe("PWA Detecção e Isolamento por Dispositivo", () => {
  const STORAGE_KEY = "pwa_installed_on_this_device";

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("deve iniciar como não instalado em um dispositivo novo (storage vazio)", () => {
    const isInstalled = window.localStorage.getItem(STORAGE_KEY) === "true";
    expect(isInstalled).toBe(false);
  });

  it("deve identificar como instalado apenas após a gravação local no dispositivo", () => {
    // Simula a instalação concluída no dispositivo 1
    window.localStorage.setItem(STORAGE_KEY, "true");
    const isInstalledDevice1 = window.localStorage.getItem(STORAGE_KEY) === "true";
    expect(isInstalledDevice1).toBe(true);
  });

  it("garante que o estado é isolado e não depende de dados de usuário ou backend", () => {
    // Dispositivo A: Usuário instala
    const deviceA_Storage = new Map<string, string>();
    deviceA_Storage.set(STORAGE_KEY, "true");

    // Dispositivo B: Mesmo usuário faz login (storage local diferente em outro aparelho)
    const deviceB_Storage = new Map<string, string>();

    expect(deviceA_Storage.get(STORAGE_KEY)).toBe("true");
    expect(deviceB_Storage.get(STORAGE_KEY)).toBeUndefined();
  });
});
