// Agent Config — per-agent model, temperature, and caching settings

export interface AgentConfig {
  model: string;
  temperature: number;
  cacheable: boolean;
}

const DEFAULT_CONFIGS: Record<string, AgentConfig> = {
  'Intake Agent':              { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: true },
  'Construct Agent':           { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: true },
  'Subskill Agent':            { model: 'gemini-2.5-flash', temperature: 0.2, cacheable: true },
  'Content Scoping Agent':     { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: true },
  'Custom Hess Matrix Agent':  { model: 'gemini-2.5-flash', temperature: 0.15, cacheable: true },
  'Misconception Agent':       { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: true },
  'Content Selector':          { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: true },
  'Generation Agent':          { model: 'gemini-2.5-flash', temperature: 0.4, cacheable: false },
  'AI SME QA':                 { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: false },
  'Research Agent':            { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: true },
  'Image Analysis':            { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: false },
  'Image Generation':          { model: 'gemini-2.5-flash-preview-image-generation', temperature: 0.5, cacheable: false },
  'SVG Generation':            { model: 'gemini-2.5-flash', temperature: 0.2, cacheable: false },
  'Content Extractor':         { model: 'gemini-2.5-flash', temperature: 0.1, cacheable: true },
};

const FALLBACK: AgentConfig = { model: 'gemini-2.5-flash', temperature: 0.2, cacheable: false };
const STORAGE_KEY = 'agentConfigs';

export function getAgentConfig(agentName: string): AgentConfig {
  // Check user overrides
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const overrides = JSON.parse(stored);
      if (overrides[agentName]) return { ...FALLBACK, ...DEFAULT_CONFIGS[agentName], ...overrides[agentName] };
    }
  } catch { /* ignore */ }
  return DEFAULT_CONFIGS[agentName] || FALLBACK;
}

export function setAgentConfigOverride(agentName: string, config: Partial<AgentConfig>) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const overrides = stored ? JSON.parse(stored) : {};
    overrides[agentName] = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

export function getAllAgentConfigs(): Record<string, AgentConfig> {
  const result: Record<string, AgentConfig> = {};
  for (const name of Object.keys(DEFAULT_CONFIGS)) {
    result[name] = getAgentConfig(name);
  }
  return result;
}

export function getAgentNames(): string[] {
  return Object.keys(DEFAULT_CONFIGS);
}
