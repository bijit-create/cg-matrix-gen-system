/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  BrainCircuit,
  ShieldCheck,
  Activity,
  PlayCircle,
  Terminal,
  CheckSquare,
  Loader2,
  FileText,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  GripVertical,
  Globe,
  ExternalLink,
  Youtube,
  FileDown,
  SlidersHorizontal,
  Sparkles,
  Zap,
  Edit3,
  Save,
  X,
  RefreshCw
} from 'lucide-react';

import katex from 'katex';

import { AgentOrchestrator } from './agents/orchestrator';
import { parseUploadedFile } from './utils/fileParser';
import { splitPair } from './utils/matchPairs';
import { PhaseChips } from './components/PhaseChips';
import { TriageBar } from './components/TriageBar';
import { QuestionBody } from './components/QuestionBody';
import { PipelineStepper } from './components/swiftee/PipelineStepper';
import { cx as swCx, Icon as SwIcon, InlineGateBar, HelpPopover } from './components/swiftee/atoms';
import { AgentLogDrawer } from './components/swiftee/AgentLogDrawer';
import { ExportHero } from './components/swiftee/ExportHero';
import { BankView } from './components/BankView';
import { useBank, bankStore } from './components/bankStore';

// --- Types ---
type Tab = 'dashboard' | 'generate' | 'bank';
type GenerateMode = 'quick' | 'pipeline';

// --- LaTeX renderer: parses \( \), \[ \], $ $, $$ $$ and renders via KaTeX ---
const LatexText: React.FC<{ text: any; className?: string; block?: boolean }> = ({ text, className, block }) => {
  const raw = text == null ? '' : String(text);
  if (!raw) return null;
  // Regex matches: \[...\] | \(...\) | $$...$$ | $...$
  const parts: Array<{ type: 'text' | 'inline' | 'display'; value: string }> = [];
  const re = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > lastIndex) parts.push({ type: 'text', value: raw.slice(lastIndex, m.index) });
    if (m[1] !== undefined) parts.push({ type: 'display', value: m[1] });
    else if (m[2] !== undefined) parts.push({ type: 'inline', value: m[2] });
    else if (m[3] !== undefined) parts.push({ type: 'display', value: m[3] });
    else if (m[4] !== undefined) parts.push({ type: 'inline', value: m[4] });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < raw.length) parts.push({ type: 'text', value: raw.slice(lastIndex) });
  if (parts.length === 0) parts.push({ type: 'text', value: raw });

  const Tag: any = block ? 'div' : 'span';
  return (
    <Tag className={className}>
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        let html = '';
        try {
          html = katex.renderToString(p.value, { displayMode: p.type === 'display', throwOnError: false, output: 'html' });
        } catch {
          return <span key={i}>{p.value}</span>;
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </Tag>
  );
};

// --- Components ---

// Swiftee topbar. Three primary tabs: Workspace · Bank · Overview.
const TopNav = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => (
  <div className="sw-topbar">
    <div className="sw-brand">
      <div className="sw-brand-mark">M</div>
      <div>
        <div className="sw-brand-name">CG-Matrix Gen</div>
        <div className="sw-brand-sub">Assessment Studio</div>
      </div>
    </div>
    <nav className="sw-topnav">
      <button className={activeTab === 'generate' ? 'on' : ''} onClick={() => setActiveTab('generate')}>
        <SwIcon name="science" size="sm" /> Workspace
      </button>
      <button className={activeTab === 'bank' ? 'on' : ''} onClick={() => setActiveTab('bank')}>
        <SwIcon name="inventory_2" size="sm" /> Bank
      </button>
      <button className={activeTab === 'dashboard' ? 'on' : ''} onClick={() => setActiveTab('dashboard')}>
        <SwIcon name="dashboard" size="sm" /> Overview
      </button>
    </nav>
    <div style={{ flex: 1 }} />
    <div className="sw-avatar">SME</div>
  </div>
);

// Dashboard (Overview) — only secondary view still wired.
const MetricCard = ({ title, value, status, target }: { title: string, value: string | number, status: 'good' | 'warning' | 'danger', target?: string }) => {
  const statusColors = {
    good: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--danger)]'
  };

  return (
    <div className="tech-border p-5 bg-[var(--surface)] flex flex-col justify-between hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors group cursor-default">
      <div className="flex justify-between items-start mb-4">
        <span className="col-header group-hover:text-[var(--bg)] group-hover:opacity-70">{title}</span>
        {status === 'good' && <CheckCircle2 size={16} className={statusColors.good} />}
        {status === 'warning' && <Clock size={16} className={statusColors.warning} />}
        {status === 'danger' && <AlertCircle size={16} className={statusColors.danger} />}
      </div>
      <div>
        <div className="text-4xl font-light tracking-tight mb-1">{value}</div>
        {target && <div className="text-xs font-mono opacity-60">TARGET: {target}</div>}
      </div>
    </div>
  );
};

const DashboardView = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-light tracking-tight mb-2">System Overview</h2>
          <p className="col-header">Current Run: Grade 8 Math - Linear Equations (LO-8.EE.C.7)</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="col-header">System Status</div>
            <div className="data-value text-[var(--success)] flex items-center gap-2 justify-end">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"></span>
              IDLE
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <MetricCard title="Total Items Generated" value="0" target="18" status="warning" />
        <MetricCard title="CG Coverage" value="0/7" target="7/7 Cells" status="warning" />
        <MetricCard title="Misconception Coverage" value="0" target="6" status="warning" />
        <MetricCard title="Local QA Pass Rate" value="-" target="95%+" status="warning" />
        <MetricCard title="Dead Distractors" value="0" target="0" status="good" />
        <MetricCard title="Human Review Pending" value="0" target="0" status="good" />
      </div>
    </motion.div>
  );
};




// --- Pipeline Runner Simulation ---

const PIPELINE_STATES = [
  { id: 'S0', name: 'Intake Complete', agent: 'Intake Agent' },
  { id: 'S1', name: 'Construct Approved', agent: 'Construct Agent' },
  { id: 'S2', name: 'Subskills Approved', agent: 'Subskill Agent', gate: 'Gate 1: Construct & Subskill Approval' },
  { id: 'S3', name: 'Content Scoped', agent: 'Content Scoping Agent' },
  { id: 'S4', name: 'Content Scope Approved', agent: 'Content Scoping Agent', gate: 'Gate 2: Content Scope Approval' },
  { id: 'S5', name: 'Hess Matrix Built', agent: 'Custom Hess Matrix Agent', gate: 'Gate 3: Hess Matrix & Misconception Approval' },
  { id: 'S6', name: 'Hess Matrix Approved', agent: 'Custom Hess Matrix Agent' },
  { id: 'S7', name: 'Generation Complete', agent: 'Generation Agent' },
  { id: 'S8', name: 'QA Passed', agent: 'QA Agents' },
  { id: 'S9', name: 'Set Balanced', agent: 'Set Balancing Agent', gate: 'Gate 4: Final Set Approval' },
  { id: 'S10', name: 'Human Review Complete', agent: 'Human Review Support Agent' },
  { id: 'S11', name: 'Pilot Ready', agent: 'Orchestrator Agent' },
];

const PipelineRunnerView = () => {
  const [lo, setLo] = useState('');
  const [skill, setSkill] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState('15');
  const [chapterContent, setChapterContent] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [tsvInput, setTsvInput] = useState('');
  const [parsedMetadata, setParsedMetadata] = useState<any>(null);

  // Tier derivation matches QuickGenerate so prompts get the same grade context.
  const pipelineGradeNum = parseInt(String(grade || parsedMetadata?.gradeCode || '').match(/\d+/)?.[0] || '0', 10);
  const pipelineGradeTier: 'primary' | 'upper-primary' | 'high' | 'unknown' =
    pipelineGradeNum >= 1 && pipelineGradeNum <= 5 ? 'primary'
    : pipelineGradeNum >= 6 && pipelineGradeNum <= 8 ? 'upper-primary'
    : pipelineGradeNum >= 9 && pipelineGradeNum <= 12 ? 'high'
    : 'unknown';

  // Sync manual Grade/Subject edits back into parsedMetadata so downstream
  // orchestration code (which reads parsedMetadata?.gradeCode) sees the latest.
  useEffect(() => {
    if (!grade && !subject) return;
    setParsedMetadata((prev: any) => ({
      ...(prev || {}),
      gradeCode: grade || prev?.gradeCode || '',
      subjectCode: subject || prev?.subjectCode || '',
    }));
  }, [grade, subject]);

  // --- Content Sources (primary material for question generation) ---
  const [contentSources, setContentSources] = useState<{
    id: string; type: 'file' | 'youtube' | 'website'; name: string;
    url?: string; content?: string; status: 'pending' | 'extracting' | 'ready' | 'failed';
  }[]>([]);
  const [newUrl, setNewUrl] = useState('');

  const [status, setStatus] = useState<'idle' | 'running' | 'waiting' | 'completed'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<{ agent: string, action: string, time: string }[]>([]);

  // --- Artifact Data ---
  const [construct, setConstruct] = useState('Students will be able to apply the target skill in various contexts, demonstrating conceptual understanding and procedural fluency.');
  const [subskills, setSubskills] = useState([
    'Identify the core components of the problem.',
    'Apply the standard algorithm or procedure.',
    'Evaluate the result for reasonableness.'
  ]);
  const [selectedSubskills, setSelectedSubskills] = useState<boolean[]>([true, true, true]);

  const [cgPlan, setCgPlan] = useState<Record<string, number>>({
    R1: 0, U1: 0, U2: 0, A2: 0, A3: 0, AN2: 0, AN3: 0
  });

  const [misconceptions, setMisconceptions] = useState<any[]>([]);
  const [misconceptionsNotFound, setMisconceptionsNotFound] = useState(false);

  const [contentScope, setContentScope] = useState<any[]>([]);
  const [selectedScope, setSelectedScope] = useState<boolean[]>([]);
  const [cellData, setCellData] = useState<Record<string, { count: number, definition: string, status: string }>>({});

  const [questions, setQuestions] = useState<any[]>([]);
  const [qaResults, setQaResults] = useState<any[]>([]);
  const [questionImages, setQuestionImages] = useState<Record<string, string>>({});
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // --- Cell-by-cell generation ---
  const [cellQueue, setCellQueue] = useState<{ cell: string, count: number }[]>([]);
  const [currentCellData, setCurrentCellData] = useState<{ cell: string, questions: any[], qa: any[], index: number } | null>(null);

  // --- Search & Resource Sourcing ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ title: string, url: string, type: 'pdf' | 'youtube' | 'web', snippet: string, selected: boolean }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [artifactSearchQuery, setArtifactSearchQuery] = useState('');
  const [sourcedContent, setSourcedContent] = useState<string[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const orchestratorRef = useRef<AgentOrchestrator | null>(null);

  // --- State history for back/forward navigation ---
  const gateSnapshots = useRef<Record<number, any>>({});

  const saveSnapshot = (step: number) => {
    gateSnapshots.current[step] = {
      construct, subskills, selectedSubskills,
      contentScope, selectedScope,
      cgPlan, cellData, misconceptions, misconceptionsNotFound,
      questions, qaResults, questionImages,
      searchResults, logs
    };
  };

  const restoreSnapshot = (step: number) => {
    const snap = gateSnapshots.current[step];
    if (!snap) return;
    setConstruct(snap.construct);
    setSubskills(snap.subskills);
    setSelectedSubskills(snap.selectedSubskills);
    setContentScope(snap.contentScope);
    setSelectedScope(snap.selectedScope);
    setCgPlan(snap.cgPlan);
    setCellData(snap.cellData);
    setMisconceptions(snap.misconceptions);
    setMisconceptionsNotFound(snap.misconceptionsNotFound);
    setQuestions(snap.questions);
    setQaResults(snap.qaResults);
    setQuestionImages(snap.questionImages);
    setSearchResults(snap.searchResults);
    setCurrentStep(step);
    setStatus('waiting');
    setLogs(prev => [...prev, { agent: 'System', action: `Returned to ${PIPELINE_STATES[step]?.gate || 'step ' + step}. You can edit and re-approve.`, time: new Date().toLocaleTimeString() }]);
  };

  const handleGoBack = (toStep: number) => {
    restoreSnapshot(toStep);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Post-Gate 3 mock steps (S10, S11 — human review complete, pilot ready)
  useEffect(() => {
    if (status === 'running' && currentStep > 9) {
      const stateDef = PIPELINE_STATES[currentStep];
      if (!stateDef) return;
      const timer = setTimeout(() => {
        setLogs(prev => [...prev, {
          agent: stateDef.agent,
          action: `Completed state: ${stateDef.id} - ${stateDef.name}`,
          time: new Date().toLocaleTimeString()
        }]);

        if (currentStep < PIPELINE_STATES.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setStatus('completed');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [status, currentStep]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lo || !skill) return;

    const total = parseInt(count);
    setStatus('running');
    setCurrentStep(0);
    setLogs([{ agent: 'Orchestrator Agent', action: `Pipeline initialized for ${total} items. Routing to Intake Agent.`, time: new Date().toLocaleTimeString() }]);

    const orchestrator = new AgentOrchestrator({
        lo, skill, count: total, metadata: parsedMetadata, chapterContent,
        onLog: (agent, action) => {
            setLogs(prev => [...prev, { agent, action, time: new Date().toLocaleTimeString() }]);
        },
        onData: (key, data) => {
            if (key === 'construct') setConstruct(data);
            if (key === 'subskills') {
                setSubskills(data);
                setSelectedSubskills(data.map(() => true));
            }
            if (key === 'cgPlan') {
                const merged = { R1: 0, U1: 0, U2: 0, A2: 0, A3: 0, AN2: 0, AN3: 0, ...data };
                setCgPlan(merged);
            }
            if (key === 'misconceptions') {
                setMisconceptionsNotFound(data.length === 0);
                setMisconceptions(data.map((m: any) => ({
                    id: m.misconception_id,
                    text: m.misconception_text,
                    type: m.type,
                    prevalence: m.prevalence,
                    reasoning: m.incorrect_reasoning
                })));
            }
            if (key === 'misconceptions_not_found') {
                setMisconceptionsNotFound(true);
            }
            if (key === 'questions') {
                setQuestions(data.map((q: any) => ({
                    id: q.id || q.question_id,
                    cell: q.cell || q.cg_cell,
                    type: q.type || q.question_type || 'mcq',
                    stem: q.stem,
                    options: q.options || [],
                    correct_answer: q.answer || q.correct_answer,
                    rationale: q.rationale || '',
                    targeted_subskill: q.targeted_subskill || '',
                    steps: q.steps || [],
                    match_pairs: q.pairs ? q.pairs.map((p: string, _i: number) => splitPair(p)) : q.match_pairs || [],
                    arrange_items: q.items || q.arrange_items || [],
                    needs_image: q.needs_image
                })));
            }
            if (key === 'qaResults') {
                setQaResults(data);
            }
            if (key === 'questionImages') {
                setQuestionImages(prev => ({ ...prev, ...data }));
            }
            if (key === 'cellQueue') {
                setCellQueue(data);
            }
            if (key === 'cellQuestions') {
                setCurrentCellData(data);
            }
            if (key === 'contentScope') {
                setContentScope(data);
                setSelectedScope(data.map((k: any) => k.scope_type !== 'advanced'));
            }
            if (key === 'cellData') {
                setCellData(data);
            }
        },
        onStateChange: (newState, step) => {
            setStatus(newState as any);
            setCurrentStep(step);
        }
    });

    orchestratorRef.current = orchestrator;

    try {
        await orchestrator.executePhase1And2();
    } catch (e: any) {
        setLogs(prev => [...prev, { agent: 'System', action: `Error: ${e.message}`, time: new Date().toLocaleTimeString() }]);
    }
  };

  const handlePasteTSV = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTsvInput(val);
    
    try {
      const lines = val.trim().split('\n');
      if (lines.length > 0) {
        // Take the last line in case they pasted headers too
        const dataRow = lines[lines.length - 1].split('\t');
        
        if (dataRow.length >= 15) {
          const skillDesc = dataRow[5];
          const loDesc = dataRow[15];
          
          if (skillDesc) setSkill(skillDesc);
          if (loDesc) setLo(loDesc);
          if (dataRow[1]) setGrade(dataRow[1]);
          if (dataRow[0]) setSubject(dataRow[0]);

          setParsedMetadata({
            subjectCode: dataRow[0],
            gradeCode: dataRow[1],
            attributeCode: dataRow[2],
            skillCode: dataRow[3],
            skillSequence: dataRow[4],
            skillDescription: dataRow[5],
            skillType: dataRow[6],
            skillStatus: dataRow[7],
            skillEvidenceId: dataRow[8],
            difficultyFormative: dataRow[9],
            difficultyChallenge: dataRow[10],
            loCode: dataRow[11],
            loType: dataRow[12],
            loStatus: dataRow[13],
            loName: dataRow[14],
            loDescription: dataRow[15]
          });
        }
      }
    } catch (err) {
      console.error("Failed to parse TSV", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const filesArr: File[] = Array.from(fileList);
    for (const file of filesArr) {
      const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fileName = file.name;
      setContentSources(prev => [...prev, { id, type: 'file' as const, name: fileName, status: 'extracting' as const }]);
      try {
        setIsParsingFile(true);
        const text = await parseUploadedFile(file);
        setChapterContent(prev => prev ? prev + '\n\n---\n[Source: ' + fileName + ']\n' + text : '[Source: ' + fileName + ']\n' + text);
        setContentSources(prev => prev.map(s => s.id === id ? { ...s, content: text, status: 'ready' as const } : s));
      } catch {
        setContentSources(prev => prev.map(s => s.id === id ? { ...s, status: 'failed' as const } : s));
      } finally {
        setIsParsingFile(false);
      }
    }
    e.target.value = '';
  };

  const handleAddUrl = async () => {
    const url = newUrl.trim();
    if (!url) return;
    setNewUrl('');

    const { detectUrlType, extractYouTubeContent, extractWebContent } = await import('./utils/contentExtractor');
    const type = detectUrlType(url);
    const id = `url-${Date.now()}`;
    const name = type === 'youtube' ? `YouTube: ${url.split('v=')[1]?.slice(0, 11) || url.slice(-20)}` : new URL(url).hostname;

    setContentSources(prev => [...prev, { id, type, name, url, status: 'extracting' }]);

    try {
      const text = type === 'youtube'
        ? await extractYouTubeContent(url)
        : await extractWebContent(url);
      setChapterContent(prev => prev ? prev + '\n\n---\n[Source: ' + url + ']\n' + text : '[Source: ' + url + ']\n' + text);
      setContentSources(prev => prev.map(s => s.id === id ? { ...s, content: text, status: 'ready' as const } : s));
    } catch (err: any) {
      setContentSources(prev => prev.map(s => s.id === id ? { ...s, status: 'failed' as const } : s));
    }
  };

  const removeContentSource = (id: string) => {
    setContentSources(prev => prev.filter(s => s.id !== id));
  };

  // --- Subskill helpers ---
  const toggleSubskill = (idx: number) => {
    setSelectedSubskills(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const moveSubskill = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= subskills.length) return;
    setSubskills(prev => {
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
    setSelectedSubskills(prev => {
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const addSubskill = () => {
    setSubskills(prev => [...prev, '']);
    setSelectedSubskills(prev => [...prev, true]);
  };

  const removeSubskill = (idx: number) => {
    setSubskills(prev => prev.filter((_, i) => i !== idx));
    setSelectedSubskills(prev => prev.filter((_, i) => i !== idx));
  };

  // --- Web search for sourcing content ---
  const handleSearchResources = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const { generateWithGroundedSearch } = await import('./agents/api');
      const searchResult = await generateWithGroundedSearch(
        'Research Agent',
        `You are a research assistant finding educational resources. Search for resources matching the query. Return your findings as a JSON array of objects with fields: title, url, type (one of: "pdf", "youtube", "web"), snippet (2-3 sentence description of what the resource contains and how it's useful). Only include REAL resources you found. Classify as "youtube" if from youtube.com, "pdf" if URL ends in .pdf or is a document, otherwise "web".`,
        JSON.stringify({ query: searchQuery, context: `Learning Objective: ${lo}, Skill: ${skill}` })
      );

      // Parse the grounded search text for structured results
      try {
        const jsonMatch = searchResult.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setSearchResults(parsed.map((r: any) => ({ ...r, selected: false })));
        }
      } catch {
        // If JSON parsing fails, create results from the raw text
        const { generateAgentResponse } = await import('./agents/api');
        const structured = await generateAgentResponse(
          'Research Agent',
          `Parse the following search results into a JSON array. Each item must have: title (string), url (string), type ("pdf"|"youtube"|"web"), snippet (string). Only include items that have a real URL.`,
          searchResult.text,
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                type: { type: 'string', enum: ['pdf', 'youtube', 'web'] },
                snippet: { type: 'string' }
              },
              required: ['title', 'url', 'type', 'snippet']
            }
          }
        );
        setSearchResults(structured.map((r: any) => ({ ...r, selected: false })));
      }
    } catch (err: any) {
      setLogs(prev => [...prev, { agent: 'Search', action: `Search failed: ${err.message}`, time: new Date().toLocaleTimeString() }]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSearchResult = (idx: number) => {
    setSearchResults(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], selected: !next[idx].selected };
      return next;
    });
    // Update sourced content for downstream agents
    setSourcedContent(
      searchResults
        .map((r, i) => i === idx ? { ...r, selected: !r.selected } : r)
        .filter(r => r.selected)
        .map(r => `[${r.type.toUpperCase()}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
    );
  };

  const handleApprove = async () => {
    // Save snapshot before advancing so we can go back
    saveSnapshot(currentStep);
    setLogs(prev => [...prev, { agent: 'Human SME', action: `Approved ${PIPELINE_STATES[currentStep]?.gate || 'current gate'}. Proceeding to next state.`, time: new Date().toLocaleTimeString() }]);

    // Gate 1 (step 2): Subskills approved → run Content Scoping
    if (currentStep === 2 && orchestratorRef.current) {
      const approved = subskills.filter((_, i) => selectedSubskills[i]);
      if (approved.length === 0) {
        setLogs(prev => [...prev, { agent: 'System', action: 'Error: Select at least one subskill.', time: new Date().toLocaleTimeString() }]);
        return;
      }
      const selectedSources = searchResults.filter(r => r.selected).map(r => `[${r.type.toUpperCase()}] ${r.title}\nURL: ${r.url}\n${r.snippet}`);
      setStatus('running');
      setCurrentStep(3);
      try {
        await orchestratorRef.current.executeContentScoping(approved, selectedSources);
      } catch (e: any) {
        setLogs(prev => [...prev, { agent: 'System', action: `Error: ${e.message}`, time: new Date().toLocaleTimeString() }]);
        setStatus('error' as any);
      }
      return;
    }

    // Gate 2 (step 4): Content scope approved → run Custom Hess Matrix + Misconceptions
    if (currentStep === 4 && orchestratorRef.current) {
      const approvedKnowledge = contentScope.filter((_: any, i: number) => selectedScope[i]);
      if (approvedKnowledge.length === 0) {
        setLogs(prev => [...prev, { agent: 'System', action: 'Error: Select at least one knowledge point.', time: new Date().toLocaleTimeString() }]);
        return;
      }
      setLogs(prev => [...prev, { agent: 'Human SME', action: `Approved ${approvedKnowledge.length}/${contentScope.length} knowledge points.`, time: new Date().toLocaleTimeString() }]);
      setStatus('running');
      setCurrentStep(5);
      try {
        await orchestratorRef.current.executeHessMatrix(approvedKnowledge);
      } catch (e: any) {
        setLogs(prev => [...prev, { agent: 'System', action: `Error: ${e.message}`, time: new Date().toLocaleTimeString() }]);
        setStatus('error' as any);
      }
      return;
    }

    // Gate 3 (step 5): Hess Matrix + Misconceptions approved → setup cell-by-cell generation
    if (currentStep === 5 && orchestratorRef.current) {
      setStatus('running');
      setCurrentStep(7);
      try {
        await orchestratorRef.current.executePhase3Setup(cgPlan, misconceptions);
      } catch (e: any) {
        setLogs(prev => [...prev, { agent: 'System', action: `Error: ${e.message}`, time: new Date().toLocaleTimeString() }]);
        setStatus('error' as any);
      }
      return;
    }

    // Gate per-cell (step 7): Approve current cell's questions → generate next cell
    if (currentStep === 7 && orchestratorRef.current && currentCellData) {
      const approvedQs = currentCellData.questions; // SME may have rejected some via handleRejectQuestion
      setLogs(prev => [...prev, { agent: 'Human SME', action: `Approved ${approvedQs.length} items for cell ${currentCellData.cell}. Moving to next cell.`, time: new Date().toLocaleTimeString() }]);
      setStatus('running');
      try {
        await orchestratorRef.current.approveAndNextCell(approvedQs);
      } catch (e: any) {
        setLogs(prev => [...prev, { agent: 'System', action: `Error: ${e.message}`, time: new Date().toLocaleTimeString() }]);
        setStatus('error' as any);
      }
      return;
    }

    // Gate 4+ (step 9+): proceed with post-generation steps.
    // Auto-generate any missing images for the approved set BEFORE landing in
    // the bank — same reasoning as Quick: SME shouldn't see image-required
    // questions with no image attached when the audit surface opens.
    const imageNeedQs = questions.filter((q: any) => q.needs_image && !questionImages[q.id || q.question_id]);
    const finalImages: Record<string, string> = { ...questionImages };
    if (imageNeedQs.length > 0) {
      setLogs(prev => [...prev, { agent: 'Image Agent', action: `Auto-generating ${imageNeedQs.length} image(s) before sending to Bank…`, time: new Date().toLocaleTimeString() }]);
      try {
        const { generateQuestionImage } = await import('./agents/imageGen');
        await Promise.allSettled(imageNeedQs.map(async (q: any) => {
          const qId = q.id || q.question_id;
          try {
            const result = await generateQuestionImage(q.stem);
            if (result.status === 'generated' && result.dataUrl) {
              finalImages[qId] = result.dataUrl;
              setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: image ✓ (${result.sizeKb}KB)`, time: new Date().toLocaleTimeString() }]);
            }
          } catch (e: any) {
            setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: image failed — ${e.message?.slice(0, 40)}`, time: new Date().toLocaleTimeString() }]);
          }
        }));
        setQuestionImages(finalImages);
      } catch { /* fall through with whatever images we have */ }
    }

    // Land the approved set in the Bank so the user can audit / regen / export.
    bankStore.set({
      mode: 'pipeline',
      questions,
      metadata: parsedMetadata,
      lo,
      skill,
      boardProfile: 'cbse',
      gradeScopeProfile: null,
      chapterContent,
      questionImages: finalImages,
      audit: null,
    });

    // The approved set is now in the bank. Don't auto-navigate; let the SME
    // continue iterating in Pipeline view if they want, then click the
    // explicit "Move to Bank · Audit & Export" CTA on the completion card.
    setLogs(prev => [...prev, { agent: 'System', action: 'Approved set ready in Bank. Open the audit surface when satisfied with the batch.', time: new Date().toLocaleTimeString() }]);

    setStatus('running');
    if (currentStep < PIPELINE_STATES.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setStatus('completed');
    }
  };

  // --- Instant type switching (no API call) ---
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSwitchType = async (qId: string, newType: string) => {
    const fromCell = currentCellData?.questions?.find((q: any) => q.id === qId);
    const fromQuestions = questions.find(q => q.id === qId);
    const q = fromCell || fromQuestions;
    if (!q) return;
    if (q.type === newType) return; // already this type

    setSwitchingId(qId);
    try {
      const { generateAgentResponse } = await import('./agents/api');
      const { Prompts } = await import('./agents/prompts');
      const { GenerationSchema } = await import('./agents/schemas');

      const typeInstructions: Record<string, string> = {
        mcq: 'MCQ with 4 options (A,B,C,D). 1 correct (correct=true). Wrong options need "why_wrong". Fill "options" array.',
        fill_blank: 'Fill-in-the-blank. Format: "If X then the answer is ##answer##." Set answer field.',
        error_analysis: `Error Analysis. Show a student's step-by-step work in "steps" array (4-6 steps). Each step = {text, correct: true/false}. Make 1-2 steps INCORRECT with "fix" field. Stem: "[Name] solved this problem. Some steps are incorrect. Select those steps." Steps must show complete reasoning, not just statements. Example: [{"text":"Wheat comes from plants","correct":true},{"text":"Milk comes from plants because cows eat grass","correct":false,"fix":"Milk is an animal product because it comes from cows"}]`,
        match: 'Match-the-following. Fill "pairs" array: ["Wheat → Plant-based", "Milk → Animal-based", ...].',
        arrange: 'Arrange-in-order. Fill "items" array in correct sequence: ["Step 1: ...", "Step 2: ...", ...].',
      };

      const prompt = `${Prompts.GenerationStage1}
Regenerate this question as a "${newType}" question. Same topic and content, different format.
${typeInstructions[newType] || typeInstructions.mcq}
Original question: "${q.stem}"
Cell: ${q.cell}. Grade: ${parsedMetadata?.gradeCode || 'unknown'}.
LANGUAGE: Simple English, Indian names, short stem, no negative phrasing.`;

      const newQ = await generateAgentResponse('Generation Agent', prompt, JSON.stringify({ id: qId, type: newType, cell: q.cell }), GenerationSchema);

      const updated = { ...newQ, cell: q.cell, type: newType };

      if (currentCellData && fromCell) {
        setCurrentCellData(prev => prev ? {
          ...prev,
          questions: prev.questions.map((cq: any) => cq.id === qId ? updated : cq)
        } : prev);
      }
      if (fromQuestions) {
        setQuestions(prev => prev.map(eq => eq.id === qId ? updated : eq));
      }
      setLogs(prev => [...prev, { agent: 'Generation Agent', action: `Switched ${qId} to ${newType}.`, time: new Date().toLocaleTimeString() }]);
    } catch (e: any) {
      setLogs(prev => [...prev, { agent: 'System', action: `Switch failed: ${e.message?.slice(0, 50)}`, time: new Date().toLocaleTimeString() }]);
    } finally {
      setSwitchingId(null);
    }
  };

  // --- Per-question image generation (on-demand) ---
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);

  const handleGenerateOptionImages = async (qId: string) => {
    const fromCell = currentCellData?.questions?.find((q: any) => (q.id || q.question_id) === qId);
    const fromQuestions = questions.find(q => q.id === qId);
    const q = fromCell || fromQuestions;
    if (!q?.options) return;
    setGeneratingImageId(qId);
    try {
      const { generateImageContent } = await import('./agents/api');
      const { normalizeToCanvas } = await import('./agents/imageGen');
      const newImages: Record<string, string> = {};
      for (const opt of q.options) {
        const desc = opt.image_desc || opt.text;
        if (!desc) continue;
        const optKey = `${qId}_opt_${opt.label || 'X'}`;
        if (questionImages[optKey]) continue; // already generated
        try {
          const prompt = `A clear, colorful, realistic illustration of ${desc}. Clean white background, educational style for children, no text in image.`;
          const rawImg = await generateImageContent(prompt);
          const { dataUrl } = await normalizeToCanvas(rawImg, 400);
          newImages[optKey] = dataUrl;
        } catch { /* skip failed */ }
      }
      setQuestionImages(prev => ({ ...prev, ...newImages }));
      setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: ${Object.keys(newImages).length} option images generated`, time: new Date().toLocaleTimeString() }]);
    } catch (e: any) {
      setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: failed — ${e.message?.slice(0, 50)}`, time: new Date().toLocaleTimeString() }]);
    } finally {
      setGeneratingImageId(null);
    }
  };

  const handleGenerateImage = async (qId: string, customPrompt?: string) => {
    // Find question from either current cell or approved questions
    const fromCell = currentCellData?.questions?.find((q: any) => (q.id || q.question_id) === qId);
    const fromQuestions = questions.find(q => q.id === qId);
    const q = fromCell || fromQuestions;
    if (!q) return;
    setGeneratingImageId(qId);
    try {
      if (customPrompt) {
        // Direct prompt (for option images, edits, etc.)
        const { generateFromPrompt } = await import('./agents/imageGen');
        const result = await generateFromPrompt(customPrompt);
        if (result.status === 'generated' && result.dataUrl) {
          setQuestionImages(prev => ({ ...prev, [qId]: result.dataUrl! }));
          setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: ${result.sizeKb}KB (800x600 PNG)`, time: new Date().toLocaleTimeString() }]);
        }
      } else {
        // Analyze question and generate
        const { generateQuestionImage } = await import('./agents/imageGen');
        const result = await generateQuestionImage(q.stem);
        if (result.status === 'generated' && result.dataUrl) {
          setQuestionImages(prev => ({ ...prev, [qId]: result.dataUrl! }));
          setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: ${result.sizeKb}KB (800x600 PNG)`, time: new Date().toLocaleTimeString() }]);
        } else {
          setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: ${result.reason || 'skipped'}`, time: new Date().toLocaleTimeString() }]);
        }
      }
    } catch (e: any) {
      setLogs(prev => [...prev, { agent: 'Image Agent', action: `${qId}: failed — ${e.message?.slice(0, 50)}`, time: new Date().toLocaleTimeString() }]);
    } finally {
      setGeneratingImageId(null);
    }
  };

  // --- Per-question actions ---
  const handleRejectQuestion = (qId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== qId));
    setQaResults(prev => prev.filter(r => r.question_id !== qId));
  };

  const handleRegenerateQuestion = async (qId: string, asType: string) => {
    const q = questions.find(q => q.id === qId);
    if (!q) return;
    setRegeneratingId(qId);
    try {
      const { generateAgentResponse } = await import('./agents/api');
      const { Prompts } = await import('./agents/prompts');
      const { GenerationSchema } = await import('./agents/schemas');
      const cd = cellData[q.cell];
      const scopeList = contentScope.filter((_, i) => selectedScope[i]).map((k: any) => k.knowledge_point).join('\n');
      const result = await generateAgentResponse(
        'Generation Agent',
        Prompts.GenerationStage1,
        JSON.stringify({
          construct: construct,
          cg_cell: q.cell,
          cell_definition: cd?.definition || q.cell,
          items_to_generate: 1,
          force_question_type: asType,
          misconceptions: misconceptions.slice(0, 6),
          learning_objective: lo,
          skill: skill,
          grade: parsedMetadata?.gradeCode || 'unknown',
          subject: parsedMetadata?.subjectCode || 'unknown',
          starting_question_id: q.id,
          approved_content_scope: scopeList,
          chapter_content: chapterContent?.slice(0, 4000) || '',
          instruction: `Generate exactly 1 question of type "${asType}" to REPLACE question ${q.id}. It must be for cell ${q.cell}. Make it different from: "${q.stem?.slice(0, 100)}"`
        }),
        GenerationSchema
      );
      if (result && result.length > 0) {
        const newQ = {
          id: result[0].question_id || q.id,
          cell: result[0].cg_cell || q.cell,
          type: result[0].question_type || asType,
          stem: result[0].stem,
          options: result[0].options || [],
          correct_answer: result[0].correct_answer,
          rationale: result[0].rationale,
          targeted_subskill: result[0].targeted_subskill,
          difficulty: result[0].difficulty,
          steps: result[0].steps || [],
          rearrange_steps: result[0].rearrange_steps || [],
          distractor_steps: result[0].distractor_steps || [],
          match_pairs: result[0].match_pairs || [],
          arrange_items: result[0].arrange_items || []
        };
        setQuestions(prev => prev.map(existing => existing.id === qId ? newQ : existing));
        setLogs(prev => [...prev, { agent: 'Generation Agent', action: `Regenerated ${qId} as ${asType}.`, time: new Date().toLocaleTimeString() }]);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, { agent: 'System', action: `Regeneration failed: ${e.message}`, time: new Date().toLocaleTimeString() }]);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleAddCustomQuestion = () => {
    const newId = `custom-${questions.length + 1}`;
    setQuestions(prev => [...prev, {
      id: newId, cell: 'R1', type: 'mcq', stem: '', options: [],
      correct_answer: '', rationale: '', targeted_subskill: '',
      steps: [], rearrange_steps: [], distractor_steps: [], match_pairs: [], arrange_items: [],
      _isCustom: true
    }]);
  };

  const totalPlanned = Object.values(cgPlan).reduce((a: number, b: number) => a + b, 0);

  if (status === 'idle') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 max-w-3xl mx-auto">
        <header className="mb-4">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--swiftee-deep)', lineHeight: 1.15, marginBottom: 2 }}>
            New generation task
          </h2>
          <p style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
            Initialize the multi-agent pipeline. Paste a TSV row, or fill each field manually.
          </p>
        </header>

        <form onSubmit={handleStart} className="sw-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="sw-field-label">Quick paste (TSV row)</label>
            <textarea
              value={tsvInput}
              onChange={handlePasteTSV}
              className="sw-textarea"
              style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, minHeight: 44, background: '#FAFAFC' }}
              placeholder="Paste Excel/Sheets row here to auto-fill…"
              rows={1}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <label className="sw-field-label">Learning objective (LO)</label>
            <textarea
              required
              value={lo}
              onChange={(e) => setLo(e.target.value)}
              className="sw-textarea"
              style={{ minHeight: 48 }}
              placeholder="e.g., Understand and apply the Pythagorean theorem…"
              rows={2}
            />
          </div>
          <div>
            <label className="sw-field-label">Target skill</label>
            <input
              required
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="sw-input"
              placeholder="e.g., Calculate hypotenuse"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="sw-field-label">
                Grade <span style={{ color: '#C8573B' }}>*</span>
              </label>
              <input
                required
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="sw-input"
                placeholder="e.g., 8 or G8"
              />
              {pipelineGradeTier !== 'unknown' && (
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 3 }}>
                  {pipelineGradeTier === 'primary' ? 'Primary (1–5)' : pipelineGradeTier === 'upper-primary' ? 'Upper primary (6–8)' : 'High (9–12)'}
                </div>
              )}
            </div>
            <div>
              <label className="sw-field-label">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="sw-input"
                placeholder="e.g., MATH, SCI, ENG"
              />
            </div>
          </div>
          {/* Content Sources — PRIMARY material for question generation */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <div className="mb-2">
              <label className="sw-field-label">Content sources (primary material)</label>
              <p style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 1 }}>
                Questions will be generated from these sources first. Add chapter PDFs, YouTube explainers, or website links.
              </p>
            </div>

            {/* Add URL input */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                placeholder="Paste YouTube link or website URL…"
                className="sw-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!newUrl.trim()}
                className="sw-btn sw-btn-primary sw-btn-sm"
              >
                <Globe size={14} /> Add link
              </button>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isParsingFile}
                />
                <button type="button" className={`sw-btn sw-btn-ghost sw-btn-sm ${isParsingFile ? 'opacity-50' : ''}`}>
                  {isParsingFile ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Upload files
                </button>
              </div>
            </div>

            {/* Content source list — Swiftee card rows */}
            {contentSources.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {contentSources.map(src => {
                  const statusChip =
                    src.status === 'ready' ? <span className="sw-chip sw-chip-green sw-chip-sm"><CheckCircle2 size={10} /> Ready</span>
                    : src.status === 'extracting' ? <span className="sw-chip sw-chip-gold sw-chip-sm"><Loader2 size={10} className="animate-spin" /> Extracting</span>
                    : src.status === 'failed' ? <span className="sw-chip sw-chip-red sw-chip-sm"><AlertCircle size={10} /> Failed</span>
                    : <span className="sw-chip sw-chip-grey sw-chip-sm">Pending</span>;
                  return (
                    <div key={src.id} style={{
                      display: 'grid', gridTemplateColumns: '36px 1fr auto auto', gap: 12,
                      alignItems: 'center', padding: '10px 12px',
                      border: '1px solid var(--border-subtle)', borderRadius: 10, background: '#FAFAFC',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: src.type === 'youtube' ? '#FF0000' : src.type === 'website' ? '#1976D2' : 'var(--swiftee-purple)',
                      }}>
                        {src.type === 'youtube' && <Youtube size={16} />}
                        {src.type === 'website' && <Globe size={16} />}
                        {src.type === 'file' && <FileText size={16} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--swiftee-deep)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{src.name}</div>
                        {src.url && (
                          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {src.url}
                          </div>
                        )}
                      </div>
                      {statusChip}
                      <button
                        type="button"
                        onClick={() => removeContentSource(src.id)}
                        className="sw-btn sw-btn-ghost sw-btn-sm"
                        style={{ padding: 6 }}
                        title="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fallback text area for pasting content directly */}
            <textarea
              value={chapterContent}
              onChange={(e) => setChapterContent(e.target.value)}
              className="sw-textarea"
              style={{ minHeight: 56 }}
              placeholder="Or paste chapter text / syllabus content directly here…"
              rows={2}
            />
            {contentSources.filter(s => s.status === 'ready').length > 0 && (
              <div style={{
                marginTop: 8, fontSize: 11, color: 'var(--green-400)',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
              }}>
                <CheckCircle2 size={12} />
                {contentSources.filter(s => s.status === 'ready').length} source(s) loaded — questions will be generated from this content
              </div>
            )}
          </div>
          <div>
            <label className="sw-field-label">Number of questions (15–22)</label>
            <input
              required
              type="number"
              min="1" max="50"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="sw-input"
            />
          </div>
          <button
            type="submit"
            className="sw-btn sw-btn-primary"
            disabled={!grade}
            title={!grade ? 'Grade is required for grade-appropriate generation.' : undefined}
            style={{ padding: '10px 14px', marginTop: 2 }}
          >
            Initialize pipeline
          </button>
          {!grade && (lo || skill) && (
            <p style={{ fontSize: 10, color: '#C8573B', marginTop: -6 }}>Grade is required before initialization.</p>
          )}
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 h-full flex flex-col max-w-[1600px] mx-auto">
      <header className="mb-4 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-light tracking-tight mb-1">Pipeline Execution</h2>
          <div className="flex items-center gap-3">
            <p className="col-header max-w-xl truncate">Task: {lo}</p>
            {parsedMetadata && (
              <span className="text-xs font-mono bg-[var(--line)] px-2 py-0.5 rounded text-[var(--ink)]">
                {parsedMetadata.subjectCode} • {parsedMetadata.gradeCode} • {parsedMetadata.skillCode}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="col-header">Status</div>
          <div className={`data-value flex items-center gap-2 justify-end ${
            status === 'running' ? 'text-[var(--success)]' : 
            status === 'waiting' ? 'text-[var(--warning)]' : 'text-[var(--ink)]'
          }`}>
            {status === 'running' && <Loader2 size={14} className="animate-spin" />}
            {status === 'waiting' && <AlertCircle size={14} className="animate-pulse" />}
            {status === 'completed' && <CheckSquare size={14} />}
            {status.toUpperCase()}
          </div>
        </div>
      </header>

      {/* Swiftee pipeline stepper — 8 steps with gate badges */}
      <div className="shrink-0 -mx-6">
        {(() => {
          // Map numeric currentStep → stepper ID
          const currentId =
            currentStep <= 1 ? 'intake' :
            currentStep === 2 ? 'subskills' :
            currentStep <= 4 ? 'scope' :
            currentStep === 5 ? 'matrix' :
            currentStep === 6 ? 'miscon' :
            currentStep <= 8 ? 'generate' :
            currentStep === 9 ? 'review' : 'export';
          const order = ['intake', 'subskills', 'scope', 'matrix', 'miscon', 'generate', 'review', 'export'];
          const currentIdx = order.indexOf(currentId);
          const doneIds = order.slice(0, currentIdx);
          return (
            <PipelineStepper
              current={currentId}
              done={doneIds}
              run={{
                id: parsedMetadata?.skillCode ? `#${parsedMetadata.skillCode}` : undefined,
                title: lo ? (lo.length > 40 ? lo.slice(0, 40) + '…' : lo) : undefined,
                grade: parsedMetadata?.gradeCode,
                skillCode: parsedMetadata?.subjectCode,
              }}
            />
          );
        })()}
      </div>

      {/* Gate stepper — click to go back */}
      <div className="flex items-center gap-1 mb-3 shrink-0 overflow-x-auto">
        {[
          { step: 2, label: 'Subskills', gate: 'Gate 1' },
          { step: 4, label: 'Content Scope', gate: 'Gate 2' },
          { step: 5, label: 'Hess Matrix', gate: 'Gate 3' },
          { step: 9, label: 'Questions', gate: 'Gate 4' },
        ].map((g, i) => {
          const isPast = currentStep > g.step;
          const isCurrent = currentStep === g.step;
          const hasSnapshot = !!gateSnapshots.current[g.step];
          return (
            <React.Fragment key={g.step}>
              {i > 0 && <div className={`w-8 h-px ${isPast || isCurrent ? 'bg-[var(--ink)]' : 'bg-[var(--line-dark)]'}`} />}
              <button
                onClick={() => hasSnapshot && isPast ? handleGoBack(g.step) : undefined}
                disabled={!hasSnapshot || !isPast}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border transition-colors shrink-0 ${
                  isCurrent
                    ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                    : isPast && hasSnapshot
                    ? 'bg-[var(--surface)] border-[var(--line-dark)] hover:bg-[var(--line)] cursor-pointer text-[var(--ink)]'
                    : 'bg-[var(--bg)] border-[var(--line)] text-[var(--line-dark)] cursor-default'
                }`}
              >
                {isPast && <CheckCircle2 size={10} className="text-[var(--success)]" />}
                {isCurrent && <Activity size={10} className="animate-pulse" />}
                <span>{g.gate}: {g.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* D6 · Agent log moved to fixed-bottom drawer (see bottom of component).
               Lightweight running-state banner remains here so users can see the
               current pipeline state at a glance without opening the drawer. */}
          <div
            style={{
              padding: '8px 14px',
              background: 'var(--swiftee-deep)',
              color: '#fff',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 11, flexShrink: 0,
            }}
          >
            {status === 'running' && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--swiftee-gold)' }} />}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--swiftee-gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>
              {status.toUpperCase()}
            </span>
            <span style={{ opacity: 0.85 }}>{PIPELINE_STATES[currentStep]?.name || 'Initializing...'}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.5, fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {logs.length} events · open log ↓
            </span>
            <div ref={logsEndRef} />
          </div>

          {/* Workspace / Artifacts (Bottom) */}
          <div className="flex-1 tech-border bg-[var(--surface)] flex flex-col overflow-hidden relative">
            <div className="p-3 border-b border-[var(--line-dark)] bg-[var(--bg)] flex items-center justify-between gap-3">
              <div className="col-header flex items-center gap-2 shrink-0">
                <FileText size={14} />
                Artifact Workspace
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="relative max-w-xs w-full">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                  <input
                    type="text"
                    value={artifactSearchQuery}
                    onChange={e => setArtifactSearchQuery(e.target.value)}
                    placeholder="Search artifacts..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs tech-border bg-[var(--surface)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                {status === 'waiting' && (
                  <div className="text-xs font-bold text-[var(--accent)] animate-pulse flex items-center gap-1 shrink-0">
                    <ShieldCheck size={14} /> HUMAN REVIEW REQUIRED
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-40">
              {status === 'idle' || (status === 'running' && currentStep < 2) ? (
                <div className="h-full flex items-center justify-center text-[var(--ink-muted)] flex-col gap-4">
                  <Activity size={32} className="animate-pulse" />
                  <p className="font-mono text-sm">Agents are drafting initial specifications...</p>
                </div>
              ) : null}

              {/* Gate 1: Construct & Subskills */}
              {(currentStep === 2 || (currentStep > 2 && status !== 'idle')) && (
                <div className={`mb-8 transition-all ${currentStep > 2 ? 'opacity-40 pointer-events-none max-h-24 overflow-hidden' : ''}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--line-dark)] pb-2">
                    <h3 className="text-lg font-bold">1. Construct & Subskills</h3>
                    {currentStep === 2 && (
                      <HelpPopover label="Why this step?">
                        Subskills are the <b style={{ color: 'var(--swiftee-deep)' }}>testable actions</b> your skill decomposes into. You decide which to test, in what order, and whether to add any the AI missed.
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
                        <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Downstream impact</div>
                        <ul style={{ margin: 0, padding: '0 0 0 16px', lineHeight: 1.65 }}>
                          <li>Content Scoping keyword-matches each subskill to your sources.</li>
                          <li>Each Hess cell will target one or more approved subskills.</li>
                          <li>Rejected subskills won't appear anywhere downstream.</li>
                        </ul>
                      </HelpPopover>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block col-header mb-1">Construct Statement</label>
                    <textarea
                      value={construct}
                      onChange={e => setConstruct(e.target.value)}
                      className="w-full tech-border bg-[var(--bg)] p-3 text-sm focus:outline-none focus:border-[var(--accent)]"
                      rows={2}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block col-header">Identified Subskills</label>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[var(--ink-muted)]">
                          {selectedSubskills.filter(Boolean).length}/{subskills.length} selected
                        </span>
                        {currentStep === 2 && (
                          <button
                            type="button"
                            onClick={addSubskill}
                            className="flex items-center gap-1 px-2 py-1 border border-[var(--line-dark)] hover:bg-[var(--line)] bg-[var(--bg)] text-xs"
                          >
                            <Plus size={12} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {subskills.map((sub, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 group transition-opacity ${!selectedSubskills[idx] ? 'opacity-40' : ''}`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedSubskills[idx] ?? true}
                            onChange={() => toggleSubskill(idx)}
                            className="w-4 h-4 shrink-0 accent-[var(--accent)] cursor-pointer"
                          />
                          {/* Grip handle */}
                          <GripVertical size={14} className="text-[var(--ink-muted)] shrink-0 opacity-30 group-hover:opacity-100" />
                          {/* Editable input */}
                          <input
                            value={sub}
                            onChange={e => {
                              const newSubs = [...subskills];
                              newSubs[idx] = e.target.value;
                              setSubskills(newSubs);
                            }}
                            className="flex-1 tech-border bg-[var(--bg)] p-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                          />
                          {/* Reorder buttons */}
                          {currentStep === 2 && (
                            <div className="flex flex-col shrink-0">
                              <button
                                type="button"
                                onClick={() => moveSubskill(idx, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 hover:bg-[var(--line)] disabled:opacity-20 transition-colors"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSubskill(idx, 'down')}
                                disabled={idx === subskills.length - 1}
                                className="p-0.5 hover:bg-[var(--line)] disabled:opacity-20 transition-colors"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          )}
                          {/* Delete button */}
                          {currentStep === 2 && subskills.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSubskill(idx)}
                              className="p-1 hover:bg-[#FFEBEE] hover:text-[var(--danger)] text-[var(--ink-muted)] transition-colors shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Search Tool */}
                  {currentStep === 2 && (
                    <div className="mt-6 tech-border bg-[var(--bg)] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe size={16} className="text-[var(--accent)]" />
                        <label className="col-header">Search Resources (PDFs, YouTube, Web)</label>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSearchResources()}
                          placeholder={`e.g., "${skill || 'nutrient categories'} grade 6 worksheet PDF"`}
                          className="flex-1 tech-border bg-[var(--surface)] p-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                        <button
                          type="button"
                          onClick={handleSearchResources}
                          disabled={isSearching || !searchQuery.trim()}
                          className="px-4 py-2 bg-[var(--ink)] text-[var(--bg)] text-sm font-bold uppercase tracking-wide hover:bg-[var(--accent)] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                          Search
                        </button>
                      </div>
                      {searchResults.length > 0 && (
                        <div>
                          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-3">
                            {searchResults.map((result, idx) => (
                              <div
                                key={idx}
                                onClick={() => toggleSearchResult(idx)}
                                className={`flex items-start gap-3 p-3 tech-border cursor-pointer transition-colors ${
                                  result.selected
                                    ? 'bg-[#E8F5E9] border-[var(--success)]'
                                    : 'bg-[var(--surface)] hover:bg-[var(--line)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={result.selected}
                                  onChange={() => toggleSearchResult(idx)}
                                  className="w-4 h-4 shrink-0 mt-0.5 accent-[var(--success)] cursor-pointer"
                                  onClick={e => e.stopPropagation()}
                                />
                                <div className="shrink-0 mt-0.5">
                                  {result.type === 'youtube' && <Youtube size={16} className="text-[#FF0000]" />}
                                  {result.type === 'pdf' && <FileDown size={16} className="text-[#D32F2F]" />}
                                  {result.type === 'web' && <Globe size={16} className="text-[#1976D2]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">{result.title}</span>
                                    <ExternalLink size={12} className="text-[var(--ink-muted)] shrink-0" />
                                  </div>
                                  <p className="text-xs text-[var(--ink-muted)] mt-0.5 line-clamp-2">{result.snippet}</p>
                                  <span className="text-xs font-mono text-[var(--accent)] truncate block mt-1">{result.url}</span>
                                </div>
                                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-[var(--line)] rounded shrink-0">
                                  {result.type}
                                </span>
                              </div>
                            ))}
                          </div>
                          {searchResults.some(r => r.selected) && (
                            <div className="flex items-center justify-between p-2 bg-[#E8F5E9] tech-border border-[var(--success)]">
                              <span className="text-xs font-mono text-[#2E7D32]">
                                {searchResults.filter(r => r.selected).length} resource(s) selected — content will be fed to downstream agents
                              </span>
                              <CheckCircle2 size={16} className="text-[var(--success)]" />
                            </div>
                          )}
                        </div>
                      )}
                      {isSearching && (
                        <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--ink-muted)]">
                          <Loader2 size={16} className="animate-spin" /> Searching for relevant resources...
                        </div>
                      )}
                    </div>
                  )}

                  {currentStep === 2 && status === 'waiting' && (
                    <div className="mt-6">
                      <InlineGateBar
                        onApprove={handleApprove}
                        approveLabel={`Approve ${selectedSubskills.filter(Boolean).length} subskills`}
                        disabled={selectedSubskills.filter(Boolean).length === 0}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Gate 2: CG Matrix & Misconceptions */}
              {currentStep >= 5 && (
                <div className={`mb-8 transition-opacity ${currentStep > 5 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--line-dark)] pb-2 gap-3">
                    <h3 className="text-lg font-bold">3. Custom Hess Matrix & Misconceptions</h3>
                    <div className="flex items-center gap-2">
                      {currentStep === 5 && (
                        <HelpPopover label="Why a matrix?">
                          <b style={{ color: 'var(--swiftee-deep)' }}>Hess cells control what the assessment measures.</b> Each cell = a row (Bloom cognitive process) × column (Depth of Knowledge). Allocating counts per cell prevents an item set that is all DOK-1 recall.
                          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
                          <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Downstream</div>
                          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
                            Generation drafts one batch per cell, drawing only on the KPs and subskills that fit. Misconceptions become wrong-answer attractors for MCQs.
                          </div>
                        </HelpPopover>
                      )}
                      {currentStep === 5 && (
                        <button onClick={() => handleGoBack(4)} className="px-2 py-1 text-[10px] font-mono uppercase border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1">
                          <ArrowRight size={10} className="rotate-180" /> Back
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-3">
                      <label className="block col-header">CG Matrix Allocation</label>
                      <span className={`text-xs font-mono font-bold ${totalPlanned !== parseInt(count) ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                        Total: {totalPlanned} / {count}
                      </span>
                    </div>
                    {/* 2D CG Matrix with inline definitions */}
                    <div className="flex flex-col gap-0">
                      {/* Header */}
                      <div className="grid grid-cols-4 bg-[var(--ink)] text-[var(--bg)]">
                        <div className="p-2.5 text-xs font-bold uppercase tracking-wider border-r border-[#333]">Bloom's Level</div>
                        <div className="p-2.5 text-xs font-bold uppercase tracking-wider text-center border-r border-[#333]">DOK 1</div>
                        <div className="p-2.5 text-xs font-bold uppercase tracking-wider text-center border-r border-[#333]">DOK 2</div>
                        <div className="p-2.5 text-xs font-bold uppercase tracking-wider text-center">DOK 3</div>
                      </div>
                      {/* Rows */}
                      {([
                        { label: 'Remember', cells: ['R1', null, null] },
                        { label: 'Understand', cells: ['U1', 'U2', null] },
                        { label: 'Apply', cells: [null, 'A2', 'A3'] },
                        { label: 'Analyze', cells: [null, 'AN2', 'AN3'] },
                      ] as const).map((row) => (
                        <div key={row.label} className="grid grid-cols-4 border-t border-[var(--line-dark)]">
                          <div className="p-2.5 font-bold text-sm border-r border-[var(--line-dark)] bg-[var(--surface)] flex items-center">
                            {row.label}
                          </div>
                          {row.cells.map((cellKey, ci) => {
                            if (!cellKey) return (
                              <div key={ci} className="p-2 border-r border-[var(--line-dark)] last:border-r-0 bg-[var(--bg)] flex items-center justify-center">
                                <span className="text-[var(--line-dark)] text-xs">—</span>
                              </div>
                            );
                            const cd = cellData[cellKey];
                            const isActive = !cd || cd.status === 'active';
                            const isInactive = cd && cd.status !== 'active';
                            return (
                              <div key={ci} className={`p-2.5 border-r border-[var(--line-dark)] last:border-r-0 flex flex-col gap-1.5 ${
                                isInactive ? 'bg-[var(--bg)] opacity-40' : 'bg-[var(--surface)]'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-mono uppercase font-bold ${isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}`}>{cellKey}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={cgPlan[cellKey] ?? 0}
                                    onChange={e => setCgPlan({...cgPlan, [cellKey]: parseInt(e.target.value) || 0})}
                                    className="w-12 text-center text-base font-bold bg-transparent border-b border-[var(--line-dark)] focus:outline-none focus:border-[var(--accent)]"
                                  />
                                </div>
                                {cd?.definition && (
                                  <p className={`text-[10px] leading-tight ${isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)] italic'}`}>
                                    {cd.definition}
                                  </p>
                                )}
                                {isInactive && cd?.status && (
                                  <span className="text-[9px] font-mono uppercase text-[var(--ink-muted)]">{cd.status.replace('_', ' ')}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block col-header mb-2">Diagnostic Misconception Bank</label>
                    {misconceptionsNotFound && misconceptions.length === 0 && (
                      <div className="tech-border bg-[#FFF8E1] border-[#F57F17] p-4 flex items-start gap-3">
                        <AlertCircle size={20} className="text-[#F57F17] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#E65100] mb-1">No research-backed misconceptions found for these skills.</p>
                          <p className="text-xs text-[#BF360C]">
                            The misconception catalog and internet search of research sources (MOSART, AAAS Project 2061, Ryan & Williams, etc.) did not return results matching this specific topic.
                            You may proceed without misconceptions, or upload additional research material using the file upload on the input form.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-3">
                      {misconceptions.map((m, idx) => (
                        <div key={m.id} className="tech-border bg-[var(--bg)] p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm font-mono bg-[var(--ink)] text-[var(--bg)] px-2 py-0.5">{m.id}</span>
                            {(m as any).type && (
                              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                (m as any).type === 'conceptual' ? 'bg-[#E3F2FD] text-[#1565C0]' :
                                (m as any).type === 'procedural' ? 'bg-[#FFF3E0] text-[#E65100]' :
                                'bg-[#F3E5F5] text-[#7B1FA2]'
                              }`}>
                                {(m as any).type}
                              </span>
                            )}
                            {(m as any).prevalence && (
                              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                (m as any).prevalence === 'common' ? 'bg-[#FFEBEE] text-[#C62828]' :
                                (m as any).prevalence === 'moderate' ? 'bg-[#FFF8E1] text-[#F57F17]' :
                                'bg-[#E8F5E9] text-[#2E7D32]'
                              }`}>
                                {(m as any).prevalence}
                              </span>
                            )}
                          </div>
                          <input
                            value={m.text}
                            onChange={e => {
                              const newM = [...misconceptions];
                              newM[idx] = { ...newM[idx], text: e.target.value };
                              setMisconceptions(newM);
                            }}
                            className="w-full tech-border bg-[var(--surface)] p-2 text-sm focus:outline-none focus:border-[var(--accent)] mb-1"
                          />
                          {(m as any).reasoning && (
                            <p className="text-xs text-[var(--ink-muted)] mt-1 italic">
                              Why: {(m as any).reasoning}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentStep === 5 && status === 'waiting' && (
                    <div className="mt-6">
                      <InlineGateBar
                        onBack={() => handleGoBack(4)}
                        onApprove={handleApprove}
                        approveLabel={`Approve matrix · ${totalPlanned} items & generate`}
                        disabled={totalPlanned !== parseInt(count)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Gate 2: Content Scope Approval */}
              {(currentStep >= 4 || (currentStep >= 3 && contentScope.length > 0)) && contentScope.length > 0 && (
                <div className={`mb-8 transition-all ${currentStep > 4 ? 'opacity-40 pointer-events-none max-h-24 overflow-hidden' : ''}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--line-dark)] pb-2 gap-3">
                    <h3 className="text-lg font-bold">2. Content Scope — Knowledge Points for Question Generation</h3>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      {currentStep === 4 && (
                        <HelpPopover label="Why this step?">
                          <b style={{ color: 'var(--swiftee-deep)' }}>Only approved points can become questions.</b> This is what prevents students seeing a question about a concept one source mentioned in passing but that is not in scope for this grade.
                          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
                          <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Bulk actions</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button className="sw-btn sw-btn-sm sw-btn-ghost" onClick={() => setSelectedScope(contentScope.map(() => true))} style={{ justifyContent: 'flex-start' }}>
                              <SwIcon name="done_all" size="sm" /> Select all
                            </button>
                            <button className="sw-btn sw-btn-sm sw-btn-ghost" onClick={() => setSelectedScope(contentScope.map((k: any) => k.scope_type === 'core'))} style={{ justifyContent: 'flex-start' }}>
                              <SwIcon name="check_circle" size="sm" /> Core only
                            </button>
                          </div>
                        </HelpPopover>
                      )}
                      <span className="text-[var(--ink-muted)]">{selectedScope.filter(Boolean).length}/{contentScope.length} selected</span>
                      {currentStep === 4 && (
                        <button onClick={() => handleGoBack(2)} className="px-2 py-1 text-[10px] font-mono uppercase border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1">
                          <ArrowRight size={10} className="rotate-180" /> Back
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Group by category */}
                  {[...new Set(contentScope.map((k: any) => k.category))].map((category: any) => {
                    const items = contentScope.map((k: any, i: number) => ({ ...k, _idx: i })).filter((k: any) => k.category === category);
                    return (
                      <div key={category} className="mb-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2 flex items-center gap-2">
                          <span>{category}</span>
                          <span className="text-[10px] font-normal">({items.filter((k: any) => selectedScope[k._idx]).length}/{items.length})</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {items.map((k: any) => (
                            <div
                              key={k.id}
                              className={`flex items-start gap-2 p-2.5 tech-border text-sm transition-all cursor-pointer ${
                                !selectedScope[k._idx] ? 'opacity-40 bg-[var(--bg)]' :
                                k.scope_type === 'advanced' ? 'bg-[#FFF3E0] border-[#F57F17]' :
                                k.scope_type === 'core' ? 'bg-[#E8F5E9] border-[var(--success)]' :
                                'bg-[var(--surface)]'
                              }`}
                              onClick={() => {
                                setSelectedScope(prev => {
                                  const next = [...prev];
                                  next[k._idx] = !next[k._idx];
                                  return next;
                                });
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedScope[k._idx] ?? false}
                                onChange={() => {}}
                                className="w-4 h-4 shrink-0 mt-0.5 accent-[var(--accent)] cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <span>{k.knowledge_point}</span>
                                {k.flag && (
                                  <span className="text-[10px] text-[#E65100] ml-2 italic">{k.flag}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                  k.scope_type === 'core' ? 'bg-[#E8F5E9] text-[#2E7D32]' :
                                  k.scope_type === 'advanced' ? 'bg-[#FFEBEE] text-[#C62828]' :
                                  'bg-[var(--line)] text-[var(--ink-muted)]'
                                }`}>{k.scope_type}</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  k.grade_level === 'primary' ? 'bg-[#E3F2FD] text-[#1565C0]' :
                                  k.grade_level === 'middle' ? 'bg-[#F3E5F5] text-[#7B1FA2]' :
                                  'bg-[#FFF8E1] text-[#F57F17]'
                                }`}>{k.grade_level}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {currentStep === 4 && status === 'waiting' && (
                    <div className="mt-6">
                      <InlineGateBar
                        onBack={() => handleGoBack(2)}
                        onApprove={handleApprove}
                        approveLabel={`Approve ${selectedScope.filter(Boolean).length} knowledge points`}
                        disabled={selectedScope.filter(Boolean).length === 0}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Cell-by-cell generation review */}
              {currentStep === 7 && currentCellData && (
                <div className="mb-8">
                  {/* D5 · dense progress strip */}
                  {(() => {
                    const target = cellQueue.reduce((s, cq) => s + (cq.count || 0), 0);
                    const done = questions.length;
                    const qaPass = qaResults.filter((r: any) => r.pass).length;
                    const qaWarn = qaResults.filter((r: any) => !r.pass).length;
                    return (
                      <div style={{
                        padding: '12px 16px', background: '#fff',
                        border: '1px solid var(--border-subtle)', borderRadius: 12,
                        display: 'flex', alignItems: 'center', gap: 16,
                        marginBottom: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 96 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--swiftee-deep)', lineHeight: 1 }}>{done}</div>
                          <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>/ {target}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="sw-bar-track" style={{ height: 6 }}>
                            <div className="sw-bar-fill" style={{ width: `${target ? (done / target) * 100 : 0}%` }} />
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                            {cellQueue.map((cq, idx) => {
                              const isActive = idx === currentCellData.index;
                              const isDone = idx < currentCellData.index;
                              const dotColor = isDone ? 'var(--green-500)' : isActive ? 'var(--swiftee-gold)' : 'var(--fg-muted)';
                              return (
                                <span
                                  key={cq.cell}
                                  style={{
                                    padding: '5px 9px', borderRadius: 6, fontSize: 11,
                                    border: `1px solid ${isActive ? 'var(--swiftee-deep)' : 'var(--border-subtle)'}`,
                                    background: isActive ? 'var(--swiftee-deep)' : '#FAFAFC',
                                    color: isActive ? '#fff' : 'var(--swiftee-deep)',
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                  }}
                                >
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
                                  <b style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{cq.cell}</b>
                                  <span style={{ opacity: 0.75, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                                    {isDone ? `${cq.count}/${cq.count}` : isActive ? `${currentCellData.questions.length}/${cq.count}` : `0/${cq.count}`}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          {qaPass > 0 && <span className="sw-chip sw-chip-green sw-chip-sm">{qaPass} pass</span>}
                          {qaWarn > 0 && <span className="sw-chip sw-chip-gold sw-chip-sm">{qaWarn} warn</span>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* D5 · dark "Now generating" banner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--swiftee-deep)', color: '#fff',
                    borderRadius: 10, marginBottom: 12, gap: 10,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'var(--swiftee-gold)', marginBottom: 1,
                      }}>
                        {status === 'running' ? 'Now generating' : 'Current cell'} · {currentCellData.cell}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                        {cellData[currentCellData.cell]?.definition || currentCellData.cell}
                      </div>
                    </div>
                    {status === 'running' && (
                      <span className="sw-chip sw-chip-gold sw-chip-sm" style={{ background: 'rgba(255,186,0,0.2)', color: 'var(--swiftee-gold)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Loader2 size={10} className="animate-spin" /> Generating
                      </span>
                    )}
                    {status === 'waiting' && (
                      <span className="sw-chip sw-chip-gold sw-chip-sm" style={{ background: 'rgba(255,186,0,0.2)', color: 'var(--swiftee-gold)' }}>
                        Awaiting approval
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">
                        Cell {currentCellData.index + 1}/{cellQueue.length}: {currentCellData.cell}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)]">
                      <span>{currentCellData.questions.length} items</span>
                      {questions.length > 0 && (
                        <span className="text-[var(--success)]">({questions.length} approved so far)</span>
                      )}
                    </div>
                  </div>

                  {status === 'running' && (
                    <div className="flex items-center justify-center gap-2 py-8 text-[var(--ink-muted)]">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="font-mono text-sm">Generating {currentCellData.cell} questions...</span>
                    </div>
                  )}

                  {status === 'waiting' && currentCellData.questions.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 gap-6 mb-4">
                        {currentCellData.questions.map((q: any) => {
                          const qa = currentCellData.qa?.find((r: any) => r.question_id === (q.question_id || q.id));
                          const qId = q.question_id || q.id;
                          const qType = q.type || q.question_type || 'mcq';
                          return (
                            <div key={qId} className={`bg-white rounded-[12px] border border-[var(--border-subtle)] ${q.needs_image ? 'border-l-4 border-l-[var(--swiftee-purple)]' : ''} ${qa && !qa.pass ? 'border-[var(--swiftee-gold)]' : ''}`}>
                              {/* Header bar */}
                              <div className={`flex justify-between items-center px-4 py-2 border-b border-[var(--line-dark)] ${q.needs_image ? 'bg-[#E3F2FD]' : 'bg-[var(--surface)]'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm font-mono bg-[var(--ink)] text-[var(--bg)] px-2 py-0.5">{qId}</span>
                                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#E3F2FD] text-[#1565C0] font-bold">{qType.replace('_', ' ')}</span>
                                  <span className="text-xs font-mono text-[var(--ink-muted)]">{q.cg_cell || q.cell}</span>
                                  {q.needs_image && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1565C0] text-white flex items-center gap-1">
                                      <BrainCircuit size={10} /> Image Required
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {q.needs_image && (
                                    generatingImageId === qId ? (
                                      <span className="text-[10px] text-[#1565C0] flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Generating...</span>
                                    ) : !questionImages[qId] ? (
                                      <button onClick={() => handleGenerateImage(qId)} className="px-2 py-0.5 text-[10px] font-bold uppercase border border-[#1565C0] text-[#1565C0] hover:bg-white flex items-center gap-1">
                                        <BrainCircuit size={10} /> Generate Image
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-[var(--success)] flex items-center gap-1"><CheckCircle2 size={10} /> Image Ready</span>
                                    )
                                  )}
                                  {!q.needs_image && (
                                    <span className="text-[10px] text-[var(--ink-muted)]">Text Only</span>
                                  )}
                                </div>
                              </div>

                              <div className="p-4">
                                <QuestionBody q={q} qType={qType} image={questionImages[qId]} density="detailed" Latex={LatexText} />

                                {/* QA Issues */}
                                {qa && qa.issues?.length > 0 && (
                                  <div className="mt-2 text-xs text-[#E65100] bg-[#FFF3E0] p-2 tech-border">
                                    {qa.issues.map((issue: string, i: number) => <div key={i}>{issue}</div>)}
                                  </div>
                                )}
                              </div>

                              {/* Action bar */}
                              <div className="px-4 py-2 border-t border-[var(--line-dark)] bg-[var(--surface)] flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => {
                                    setCurrentCellData(prev => prev ? {
                                      ...prev,
                                      questions: prev.questions.filter((cq: any) => (cq.question_id || cq.id) !== qId)
                                    } : prev);
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold uppercase border border-[var(--danger)] text-[var(--danger)] hover:bg-[#FFEBEE] flex items-center gap-1"
                                >
                                  <Trash2 size={10} /> Reject
                                </button>
                                {switchingId === qId ? (
                                  <span className="text-[10px] text-[var(--accent)] flex items-center gap-1">
                                    <Loader2 size={10} className="animate-spin" /> Switching...
                                  </span>
                                ) : (
                                  <>
                                    <span className="text-[10px] text-[var(--ink-muted)]">Switch to:</span>
                                    {['mcq', 'true_false', 'fill_blank', 'match', 'arrange'].map(t => (
                                      <button
                                        key={t}
                                        disabled={switchingId !== null}
                                        onClick={() => handleSwitchType(qId, t)}
                                        className={`px-1.5 py-0.5 text-[10px] font-mono border transition-colors disabled:opacity-30 ${
                                          qType === t ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line-dark)] hover:bg-[var(--line)]'
                                        }`}
                                      >
                                        {t.replace('_', ' ')}
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--ink-muted)] font-mono">
                          {currentCellData.questions.length} items for {currentCellData.cell} | Cell {currentCellData.index + 1} of {cellQueue.length}
                        </span>
                        <button
                          onClick={handleApprove}
                          className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2 text-sm font-bold uppercase tracking-wide hover:bg-[var(--success)] transition-colors flex items-center gap-2"
                        >
                          <CheckSquare size={16} />
                          {currentCellData.index + 1 < cellQueue.length
                            ? `Approve & Next Cell (${cellQueue[currentCellData.index + 1]?.cell})`
                            : 'Approve & Run Final QA'
                          }
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Gate 4: Final Generated Set */}
              {(currentStep >= 9 || status === 'completed') && questions.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--line-dark)] pb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">4. Generated Question Set</h3>
                      {currentStep === 9 && status === 'waiting' && (
                        <button onClick={() => handleGoBack(5)} className="px-2 py-1 text-[10px] font-mono uppercase border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1">
                          <ArrowRight size={10} className="rotate-180" /> Back to Hess Matrix
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--ink-muted)]">
                      <span>{questions.length} items</span>
                      <span className="text-[var(--line-dark)]">|</span>
                      {qaResults.length > 0 && <span>{qaResults.filter((r: any) => r.pass).length}/{qaResults.length} QA passed</span>}
                      <span className="text-[var(--line-dark)]">|</span>
                      <span>Types: {[...new Set(questions.map(q => q.type))].join(', ')}</span>
                    </div>
                  </div>

                  <TriageBar
                    total={questions.length}
                    approved={questions.length}
                    flagged={qaResults.length > 0 ? qaResults.filter((r: any) => !r.pass).length : undefined}
                    className="mb-3"
                  />

                  <div className="grid grid-cols-1 gap-6">
                    {questions.map((q) => {
                      const qa = qaResults.find((r: any) => r.question_id === q.id);
                      const qType = q.type || 'mcq';
                      const typeLabel: Record<string, string> = { mcq: 'MCQ', true_false: 'True / False', fill_blank: 'Fill in the Blank', one_word: 'One Word', match: 'Match the Following', arrange: 'Arrange in Order' };
                      const typeBg: Record<string, string> = { mcq: 'bg-[#E3F2FD] text-[#1565C0]', true_false: 'bg-[#E8EAF6] text-[#283593]', fill_blank: 'bg-[#F3E5F5] text-[#7B1FA2]', one_word: 'bg-[#E8F5E9] text-[#2E7D32]', match: 'bg-[#E0F7FA] text-[#00695C]', arrange: 'bg-[#FFF8E1] text-[#F57F17]' };

                      return (
                        <div key={q.id} className={`bg-white rounded-[12px] border border-[var(--border-subtle)] ${q.needs_image ? 'border-l-4 border-l-[var(--swiftee-purple)]' : ''} ${qa && !qa.pass ? 'border-[var(--swiftee-gold)]' : ''}`}>
                          {/* Header bar */}
                          <div className={`flex justify-between items-center px-4 py-2 border-b border-[var(--line-dark)] ${q.needs_image ? 'bg-[#E3F2FD]' : 'bg-[var(--surface)]'}`}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm font-mono bg-[var(--ink)] text-[var(--bg)] px-2 py-0.5">{q.id}</span>
                              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${typeBg[qType] || 'bg-[var(--line)]'}`}>{typeLabel[qType] || qType}</span>
                              <span className="text-xs font-mono text-[var(--ink-muted)]">{q.cell}</span>
                              {qa && <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${qa.pass ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF3E0] text-[#E65100]'}`}>{qa.pass ? 'QA ✓' : 'QA ✗'}</span>}
                              {q.needs_image && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1565C0] text-white flex items-center gap-1">
                                  <BrainCircuit size={10} /> Image Required
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {q.needs_image && (
                                questionImages[q.id] ? (
                                  <span className="text-[10px] text-[var(--success)] flex items-center gap-1"><CheckCircle2 size={10} /> Image Ready</span>
                                ) : currentStep === 9 && status === 'waiting' ? (
                                  <button onClick={() => handleGenerateImage(q.id)} disabled={generatingImageId === q.id} className="px-2 py-0.5 text-[10px] font-bold uppercase border border-[#1565C0] text-[#1565C0] hover:bg-white flex items-center gap-1 disabled:opacity-50">
                                    {generatingImageId === q.id ? <><Loader2 size={10} className="animate-spin" /> Generating...</> : <><BrainCircuit size={10} /> Generate Image</>}
                                  </button>
                                ) : null
                              )}
                              {!q.needs_image && <span className="text-[10px] text-[var(--ink-muted)]">Text Only</span>}
                            </div>
                          </div>

                          <div className="p-4">
                            <QuestionBody q={q} qType={qType} image={questionImages[q.id]} density="detailed" Latex={LatexText} />

                            {qa && qa.issues?.length > 0 && (
                              <div className={`mt-2 text-xs p-2 tech-border ${qa.severity === 'critical' ? 'bg-[#FFEBEE]' : qa.severity === 'major' ? 'bg-[#FFF3E0]' : 'bg-[var(--surface)]'}`}>
                                <strong>QA ({qa.issues.length}):</strong> {qa.issues.slice(0, 3).join(' | ')}
                              </div>
                            )}
                          </div>

                          {/* Action bar */}
                          {currentStep === 9 && status === 'waiting' && (
                            <div className="px-4 py-2 border-t border-[var(--line-dark)] bg-[var(--surface)] flex items-center gap-2 flex-wrap">
                              <button onClick={() => handleRejectQuestion(q.id)} className="px-2.5 py-1 text-[10px] font-bold uppercase border border-[var(--danger)] text-[var(--danger)] hover:bg-[#FFEBEE] flex items-center gap-1">
                                <Trash2 size={10} /> Reject
                              </button>
                              <span className="text-[10px] text-[var(--ink-muted)]">Switch to:</span>
                              {['mcq', 'true_false', 'fill_blank', 'match', 'arrange'].map(t => (
                                <button key={t} onClick={() => handleRegenerateQuestion(q.id, t)} className={`px-1.5 py-0.5 text-[10px] font-mono border ${qType === t ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line-dark)] hover:bg-[var(--line)]'}`}>
                                  {t.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {currentStep === 9 && status === 'waiting' && (
                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex justify-start">
                        <button
                          onClick={handleAddCustomQuestion}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wide border border-[var(--line-dark)] hover:bg-[var(--line)] transition-colors flex items-center gap-2"
                        >
                          <Plus size={14} /> Add Custom Question
                        </button>
                      </div>
                      <InlineGateBar
                        onApprove={handleApprove}
                        approveLabel={`Approve final set · ${questions.length} items`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* D6 · Completion — Swiftee ExportHero. Primary CTA moves the SME
                  to the Bank for audit + export (parity with Quick mode); the
                  raw Download ZIP is now a secondary action. */}
              {status === 'completed' && (
                <ExportHero
                  itemCount={questions.length}
                  title={lo || skill || 'Run complete'}
                  subtitle={
                    parsedMetadata?.gradeCode && parsedMetadata?.subjectCode
                      ? `${parsedMetadata.subjectCode} · ${parsedMetadata.gradeCode}`
                      : undefined
                  }
                  stats={[
                    { label: 'Items', v: questions.length, sub: 'banked' },
                    { label: 'QA passed', v: `${qaResults.filter((r: any) => r.pass).length}/${qaResults.length || questions.length}`, sub: 'structural + pedagogical' },
                    { label: 'Cells', v: new Set(questions.map((q: any) => q.cell)).size, sub: 'Hess matrix coverage' },
                  ]}
                  primary={{
                    label: 'Move to Bank · Audit & Export',
                    onClick: () => window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'bank' })),
                  }}
                  secondary={{
                    label: 'Download ZIP now',
                    onClick: async () => {
                      const { exportToExcelAndZip } = await import('./utils/exporter');
                      await exportToExcelAndZip({
                        questions,
                        questionImages,
                        metadata: {
                          lo, skill, count: parseInt(count), construct,
                          grade: parsedMetadata?.gradeCode,
                          subject: parsedMetadata?.subjectCode,
                          skillCode: parsedMetadata?.skillCode,
                          loCode: parsedMetadata?.loCode,
                        },
                        qaResults,
                      });
                    },
                  }}
                />
              )}

            </div>

            {/* Gate status bar — no duplicate buttons */}
            <AnimatePresence>
              {status === 'waiting' && PIPELINE_STATES[currentStep]?.gate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-0 left-0 right-0 px-4 py-2.5 bg-[#FFF4E5] border-t border-[#F59E0B] text-[#92400E] text-xs font-mono flex items-center gap-2 z-50"
                >
                  <ShieldCheck size={14} className="text-[#D97706]" />
                  Paused at <strong>{PIPELINE_STATES[currentStep].gate}</strong> — review and approve above to continue.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* D6 · Agent log drawer (fixed bottom, click to expand) */}
      <AgentLogDrawer
        lines={logs.map(l => ({ t: l.time, a: l.agent, m: l.action }))}
      />
    </motion.div>
  );
};

// ===== FEEDBACK REFINER — takes user feedback and refines questions =====
const FeedbackRefiner = ({ questions, setQuestions, lo, skill, metadata, log, setStatus, setProgress, refreshImage }: {
  questions: any[]; setQuestions: (q: any[]) => void; lo: string; skill: string; metadata: any;
  log: (msg: string) => void; setStatus: (s: any) => void; setProgress: (p: string) => void;
  refreshImage?: (q: any) => void;
}) => {
  const [feedback, setFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async () => {
    if (!feedback.trim()) return;
    setIsRefining(true);
    log(`Refining with feedback: "${feedback.slice(0, 80)}..."`);
    setStatus('running');
    setProgress('Refining questions based on feedback...');

    try {
      const { generateAgentResponse } = await import('./agents/api');
      const { GenerationSchema } = await import('./agents/schemas');

      // Send current questions + feedback to Gemini for refinement
      const currentQsSummary = questions.map(q =>
        `${q.id} [${q.type}] ${q.cell}: "${q.stem?.slice(0, 60)}..."`
      ).join('\n');

      const refinedQs: any[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        setProgress(`Refining ${q.id} (${i + 1}/${questions.length})...`);

        try {
          const prompt = `You are refining an existing question based on user feedback.

ORIGINAL QUESTION:
- ID: ${q.id}
- Type: ${q.type}
- Cell: ${q.cell}
- Stem: ${q.stem}
- Answer: ${q.answer || q.correct_answer || ''}

USER FEEDBACK (apply this to improve the question):
"${feedback}"

Generate an improved version of this question applying the feedback.
Keep the same type (${q.type}), cell (${q.cell}), and ID (${q.id}).
If the feedback doesn't apply to this question, return it unchanged.
Simple English, Indian names, short stems.`;

          const typeInstr: Record<string, string> = {
            mcq: 'MCQ with 4 options. Fill "options" array.',
            fill_blank: 'Fill-blank. Put ##answer## in stem.',
            error_analysis: 'Error analysis. "steps" array.',
            match: 'Match. "pairs" array.',
            arrange: 'Arrange. "items" array.',
          };

          const refined = await generateAgentResponse('Generation Agent',
            prompt + '\n' + (typeInstr[q.type] || typeInstr.mcq),
            JSON.stringify({ id: q.id, type: q.type, cell: q.cell }),
            GenerationSchema
          );
          refinedQs.push({ ...refined, cell: q.cell, type: q.type, id: q.id });
          log(`${q.id}: refined ✓`);
        } catch {
          refinedQs.push(q); // keep original on failure
          log(`${q.id}: kept original`);
        }
      }

      setQuestions(refinedQs);
      // Keep the bank store in sync so the audit / Move-to-Bank flow sees the
      // refined batch.
      if (bankStore.get().mode === 'quick') bankStore.setQuestions(refinedQs);
      setFeedback('');
      log(`Refinement complete. ${refinedQs.length} questions updated.`);
      // Refresh images for every refined question (clears stale, regenerates if still needed).
      if (refreshImage) {
        for (const rq of refinedQs) {
          const prevQ = questions.find(x => x.id === rq.id);
          if (prevQ && prevQ.stem !== rq.stem) refreshImage(rq);
        }
      }
    } catch (e: any) {
      log(`Refinement error: ${e.message?.slice(0, 50)}`);
    } finally {
      setIsRefining(false);
      setStatus('done');
      setProgress('');
    }
  };

  return (
    <div className="tech-border bg-[#FFF8E1] border-[#F57F17] p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle size={16} className="text-[#F57F17]" />
        <label className="text-sm font-bold">Feedback & Refine</label>
      </div>
      <p className="text-xs text-[var(--ink-muted)] mb-2">
        Describe what you want changed. All questions will be refined based on your feedback.
      </p>
      <div className="flex gap-2">
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleRefine())}
          placeholder="e.g., Make questions easier, use more real-life examples, avoid technical terms, add more error analysis questions, focus on classification not recall..."
          className="flex-1 tech-border bg-white p-2.5 text-sm focus:outline-none focus:border-[var(--accent)] min-h-[60px]"
          disabled={isRefining}
        />
        <button
          onClick={handleRefine}
          disabled={!feedback.trim() || isRefining}
          className="px-4 py-2 bg-[var(--ink)] text-[var(--bg)] text-xs font-bold uppercase self-end hover:bg-[var(--accent)] transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
        >
          {isRefining ? <><Loader2 size={12} className="animate-spin" /> Refining...</> : <><BrainCircuit size={12} /> Refine All</>}
        </button>
      </div>
    </div>
  );
};

// ===== QUICK GENERATE — Lean, single-click question generation =====
const QuickGenerateView = () => {
  const [lo, setLo] = useState('');
  const [skill, setSkill] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState('15');
  const [content, setContent] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [tsvInput, setTsvInput] = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  // Grade is the numeric part ("4" from "G4" or "Grade 4"); gradeTier drives the
  // grade-appropriate block in the generation prompt.
  const gradeNum = parseInt(String(grade || metadata?.gradeCode || '').match(/\d+/)?.[0] || '0', 10);
  const gradeTier: 'primary' | 'upper-primary' | 'high' | 'unknown' =
    gradeNum >= 1 && gradeNum <= 5 ? 'primary'
    : gradeNum >= 6 && gradeNum <= 8 ? 'upper-primary'
    : gradeNum >= 9 && gradeNum <= 12 ? 'high'
    : 'unknown';

  // Keep metadata in sync with manual Grade / Subject edits so downstream code
  // (which reads metadata.gradeCode / metadata.subjectCode) always sees the
  // latest values regardless of whether they came from TSV or the inputs.
  useEffect(() => {
    if (!grade && !subject) return;
    setMetadata((prev: any) => ({
      ...(prev || {}),
      gradeCode: grade || prev?.gradeCode || '',
      subjectCode: subject || prev?.subjectCode || '',
    }));
  }, [grade, subject]);

  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionImages, setQuestionImages] = useState<Record<string, string>>({});
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  // Content-driven grade-appropriateness profile (inferred once per batch;
  // cached here so Regen/Simplify/Harder reuse it without extra calls).
  const [gradeScopeProfile, setGradeScopeProfile] = useState<any>(null);

  // Customization panel state
  const ALL_BLOOM = ['Remember', 'Understand', 'Apply', 'Analyze'] as const;
  const ALL_TYPES = ['mcq', 'fill_blank', 'match', 'arrange', 'error_analysis', 'assertion_reason', 'case_based'] as const;
  const [bloomLevels, setBloomLevels] = useState<string[]>([...ALL_BLOOM]);
  // Default OFF: fill_blank, error_analysis (Neha's feedback — opt-in, not opt-out)
  const [qTypes, setQTypes] = useState<string[]>(['mcq', 'match', 'arrange', 'assertion_reason', 'case_based']);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [boardProfile, setBoardProfile] = useState<'cbse' | 'state'>('cbse');
  const [customNotes, setCustomNotes] = useState('');
  const [showCustomPanel, setShowCustomPanel] = useState(true);

  // Per-question action state
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const toggleArrayValue = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  // Bloom level → CG cells
  const BLOOM_TO_CELLS: Record<string, string[]> = {
    Remember: ['R1'], Understand: ['U1', 'U2'], Apply: ['A2', 'A3'], Analyze: ['AN2', 'AN3']
  };

  // Subject classifier: fill_blank and error_analysis are only allowed for Maths & English.
  // Maths fill_blank answers must be numeric only.
  const classifySubject = (code?: string): 'math' | 'english' | 'other' => {
    const s = (code || '').toLowerCase();
    if (/math|maths|mat|mth|ganit/.test(s)) return 'math';
    if (/eng|english|angrezi/.test(s)) return 'english';
    return 'other';
  };
  const subjectKind = classifySubject(metadata?.subjectCode);
  const typesAllowedBySubject = (t: string) =>
    (t === 'fill_blank' || t === 'error_analysis') ? subjectKind !== 'other' : true;

  // Physics detection (for error-analysis scaffolding — Sri Niharika's feedback)
  const isPhysics = /phys|bhautiki/i.test(metadata?.subjectCode || '') || /phys/i.test(skill || '');

  // Subject-aware error-analysis instruction (Sri Niharika — typed error categories for physics)
  const errorAnalysisInstr = (): string => {
    const latexLine = ' All mathematical expressions in "text" and "fix" MUST be wrapped in LaTeX delimiters \\( ... \\) (use \\dfrac, \\sqrt, ^{}, \\cdot etc.).';
    if (isPhysics) return 'Physics error analysis. 4-step worked solution. 1-2 steps contain ONE typed error; each wrong step MUST include "fix" AND "error_type" from: unit_dimensional, sign_direction, formula_misapplication, reference_frame, significant_figures. The error must be physics-meaningful, NOT arithmetic. Correct steps set error_type="".' + latexLine;
    if (subjectKind === 'math') return 'Math error analysis. 4 steps. 1-2 wrong with "fix" and "error_type" from: sign, transposition, distribution, inverse_op, fraction_rule, order_of_ops. Error must be a NAMED procedural misconception, not arithmetic slip.' + latexLine;
    return 'Error analysis. "steps" array (4 steps). 1-2 wrong with "fix".';
  };

  // Derive an approved-terms list from uploaded chapter content (Bhanu Priya — NCERT terminology)
  const approvedTermsFromContent = (txt: string): string[] => {
    if (!txt || txt.length < 40) return [];
    const stop = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'these', 'those', 'then', 'than', 'are', 'was', 'were', 'has', 'have', 'had', 'but', 'not', 'can', 'could', 'will', 'would', 'should', 'into', 'onto', 'upon', 'such', 'which', 'while', 'when', 'where', 'because', 'there', 'their', 'they', 'them', 'its', 'also', 'some', 'most', 'more', 'less', 'other', 'each', 'every']);
    const bigrams: Record<string, number> = {};
    (txt.match(/\b[A-Z][a-z]+(?:\s+[a-z]+){0,2}\b/g) || []).forEach(b => { bigrams[b] = (bigrams[b] || 0) + 1; });
    const techWords: Record<string, number> = {};
    (txt.toLowerCase().match(/\b[a-z]{6,}\b/g) || []).forEach(w => {
      if (stop.has(w)) return;
      techWords[w] = (techWords[w] || 0) + 1;
    });
    const top = (obj: Record<string, number>, n: number) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
    return [...new Set([...top(bigrams, 15), ...top(techWords, 20)])];
  };

  // Scenario-opener regex (Divyansh — scenario-overuse detection)
  const SCENARIO_RE = /^\s*(?:Riya|Kabir|Meera|Aarav|Aditi|Rohan|Priya|Sneha|A\s+student|A\s+teacher|A\s+doctor|A\s+farmer|Consider|Imagine|Suppose|In\s+a\s+|An?\s+\w+\s+is\s+|On\s+a\s+|During\s+a\s+)/i;

  const handlePasteTSV = (val: string) => {
    setTsvInput(val);
    try {
      const lines = val.trim().split('\n');
      const row = lines[lines.length - 1].split('\t');
      if (row.length >= 15) {
        if (row[5]) setSkill(row[5]);
        if (row[15]) setLo(row[15]);
        if (row[1]) setGrade(row[1]);
        if (row[0]) setSubject(row[0]);
        setMetadata({ subjectCode: row[0], gradeCode: row[1], skillCode: row[3] });
      }
    } catch { /* ignore */ }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingFile(true);
    try {
      const { parseUploadedFile } = await import('./utils/fileParser');
      const text = await parseUploadedFile(file);
      setContent(prev => prev ? prev + '\n\n' + text : text);
      log(`Extracted ${text.length} chars from ${file.name}`);
    } catch (err: any) {
      log(`File error: ${err.message}`);
    } finally {
      setIsParsingFile(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!lo || !skill) return;
    setStatus('running');
    setQuestions([]);
    setLogs([]);
    const total = parseInt(count) || 15;

    try {
      const { generateAgentResponse } = await import('./agents/api');
      const { Prompts } = await import('./agents/prompts');
      const { CGMapperSchema, GenerationSchema } = await import('./agents/schemas');

      // Step 1: Build Hess Matrix
      log('Building Hess Matrix...');
      setProgress('Building Hess Matrix...');
      const matrix = await generateAgentResponse('Custom Hess Matrix Agent', Prompts.CGMapperAgent, JSON.stringify({
        construct: skill, subskills: [skill], target_questions: total,
        grade: metadata?.gradeCode || '', subject: metadata?.subjectCode || '',
        learning_objective: lo, skill,
        approved_knowledge_points: content.slice(0, 2000) || lo,
      }), CGMapperSchema);

      const cgPlan = matrix.matrix || {};
      // Filter to only cells matching selected Bloom levels
      const allowedCells = new Set(bloomLevels.flatMap(b => BLOOM_TO_CELLS[b] || []));
      let cells = Object.entries(cgPlan)
        .filter(([cell, d]: [string, any]) => d.status === 'active' && d.count > 0 && allowedCells.has(cell))
        .map(([cell, d]: [string, any]) => ({ cell, count: d.count, def: d.definition }));

      // Re-distribute to hit target total if Bloom filter dropped cells
      const subtotal = cells.reduce((s, c) => s + c.count, 0);
      if (subtotal > 0 && subtotal < total && cells.length > 0) {
        const deficit = total - subtotal;
        for (let i = 0; i < deficit; i++) cells[i % cells.length].count += 1;
      }
      if (cells.length === 0) {
        log('No cells match selected Bloom levels. Aborting.');
        setStatus('done');
        return;
      }

      log(`Matrix: ${cells.map(c => `${c.cell}:${c.count}`).join(', ')}`);

      // Step 2: Search for exemplar questions
      log('Searching for exemplar questions...');
      setProgress('Searching question banks...');
      let exemplarBank = '';
      try {
        const { generateWithGroundedSearch } = await import('./agents/api');
        const res = await generateWithGroundedSearch('Research Agent',
          `Find 6-10 real assessment questions for: "${skill}" (${metadata?.subjectCode || ''}, Grade ${metadata?.gradeCode || ''}). Search: NCERT Exemplar, CBSE sample papers, DIKSHA, Khan Academy, Olympiad banks. Exact question text + source. UK English. Grade-appropriate only.`,
          JSON.stringify({ skill, lo, grade: metadata?.gradeCode })
        );
        exemplarBank = (res.text || '').slice(0, 1500);
        log(exemplarBank.length > 50 ? 'Found exemplar questions.' : 'No exemplars found.');
      } catch { log('Exemplar search failed. Continuing.'); }

      // Step 3: Generate questions cell by cell
      const allQs: any[] = [];
      const defaultTypeMap: Record<string, string[]> = {
        R1: ['mcq', 'fill_blank'], U1: ['mcq', 'fill_blank'], U2: ['mcq', 'match'],
        A2: ['mcq', 'error_analysis'], A3: ['error_analysis'], AN2: ['mcq', 'error_analysis'], AN3: ['error_analysis']
      };

      // Subject rule: fill_blank + error_analysis allowed only for Maths/English.
      if (subjectKind === 'other') {
        log('Subject not Maths/English — FIB & error analysis disabled.');
      }
      const subjectFilteredQTypes = qTypes.filter(typesAllowedBySubject);

      // Intersect each cell's natural types with (user selection ∩ subject-allowed); fall back safely.
      const typeMap: Record<string, string[]> = {};
      Object.entries(defaultTypeMap).forEach(([cell, types]) => {
        const filtered = types
          .filter(typesAllowedBySubject)
          .filter(t => subjectFilteredQTypes.includes(t));
        typeMap[cell] = filtered.length > 0
          ? filtered
          : (subjectFilteredQTypes.length > 0 ? subjectFilteredQTypes : ['mcq']);
      });

      const difficultyInstr: Record<string, string> = {
        easy: 'DIFFICULTY: EASY. Direct recall, single-step, simple vocabulary, familiar context.',
        medium: 'DIFFICULTY: MEDIUM. Two-step reasoning, moderate vocabulary, familiar application.',
        hard: 'DIFFICULTY: HARD. Multi-step reasoning, unfamiliar context, distractors require discrimination.',
        mixed: 'DIFFICULTY: MIXED across questions (vary easy/medium/hard).',
      };

      // Grade-math boundary — keeps numericals in-scope (Divyansh)
      const { Prompts: Pr, getGradeMathBoundary, getGradeAppropriatenessHint, formatGradeProfile, getImageRatioForGrade } = await import('./agents/prompts');
      const gradeMathBoundary = subjectKind === 'math' ? getGradeMathBoundary(metadata?.gradeCode) : '';
      if (gradeMathBoundary) log('Applying grade-math concept boundary.');

      // Content-driven GRADE_PROFILE (one call per batch, cached for Regen/Simplify/Harder).
      let gradeHint = '';
      if (metadata?.gradeCode) {
        setProgress('Inferring grade-appropriate profile...');
        log('Inferring grade-appropriate profile from content + grade...');
        try {
          const { GradeScopeSchema } = await import('./agents/schemas');
          const scopeInput = JSON.stringify({
            grade: metadata?.gradeCode,
            subject: metadata?.subjectCode,
            skill,
            learning_objective: lo,
            chapter_content: content ? content.slice(0, 2500) : '',
          });
          const profile = await generateAgentResponse('Grade Scope Agent', Pr.GradeScopeAgent, scopeInput, GradeScopeSchema);
          setGradeScopeProfile(profile);
          gradeHint = formatGradeProfile(profile);
          log(`Grade profile ready: ${profile.concrete_lock ? 'concrete-locked; ' : ''}cap ${profile.stem_cap_words || '—'} words.`);
        } catch (e: any) {
          log(`Grade scope inference failed: ${e.message?.slice(0, 50)}. Falling back to minimal hint.`);
          gradeHint = getGradeAppropriatenessHint(metadata?.gradeCode, metadata?.subjectCode);
        }
      }

      // State-board language profile (Divyansh) — applied for grades 9/10 only
      const gradeNum = parseInt(String(metadata?.gradeCode || '').match(/\d+/)?.[0] || '0', 10);
      const stateBoardNote = (boardProfile === 'state' && gradeNum >= 9 && gradeNum <= 10)
        ? `\nSTATE-BOARD LANGUAGE PROFILE:\n- Max 25 words per stem.\n- Grade-8 vocabulary ceiling — no technical jargon that requires explanation.\n- NO nested clauses (avoid "which, given that..."). Use active voice.\n- Concrete nouns; no filler ("In the context of...", "With respect to...").\n- Break any longer idea into two sentences.`
        : '';
      if (stateBoardNote) log('Applying state-board language profile.');

      // Approved terms from uploaded content (Bhanu Priya — NCERT terminology)
      const approvedTerms = approvedTermsFromContent(content);
      const approvedTermsNote = approvedTerms.length > 0
        ? `\nAPPROVED_TERMS (use ONLY these chapter-specific terms; do NOT invent synonyms):\n${approvedTerms.slice(0, 30).join(', ')}`
        : '';

      // Grade-tier image ratio — distribute image targets across the batch.
      // First targetImageMin positions (rounded up) carry a hard image directive;
      // beyond that, AI decides naturally. Post-loop correction flips extras if
      // the model ignores the directive.
      const imageRatio = getImageRatioForGrade(metadata?.gradeCode);
      const targetImageMin = Math.ceil((total * imageRatio.minPct) / 100);
      log(`Grade ${metadata?.gradeCode || '?'}: target ${imageRatio.minPct}-${imageRatio.maxPct}% visual (min ${targetImageMin}/${total}).`);
      // Evenly interleave image-targeted positions so visuals aren't clumped at
      // the start of the set.
      const imageTargetPositions = new Set<number>();
      if (targetImageMin > 0 && total > 0) {
        const step = total / targetImageMin;
        for (let k = 0; k < targetImageMin; k++) {
          imageTargetPositions.add(Math.floor(k * step));
        }
      }

      for (const { cell, count: cellCount, def } of cells) {
        const types = typeMap[cell] || ['mcq'];
        for (let qi = 0; qi < cellCount; qi++) {
          const qType = types[qi % types.length];
          const qId = `${cell}-${allQs.length + 1}`;
          setProgress(`Generating ${qId} (${qType})...`);
          log(`Generating ${qId}: ${qType}...`);

          // LaTeX is required for Math, Physics, and any Science subject (chem formulas, biology stats, etc.)
          const isScience = /sci|bio|chem|phys|bhautiki|rasayan|jeev/i.test(metadata?.subjectCode || '');
          const needsLatex = subjectKind === 'math' || isPhysics || isScience;
          const mathLatexReminder = needsLatex
            ? ' Every mathematical, chemical, or scientific expression (equations, formulas, exponents, fractions, roots, chemical formulas like H_2O or CO_2, ions like Na^+, ratios, units) in stem, options, pairs, items, answer, and rationale MUST be LaTeX-wrapped: inline \\( ... \\), display \\[ ... \\]. Use \\dfrac, \\sqrt[n]{...}, a^{m+n}, \\cdot, subscripts X_{i}, superscripts X^{+} — never raw ASCII math. Plain English prose stays plain.'
            : '';

          const typeInstr: Record<string, string> = {
            mcq: 'MCQ with 4 options (A,B,C,D). 1 correct. Wrong options need "why_wrong".' + mathLatexReminder,
            fill_blank: subjectKind === 'math'
              ? 'Fill-in-the-blank. Put ##answer## in stem. The answer MUST be a NUMBER only (integer or decimal). No words, no units, no variables, no expressions — just the numeric value (e.g., 42, 3.14, -5, 0.75). The stem should pose a problem whose answer is purely numeric. Wrap every math expression in the stem with LaTeX delimiters \\( ... \\).'
              : 'Fill-in-the-blank. Put ##answer## in stem.',
            error_analysis: errorAnalysisInstr(),
            match: 'Match. "pairs" array: ["X → Y", ...].' + mathLatexReminder,
            arrange: 'Arrange. "items" array in correct order.' + mathLatexReminder,
            assertion_reason: 'Assertion–Reason MCQ. Stem must contain "Assertion (A): ..." and "Reason (R): ...". Options MUST be: (A) Both A and R are true, and R is the correct explanation of A; (B) Both A and R are true, but R is not the correct explanation of A; (C) A is true, R is false; (D) A is false, R is true. Mark exactly one correct.' + mathLatexReminder,
            case_based: 'Case-based / situational MCQ. Stem opens with a short real-life scenario (2-3 sentences) then asks the question. 4 options, 1 correct, wrong options need "why_wrong".' + mathLatexReminder,
          };

          // Pass already-generated stems so Gemini avoids repetition
          const alreadyGenerated = allQs.map(prev => prev.stem?.slice(0, 40)).filter(Boolean).slice(-5);
          const avoidNote = alreadyGenerated.length > 0
            ? `\nALREADY GENERATED (do NOT repeat these topics):\n${alreadyGenerated.map(s => `- "${s}..."`).join('\n')}\nGenerate something DIFFERENT.`
            : '';

          const customNote = customNotes.trim()
            ? `\nCUSTOM INSTRUCTIONS (obey strictly):\n${customNotes.trim()}`
            : '';

          // R1/U1: enforce no-scenario opener at the per-question level too (Divyansh)
          const noScenarioNote = (cell === 'R1' || cell === 'U1')
            ? '\nR1/U1 RULE: Stem MUST be a direct question or one-sentence statement. Do NOT open with a scenario, character name, or "Consider/Imagine/Suppose".'
            : '';

          // Grade-tier image target — lower grades need more visuals.
          const thisPositionIsImage = imageTargetPositions.has(allQs.length);
          const imageDirectiveNote = thisPositionIsImage
            ? `\nIMAGE REQUIREMENT (this question): needs_image MUST be true. Design the stem to REQUIRE a picture, diagram, graph, chart, or illustration to answer.
SELF-CONTAINED STEM (CRITICAL): even though the image is attached, the stem MUST still carry every essential numeric value, label, or piece of data needed to solve — NEVER write "Look at the image showing the weights" without also listing those weights in the stem text (e.g., "Aisha bought three items weighing 5.250 kg, 3.800 kg, and 1.755 kg. [image shows these]. What is the total?"). The student must be able to see the numbers even if the image fails to render.
If MCQ, options may also reference the image. For primary grades especially, prefer concrete visuals (objects to count, pictures to identify, diagrams to label). For the "image_desc" on needs_image=true, describe exactly what to show.`
            : '';

          // assertion_reason + case_based are specialised MCQs — map to 'mcq' schema-wise
          const schemaType = (qType === 'assertion_reason' || qType === 'case_based') ? 'mcq' : qType;

          try {
            const exemplarNote = exemplarBank ? `\nEXEMPLAR QUESTIONS (match this quality):\n${exemplarBank.slice(0, 400)}` : '';
            const contentSlice = content.length > 0 ? content.slice(0, 1500) : lo;
            const q = await generateAgentResponse('Generation Agent',
              `${Prompts.GenerationStage1}\nCell ${cell}: ${def || cell}\nGenerate 1 "${qType}". ${typeInstr[qType] || typeInstr.mcq}\n${difficultyInstr[difficulty]}${gradeHint}${gradeMathBoundary}${stateBoardNote}${approvedTermsNote}${noScenarioNote}${imageDirectiveNote}\nContent: ${contentSlice}\nSkill: ${skill}\nGrade: ${metadata?.gradeCode || ''} | Subject: ${metadata?.subjectCode || ''}\nUK English (colour, favourite, organise, centre). Indian names. Grade-appropriate.${avoidNote}${customNote}${exemplarNote}`,
              JSON.stringify({ id: qId, type: schemaType, cell }),
              GenerationSchema
            );
            // If this position was image-targeted but the model ignored the directive, force-flip.
            if (thisPositionIsImage && !q.needs_image) q.needs_image = true;
            allQs.push({ ...q, cell, type: qType, id: qId });
            setQuestions([...allQs]);
            log(`${qId}: ${qType} ✓`);
          } catch (e: any) {
            log(`${qId}: failed — ${e.message?.slice(0, 40)}`);
          }
        }
      }

      // === Post-generation checks ===

      // Image-ratio floor — ensure the grade-tier visual minimum is met.
      const imagesFlagged = allQs.filter(q => q.needs_image).length;
      const imagesPct = allQs.length > 0 ? (imagesFlagged / allQs.length) * 100 : 0;
      log(`imageRatio=${imagesPct.toFixed(0)}% (${imagesFlagged}/${allQs.length}; target ${imageRatio.minPct}-${imageRatio.maxPct}%)`);
      if (imagesFlagged < targetImageMin && allQs.length > 0) {
        const deficit = targetImageMin - imagesFlagged;
        // Pick questions currently text-only, preferring those whose stems look
        // visualisable (mention shapes, diagrams, objects, count, compare, etc.).
        const visualCueRe = /\b(shape|diagram|figure|picture|image|graph|chart|count|compare|identify|label|parts?|object|organism|circle|triangle|rectangle|square|fraction|map|cycle)\b/i;
        const candidates = allQs
          .filter(q => !q.needs_image)
          .sort((a, b) => (visualCueRe.test(b.stem || '') ? 1 : 0) - (visualCueRe.test(a.stem || '') ? 1 : 0));
        const toFlip = candidates.slice(0, deficit);
        toFlip.forEach(q => { q.needs_image = true; });
        log(`Image floor not met. Flipped ${toFlip.length} text-only questions to needs_image=true.`);
        setQuestions([...allQs]);
      }

      // Scenario-ratio cap (Divyansh) — if > 40% of stems open with a scenario, regenerate the excess
      const scenarioOpeners = allQs.filter(q => SCENARIO_RE.test(q.stem || ''));
      const scenarioRatio = allQs.length > 0 ? scenarioOpeners.length / allQs.length : 0;
      log(`scenarioRatio=${(scenarioRatio * 100).toFixed(0)}% (${scenarioOpeners.length}/${allQs.length})`);
      if (scenarioRatio > 0.4 && allQs.length >= 5) {
        const excess = Math.ceil(scenarioOpeners.length - 0.4 * allQs.length);
        const toFix = scenarioOpeners.slice(0, excess);
        log(`Scenario ratio > 40%. Regenerating ${toFix.length} as non-scenario.`);
        setProgress(`Rebalancing scenario/direct mix...`);
        for (const q of toFix) {
          await handleQuickAction(q, 'regenerate', 'NO scenario opener. Use a direct question or one-sentence statement. Do NOT use character names or "Consider/Imagine/Suppose".');
        }
      }

      // Numerical-diversity check (Divyansh)
      try {
        const { checkNumericalDiversity } = await import('./agents/ruleBasedQA');
        const diagnostics = checkNumericalDiversity(allQs);
        if (diagnostics.length > 0) diagnostics.forEach(d => log(`diversity: ${d}`));
      } catch { /* helper optional */ }

      log(`Done! ${allQs.length} questions generated.`);

      // Auto-generate images for every question flagged needs_image=true that
      // doesn't already have one. The requestQueue throttles concurrency so
      // we can fire all in parallel without blowing the rate limit. Bank
      // navigation only happens AFTER this step, so the SME never lands on a
      // "Look at the image" question with no image.
      const imageNeedQs = allQs.filter((q: any) => q.needs_image && !questionImages[q.id]);
      const finalImages: Record<string, string> = { ...questionImages };
      if (imageNeedQs.length > 0) {
        log(`Auto-generating ${imageNeedQs.length} image(s)…`);
        setProgress(`Generating images (0/${imageNeedQs.length})…`);
        const { generateQuestionImage } = await import('./agents/imageGen');
        let imgDone = 0;
        await Promise.allSettled(imageNeedQs.map(async (q: any) => {
          try {
            const result = await generateQuestionImage(q.stem);
            if (result.status === 'generated' && result.dataUrl) {
              finalImages[q.id] = result.dataUrl;
              log(`${q.id}: image ✓ (${result.sizeKb}KB)`);
            } else {
              log(`${q.id}: image skipped — ${result.reason || 'no visual'}`);
            }
          } catch (e: any) {
            log(`${q.id}: image failed — ${e.message?.slice(0, 40)}`);
          } finally {
            imgDone++;
            setProgress(`Generating images (${imgDone}/${imageNeedQs.length})…`);
          }
        }));
        setQuestionImages(finalImages);
      }

      // Land this batch in the Bank so the user can audit / regen / export.
      bankStore.set({
        mode: 'quick',
        questions: allQs,
        metadata,
        lo,
        skill,
        boardProfile,
        gradeScopeProfile,
        chapterContent: content,
        questionImages: finalImages,
        audit: null,
      });

      setProgress('');
      setStatus('done');

      // Stay in the Workspace view so the SME can iterate per-question
      // (Simplify / Harder / Regen / Edit). Bank navigation is now triggered
      // explicitly by the "Move to Bank · Audit & Export" button in the
      // results header.
      log('Ready for review. Tweak in place, then move to Bank when satisfied.');
    } catch (e: any) {
      log(`Error: ${e.message}`);
      setStatus('done');
    }
  };

  // Per-question action: regenerate / simplify / harder. extraNote appends caller-specific constraints.
  const handleQuickAction = async (q: any, action: 'regenerate' | 'simplify' | 'harder', extraNote?: string) => {
    setActioningId(q.id);
    log(`${q.id}: ${action}...`);
    try {
      const { generateAgentResponse } = await import('./agents/api');
      const { Prompts, getGradeAppropriatenessHint, formatGradeProfile } = await import('./agents/prompts');
      const { GenerationSchema, GradeScopeSchema } = await import('./agents/schemas');

      const actionInstr: Record<string, string> = {
        regenerate: 'Generate a DIFFERENT question testing the same skill. Do not repeat the current stem.',
        simplify: 'Make this question EASIER: simpler vocabulary, more familiar context, one-step reasoning.',
        harder: 'Make this question HARDER: multi-step reasoning, less familiar context, sharper distractors.',
      };

      const typeInstr: Record<string, string> = {
        mcq: 'MCQ with 4 options (A,B,C,D). 1 correct. Wrong options need "why_wrong".',
        fill_blank: subjectKind === 'math'
          ? 'Fill-in-the-blank. Put ##answer## in stem. Answer MUST be a NUMBER only — no words, no units, no variables.'
          : 'Fill-in-the-blank. Put ##answer## in stem.',
        error_analysis: errorAnalysisInstr(),
        match: 'Match. "pairs" array: ["X → Y", ...].',
        arrange: 'Arrange. "items" array in correct order.',
        assertion_reason: 'Assertion–Reason MCQ with standard 4-option pattern.',
        case_based: 'Case-based MCQ. Stem opens with a 2-3 sentence scenario.',
      };

      const schemaType = (q.type === 'assertion_reason' || q.type === 'case_based') ? 'mcq' : q.type;
      const extraNoteLine = extraNote ? `\nEXTRA CONSTRAINT: ${extraNote}` : '';
      // Prefer cached profile from handleGenerate; lazy-infer only if missing.
      let gradeHint = '';
      if (gradeScopeProfile) {
        gradeHint = formatGradeProfile(gradeScopeProfile);
      } else if (metadata?.gradeCode) {
        try {
          const scopeInput = JSON.stringify({
            grade: metadata?.gradeCode,
            subject: metadata?.subjectCode,
            skill, learning_objective: lo,
            chapter_content: content ? content.slice(0, 2500) : '',
          });
          const profile = await generateAgentResponse('Grade Scope Agent', Prompts.GradeScopeAgent, scopeInput, GradeScopeSchema);
          setGradeScopeProfile(profile);
          gradeHint = formatGradeProfile(profile);
        } catch {
          gradeHint = getGradeAppropriatenessHint(metadata?.gradeCode, metadata?.subjectCode);
        }
      }
      const prompt = `${Prompts.GenerationStage1}
Cell ${q.cell}. ${actionInstr[action]}
Type: ${q.type}. ${typeInstr[q.type] || typeInstr.mcq}${gradeHint}
Skill: ${skill}
LO: ${lo}
Grade: ${metadata?.gradeCode || ''} | Subject: ${metadata?.subjectCode || ''}
UK English. Indian names. Grade-appropriate.${extraNoteLine}

CURRENT QUESTION (${action === 'regenerate' ? 'replace with something different' : 'rewrite'}):
${q.stem}`;

      const refined = await generateAgentResponse('Generation Agent', prompt,
        JSON.stringify({ id: q.id, type: schemaType, cell: q.cell }),
        GenerationSchema);

      const updated = { ...refined, cell: q.cell, type: q.type, id: q.id };
      const nextQuestions = questions.map(x => x.id === q.id ? updated : x);
      setQuestions(nextQuestions);
      // Mirror the change into the bank if this batch is already banked (so the
      // Bank tab and its audit stay in sync with Quick's edits).
      if (bankStore.get().mode === 'quick') bankStore.setQuestions(nextQuestions);
      log(`${q.id}: ${action} ✓`);
      // Question changed — stale image must go; regenerate if still needed.
      refreshImageForQuestion(updated);
    } catch (e: any) {
      log(`${q.id}: ${action} failed — ${e.message?.slice(0, 40)}`);
    } finally {
      setActioningId(null);
    }
  };

  const startEdit = (q: any) => {
    setEditingId(q.id);
    setEditDraft(JSON.parse(JSON.stringify(q)));
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = () => {
    if (!editDraft) return;
    const prev = questions.find(x => x.id === editDraft.id);
    const next = questions.map(x => x.id === editDraft.id ? editDraft : x);
    setQuestions(next);
    // Keep the bank store in sync if this batch is already banked, so when
    // the SME clicks "Move to Bank" the latest edits show up.
    if (bankStore.get().mode === 'quick') bankStore.setQuestions(next);
    log(`${editDraft.id}: edited ✓`);
    // If the stem changed, refresh the image (clear + regenerate if still needed)
    if (prev && prev.stem !== editDraft.stem) refreshImageForQuestion(editDraft);
    cancelEdit();
  };

  // Clear stale image and auto-regenerate a fresh one if the question still needs an image.
  const refreshImageForQuestion = async (q: any) => {
    setQuestionImages(prev => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });
    if (!q?.needs_image || !q?.stem) return;
    setGeneratingImageId(q.id);
    try {
      const { generateQuestionImage } = await import('./agents/imageGen');
      const result = await generateQuestionImage(q.stem);
      if (result.status === 'generated' && result.dataUrl) {
        setQuestionImages(prev => ({ ...prev, [q.id]: result.dataUrl! }));
        log(`${q.id}: image refreshed (${result.sizeKb}KB)`);
      } else {
        log(`${q.id}: image skipped — ${result.reason}`);
      }
    } catch {
      log(`${q.id}: image refresh failed`);
    } finally {
      setGeneratingImageId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 h-full flex flex-col max-w-[1400px] mx-auto">
      <header className="mb-4 shrink-0">
        <h2 className="text-3xl font-light tracking-tight mb-1">Quick Generate</h2>
        <p className="col-header">Skip the pipeline. Input → Questions. No gates, no approvals.</p>
      </header>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Input */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
          <div className="tech-border bg-[var(--surface)] p-4 flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Quick Paste (TSV)</label>
              <textarea value={tsvInput} onChange={e => handlePasteTSV(e.target.value)} className="w-full tech-border bg-[#0a0a0a] text-[#e5e5e5] p-2 font-mono text-xs" placeholder="Paste row..." rows={2} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Learning Objective</label>
              <textarea required value={lo} onChange={e => setLo(e.target.value)} className="w-full tech-border bg-[var(--bg)] p-2 text-sm" placeholder="e.g., Classify organisms..." rows={2} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Skill</label>
              <input required value={skill} onChange={e => setSkill(e.target.value)} className="w-full tech-border bg-[var(--bg)] p-2 text-sm" placeholder="e.g., Classify food items" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">
                  Grade <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  required
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className="w-full tech-border bg-[var(--bg)] p-2 text-sm"
                  placeholder="e.g., 4 or G4"
                />
                {gradeTier !== 'unknown' && (
                  <div className="text-[9px] text-[var(--ink-muted)] mt-1">
                    {gradeTier === 'primary' ? 'Primary (1–5)' : gradeTier === 'upper-primary' ? 'Upper primary (6–8)' : 'High (9–12)'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full tech-border bg-[var(--bg)] p-2 text-sm"
                  placeholder="e.g., MATH, SCI, ENG"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Questions</label>
              <input type="number" min="1" max="30" value={count} onChange={e => setCount(e.target.value)} className="w-full tech-border bg-[var(--bg)] p-2 text-sm" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)]">Content (optional)</label>
                <div className="relative">
                  <input type="file" accept=".pdf,.docx,.xlsx" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isParsingFile} />
                  <button type="button" className="px-2 py-0.5 text-[10px] border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1">
                    {isParsingFile ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />} Upload
                  </button>
                </div>
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full tech-border bg-[var(--bg)] p-2 text-sm" placeholder="Paste chapter text..." rows={3} />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!lo || !skill || !grade || status === 'running'}
              title={!grade ? 'Grade is required for grade-appropriate generation.' : undefined}
              className="bg-[var(--ink)] text-[var(--bg)] py-3 font-bold uppercase tracking-wide hover:bg-[var(--accent)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'running' ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Activity size={16} /> Generate All</>}
            </button>
            {!grade && (lo || skill) && (
              <p className="text-[10px] text-[var(--danger)]">Grade required before generation.</p>
            )}
          </div>

          {/* Customization Panel */}
          <div className="tech-border bg-[var(--surface)]">
            <button
              onClick={() => setShowCustomPanel(v => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-left border-b border-[var(--line-dark)] hover:bg-[var(--line)]"
            >
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                <SlidersHorizontal size={12} /> Customization
              </span>
              {showCustomPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showCustomPanel && (
              <div className="p-3 flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Bloom's Levels</label>
                  <div className="flex flex-wrap gap-1">
                    {ALL_BLOOM.map(b => (
                      <button
                        key={b}
                        onClick={() => toggleArrayValue(bloomLevels, b, setBloomLevels)}
                        className={`text-[10px] px-2 py-1 border ${bloomLevels.includes(b) ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--bg)] border-[var(--line-dark)] text-[var(--ink-muted)]'}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-[var(--ink-muted)] mt-1">Matrix cells: R=Remember, U=Understand, A=Apply, AN=Analyze</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Question Types</label>
                  <div className="flex flex-wrap gap-1">
                    {ALL_TYPES.map(t => {
                      const disabled = !typesAllowedBySubject(t);
                      const active = qTypes.includes(t) && !disabled;
                      const title = disabled ? 'Only available for Maths/English subjects' : '';
                      return (
                        <button
                          key={t}
                          title={title}
                          disabled={disabled}
                          onClick={() => !disabled && toggleArrayValue(qTypes, t, setQTypes)}
                          className={`text-[10px] px-2 py-1 border ${active ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--bg)] border-[var(--line-dark)] text-[var(--ink-muted)]'} ${disabled ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                        >
                          {t.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-[var(--ink-muted)] mt-1">
                    FIB &amp; error analysis are OFF by default — enable per batch. Assertion–Reason &amp; Case-based map to specialised MCQs.
                    {subjectKind === 'other' && <> FIB &amp; error analysis are disabled for non-Maths/English.</>}
                    {subjectKind === 'math' && <> Maths FIB answers will be numeric only.</>}
                    {isPhysics && <> Physics error-analysis uses typed error categories (unit, sign, formula, reference-frame).</>}
                  </p>
                  <p className="text-[9px] text-[var(--accent)] mt-1">
                    Recommended by subject: {subjectKind === 'math' ? 'mcq, fill_blank, match, arrange, error_analysis' : subjectKind === 'english' ? 'mcq, match, arrange, fill_blank, case_based' : 'mcq, match, case_based, assertion_reason'}.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Difficulty</label>
                  <div className="flex gap-1">
                    {(['easy', 'medium', 'hard', 'mixed'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 text-[10px] px-2 py-1 border capitalize ${difficulty === d ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--bg)] border-[var(--line-dark)] text-[var(--ink-muted)]'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Board Profile</label>
                  <div className="flex gap-1">
                    {(['cbse', 'state'] as const).map(b => (
                      <button
                        key={b}
                        onClick={() => setBoardProfile(b)}
                        className={`flex-1 text-[10px] px-2 py-1 border uppercase ${boardProfile === b ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--bg)] border-[var(--line-dark)] text-[var(--ink-muted)]'}`}
                      >
                        {b === 'cbse' ? 'CBSE' : 'State Board'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-[var(--ink-muted)] mt-1">
                    State Board (grades 9–10) enforces ≤25-word stems, grade-8 vocabulary ceiling, active voice.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Custom Instructions</label>
                  <textarea
                    value={customNotes}
                    onChange={e => setCustomNotes(e.target.value)}
                    placeholder="e.g., 60% direct recall, avoid trick questions, use cricket examples, include diagrams where possible..."
                    className="w-full tech-border bg-[var(--bg)] p-2 text-xs"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="tech-border bg-[#0a0a0a] text-[#e5e5e5] font-mono text-[10px] p-3 flex-1 overflow-y-auto min-h-[100px]">
            {progress && <div className="text-[#4ade80] mb-1">{progress}</div>}
            {logs.map((l, i) => <div key={i} className="text-[#a3a3a3]">{l}</div>)}
            {logs.length === 0 && <div className="text-[#555]">Logs will appear here...</div>}
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex-1 overflow-y-auto">
          {/* Phase indicator — Stage A.1 skeleton, wired with richer state later */}
          <div className="mb-3">
            <PhaseChips phases={[
              { id: 'brief', label: 'Brief', state: lo && skill ? 'done' : 'active' },
              { id: 'generate', label: 'Generate', state: status === 'running' ? 'active' : status === 'done' ? 'done' : lo && skill ? 'active' : 'pending' },
              { id: 'triage', label: 'Triage', state: status === 'done' && questions.length > 0 ? 'active' : 'pending' },
              { id: 'export', label: 'Export', state: status === 'done' && questions.length > 0 ? 'active' : 'pending' },
            ]} />
          </div>

          {questions.length === 0 && status === 'idle' && (
            <div className="h-full flex items-center justify-center text-[var(--ink-muted)] flex-col gap-4">
              <Activity size={48} className="opacity-20" />
              <p className="text-sm">Fill in the inputs and click Generate All</p>
            </div>
          )}

          {questions.length > 0 && (
            <div className="flex flex-col gap-4">
              <TriageBar total={questions.length} approved={questions.length} />
              <div className="flex justify-between items-center gap-3">
                <div>
                  <div style={{ fontSize: 13, color: 'var(--swiftee-deep)', fontWeight: 600 }}>
                    {questions.length} question{questions.length === 1 ? '' : 's'} generated
                  </div>
                  {status === 'done' && (
                    <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>
                      Tweak each one with Regen / Simplify / Harder / Edit, or move on to audit + export.
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {status === 'done' && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'bank' }))}
                      className="sw-btn sw-btn-primary sw-btn-sm"
                      title="Send this batch to the Bank to run audit, fix flagged questions, and export."
                    >
                      <Activity size={12} /> Move to Bank · Audit & Export
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback & Refine */}
              {status === 'done' && (
                <FeedbackRefiner questions={questions} setQuestions={setQuestions} lo={lo} skill={skill} metadata={metadata} log={log} setStatus={setStatus} setProgress={setProgress} refreshImage={refreshImageForQuestion} />
              )}

              {questions.map((q: any) => {
                const qType = q.type || 'mcq';
                return (
                  <div key={q.id} className={`bg-white rounded-[12px] border border-[var(--border-subtle)] overflow-hidden ${q.needs_image ? 'border-l-4 border-l-[var(--swiftee-purple)]' : ''}`}>
                    <div className={`flex justify-between items-center px-3 py-1.5 border-b border-[var(--border-subtle)] ${q.needs_image ? 'bg-[var(--bg-tint)]' : 'bg-[#FAFAFC]'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono bg-[var(--ink)] text-[var(--bg)] px-1.5 py-0.5">{q.id}</span>
                        <span className="text-[10px] font-mono uppercase px-1 py-0.5 rounded bg-[#E3F2FD] text-[#1565C0] font-bold">{qType.replace('_', ' ')}</span>
                        {q.needs_image && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#1565C0] text-white">IMG</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {q.needs_image && (
                          questionImages[q.id] ? (
                            <span className="text-[10px] text-[var(--success)] flex items-center gap-1"><CheckCircle2 size={10} /> Image Ready</span>
                          ) : (
                            <button
                              onClick={async () => {
                                setGeneratingImageId(q.id);
                                try {
                                  const { generateQuestionImage } = await import('./agents/imageGen');
                                  const result = await generateQuestionImage(q.stem);
                                  if (result.status === 'generated' && result.dataUrl) {
                                    setQuestionImages(prev => ({ ...prev, [q.id]: result.dataUrl! }));
                                    log(`${q.id}: image generated (${result.sizeKb}KB)`);
                                  } else {
                                    log(`${q.id}: image skipped — ${result.reason}`);
                                  }
                                } catch (e: any) {
                                  log(`${q.id}: image failed`);
                                } finally {
                                  setGeneratingImageId(null);
                                }
                              }}
                              disabled={generatingImageId === q.id}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase border border-[#1565C0] text-[#1565C0] hover:bg-white flex items-center gap-1 disabled:opacity-50"
                            >
                              {generatingImageId === q.id ? <><Loader2 size={10} className="animate-spin" /> Generating...</> : <><BrainCircuit size={10} /> Generate Image</>}
                            </button>
                          )
                        )}
                        {!q.needs_image && <span className="text-[9px] text-[var(--ink-muted)]">Text Only</span>}
                        {/* Quick actions */}
                        {editingId !== q.id && (
                          <div className="flex items-center gap-1 pl-2 border-l border-[var(--line-dark)]">
                            <button
                              title="Regenerate (new question, same skill)"
                              onClick={() => handleQuickAction(q, 'regenerate')}
                              disabled={actioningId === q.id}
                              className="px-1.5 py-0.5 text-[10px] border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1 disabled:opacity-50"
                            >
                              {actioningId === q.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} Regen
                            </button>
                            <button
                              title="Simplify (make easier)"
                              onClick={() => handleQuickAction(q, 'simplify')}
                              disabled={actioningId === q.id}
                              className="px-1.5 py-0.5 text-[10px] border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1 disabled:opacity-50"
                            >
                              <Sparkles size={10} /> Simplify
                            </button>
                            <button
                              title="Make harder"
                              onClick={() => handleQuickAction(q, 'harder')}
                              disabled={actioningId === q.id}
                              className="px-1.5 py-0.5 text-[10px] border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1 disabled:opacity-50"
                            >
                              <Zap size={10} /> Harder
                            </button>
                            <button
                              title="Inline edit"
                              onClick={() => startEdit(q)}
                              className="px-1.5 py-0.5 text-[10px] border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1"
                            >
                              <Edit3 size={10} /> Edit
                            </button>
                          </div>
                        )}
                        {editingId === q.id && (
                          <div className="flex items-center gap-1 pl-2 border-l border-[var(--line-dark)]">
                            <button
                              onClick={saveEdit}
                              className="px-1.5 py-0.5 text-[10px] bg-[var(--success)] text-white flex items-center gap-1"
                            >
                              <Save size={10} /> Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-1.5 py-0.5 text-[10px] border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1"
                            >
                              <X size={10} /> Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      {editingId === q.id ? (
                        <>
                          {questionImages[q.id] && (
                            <div className="mb-2 tech-border bg-white p-2 flex justify-center">
                              <img src={questionImages[q.id]} alt="Question" className="max-w-full max-h-48 object-contain" />
                            </div>
                          )}
                          <textarea
                            value={editDraft?.stem || ''}
                            onChange={e => setEditDraft({ ...editDraft, stem: e.target.value })}
                            className="w-full tech-border bg-white p-2 text-sm mb-2"
                            rows={3}
                          />

                          {qType === 'mcq' && editDraft?.options?.length > 0 && (
                            <div className="flex flex-col gap-1 mb-2">
                              {editDraft.options.map((opt: any, i: number) => {
                                const isCorrect = opt.correct || opt.is_correct;
                                return (
                                  <div key={i} className={`text-sm p-2 tech-border flex items-start gap-1.5 ${isCorrect ? 'border-2 border-[var(--success)] bg-[#E8F5E9] shadow-sm' : 'bg-white'}`}>
                                    <span className={`font-bold text-xs shrink-0 ${isCorrect ? 'text-[var(--success)]' : ''}`}>
                                      {opt.label || String.fromCharCode(65 + i)}{isCorrect ? ' ✓ CORRECT' : '.'}
                                    </span>
                                    <div className="flex-1 flex items-center gap-2">
                                      <input
                                        value={opt.text}
                                        onChange={e => {
                                          const newOpts = [...editDraft.options];
                                          newOpts[i] = { ...newOpts[i], text: e.target.value };
                                          setEditDraft({ ...editDraft, options: newOpts });
                                        }}
                                        className="flex-1 bg-transparent border-b border-[var(--line-dark)] text-sm p-1 focus:outline-none focus:border-[var(--accent)]"
                                      />
                                      <label className="text-[10px] flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="radio"
                                          checked={!!isCorrect}
                                          onChange={() => {
                                            const newOpts = editDraft.options.map((o: any, j: number) => ({ ...o, correct: j === i, is_correct: j === i }));
                                            setEditDraft({ ...editDraft, options: newOpts });
                                          }}
                                        />
                                        correct
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {qType === 'fill_blank' && (
                            <input
                              value={editDraft?.answer || ''}
                              onChange={e => setEditDraft({ ...editDraft, answer: e.target.value })}
                              className="w-full tech-border bg-[#E8F5E9] border-2 border-[var(--success)] p-2 text-sm font-mono mb-2"
                            />
                          )}
                        </>
                      ) : (
                        <QuestionBody q={q} qType={qType} image={questionImages[q.id]} density="compact" Latex={LatexText} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};


const LoginGate = ({ onLogin }: { onLogin: () => void }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleLogin = async () => {
    if (!token.trim()) return;
    setChecking(true);
    setError('');
    try {
      // Test the token with a simple request
      const { setAuthToken } = await import('./agents/api');
      setAuthToken(token.trim());
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.trim()}` },
        body: JSON.stringify({ action: 'generate', model: 'gemini-2.5-flash', userPayload: '"ping"', temperature: 0 }),
      });
      if (res.status === 401 || res.status === 403) {
        setError('Invalid access token.');
        const { clearAuthToken } = await import('./agents/api');
        clearAuthToken();
      } else {
        onLogin();
      }
    } catch {
      // If the endpoint doesn't exist (local dev), allow anyway
      onLogin();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center">
      <div className="max-w-sm w-full p-8">
        <div className="flex items-center gap-3 mb-8">
          <BrainCircuit className="text-[var(--accent)]" size={32} />
          <h1 className="font-bold text-xl uppercase tracking-tight">CG-Matrix Gen</h1>
        </div>
        <div className="tech-border bg-[var(--surface)] p-6">
          <label className="block col-header mb-2">Access Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter your access token..."
            className="w-full tech-border bg-[var(--bg)] p-3 font-mono text-sm focus:outline-none focus:border-[var(--accent)] mb-4"
            autoFocus
          />
          {error && <p className="text-sm text-[var(--danger)] mb-3">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={!token.trim() || checking}
            className="w-full bg-[var(--ink)] text-[var(--bg)] py-3 font-bold uppercase tracking-wide hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
          >
            {checking ? 'Verifying...' : 'Enter'}
          </button>
        </div>
        <p className="text-xs text-[var(--ink-muted)] mt-4 text-center">Contact your admin for the access token.</p>
      </div>
    </div>
  );
};

// ===== GENERATE (unified shell: Quick | Pipeline) =====
// Single tab wraps both generation modes. Mode persists in sessionStorage.
// Stage A.1: mode toggle only. Brief state is per-mode (lifting comes in Stage A.3).
const GenerateView = () => {
  const [mode, setMode] = useState<GenerateMode>(() => {
    const saved = sessionStorage.getItem('generateMode');
    return (saved === 'quick' || saved === 'pipeline') ? saved : 'pipeline';
  });

  const switchMode = (next: GenerateMode) => {
    setMode(next);
    sessionStorage.setItem('generateMode', next);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mode toggle */}
      <div className="shrink-0 px-6 pt-4 pb-0 flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase text-[var(--ink-muted)]">Mode</span>
        <div className="inline-flex border border-[var(--line-dark)] bg-[var(--surface)]">
          <button
            onClick={() => switchMode('quick')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${mode === 'quick' ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:bg-[var(--line)] text-[var(--ink-muted)]'}`}
          >
            <Activity size={12} /> Quick
          </button>
          <button
            onClick={() => switchMode('pipeline')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${mode === 'pipeline' ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:bg-[var(--line)] text-[var(--ink-muted)]'}`}
          >
            <PlayCircle size={12} /> Pipeline
          </button>
        </div>
        <span className="text-[10px] text-[var(--ink-muted)]">
          {mode === 'quick' ? 'One-click generation, no gates.' : 'Multi-stage with agent approvals.'}
        </span>
      </div>
      {/* Active mode body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'quick' && <QuickGenerateView key="quick" />}
          {mode === 'pipeline' && <PipelineRunnerView key="pipeline" />}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Bank route wrapper — threads the app-level LatexText renderer and a single
// export handler into BankView so that component stays independent of both.
const BankRoute = () => {
  const bank = useBank();
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const onExport = async () => {
    if (bank.questions.length === 0) return;
    const { exportToExcelAndZip } = await import('./utils/exporter');
    await exportToExcelAndZip({
      questions: bank.questions,
      questionImages: bank.questionImages,
      metadata: {
        lo: bank.lo, skill: bank.skill, count: bank.questions.length, construct: bank.skill,
        grade: bank.metadata?.gradeCode,
        subject: bank.metadata?.subjectCode,
        skillCode: bank.metadata?.skillCode,
      },
      qaResults: [],
    });
  };

  /** Regenerate a single question using the audit flags as an EXTRA CONSTRAINT.
   * Works for both Quick-mode and Pipeline-mode batches since it goes straight
   * to the generator with the current bank state. After regen, re-runs
   * runFullAudit on just that question and merges the updated report back in. */
  const regenerateOne = async (q: any, reportOrFlags: any) => {
    const qId = q.id || q.question_id;
    setBusyQuestionId(qId);
    try {
      const [{ generateAgentResponse }, promptsMod, { GenerationSchema }, { runFullAudit, auditFlagsToExtraNote }] = await Promise.all([
        import('./agents/api'),
        import('./agents/prompts'),
        import('./agents/schemas'),
        import('./agents/audit'),
      ]);
      const Prompts = promptsMod.Prompts;
      const formatGradeProfile = promptsMod.formatGradeProfile;

      const extraNote = auditFlagsToExtraNote(reportOrFlags);
      const gradeHint = bank.gradeScopeProfile ? formatGradeProfile(bank.gradeScopeProfile) : '';
      const qType = q.type || 'mcq';
      const schemaType = (qType === 'assertion_reason' || qType === 'case_based') ? 'mcq' : qType;

      const typeInstr: Record<string, string> =  {
        mcq: 'MCQ with 4 options (A,B,C,D). 1 correct. Wrong options need "why_wrong".',
        fill_blank: 'Fill-in-the-blank. Put ##answer## in stem.',
        error_analysis: 'Error analysis. "steps" array (4 steps). 1-2 wrong with "fix".',
        match: 'Match. "pairs" array: ["X → Y", ...].',
        arrange: 'Arrange. "items" array in correct order.',
        assertion_reason: 'Assertion–Reason MCQ with standard 4-option pattern.',
        case_based: 'Case-based MCQ. Stem opens with a 2-3 sentence scenario.',
        true_false: 'True/False question with a clear factual statement.',
        one_word: 'One-word / short-answer question.',
      };

      const prompt = `${Prompts.GenerationStage1}
Cell ${q.cell || q.cg_cell}. Regenerate this question to FIX the audit findings below. Preserve the topic and skill.
Type: ${qType}. ${typeInstr[qType] || typeInstr.mcq}${gradeHint}
Skill: ${bank.skill}
LO: ${bank.lo}
Grade: ${bank.metadata?.gradeCode || ''} | Subject: ${bank.metadata?.subjectCode || ''}
UK English. Indian names. Grade-appropriate.
${extraNote}

CURRENT QUESTION:
${q.stem}`;

      const refined: any = await generateAgentResponse('Bank Regen',
        prompt,
        JSON.stringify({ id: qId, type: schemaType, cell: q.cell || q.cg_cell }),
        GenerationSchema);
      const updated = { ...refined, cell: q.cell || q.cg_cell, type: qType, id: qId };

      // Write back into the bank.
      const nextQuestions = bank.questions.map(x => (x.id || x.question_id) === qId ? updated : x);
      bankStore.setQuestions(nextQuestions);

      // Re-audit just this question and merge.
      try {
        const single = await runFullAudit([updated], {
          lo: bank.lo,
          skill: bank.skill,
          metadata: bank.metadata,
          profile: bank.gradeScopeProfile,
          chapterContent: bank.chapterContent,
          boardProfile: bank.boardProfile,
        });
        if (bank.audit) {
          const merged = {
            perQuestion: bank.audit.perQuestion.map(r => r.questionId === qId ? (single.perQuestion[0] || r) : r),
            setFlags: single.setFlags, // set-level flags are set-wide; recompute from just this one isn't ideal, but keeps UI fresh
          };
          bankStore.setAudit(merged);
        }
      } catch {
        /* audit merge optional */
      }
    } finally {
      setBusyQuestionId(null);
    }
  };

  const bulkRegen = async (sev: 'fail' | 'warn') => {
    if (!bank.audit) return;
    const targets = bank.audit.perQuestion.filter(r => r.severity === sev);
    if (targets.length === 0) return;
    setBulkBusy(true);
    try {
      for (const r of targets) {
        const q = bankStore.get().questions.find(x => (x.id || x.question_id) === r.questionId);
        if (!q) continue;
        await regenerateOne(q, r);
      }
      // After bulk: re-run the full audit so set-level flags and category bars recompute accurately.
      try {
        const { runFullAudit } = await import('./agents/audit');
        const fresh = await runFullAudit(bankStore.get().questions, {
          lo: bank.lo,
          skill: bank.skill,
          metadata: bank.metadata,
          profile: bank.gradeScopeProfile,
          chapterContent: bank.chapterContent,
          boardProfile: bank.boardProfile,
        });
        bankStore.setAudit(fresh);
      } catch { /* optional */ }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <BankView
      Latex={LatexText}
      onExport={onExport}
      onRegenerateWithFeedback={regenerateOne}
      onBulkRegen={bulkRegen}
      busyQuestionId={busyQuestionId}
      bulkBusy={bulkBusy}
    />
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [authenticated, setAuthenticated] = useState(() => {
    // Auto-login if token already in session
    return !!sessionStorage.getItem('appAccessToken');
  });

  // Cross-view navigation: any view can dispatch
  // window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'bank' }))
  // to switch tabs without prop-drilling setActiveTab everywhere.
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as Tab | undefined;
      if (tab === 'dashboard' || tab === 'generate' || tab === 'bank') {
        setActiveTab(tab);
      }
    };
    window.addEventListener('app:navigate', handler);
    return () => window.removeEventListener('app:navigate', handler);
  }, []);

  if (!authenticated) {
    return <LoginGate onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardView key="dashboard" />}
          {activeTab === 'generate' && <GenerateView key="generate" />}
          {activeTab === 'bank' && <BankRoute key="bank" />}
        </AnimatePresence>
      </main>
    </div>
  );
}
