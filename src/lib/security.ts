// src/lib/security.ts
// ============================================================
// UTILITÁRIOS DE SEGURANÇA E VALIDAÇÃO
// Centraliza sanitização de strings, validações de entrada
// e proteções contra dados malformados antes do Firestore.
// ============================================================

// ─── Limites de tamanho ──────────────────────────────────────────────────────
export const LIMITS = {
  TITULO_MAX: 200,
  DESCRICAO_MAX: 500,
  TEXTO_ORIGINAL_MAX: 200_000,
  FLASHCARD_FRENTE_MAX: 500,
  FLASHCARD_VERSO_MAX: 1000,
  QUESTAO_PERGUNTA_MAX: 2000,
  QUESTAO_ALTERNATIVA_MAX: 500,
  QUESTAO_EXPLICACAO_MAX: 3000,
  QUESTAO_ALTERNATIVAS_MIN: 2,
  QUESTAO_ALTERNATIVAS_MAX: 6,
  RESUMO_MAX: 1000,
  TRECHO_MAX: 2000,
  NOME_MAX: 100,
  EMAIL_MAX: 254,
  SENHA_MIN: 6,
  ASSUNTOS_MAX: 20,
  QUESTOES_LOTE_MAX: 20,
  FLASHCARDS_LOTE_MAX: 30,
  TEXTO_IA_AVISO: 20_000, // acima disto exibe aviso ao usuário
} as const;

// ─── Sanitização de strings ──────────────────────────────────────────────────

/**
 * Remove caracteres de controle perigosos (exceto \n, \r, \t),
 * normaliza espaços múltiplos e trunca para o limite dado.
 */
export function sanitizeString(value: unknown, maxLength: number): string {
  if (value === null || value === undefined) return "";
  const str = String(value)
    // Remove caracteres de controle exceto newline/tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Remove caracteres nulos Unicode
    .replace(/\u0000/g, "")
    .trim();
  return str.slice(0, maxLength);
}

/**
 * Sanitiza uma string para uso em campo de uma linha
 * (remove quebras de linha).
 */
export function sanitizeSingleLine(value: unknown, maxLength: number): string {
  return sanitizeString(value, maxLength).replace(/[\r\n]+/g, " ");
}

/**
 * Sanitiza array de strings.
 */
export function sanitizeStringArray(
  arr: unknown,
  maxLength: number,
  maxItems: number
): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, maxItems)
    .map((item) => sanitizeSingleLine(item, maxLength))
    .filter((s) => s.length > 0);
}

// ─── Validações ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNonEmpty(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} não pode estar vazio.` };
  }
  return { valid: true };
}

export function validateMinLength(
  value: string,
  min: number,
  fieldName: string
): ValidationResult {
  if (value.trim().length < min) {
    return {
      valid: false,
      error: `${fieldName} deve ter pelo menos ${min} caractere${min > 1 ? "s" : ""}.`,
    };
  }
  return { valid: true };
}

export function validateMaxLength(
  value: string,
  max: number,
  fieldName: string
): ValidationResult {
  if (value.length > max) {
    return {
      valid: false,
      error: `${fieldName} excede o limite de ${max} caracteres.`,
    };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    return { valid: false, error: "E-mail inválido." };
  }
  if (email.length > LIMITS.EMAIL_MAX) {
    return { valid: false, error: "E-mail muito longo." };
  }
  return { valid: true };
}

export function validateArray(
  arr: unknown,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (!Array.isArray(arr)) {
    return { valid: false, error: `${fieldName} deve ser uma lista.` };
  }
  if (arr.length < min) {
    return {
      valid: false,
      error: `${fieldName} deve ter pelo menos ${min} item${min > 1 ? "s" : ""}.`,
    };
  }
  if (arr.length > max) {
    return {
      valid: false,
      error: `${fieldName} excede o máximo de ${max} itens.`,
    };
  }
  return { valid: true };
}

// ─── Validadores de domínio ───────────────────────────────────────────────────

export interface FlashcardInput {
  frente: string;
  verso: string;
}

export function validateAndSanitizeFlashcard(fc: unknown): FlashcardInput | null {
  if (!fc || typeof fc !== "object") return null;
  const obj = fc as Record<string, unknown>;

  const frente = sanitizeString(obj.frente, LIMITS.FLASHCARD_FRENTE_MAX);
  const verso = sanitizeString(obj.verso, LIMITS.FLASHCARD_VERSO_MAX);

  if (frente.length < 3 || verso.length < 3) return null;

  return { frente, verso };
}

export interface QuestaoInput {
  pergunta: string;
  alternativas: string[];
  correta: string;
  explicacao: string;
  tipo: "simples" | "elaborada";
}

export function validateAndSanitizeQuestao(q: unknown): QuestaoInput | null {
  if (!q || typeof q !== "object") return null;
  const obj = q as Record<string, unknown>;

  const pergunta = sanitizeString(obj.pergunta, LIMITS.QUESTAO_PERGUNTA_MAX);
  if (pergunta.length < 5) return null;

  const alternativas = sanitizeStringArray(
    obj.alternativas,
    LIMITS.QUESTAO_ALTERNATIVA_MAX,
    LIMITS.QUESTAO_ALTERNATIVAS_MAX
  );
  if (alternativas.length < LIMITS.QUESTAO_ALTERNATIVAS_MIN) return null;

  const correta = sanitizeSingleLine(obj.correta, LIMITS.QUESTAO_ALTERNATIVA_MAX);
  if (!correta) return null;

  // Verifica se a correta está entre as alternativas
  if (!alternativas.some((a) => a === correta)) {
    // Tenta match parcial (segurança extra)
    const match = alternativas.find((a) =>
      a.toLowerCase().trim() === correta.toLowerCase().trim()
    );
    if (!match) return null;
  }

  const explicacao = sanitizeString(obj.explicacao, LIMITS.QUESTAO_EXPLICACAO_MAX);
  const tipo = obj.tipo === "simples" ? "simples" : "elaborada";

  return { pergunta, alternativas, correta, explicacao, tipo };
}

export interface AssuntoInput {
  id: string;
  titulo: string;
  descricao: string;
  trecho: string;
  totalQuestoes?: number;
}

export function validateAndSanitizeAssunto(a: unknown): AssuntoInput | null {
  if (!a || typeof a !== "object") return null;
  const obj = a as Record<string, unknown>;

  const id = sanitizeSingleLine(obj.id, 50);
  const titulo = sanitizeSingleLine(obj.titulo, LIMITS.TITULO_MAX);
  const descricao = sanitizeSingleLine(obj.descricao, LIMITS.DESCRICAO_MAX);
  const trecho = sanitizeString(obj.trecho, LIMITS.TRECHO_MAX);

  if (!id || titulo.length < 2) return null;

  return {
    id,
    titulo,
    descricao,
    trecho,
    totalQuestoes: typeof obj.totalQuestoes === "number" ? obj.totalQuestoes : 0,
  };
}

// ─── Debounce ────────────────────────────────────────────────────────────────

/**
 * Cria uma versão com debounce de uma função.
 * Evita chamadas duplicadas por duplo clique ou re-renderização.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Hook de controle de submissão única.
 * Retorna flag `isSubmitting` e wrapper `withProtection`.
 * Garante que uma ação assíncrona não seja disparada duas vezes.
 */
export function createSubmitGuard() {
  let running = false;
  return async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (running) return undefined;
    running = true;
    try {
      return await fn();
    } finally {
      running = false;
    }
  };
}

// ─── Aviso de texto grande para IA ───────────────────────────────────────────

export function checkTextSizeForIA(text: string): {
  size: number;
  isLarge: boolean;
  warning: string | null;
} {
  const size = text.length;
  const isLarge = size > LIMITS.TEXTO_IA_AVISO;
  return {
    size,
    isLarge,
    warning: isLarge
      ? `Texto grande (${Math.round(size / 1000)}k caracteres). A IA processará uma amostra representativa.`
      : null,
  };
}

// ─── Verificação de array de assuntos ────────────────────────────────────────

export function validateAssuntosArray(assuntos: unknown): boolean {
  if (!Array.isArray(assuntos)) return false;
  if (assuntos.length === 0) return false;
  return assuntos.every(
    (a) =>
      a &&
      typeof a === "object" &&
      typeof (a as Record<string, unknown>).id === "string" &&
      typeof (a as Record<string, unknown>).titulo === "string"
  );
}