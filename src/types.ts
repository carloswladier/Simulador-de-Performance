import { ReactNode } from 'react';

export type UserProfile = 'admin' | 'coordenador' | 'executivo';

export interface User {
  id: string;
  login: string;
  nome: string;
  senha: string;
  perfil: UserProfile;
  coordenadorId?: string; // ID do coordenador responsável se perfil === 'executivo'
  createdAt?: string;
}

export interface Indicator {
  id: string;
  label: string;
  icon?: ReactNode;
  pontos: number;
  target: number;
  targetStr?: string;
  real: number;
  realStr?: string;
  isPercentage: boolean;
  isLowerBetter?: boolean;
}

export interface SavedPerformanceRecord {
  executivoId: string;
  mes: string; // Ex: "09" ou "SETEMBRO 2026"
  salesIndicators: Array<{
    id: string;
    target: number;
    targetStr?: string;
    real: number;
    realStr?: string;
  }>;
  qualityIndicators: Array<{
    id: string;
    target: number;
    targetStr?: string;
    real: number;
    realStr?: string;
  }>;
  updatedAt: string;
}

export interface HostingerDbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl: boolean;
  hasPassword?: boolean;
}

export interface DbStatusResponse {
  connected: boolean;
  config: HostingerDbConfig;
  lastError: string | null;
}

export interface RvvRow {
  id: string;
  indicador: string;
  meta: string;
  realizado: string;
  valorDia?: string;
  atingimento: string;
  pontuacao: string;
  total: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  acceleratorSource?: 'bl' | 'cel' | 'tv';
}

export interface SavedRvvRecord {
  executivoId: string;
  mes: string;
  rows: RvvRow[];
  resultadoTotal: string;
  tetoRemuneracao: string;
  updatedAt: string;
}
