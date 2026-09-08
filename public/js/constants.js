// Listas fixas usadas nos formulários e filtros do sistema.
// Para ajustar setores, causas, prioridades ou status, edite apenas este arquivo.

export const SETORES = [
  "Produção",
  "Comercial",
  "Logística",
  "Instalação",
  "Compras / PCP",
  "Qualidade",
  "Manutenção",
  "Financeiro / RH",
  "Outros",
];

export const CAUSAS = [
  "Risco",
  "Quebra",
  "Medida incorreta",
  "Mancha",
  "Defeito visual",
  "Laminação",
  "Vidro duplo/insulado",
  "Têmpera",
  "Lapidação",
  "Atraso",
  "Produto incorreto",
  "Instalação",
  "Transporte",
  "Outro",
];

export const PRIORIDADES = ["Baixa", "Média", "Alta", "Crítica"];

export const STATUS_LIST = ["Aberta", "Em análise", "Em tratamento", "Resolvida"];

// Metadados visuais (classe CSS de badge) por valor
export const PRIORITY_CLASS = {
  Baixa: "badge-baixa",
  Média: "badge-média",
  Alta: "badge-alta",
  Crítica: "badge-crítica",
};

export const STATUS_CLASS = {
  Aberta: "badge-aberta",
  "Em análise": "badge-em-analise",
  "Em tratamento": "badge-em-tratamento",
  Resolvida: "badge-resolvida",
};
