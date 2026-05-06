export const APPOINTMENT_TYPES = [
  { value: 'reuniao', label: 'Reunião', color: '#3b82f6' },
  { value: 'visita', label: 'Visita', color: '#10b981' },
  { value: 'evento_publico', label: 'Evento Público', color: '#f59e0b' },
  { value: 'entrevista', label: 'Entrevista', color: '#8b5cf6' },
  { value: 'caminhada', label: 'Caminhada', color: '#06b6d4' },
  { value: 'gravacao', label: 'Gravação', color: '#ec4899' },
  { value: 'viagem', label: 'Viagem', color: '#6366f1' },
  { value: 'agenda_interna', label: 'Agenda Interna', color: '#64748b' },
  { value: 'outro', label: 'Outro', color: '#94a3b8' },
]

export const APPOINTMENT_STATUS = [
  { value: 'confirmado', label: 'Confirmado', color: '#10b981', bg: '#d1fae5' },
  { value: 'pendente', label: 'Pendente', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'cancelado', label: 'Cancelado', color: '#ef4444', bg: '#fee2e2' },
  { value: 'concluido', label: 'Concluído', color: '#6b7280', bg: '#f3f4f6' },
]

export const PRIORITY_LEVELS = [
  { value: 'alta', label: 'Alta', color: '#ef4444', bg: '#fee2e2' },
  { value: 'media', label: 'Média', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'baixa', label: 'Baixa', color: '#10b981', bg: '#d1fae5' },
]

export const DEMAND_TYPES = [
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'ramal', label: 'Ramal' },
  { value: 'regularizacao_fundiaria', label: 'Regularização Fundiária' },
  { value: 'esporte', label: 'Esporte' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'assistencia_social', label: 'Assistência Social' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'emprego_renda', label: 'Emprego e Renda' },
  { value: 'meio_ambiente', label: 'Meio Ambiente' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'outro', label: 'Outro' },
]

export const DEMAND_STATUS = [
  { value: 'nova', label: 'Nova', color: '#3b82f6', bg: '#dbeafe' },
  { value: 'em_analise', label: 'Em Análise', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'em_andamento', label: 'Em Andamento', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'aguardando_retorno', label: 'Aguardando Retorno', color: '#06b6d4', bg: '#cffafe' },
  { value: 'resolvida', label: 'Resolvida', color: '#10b981', bg: '#d1fae5' },
  { value: 'arquivada', label: 'Arquivada', color: '#6b7280', bg: '#f3f4f6' },
]

export const ACCESS_LEVELS = [
  { value: 'admin', label: 'Administrador', description: 'Cria, edita e exclui tudo' },
  { value: 'coordenador', label: 'Coordenador', description: 'Cria e edita agenda e demandas' },
  { value: 'visualizador', label: 'Visualizador', description: 'Apenas visualiza' },
]

export const NOTE_TYPES = [
  { value: 'relato', label: 'Relato do Dia' },
  { value: 'atencao', label: 'Ponto de Atenção' },
  { value: 'problema', label: 'Problema Encontrado' },
  { value: 'pessoa', label: 'Pessoa Importante' },
  { value: 'encaminhamento', label: 'Encaminhamento' },
  { value: 'interno', label: 'Observação Interna' },
]

export const SUGGESTED_TAGS = [
  '#saúde', '#ramal', '#energia', '#regularização', '#água',
  '#educação', '#evento', '#liderança', '#urgente', '#infraestrutura',
  '#segurança', '#emprego', '#cultura', '#esporte', '#documentação',
]

export const ART_FORMATS = [
  { value: 'story', label: 'Story', width: 1080, height: 1920, description: '1080×1920' },
  { value: 'feed', label: 'Feed Quadrado', width: 1080, height: 1080, description: '1080×1080' },
  { value: 'horizontal', label: 'Horizontal', width: 1920, height: 1080, description: '1920×1080' },
]

export const ART_TEMPLATES = [
  { value: 'institucional', label: 'Institucional', description: 'Sóbrio e formal' },
  { value: 'premium', label: 'Premium Minimalista', description: 'Elegante e moderno' },
  { value: 'campanha', label: 'Campanha Popular', description: 'Dinâmico e impactante' },
]
