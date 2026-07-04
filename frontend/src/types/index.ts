// Tipos compartilhados entre frontend e backend

export enum UserType {
  PROFESSORA = "PROFESSORA",
  ALUNO = "ALUNO"
}

export enum SlotType {
  AULA = "AULA",
  PESSOAL = "PESSOAL"
}

export enum SlotStatus {
  DISPONIVEL = "disponivel",
  OCUPADO = "ocupado",
  BLOQUEADO = "bloqueado",
  ALOCADO = "alocado",
  PENDING_SYNC = "pending_sync"
}

export enum PresencaStatus {
  COMPARECEU = "Compareceu",
  FALTOU = "Faltou",
  REAGENDADO = "Reagendado",
  CANCELADO = "Cancelado"
}

// Interfaces

export interface User {
  id: string;
  tipo: UserType;
  nome?: string;
  email?: string;
}

export interface AuthToken {
  token: string;
  user: User;
  expiresAt: string;
}

export interface Slot {
  slotId: string;
  tipo: SlotType;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  duracao: number; // minutos
  endereco?: string | null;
  descricao?: string | null;
  status: SlotStatus;
  alunoAlocado?: string | null;
  diasFixos?: number[]; // [1-7] = segunda-domingo
  periodoAlocacaoInicio?: string | null; // YYYY-MM-DD
  periodoAlocacaoFim?: string | null; // YYYY-MM-DD
  googleEventId?: string | null;
  sincronizadoDe: "APP" | "CALENDAR";
  notas?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Agendamento {
  agendId: string;
  slotId: string;
  alunoId: string;
  nomeAluno?: string | null;
  emailAluno: string;
  dataAgendamento: string; // ISO-8601
  googleEventId?: string | null;
  statusPresenca?: PresencaStatus | null;
  notas?: string;
}

export interface SyncLog {
  id: string;
  dataSync: string;
  status: "sucesso" | "erro" | "parcial";
  slotsProcessados: number;
  agendamentosProcessados: number;
  erro?: string;
  duracao: number; // ms
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}
