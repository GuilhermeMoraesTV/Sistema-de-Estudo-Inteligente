import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import {
  sanitizeString,
  sanitizeSingleLine,
  sanitizeStringArray,
  validateAndSanitizeFlashcard,
  validateAndSanitizeQuestao,
  validateAndSanitizeAssunto,
  validateNonEmpty,
  validateMaxLength,
  validateArray,
  LIMITS,
  AssuntoInput,
} from "../lib/security";

const timestampToMillis = (valor?: Timestamp) => valor?.toMillis?.() ?? 0;

// ==================== PERFIL ====================

export interface PerfilUsuario {
  uid: string;
  email: string;
  nome: string;
  criadoEm: Timestamp;
  modoRevisao?: "espacada" | "diaria";
}

export const criarPerfilUsuario = async (
  uid: string,
  email: string,
  nome: string
) => {
  const nomeS = sanitizeSingleLine(nome, LIMITS.NOME_MAX);
  const emailS = sanitizeSingleLine(email, LIMITS.EMAIL_MAX);

  if (!nomeS || !emailS || !uid) {
    throw new Error("Dados de perfil inválidos.");
  }

  await setDoc(doc(db, "users", uid), {
    uid,
    email: emailS,
    nome: nomeS,
    criadoEm: Timestamp.now(),
    modoRevisao: "espacada",
  });
};

export const buscarPerfilUsuario = async (
  uid: string
): Promise<PerfilUsuario | null> => {
  if (!uid) return null;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as PerfilUsuario) : null;
};

export const atualizarModoRevisao = async (
  uid: string,
  modo: "espacada" | "diaria"
) => {
  if (!uid) throw new Error("UID inválido.");
  if (modo !== "espacada" && modo !== "diaria") {
    throw new Error("Modo de revisão inválido.");
  }
  await setDoc(doc(db, "users", uid), { modoRevisao: modo }, { merge: true });
};

// ==================== MATERIAIS ====================

export interface Material {
  id?: string;
  userId: string;
  titulo: string;
  textoOriginal: string;
  resumo: string;
  assuntos: AssuntoSalvo[];
  criadoEm: Timestamp;
}

export interface AssuntoSalvo {
  id: string;
  titulo: string;
  descricao: string;
  trecho: string;
  totalQuestoes?: number;
}

export const salvarMaterial = async (
  userId: string,
  titulo: string,
  textoOriginal: string,
  resumo: string,
  assuntos: AssuntoSalvo[]
): Promise<string> => {
  // Validações
  if (!userId) throw new Error("userId inválido.");

  const tituloS = sanitizeSingleLine(titulo, LIMITS.TITULO_MAX);
  const vTitulo = validateNonEmpty(tituloS, "Título");
  if (!vTitulo.valid) throw new Error(vTitulo.error);

  const textoS = sanitizeString(textoOriginal, LIMITS.TEXTO_ORIGINAL_MAX);
  const resumoS = sanitizeSingleLine(resumo, LIMITS.RESUMO_MAX);

  const vAssuntos = validateArray(assuntos, 1, LIMITS.ASSUNTOS_MAX, "Assuntos");
  if (!vAssuntos.valid) throw new Error(vAssuntos.error);

  // Sanitiza cada assunto
  const assuntosS: AssuntoInput[] = assuntos
    .map(validateAndSanitizeAssunto)
    .filter((a): a is AssuntoInput => a !== null);

  if (assuntosS.length === 0) {
    throw new Error("Nenhum assunto válido para salvar.");
  }

  const docRef = await addDoc(collection(db, "materiais"), {
    userId,
    titulo: tituloS,
    textoOriginal: textoS,
    resumo: resumoS,
    assuntos: assuntosS,
    criadoEm: Timestamp.now(),
  });
  return docRef.id;
};

export const buscarMateriaisDoUsuario = async (
  userId: string
): Promise<Material[]> => {
  if (!userId) return [];
  const q = query(collection(db, "materiais"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Material))
    .sort(
      (a, b) =>
        timestampToMillis(b.criadoEm) - timestampToMillis(a.criadoEm)
    );
};

export const buscarMaterialPorId = async (
  materialId: string
): Promise<Material | null> => {
  if (!materialId) return null;
  const docRef = doc(db, "materiais", materialId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data() as Material;

  // Garante que assuntos é sempre um array válido
  if (!Array.isArray(data.assuntos)) {
    data.assuntos = [];
  }
  return { id: docSnap.id, ...data };
};

export const excluirMaterial = async (
  materialId: string,
  userId: string
): Promise<void> => {
  if (!materialId || !userId) throw new Error("Parâmetros inválidos.");

  await deleteDoc(doc(db, "materiais", materialId));

  // Exclui questões associadas
  const qQuestoes = query(
    collection(db, "questoes"),
    where("userId", "==", userId),
    where("materialId", "==", materialId)
  );
  const snapQuestoes = await getDocs(qQuestoes);
  if (snapQuestoes.docs.length > 0) {
    const b = writeBatch(db);
    snapQuestoes.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }
};

export const excluirFlashcardsPorAssunto = async (
  userId: string,
  materialId: string,
  assuntoId: string
): Promise<void> => {
  if (!userId || !materialId || !assuntoId) {
    throw new Error("Parâmetros inválidos para exclusão.");
  }
  const q = query(
    collection(db, "flashcards"),
    where("userId", "==", userId),
    where("materialId", "==", materialId),
    where("assuntoId", "==", assuntoId)
  );
  const snap = await getDocs(q);
  if (snap.docs.length === 0) return;
  const b = writeBatch(db);
  snap.docs.forEach((d) => b.delete(d.ref));
  await b.commit();
};

export const renomearMaterial = async (
  materialId: string,
  novoTitulo: string
): Promise<void> => {
  if (!materialId) throw new Error("materialId inválido.");
  const titulo = sanitizeSingleLine(novoTitulo, LIMITS.TITULO_MAX);
  const v = validateNonEmpty(titulo, "Título");
  if (!v.valid) throw new Error(v.error);
  await updateDoc(doc(db, "materiais", materialId), { titulo });
};

export const renomearAssunto = async (
  materialId: string,
  assuntoId: string,
  novoTitulo: string,
  assuntosAtuais: AssuntoSalvo[]
): Promise<void> => {
  if (!materialId || !assuntoId) throw new Error("Parâmetros inválidos.");
  const titulo = sanitizeSingleLine(novoTitulo, LIMITS.TITULO_MAX);
  const v = validateNonEmpty(titulo, "Título do assunto");
  if (!v.valid) throw new Error(v.error);

  const novosAssuntos = assuntosAtuais.map((a) =>
    a.id === assuntoId ? { ...a, titulo } : a
  );
  await updateDoc(doc(db, "materiais", materialId), {
    assuntos: novosAssuntos,
  });
};

// ==================== QUESTÕES ====================

export interface Questao {
  id?: string;
  userId: string;
  materialId: string;
  assuntoId: string;
  assuntoTitulo: string;
  pergunta: string;
  alternativas: string[];
  correta: string;
  explicacao: string;
  tipo: "simples" | "elaborada";
  criadoEm: Timestamp;
}

export const salvarQuestoes = async (
  userId: string,
  materialId: string,
  assuntoId: string,
  assuntoTitulo: string,
  questoes: Array<{
    pergunta: string;
    alternativas: string[];
    correta: string;
    explicacao: string;
    tipo?: "simples" | "elaborada";
  }>
): Promise<string[]> => {
  if (!userId || !materialId || !assuntoId) {
    throw new Error("Parâmetros obrigatórios ausentes em salvarQuestoes.");
  }

  // Valida se há questões para salvar
  if (!Array.isArray(questoes) || questoes.length === 0) {
    console.warn("salvarQuestoes: lista vazia, nada salvo.");
    return [];
  }

  if (questoes.length > LIMITS.QUESTOES_LOTE_MAX) {
    throw new Error(
      `Número de questões (${questoes.length}) excede o máximo permitido (${LIMITS.QUESTOES_LOTE_MAX}).`
    );
  }

  const assuntoTituloS = sanitizeSingleLine(assuntoTitulo, LIMITS.TITULO_MAX);
  const ids: string[] = [];

  for (const q of questoes) {
    // Valida e sanitiza cada questão individualmente
    const questaoValida = validateAndSanitizeQuestao(q);
    if (!questaoValida) {
      console.warn("Questão inválida ignorada:", q?.pergunta?.slice?.(0, 60));
      continue;
    }

    const docRef = await addDoc(collection(db, "questoes"), {
      userId,
      materialId,
      assuntoId,
      assuntoTitulo: assuntoTituloS,
      pergunta: questaoValida.pergunta,
      alternativas: questaoValida.alternativas,
      correta: questaoValida.correta,
      explicacao: questaoValida.explicacao,
      tipo: questaoValida.tipo,
      criadoEm: Timestamp.now(),
    });
    ids.push(docRef.id);
  }
  return ids;
};

export const buscarQuestoesPorAssunto = async (
  userId: string,
  materialId: string,
  assuntoId: string
): Promise<Questao[]> => {
  if (!userId || !materialId || !assuntoId) return [];
  const q = query(
    collection(db, "questoes"),
    where("userId", "==", userId),
    where("materialId", "==", materialId),
    where("assuntoId", "==", assuntoId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Questao));
};

// ==================== FLASHCARDS ====================

export interface Flashcard {
  id?: string;
  userId: string;
  materialId: string;
  materialTitulo?: string;
  assuntoId: string;
  assuntoTitulo: string;
  frente: string;
  verso: string;
  origem: "gerado" | "erro" | "manual";
  proximaRevisao: Timestamp;
  intervalo: number;
  facilidade: number;
  repeticoes: number;
  criadoEm: Timestamp;
}

export const salvarFlashcards = async (
  userId: string,
  materialId: string,
  assuntoId: string,
  assuntoTitulo: string,
  flashcards: Array<{ frente: string; verso: string }>,
  origem: "gerado" | "erro" | "manual" = "gerado",
  materialTitulo?: string
): Promise<string[]> => {
  if (!userId || !materialId || !assuntoId) {
    throw new Error("Parâmetros obrigatórios ausentes em salvarFlashcards.");
  }

  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    console.warn("salvarFlashcards: lista vazia, nada salvo.");
    return [];
  }

  if (flashcards.length > LIMITS.FLASHCARDS_LOTE_MAX) {
    throw new Error(
      `Número de flashcards (${flashcards.length}) excede o máximo permitido (${LIMITS.FLASHCARDS_LOTE_MAX}).`
    );
  }

  const assuntoTituloS = sanitizeSingleLine(assuntoTitulo, LIMITS.TITULO_MAX);
  const materialTituloS = sanitizeSingleLine(
    materialTitulo ?? "",
    LIMITS.TITULO_MAX
  );
  const origemValida: Flashcard["origem"] = ["gerado", "erro", "manual"].includes(
    origem
  )
    ? origem
    : "gerado";

  const agora = Timestamp.now();
  const ids: string[] = [];

  for (const fc of flashcards) {
    // Valida e sanitiza frente/verso individualmente
    const fcValido = validateAndSanitizeFlashcard(fc);
    if (!fcValido) {
      console.warn(
        "Flashcard inválido ignorado:",
        String(fc?.frente).slice(0, 40)
      );
      continue;
    }

    const docRef = await addDoc(collection(db, "flashcards"), {
      userId,
      materialId,
      assuntoId,
      assuntoTitulo: assuntoTituloS,
      materialTitulo: materialTituloS,
      frente: fcValido.frente,
      verso: fcValido.verso,
      origem: origemValida,
      proximaRevisao: agora,
      intervalo: 1,
      facilidade: 2.5,
      repeticoes: 0,
      criadoEm: agora,
    });
    ids.push(docRef.id);
  }
  return ids;
};

export const criarFlashcardManual = async (
  userId: string,
  frente: string,
  verso: string,
  opcoes: {
    materialId?: string;
    materialTitulo?: string;
    assuntoId?: string;
    assuntoTitulo?: string;
  } = {}
): Promise<string> => {
  if (!userId) throw new Error("userId inválido.");

  const frenteS = sanitizeString(frente, LIMITS.FLASHCARD_FRENTE_MAX);
  const versoS = sanitizeString(verso, LIMITS.FLASHCARD_VERSO_MAX);

  const vFrente = validateNonEmpty(frenteS, "Frente do flashcard");
  if (!vFrente.valid) throw new Error(vFrente.error);

  const vVerso = validateNonEmpty(versoS, "Verso do flashcard");
  if (!vVerso.valid) throw new Error(vVerso.error);

  const vFrenteLen = validateMaxLength(
    frenteS,
    LIMITS.FLASHCARD_FRENTE_MAX,
    "Frente"
  );
  if (!vFrenteLen.valid) throw new Error(vFrenteLen.error);

  const vVersoLen = validateMaxLength(
    versoS,
    LIMITS.FLASHCARD_VERSO_MAX,
    "Verso"
  );
  if (!vVersoLen.valid) throw new Error(vVersoLen.error);

  const agora = Timestamp.now();
  const docRef = await addDoc(collection(db, "flashcards"), {
    userId,
    materialId: sanitizeSingleLine(opcoes.materialId ?? "manual", 100),
    materialTitulo: sanitizeSingleLine(
      opcoes.materialTitulo ?? "Criados manualmente",
      LIMITS.TITULO_MAX
    ),
    assuntoId: sanitizeSingleLine(opcoes.assuntoId ?? "manual", 100),
    assuntoTitulo: sanitizeSingleLine(
      opcoes.assuntoTitulo ?? "Manual",
      LIMITS.TITULO_MAX
    ),
    frente: frenteS,
    verso: versoS,
    origem: "manual",
    proximaRevisao: agora,
    intervalo: 1,
    facilidade: 2.5,
    repeticoes: 0,
    criadoEm: agora,
  });
  return docRef.id;
};

export const buscarFlashcardsPendentes = async (
  userId: string
): Promise<Flashcard[]> => {
  if (!userId) return [];
  const agora = Timestamp.now();
  const q = query(
    collection(db, "flashcards"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Flashcard))
    .filter((f) => timestampToMillis(f.proximaRevisao) <= agora.toMillis())
    .sort(
      (a, b) =>
        timestampToMillis(a.proximaRevisao) - timestampToMillis(b.proximaRevisao)
    );
};

export const buscarTodosFlashcardsDoUsuario = async (
  userId: string
): Promise<Flashcard[]> => {
  if (!userId) return [];
  const q = query(
    collection(db, "flashcards"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Flashcard));
};

export const buscarFlashcardsPorMaterial = async (
  userId: string,
  materialId: string
): Promise<Flashcard[]> => {
  if (!userId || !materialId) return [];
  const q = query(
    collection(db, "flashcards"),
    where("userId", "==", userId),
    where("materialId", "==", materialId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Flashcard))
    .sort(
      (a, b) =>
        timestampToMillis(a.criadoEm) - timestampToMillis(b.criadoEm)
    );
};

export const excluirFlashcard = async (flashcardId: string): Promise<void> => {
  if (!flashcardId) throw new Error("flashcardId inválido.");
  await deleteDoc(doc(db, "flashcards", flashcardId));
};

export const excluirFlashcardsBatch = async (ids: string[]): Promise<void> => {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const validIds = ids.filter(Boolean);
  if (validIds.length === 0) return;
  const b = writeBatch(db);
  validIds.forEach((id) => b.delete(doc(db, "flashcards", id)));
  await b.commit();
};

export const editarFlashcard = async (
  flashcardId: string,
  frente: string,
  verso: string
): Promise<void> => {
  if (!flashcardId) throw new Error("flashcardId inválido.");

  const frenteS = sanitizeString(frente, LIMITS.FLASHCARD_FRENTE_MAX);
  const versoS = sanitizeString(verso, LIMITS.FLASHCARD_VERSO_MAX);

  const vFrente = validateNonEmpty(frenteS, "Frente");
  if (!vFrente.valid) throw new Error(vFrente.error);

  const vVerso = validateNonEmpty(versoS, "Verso");
  if (!vVerso.valid) throw new Error(vVerso.error);

  await updateDoc(doc(db, "flashcards", flashcardId), {
    frente: frenteS,
    verso: versoS,
  });
};

export const atualizarFlashcard = async (
  flashcardId: string,
  qualidade: number,
  modoRevisao: "espacada" | "diaria" = "espacada"
) => {
  if (!flashcardId) throw new Error("flashcardId inválido.");

  // Garante que qualidade é inteiro 0, 1 ou 2
  const q = Math.max(0, Math.min(2, Math.round(Number(qualidade))));
  if (isNaN(q)) throw new Error("Qualidade inválida.");

  const docRef = doc(db, "flashcards", flashcardId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;

  const dados = docSnap.data() as Flashcard;
  let { intervalo, facilidade, repeticoes } = dados;

  // Garante valores numéricos válidos (proteção contra dados corrompidos)
  intervalo = typeof intervalo === "number" && intervalo > 0 ? intervalo : 1;
  facilidade =
    typeof facilidade === "number" && facilidade >= 1.3 ? facilidade : 2.5;
  repeticoes = typeof repeticoes === "number" && repeticoes >= 0 ? repeticoes : 0;

  if (modoRevisao === "diaria") {
    const prox = new Date();
    prox.setDate(prox.getDate() + 1);
    await updateDoc(docRef, {
      repeticoes: repeticoes + 1,
      proximaRevisao: Timestamp.fromDate(prox),
    });
    return;
  }

  // SM-2
  if (q === 0) {
    intervalo = 1;
    repeticoes = 0;
    facilidade = Math.max(1.3, facilidade - 0.2);
  } else if (q === 1) {
    repeticoes += 1;
    intervalo =
      repeticoes === 1 ? 1 : repeticoes === 2 ? 3 : Math.round(intervalo * facilidade * 0.8);
    facilidade = Math.max(1.3, facilidade - 0.1);
  } else {
    repeticoes += 1;
    intervalo =
      repeticoes === 1 ? 1 : repeticoes === 2 ? 6 : Math.round(intervalo * facilidade);
    facilidade = facilidade + 0.1;
  }

  const prox = new Date();
  prox.setDate(prox.getDate() + Math.max(1, intervalo));
  await updateDoc(docRef, {
    intervalo,
    facilidade,
    repeticoes,
    proximaRevisao: Timestamp.fromDate(prox),
  });
};

// ==================== HISTÓRICO ====================

export interface HistoricoResposta {
  id?: string;
  userId: string;
  tipo: "questao" | "flashcard";
  itemId: string;
  acertou: boolean;
  tempoGasto: number;
  assuntoId?: string;
  assuntoTitulo?: string;
  pergunta?: string;
  criadoEm: Timestamp;
}

export const registrarResposta = async (
  userId: string,
  tipo: "questao" | "flashcard",
  itemId: string,
  acertou: boolean,
  tempoGasto: number,
  extra?: { assuntoId?: string; assuntoTitulo?: string; pergunta?: string }
) => {
  if (!userId || !itemId) return; // Falha silenciosa — não bloqueia o fluxo
  if (tipo !== "questao" && tipo !== "flashcard") return;

  await addDoc(collection(db, "historico_respostas"), {
    userId,
    tipo,
    itemId,
    acertou: Boolean(acertou),
    tempoGasto: Math.max(0, Number(tempoGasto) || 0),
    assuntoId: sanitizeSingleLine(extra?.assuntoId ?? "", 100),
    assuntoTitulo: sanitizeSingleLine(extra?.assuntoTitulo ?? "", LIMITS.TITULO_MAX),
    pergunta: sanitizeString(extra?.pergunta ?? "", 300),
    criadoEm: Timestamp.now(),
  });
};

export const buscarHistoricoDoUsuario = async (
  userId: string
): Promise<HistoricoResposta[]> => {
  if (!userId) return [];
  const q = query(
    collection(db, "historico_respostas"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as HistoricoResposta))
    .sort(
      (a, b) =>
        timestampToMillis(b.criadoEm) - timestampToMillis(a.criadoEm)
    );
};

export const calcularEstatisticas = async (userId: string) => {
  if (!userId) {
    return {
      totalMateriais: 0,
      totalRespostas: 0,
      taxaAcerto: 0,
      taxaAcertoQuestoes: 0,
      flashcardsPendentes: 0,
      ultimasRespostas: [],
    };
  }

  const [historico, materiais, flashcardsPendentes] = await Promise.all([
    buscarHistoricoDoUsuario(userId),
    buscarMateriaisDoUsuario(userId),
    buscarFlashcardsPendentes(userId),
  ]);

  const totalRespostas = historico.length;
  const acertos = historico.filter((h) => h.acertou).length;
  const taxaAcerto =
    totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0;

  const respostasQuestoes = historico.filter((h) => h.tipo === "questao");
  const acertosQuestoes = respostasQuestoes.filter((h) => h.acertou).length;
  const taxaAcertoQuestoes =
    respostasQuestoes.length > 0
      ? Math.round((acertosQuestoes / respostasQuestoes.length) * 100)
      : 0;

  return {
    totalMateriais: materiais.length,
    totalRespostas,
    taxaAcerto,
    taxaAcertoQuestoes,
    flashcardsPendentes: flashcardsPendentes.length,
    ultimasRespostas: historico.slice(0, 10),
  };
};

// Alias de compatibilidade
export const gerarReforcoParaQuestao = async () => ({
  questoes: [],
  flashcards: [],
});