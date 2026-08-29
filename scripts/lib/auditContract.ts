// fallow-ignore-file security-sink
/**
 * scripts/lib/auditContract.ts
 * 
 * STANDARD AUDIT CONTRACT (Node.js 26+)
 * Defines the immutable data structures, family types, and standard outputs
 * required for all Poké Vicio sub-auditors and the general audit orchestrator.
 */

export const AUDIT_FAMILIES = [
  'architecture',
  'domain_data',
  'persistence',
  'fsm',
  'assets',
  'documentation'
] as const;

export type AuditFamily = (typeof AUDIT_FAMILIES)[number];

export interface FamilyMetadata {
  key: AuditFamily;
  title: string;
  order: number;
  icon: string;
  description: string;
}

export const FAMILY_METADATA: Record<AuditFamily, FamilyMetadata> = {
  architecture: {
    key: 'architecture',
    title: 'ESTÁNDARES ESTÁTICOS, AST Y ARQUITECTURA',
    order: 1,
    icon: '📁',
    description: 'Reglas de calidad de código, AST, Fallow intelligence y dependencias.'
  },
  domain_data: {
    key: 'domain_data',
    title: 'TIPOS DE DOMINIO Y BASES DE DATOS CANÓNICAS',
    order: 2,
    icon: '🔒',
    description: 'Validación de tipos de dominio estrictos, datos de Pokémon, movimientos, ítems y traducciones.'
  },
  persistence: {
    key: 'persistence',
    title: 'PERSISTENCIA, SQL Y MIGRACIONES',
    order: 3,
    icon: '💾',
    description: 'Integridad sintáctica de migraciones SQLite en memoria y compatibilidad de partidas.'
  },
  fsm: {
    key: 'fsm',
    title: 'MÁQUINA DE ESTADOS FINITO (FSM)',
    order: 4,
    icon: '🔄',
    description: 'Paridad entre diagramas Mermaid, implementación TypeScript y flujo de combate.'
  },
  assets: {
    key: 'assets',
    title: 'ASSETS, SPRITES Y MULTIMEDIA',
    order: 5,
    icon: '🎨',
    description: 'Verificación de sprites estáticos, colisiones de ítems y recursos visuales.'
  },
  documentation: {
    key: 'documentation',
    title: 'DOCUMENTACIÓN Y ESTRUCTURA DOX',
    order: 6,
    icon: '📚',
    description: 'Integridad de enlaces relativos en markdown e índices DOX (AGENTS.md).'
  }
};

export type FindingSeverity = 'error' | 'warning' | 'info';

export interface AuditFinding {
  severity: FindingSeverity;
  message: string;
  file?: string;
  line?: number;
  ruleId?: string;
  context?: string;
}

export interface StandardAuditResult {
  id: string;
  name: string;
  family: AuditFamily;
  status: 'passed' | 'failed';
  durationMs: number;
  metrics: Record<string, number | string>;
  findings: AuditFinding[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    totalFilesScanned?: number;
  };
}

export interface AuditTaskDefinition {
  id: string;
  name: string;
  family: AuditFamily;
  scriptPath: string;
  command: string;
  args: string[];
  fast?: boolean;
  order?: number;
  timeoutMs?: number;
  shell?: boolean;
}

export interface AuditTaskDescriptor {
  id?: string;
  name?: string;
  family?: AuditFamily;
  fast?: boolean;
  order?: number;
  timeoutMs?: number;
  permissions?: string[];
  extraArgs?: string[];
}
