/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Network,
  GitMerge,
  Users,
  Settings,
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
  FileDown
} from 'lucide-react';

import { AgentOrchestrator } from './agents/orchestrator';
import { parseUploadedFile } from './utils/fileParser';

// --- Types ---
type Tab = 'dashboard' | 'architecture' | 'state-machine' | 'raci' | 'pipeline' | 'config';

// --- Components ---

const TopNav = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => {
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'pipeline', label: 'Run Pipeline', icon: <PlayCircle size={16} /> },
    { id: 'architecture', label: 'Architecture', icon: <Network size={16} /> },
    { id: 'state-machine', label: 'State Machine', icon: <GitMerge size={16} /> },
    { id: 'raci', label: 'RACI Matrix', icon: <Users size={16} /> },
  ];

  return (
    <div className="w-full border-b border-[var(--line-dark)] bg-[var(--surface)] flex items-center justify-between px-6 shrink-0 h-16">
      <div className="flex items-center gap-3">
        <BrainCircuit className="text-[var(--accent)]" size={24} />
        <h1 className="font-sans font-bold text-lg leading-none tracking-tight uppercase">
          CG-Matrix Gen System
        </h1>
      </div>
      
      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md ${
              activeTab === item.id 
                ? 'bg-[var(--ink)] text-[var(--bg)]' 
                : 'hover:bg-[var(--line)] text-[var(--ink)]'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'config' ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:bg-[var(--line)]'}`}
        >
          <Settings size={16} />
          Config
        </button>
      </div>
    </div>
  );
};

// ... (Keep existing DashboardView, ArchitectureView, StateMachineView, RaciView)
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

const ArchitectureView = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 max-w-7xl mx-auto h-full flex flex-col"
    >
      <header className="mb-8">
        <h2 className="text-4xl font-light tracking-tight mb-2">System Architecture</h2>
        <p className="col-header">Three-Plane Multi-Agent Topology</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Plane */}
        <div className="tech-border bg-[var(--surface)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-[var(--line-dark)] pb-4">
            <Database size={20} />
            <h3 className="font-bold uppercase tracking-wide">1. Production Plane</h3>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {['Intake Agent', 'Construct Agent', 'CG Mapper Agent', 'Subskill Agent', 'Misconception Agent', 'Distractor Rule Agent', 'Item Blueprint Agent', 'Generation Agents'].map((agent, i) => (
              <div key={i} className="tech-border p-3 bg-[var(--bg)] flex items-center justify-between group hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors">
                <span className="font-mono text-sm">{agent}</span>
                <ArrowRight size={14} className="opacity-30 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Quality Plane */}
        <div className="tech-border bg-[var(--surface)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-[var(--line-dark)] pb-4">
            <ShieldCheck size={20} />
            <h3 className="font-bold uppercase tracking-wide">2. Quality Plane</h3>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {['Structural QA', 'Cognitive QA', 'Misconception QA', 'Developmental QA', 'Bias & Language QA', 'Set Balancing Agent'].map((agent, i) => (
              <div key={i} className="tech-border p-3 bg-[#FFF3E0] border-[#EF6C00] text-[#E65100] flex items-center justify-between">
                <span className="font-mono text-sm">{agent}</span>
                <CheckCircle2 size={14} className="opacity-50" />
              </div>
            ))}
          </div>
        </div>

        {/* Governance Plane */}
        <div className="tech-border bg-[var(--surface)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-[var(--line-dark)] pb-4">
            <Users size={20} />
            <h3 className="font-bold uppercase tracking-wide">3. Governance Plane</h3>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="tech-border p-4 bg-[#FFEbee] border-[#c62828] text-[#b71c1c]">
              <div className="font-bold text-sm mb-1">Gate 1: Construct Approval</div>
              <div className="text-xs opacity-80">Human SME required</div>
            </div>
            <div className="tech-border p-4 bg-[#FFEbee] border-[#c62828] text-[#b71c1c]">
              <div className="font-bold text-sm mb-1">Gate 2: Misconception Approval</div>
              <div className="text-xs opacity-80">Human SME required</div>
            </div>
            <div className="tech-border p-4 bg-[#FFEbee] border-[#c62828] text-[#b71c1c]">
              <div className="font-bold text-sm mb-1">Gate 3: Final Set Approval</div>
              <div className="text-xs opacity-80">Human SME required</div>
            </div>
            <div className="mt-auto tech-border p-4 bg-[#E8F5E9] border-[#2E7D32] text-[#1B5E20]">
              <div className="font-bold text-sm mb-1">Calibration Agent / Pilot</div>
              <div className="text-xs opacity-80">Data-driven refinement</div>
            </div>
            <div className="tech-border p-4 bg-[#E8F5E9] border-[#2E7D32] text-[#1B5E20]">
              <div className="font-bold text-sm mb-1">Operational Item Bank</div>
              <div className="text-xs opacity-80">Version controlled storage</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StateMachineView = () => {
  const states = [
    { id: 'S0', name: 'Task Received', status: 'done' },
    { id: 'S1', name: 'Construct Defined', status: 'done' },
    { id: 'S2', name: 'CG Mapped', status: 'done' },
    { id: 'S3', name: 'Misconceptions Approved', status: 'done' },
    { id: 'S4', name: 'Blueprint Approved', status: 'done' },
    { id: 'S5', name: 'Draft Generated', status: 'active' },
    { id: 'S6', name: 'Local QA Passed', status: 'pending' },
    { id: 'S7', name: 'Set QA Passed', status: 'pending' },
    { id: 'S8', name: 'Human Review Passed', status: 'pending' },
    { id: 'S9', name: 'Pilot Ready', status: 'pending' },
    { id: 'S10', name: 'Calibrated', status: 'pending' },
    { id: 'S11', name: 'Banked', status: 'pending' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 max-w-5xl mx-auto"
    >
      <header className="mb-12">
        <h2 className="text-4xl font-light tracking-tight mb-2">Item State Machine</h2>
        <p className="col-header">Strict linear lifecycle. Items cannot skip states.</p>
      </header>

      <div className="relative">
        {/* Connecting Line */}
        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-[var(--line-dark)] opacity-20"></div>
        
        <div className="flex flex-col gap-6 relative z-10">
          {states.map((state, i) => (
            <div key={state.id} className="flex items-center gap-6 group">
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center bg-[var(--bg)] transition-colors ${
                state.status === 'done' ? 'border-[var(--ink)] text-[var(--ink)]' :
                state.status === 'active' ? 'border-[var(--accent)] text-[var(--accent)] shadow-[0_0_15px_rgba(242,125,38,0.3)]' :
                'border-[var(--line)] text-[var(--line-dark)] opacity-40'
              }`}>
                <span className="font-mono text-sm font-bold">{state.id}</span>
              </div>
              
              <div className={`flex-1 tech-border p-4 transition-colors ${
                state.status === 'active' ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--surface)] hover:bg-[var(--line)]'
              } ${state.status === 'pending' ? 'opacity-50' : ''}`}>
                <h4 className="font-bold text-lg">{state.name}</h4>
                {state.status === 'active' && (
                  <div className="mt-2 text-sm font-mono opacity-80 flex items-center gap-2">
                    <Activity size={14} className="animate-pulse" /> Processing via Generation Agents...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const RaciView = () => {
  const raciData = [
    { phase: '1. Construct & Subskill Design', ai: 'R', sme: 'A', lead: 'I', ed: '-', ops: '-' },
    { phase: '2. Misconception & Distractor Rules', ai: 'R', sme: 'C', lead: 'A', ed: '-', ops: '-' },
    { phase: '3. Item Generation (Drafting)', ai: 'R', sme: 'C', lead: 'I', ed: '-', ops: '-' },
    { phase: '4. Independent QA Validation', ai: 'R', sme: 'C', lead: 'A', ed: 'C', ops: '-' },
    { phase: '5. Bias & Sensitivity Review', ai: 'R', sme: 'C', lead: 'A', ed: 'C', ops: '-' },
    { phase: '6. Final Set Approval', ai: '-', sme: 'R', lead: 'A', ed: 'I', ops: '-' },
    { phase: '7. Pilot Data & Calibration', ai: 'R', sme: 'C', lead: 'A', ed: '-', ops: 'C' },
    { phase: '8. Banking & Version Control', ai: 'R', sme: '-', lead: 'A', ed: '-', ops: 'R' },
  ];

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'R': return 'bg-[var(--ink)] text-[var(--bg)] font-bold';
      case 'A': return 'bg-[var(--accent)] text-white font-bold';
      case 'C': return 'bg-[var(--line)] text-[var(--ink)]';
      case 'I': return 'bg-transparent text-[var(--ink-muted)]';
      default: return 'text-[var(--line)]';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 max-w-6xl mx-auto"
    >
      <header className="mb-8">
        <h2 className="text-4xl font-light tracking-tight mb-2">RACI Responsibility Matrix</h2>
        <p className="col-header">Clear delineation of ownership across the production cycle.</p>
      </header>

      <div className="tech-border bg-[var(--surface)] overflow-hidden">
        <div className="grid grid-cols-6 border-b border-[var(--line-dark)] bg-[var(--bg)]">
          <div className="p-4 col-header">Production Phase</div>
          <div className="p-4 col-header text-center">AI System / Agents</div>
          <div className="p-4 col-header text-center">Human SME</div>
          <div className="p-4 col-header text-center">Assessment Lead</div>
          <div className="p-4 col-header text-center">Editorial</div>
          <div className="p-4 col-header text-center">Ops / Data</div>
        </div>
        
        {raciData.map((row, i) => (
          <div key={i} className="grid grid-cols-6 border-b border-[var(--line-dark)] last:border-b-0 hover:bg-[var(--bg)] transition-colors">
            <div className="p-4 font-medium flex items-center">{row.phase}</div>
            {[row.ai, row.sme, row.lead, row.ed, row.ops].map((role, j) => (
              <div key={j} className="p-4 flex items-center justify-center border-l border-[var(--line-dark)]">
                <div className={`w-8 h-8 flex items-center justify-center rounded-sm text-sm ${getRoleColor(role)}`}>
                  {role}
                </div>
              </div>
            ))}
          </div>
        ))}
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
  const [count, setCount] = useState('15');
  const [chapterContent, setChapterContent] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [tsvInput, setTsvInput] = useState('');
  const [parsedMetadata, setParsedMetadata] = useState<any>(null);

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
                    match_pairs: q.pairs ? q.pairs.map((p: string, i: number) => {
                        const [l, r] = p.split(' → ');
                        return { left: l || p, right: r || '' };
                    }) : q.match_pairs || [],
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

    // Gate 4+ (step 9+): proceed with post-generation steps
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

      const prompt = `${Prompts.GenerationAgent}
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
        Prompts.GenerationAgent,
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-3xl mx-auto">
        <header className="mb-8">
          <h2 className="text-4xl font-light tracking-tight mb-2">New Generation Task</h2>
          <p className="col-header">Initialize the multi-agent pipeline</p>
        </header>

        <form onSubmit={handleStart} className="tech-border bg-[var(--surface)] p-8 flex flex-col gap-6">
          <div>
            <label className="block col-header mb-2">Quick Paste (TSV Row)</label>
            <textarea 
              value={tsvInput}
              onChange={handlePasteTSV}
              className="w-full tech-border bg-[#0a0a0a] text-[#e5e5e5] p-3 font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
              placeholder="Paste Excel/Sheets row here to auto-fill..."
              rows={2}
            />
          </div>
          
          <div className="border-t border-[var(--line-dark)] pt-6">
            <label className="block col-header mb-2">Learning Objective (LO)</label>
            <textarea 
              required
              value={lo}
              onChange={(e) => setLo(e.target.value)}
              className="w-full tech-border bg-[var(--bg)] p-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="e.g., Understand and apply the Pythagorean theorem..."
              rows={3}
            />
          </div>
          <div>
            <label className="block col-header mb-2">Target Skill</label>
            <input 
              required
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="w-full tech-border bg-[var(--bg)] p-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="e.g., Calculate hypotenuse"
            />
          </div>
          {/* Content Sources — PRIMARY material for question generation */}
          <div className="border-t border-[var(--line-dark)] pt-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="block col-header">Content Sources (Primary Material)</label>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">Questions will be generated from these sources first. Add chapter PDFs, YouTube explainers, or website links.</p>
              </div>
            </div>

            {/* Add URL input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                placeholder="Paste YouTube link or website URL..."
                className="flex-1 tech-border bg-[var(--bg)] p-2.5 font-sans text-sm focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!newUrl.trim()}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--bg)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--accent)] transition-colors disabled:opacity-30 flex items-center gap-2"
              >
                <Globe size={14} /> Add Link
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
                <button type="button" className={`px-4 py-2 border border-[var(--line-dark)] hover:bg-[var(--line)] bg-[var(--bg)] text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${isParsingFile ? 'opacity-50' : ''}`}>
                  {isParsingFile ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Upload Files
                </button>
              </div>
            </div>

            {/* Content source list */}
            {contentSources.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-3">
                {contentSources.map(src => (
                  <div key={src.id} className={`flex items-center gap-2 p-2 tech-border text-sm ${
                    src.status === 'ready' ? 'bg-[#E8F5E9] border-[var(--success)]' :
                    src.status === 'extracting' ? 'bg-[var(--surface)]' :
                    src.status === 'failed' ? 'bg-[#FFEBEE] border-[var(--danger)]' : 'bg-[var(--surface)]'
                  }`}>
                    {src.type === 'youtube' && <Youtube size={14} className="text-[#FF0000] shrink-0" />}
                    {src.type === 'website' && <Globe size={14} className="text-[#1976D2] shrink-0" />}
                    {src.type === 'file' && <FileText size={14} className="text-[var(--ink-muted)] shrink-0" />}
                    <span className="flex-1 truncate font-mono text-xs">{src.name}</span>
                    {src.url && <span className="text-[10px] text-[var(--accent)] truncate max-w-xs">{src.url}</span>}
                    {src.status === 'extracting' && <Loader2 size={12} className="animate-spin text-[var(--accent)] shrink-0" />}
                    {src.status === 'ready' && <CheckCircle2 size={12} className="text-[var(--success)] shrink-0" />}
                    {src.status === 'failed' && <AlertCircle size={12} className="text-[var(--danger)] shrink-0" />}
                    <button type="button" onClick={() => removeContentSource(src.id)} className="p-0.5 hover:text-[var(--danger)] text-[var(--ink-muted)] shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback text area for pasting content directly */}
            <textarea
              value={chapterContent}
              onChange={(e) => setChapterContent(e.target.value)}
              className="w-full tech-border bg-[var(--bg)] p-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Or paste chapter text / syllabus content directly here..."
              rows={3}
            />
            {contentSources.filter(s => s.status === 'ready').length > 0 && (
              <div className="mt-2 text-xs font-mono text-[var(--success)] flex items-center gap-1">
                <CheckCircle2 size={12} />
                {contentSources.filter(s => s.status === 'ready').length} source(s) loaded — questions will be generated from this content
              </div>
            )}
          </div>
          <div>
            <label className="block col-header mb-2">Number of Questions (15-22)</label>
            <input 
              required
              type="number"
              min="1" max="50"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full tech-border bg-[var(--bg)] p-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button type="submit" className="bg-[var(--ink)] text-[var(--bg)] py-4 font-bold tracking-wide uppercase hover:bg-[var(--accent)] transition-colors mt-4">
            Initialize Pipeline
          </button>
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
          
          {/* Terminal Logs (Top) */}
          <div className="h-32 shrink-0 flex flex-col tech-border bg-[#0a0a0a] text-[#e5e5e5] font-mono text-xs overflow-hidden">
            <div className="bg-[#1a1a1a] p-2 border-b border-[#333] flex items-center justify-between text-[#888]">
              <div className="flex items-center gap-2">
                <Terminal size={12} />
                orchestrator.log
              </div>
              <div className="text-[#4ade80] flex items-center gap-2">
                {status === 'running' && <Loader2 size={12} className="animate-spin" />}
                {PIPELINE_STATES[currentStep]?.name || 'Initializing...'}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[#4ade80] shrink-0">[{log.time}]</span>
                  <span className="text-[#60a5fa] shrink-0 w-48 truncate">{log.agent}</span>
                  <span className="text-[#a3a3a3]">{log.action}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
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
                  <h3 className="text-lg font-bold mb-4 border-b border-[var(--line-dark)] pb-2">1. Construct & Subskills</h3>
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
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleApprove}
                        disabled={selectedSubskills.filter(Boolean).length === 0}
                        className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2 text-sm font-bold uppercase tracking-wide hover:bg-[var(--success)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckSquare size={16} /> Approve {selectedSubskills.filter(Boolean).length} Subskills & Continue
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Gate 2: CG Matrix & Misconceptions */}
              {currentStep >= 5 && (
                <div className={`mb-8 transition-opacity ${currentStep > 5 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--line-dark)] pb-2">
                    <h3 className="text-lg font-bold">3. Custom Hess Matrix & Misconceptions</h3>
                    {currentStep === 5 && (
                      <button onClick={() => handleGoBack(4)} className="px-2 py-1 text-[10px] font-mono uppercase border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1">
                        <ArrowRight size={10} className="rotate-180" /> Back to Content Scope
                      </button>
                    )}
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
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={handleApprove} 
                        disabled={totalPlanned !== parseInt(count)}
                        className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2 text-sm font-bold uppercase tracking-wide hover:bg-[var(--success)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckSquare size={16} /> Approve Hess Matrix & Generate Questions
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Gate 2: Content Scope Approval */}
              {(currentStep >= 4 || (currentStep >= 3 && contentScope.length > 0)) && contentScope.length > 0 && (
                <div className={`mb-8 transition-all ${currentStep > 4 ? 'opacity-40 pointer-events-none max-h-24 overflow-hidden' : ''}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--line-dark)] pb-2">
                    <h3 className="text-lg font-bold">2. Content Scope — Knowledge Points for Question Generation</h3>
                    {currentStep === 4 && (
                      <button onClick={() => handleGoBack(2)} className="px-2 py-1 text-[10px] font-mono uppercase border border-[var(--line-dark)] hover:bg-[var(--line)] flex items-center gap-1">
                        <ArrowRight size={10} className="rotate-180" /> Back to Subskills
                      </button>
                    )}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-[var(--ink-muted)]">{selectedScope.filter(Boolean).length}/{contentScope.length} selected</span>
                      <button
                        type="button"
                        onClick={() => setSelectedScope(contentScope.map(() => true))}
                        className="px-2 py-0.5 border border-[var(--line-dark)] hover:bg-[var(--line)] text-[10px] uppercase"
                      >Select All</button>
                      <button
                        type="button"
                        onClick={() => setSelectedScope(contentScope.map((k: any) => k.scope_type === 'core'))}
                        className="px-2 py-0.5 border border-[var(--line-dark)] hover:bg-[var(--line)] text-[10px] uppercase"
                      >Core Only</button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--ink-muted)] mb-4">
                    Review the knowledge points extracted from your content. Only selected items will be used for question generation. Deselect anything out of scope or grade-inappropriate.
                  </p>

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
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleApprove}
                        disabled={selectedScope.filter(Boolean).length === 0}
                        className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2 text-sm font-bold uppercase tracking-wide hover:bg-[var(--success)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckSquare size={16} /> Approve {selectedScope.filter(Boolean).length} Knowledge Points & Build Hess Matrix
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cell-by-cell generation review */}
              {currentStep === 7 && currentCellData && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--line-dark)] pb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">
                        Cell {currentCellData.index + 1}/{cellQueue.length}: {currentCellData.cell}
                      </h3>
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-white`}>
                        {cellData[currentCellData.cell]?.definition?.slice(0, 60) || currentCellData.cell}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)]">
                      <span>{currentCellData.questions.length} items</span>
                      {questions.length > 0 && (
                        <span className="text-[var(--success)]">({questions.length} approved so far)</span>
                      )}
                    </div>
                  </div>

                  {/* Cell progress bar */}
                  <div className="flex gap-1 mb-4">
                    {cellQueue.map((cq, i) => (
                      <div
                        key={cq.cell}
                        className={`flex-1 h-2 rounded-full transition-colors ${
                          i < currentCellData.index ? 'bg-[var(--success)]' :
                          i === currentCellData.index ? 'bg-[var(--accent)]' :
                          'bg-[var(--line)]'
                        }`}
                        title={`${cq.cell}: ${cq.count} questions`}
                      />
                    ))}
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
                            <div key={qId} className={`tech-border bg-[var(--bg)] ${q.needs_image ? 'border-l-4 border-l-[#1565C0]' : ''} ${qa && !qa.pass ? 'border-[var(--warning)]' : ''}`}>
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
                                {/* Question Stem — copy-pasteable */}
                                <div className="mb-3">
                                  <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Question Stem</label>
                                  <div className="tech-border bg-white p-3 text-sm select-all cursor-text min-h-[40px]">{q.stem}</div>
                                </div>

                                {/* Stem image if generated */}
                                {questionImages[qId] && (
                                  <div className="mb-3 tech-border bg-white p-2 flex justify-center">
                                    <img src={questionImages[qId]} alt="Question" className="max-w-full max-h-48 object-contain" />
                                  </div>
                                )}

                                {/* MCQ Options */}
                                {qType === 'mcq' && q.options?.length > 0 && (
                                  <div className="mb-3">
                                    <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Options</label>
                                    <div className="flex flex-col gap-1.5">
                                      {q.options.map((opt: any, i: number) => {
                                        const isCorrect = opt.correct || opt.is_correct;
                                        const label = opt.label || String.fromCharCode(65 + i);
                                        return (
                                          <div key={i} className={`flex items-start gap-2 tech-border p-2.5 ${isCorrect ? 'border-[var(--success)] bg-[#E8F5E9]' : 'bg-white'}`}>
                                            <span className={`font-bold text-sm shrink-0 ${isCorrect ? 'text-[var(--success)]' : ''}`}>
                                              {label}{isCorrect ? ' ✓' : '.'}
                                            </span>
                                            <span className="text-sm select-all cursor-text flex-1">{opt.text}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Fill in the Blank */}
                                {qType === 'fill_blank' && (
                                  <div className="mb-3">
                                    <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Answer</label>
                                    <div className="tech-border bg-[#E8F5E9] border-[var(--success)] p-2.5 text-sm font-mono select-all cursor-text">{q.answer || q.correct_answer}</div>
                                  </div>
                                )}

                                {/* Error Analysis Steps */}
                                {qType === 'error_analysis' && q.steps?.length > 0 && (
                                  <div className="mb-3">
                                    <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Student's Work</label>
                                    <div className="flex flex-col gap-1.5">
                                      {q.steps.map((step: any, i: number) => (
                                        <div key={i} className={`tech-border p-2.5 ${step.correct ? 'bg-white' : 'bg-[#FFEBEE] border-[var(--danger)]'}`}>
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <span className="font-bold text-xs text-[var(--ink-muted)]">Step {i + 1}: </span>
                                              <span className={`text-sm select-all cursor-text ${!step.correct ? 'line-through text-[var(--danger)]' : ''}`}>{step.text}</span>
                                            </div>
                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${step.correct ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'}`}>
                                              {step.correct ? 'Correct' : 'Incorrect'}
                                            </span>
                                          </div>
                                          {!step.correct && step.fix && (
                                            <div className="mt-1.5 text-xs text-[var(--success)] select-all cursor-text">Correct: {step.fix}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Match the Following */}
                                {qType === 'match' && (q.pairs?.length > 0 || q.match_pairs?.length > 0) && (
                                  <div className="mb-3">
                                    <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Match Pairs</label>
                                    <div className="tech-border bg-white overflow-hidden">
                                      <div className="grid grid-cols-2 bg-[var(--ink)] text-[var(--bg)]">
                                        <div className="p-2 text-xs font-bold uppercase">Left</div>
                                        <div className="p-2 text-xs font-bold uppercase border-l border-[#333]">Right (Correct Match)</div>
                                      </div>
                                      {(q.pairs || q.match_pairs || []).map((pair: any, i: number) => {
                                        const left = typeof pair === 'string' ? pair.split(' → ')[0] : pair.left;
                                        const right = typeof pair === 'string' ? pair.split(' → ')[1] : pair.right;
                                        return (
                                          <div key={i} className="grid grid-cols-2 border-t border-[var(--line-dark)]">
                                            <div className="p-2.5 text-sm select-all cursor-text">{left}</div>
                                            <div className="p-2.5 text-sm select-all cursor-text border-l border-[var(--line-dark)] text-[var(--success)] font-medium">{right}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Arrange the Following */}
                                {qType === 'arrange' && (q.items?.length > 0 || q.arrange_items?.length > 0) && (
                                  <div className="mb-3">
                                    <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Correct Order</label>
                                    <div className="flex flex-col gap-1.5">
                                      {(q.items || q.arrange_items || []).map((item: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 tech-border bg-white p-2.5">
                                          <span className="w-6 h-6 rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                          <span className="text-sm select-all cursor-text flex-1">{item}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Rationale */}
                                {q.rationale && (
                                  <div className="mb-2">
                                    <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Rationale</label>
                                    <div className="tech-border bg-[var(--surface)] p-2.5 text-xs select-all cursor-text">{q.rationale}</div>
                                  </div>
                                )}

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
                                    {['mcq', 'fill_blank', 'error_analysis', 'match', 'arrange'].map(t => (
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

                  <div className="grid grid-cols-1 gap-6">
                    {questions.map((q) => {
                      const qa = qaResults.find((r: any) => r.question_id === q.id);
                      const qType = q.type || 'mcq';
                      const typeLabel: Record<string, string> = { mcq: 'MCQ', fill_blank: 'Fill in the Blank', error_analysis: 'Error Analysis', match: 'Match the Following', arrange: 'Arrange in Order' };
                      const typeBg: Record<string, string> = { mcq: 'bg-[#E3F2FD] text-[#1565C0]', fill_blank: 'bg-[#F3E5F5] text-[#7B1FA2]', error_analysis: 'bg-[#FFF3E0] text-[#E65100]', match: 'bg-[#E0F7FA] text-[#00695C]', arrange: 'bg-[#FFF8E1] text-[#F57F17]' };

                      return (
                        <div key={q.id} className={`tech-border bg-[var(--bg)] ${q.needs_image ? 'border-l-4 border-l-[#1565C0]' : ''} ${qa && !qa.pass ? 'border-[var(--warning)]' : ''}`}>
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
                            {/* Stem */}
                            <div className="mb-3">
                              <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Question Stem</label>
                              <div className="tech-border bg-white p-3 text-sm select-all cursor-text min-h-[40px]">{q.stem}</div>
                            </div>

                            {questionImages[q.id] && (
                              <div className="mb-3 tech-border bg-white p-2 flex justify-center">
                                <img src={questionImages[q.id]} alt="Question" className="max-w-full max-h-48 object-contain" />
                              </div>
                            )}

                            {/* MCQ Options */}
                            {qType === 'mcq' && q.options?.length > 0 && (
                              <div className="mb-3">
                                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Options</label>
                                <div className="flex flex-col gap-1.5">
                                  {q.options.map((opt: any, i: number) => {
                                    const isCorrect = opt.correct || opt.is_correct;
                                    const label = opt.label || String.fromCharCode(65 + i);
                                    return (
                                      <div key={i} className={`flex items-start gap-2 tech-border p-2.5 ${isCorrect ? 'border-[var(--success)] bg-[#E8F5E9]' : 'bg-white'}`}>
                                        <span className={`font-bold text-sm shrink-0 ${isCorrect ? 'text-[var(--success)]' : ''}`}>{label}{isCorrect ? ' ✓' : '.'}</span>
                                        <span className="text-sm select-all cursor-text flex-1">{typeof opt === 'string' ? opt : opt.text}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Fill in the Blank */}
                            {qType === 'fill_blank' && (
                              <div className="mb-3">
                                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Answer</label>
                                <div className="tech-border bg-[#E8F5E9] border-[var(--success)] p-2.5 text-sm font-mono select-all cursor-text">{q.correct_answer || q.answer}</div>
                              </div>
                            )}

                            {/* Error Analysis */}
                            {qType === 'error_analysis' && q.steps?.length > 0 && (
                              <div className="mb-3">
                                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Student's Work</label>
                                <div className="flex flex-col gap-1.5">
                                  {q.steps.map((step: any, i: number) => {
                                    const isCorr = step.correct || step.is_correct;
                                    return (
                                      <div key={i} className={`tech-border p-2.5 ${isCorr ? 'bg-white' : 'bg-[#FFEBEE] border-[var(--danger)]'}`}>
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <span className="font-bold text-xs text-[var(--ink-muted)]">Step {i + 1}: </span>
                                            <span className={`text-sm select-all cursor-text ${!isCorr ? 'line-through text-[var(--danger)]' : ''}`}>{step.text}</span>
                                          </div>
                                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${isCorr ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'}`}>{isCorr ? 'Correct' : 'Incorrect'}</span>
                                        </div>
                                        {!isCorr && (step.fix || step.correct_version) && (
                                          <div className="mt-1.5 text-xs text-[var(--success)] select-all cursor-text">Correct: {step.fix || step.correct_version}</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Match */}
                            {qType === 'match' && (q.pairs?.length > 0 || q.match_pairs?.length > 0) && (
                              <div className="mb-3">
                                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Match Pairs</label>
                                <div className="tech-border bg-white overflow-hidden">
                                  <div className="grid grid-cols-2 bg-[var(--ink)] text-[var(--bg)]">
                                    <div className="p-2 text-xs font-bold uppercase">Left</div>
                                    <div className="p-2 text-xs font-bold uppercase border-l border-[#333]">Right (Correct Match)</div>
                                  </div>
                                  {(q.pairs || q.match_pairs || []).map((pair: any, i: number) => {
                                    const left = typeof pair === 'string' ? pair.split(' → ')[0] : pair.left;
                                    const right = typeof pair === 'string' ? pair.split(' → ')[1] : pair.right;
                                    return (
                                      <div key={i} className="grid grid-cols-2 border-t border-[var(--line-dark)]">
                                        <div className="p-2.5 text-sm select-all cursor-text">{left}</div>
                                        <div className="p-2.5 text-sm select-all cursor-text border-l border-[var(--line-dark)] text-[var(--success)] font-medium">{right}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Arrange */}
                            {qType === 'arrange' && (q.items?.length > 0 || q.arrange_items?.length > 0) && (
                              <div className="mb-3">
                                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Correct Order</label>
                                <div className="flex flex-col gap-1.5">
                                  {(q.items || q.arrange_items || []).map((item: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2 tech-border bg-white p-2.5">
                                      <span className="w-6 h-6 rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                      <span className="text-sm select-all cursor-text flex-1">{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Rationale */}
                            {q.rationale && (
                              <div className="mb-2">
                                <label className="text-[10px] font-bold uppercase text-[var(--ink-muted)] mb-1 block">Rationale</label>
                                <div className="tech-border bg-[var(--surface)] p-2.5 text-xs select-all cursor-text">{q.rationale}</div>
                              </div>
                            )}

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
                              {['mcq', 'fill_blank', 'error_analysis', 'match', 'arrange'].map(t => (
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
                    <div className="mt-6 flex justify-between items-center">
                      <button
                        onClick={handleAddCustomQuestion}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wide border border-[var(--line-dark)] hover:bg-[var(--line)] transition-colors flex items-center gap-2"
                      >
                        <Plus size={14} /> Add Custom Question
                      </button>
                      <button onClick={handleApprove} className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2 text-sm font-bold uppercase tracking-wide hover:bg-[var(--success)] transition-colors flex items-center gap-2">
                        <CheckSquare size={16} /> Approve Final Set ({questions.length} items)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Completion State */}
              {status === 'completed' && (
                <div className="mt-8 p-6 tech-border bg-[#E8F5E9] border-[#2E7D32] text-[#1B5E20] flex flex-col items-center text-center">
                  <CheckCircle2 size={48} className="mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Pipeline Complete</h3>
                  <p className="mb-6">Successfully generated {questions.length} items calibrated and ready for banking.</p>
                  <button
                    onClick={async () => {
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
                    }}
                    className="bg-[#1B5E20] text-white px-6 py-3 font-bold uppercase tracking-wide hover:bg-[#2E7D32] transition-colors flex items-center gap-2"
                  >
                    <FileDown size={20} /> Export to Item Bank (.zip)
                  </button>
                </div>
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
    </motion.div>
  );
};

const ConfigView = () => {
  const [cacheStats, setCacheStats] = useState({ size: 0, hits: 0, misses: 0, maxEntries: 100 });
  const [queueStats, setQueueStats] = useState({ active: 0, pending: 0 });

  const refreshStats = async () => {
    const { responseCache } = await import('./services/responseCache');
    const { requestQueue } = await import('./services/requestQueue');
    setCacheStats(responseCache.getStats());
    setQueueStats(requestQueue.getStats());
  };

  useEffect(() => { refreshStats(); const t = setInterval(refreshStats, 3000); return () => clearInterval(t); }, []);

  const handleClearCache = async () => {
    const { responseCache } = await import('./services/responseCache');
    responseCache.clear();
    refreshStats();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h2 className="text-4xl font-light tracking-tight mb-2">Configuration</h2>
        <p className="col-header">API keys, agent settings, cache management</p>
      </header>

      {/* API Keys — Server-Side */}
      <div className="tech-border bg-[#E8F5E9] border-[var(--success)] p-6 mb-6">
        <h3 className="font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-[var(--success)]" /> API Keys (Server-Side)
        </h3>
        <p className="text-sm mb-3">API keys are managed securely on the server via Vercel Environment Variables. They never reach the browser.</p>
        <div className="text-xs font-mono bg-[var(--bg)] p-3 tech-border">
          <p>Set these in Vercel Dashboard → Settings → Environment Variables:</p>
          <ul className="mt-2 flex flex-col gap-1">
            <li><strong>GEMINI_API_KEY</strong> — Primary key</li>
            <li><strong>GEMINI_API_KEY_1</strong> — Rotation key 1</li>
            <li><strong>GEMINI_API_KEY_2</strong> — Rotation key 2</li>
            <li><strong>GEMINI_API_KEY_3</strong> — Rotation key 3 (optional)</li>
          </ul>
          <p className="mt-2 text-[var(--ink-muted)]">The server rotates between all configured keys automatically.</p>
        </div>
      </div>

      {/* Queue & Cache Stats */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="tech-border bg-[var(--surface)] p-6">
          <h3 className="font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
            <Activity size={16} /> Request Queue
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="col-header">Active</div>
              <div className="text-3xl font-light">{queueStats.active}</div>
            </div>
            <div>
              <div className="col-header">Pending</div>
              <div className="text-3xl font-light">{queueStats.pending}</div>
            </div>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-3">Max 3 concurrent requests. Server rotates between configured keys.</p>
        </div>
        <div className="tech-border bg-[var(--surface)] p-6">
          <h3 className="font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
            <Database size={16} /> Response Cache
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="col-header">Entries</div>
              <div className="text-3xl font-light">{cacheStats.size}/{cacheStats.maxEntries}</div>
            </div>
            <div>
              <div className="col-header">Hits</div>
              <div className="text-3xl font-light text-[var(--success)]">{cacheStats.hits}</div>
            </div>
            <div>
              <div className="col-header">Misses</div>
              <div className="text-3xl font-light">{cacheStats.misses}</div>
            </div>
          </div>
          <button onClick={handleClearCache} className="mt-3 text-xs text-[var(--danger)] hover:underline">Clear Cache</button>
        </div>
      </div>

      {/* Agent Temperatures */}
      <div className="tech-border bg-[var(--surface)] p-6">
        <h3 className="font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
          <BrainCircuit size={16} /> Agent Settings
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { name: 'Intake Agent', temp: 0.1 }, { name: 'Construct Agent', temp: 0.1 },
            { name: 'Subskill Agent', temp: 0.2 }, { name: 'Content Scoping Agent', temp: 0.1 },
            { name: 'Custom Hess Matrix Agent', temp: 0.15 }, { name: 'Misconception Agent', temp: 0.1 },
            { name: 'Generation Agent', temp: 0.4 }, { name: 'AI SME QA', temp: 0.1 },
          ].map(agent => (
            <div key={agent.name} className="flex items-center justify-between p-2 tech-border bg-[var(--bg)]">
              <span className="font-mono text-sm">{agent.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--ink-muted)]">temp:</span>
                <span className="text-sm font-bold">{agent.temp}</span>
                <span className="text-xs text-[var(--ink-muted)]">| gemini-2.5-flash</span>
              </div>
            </div>
          ))}
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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [authenticated, setAuthenticated] = useState(() => {
    // Auto-login if token already in session
    return !!sessionStorage.getItem('appAccessToken');
  });

  if (!authenticated) {
    return <LoginGate onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardView key="dashboard" />}
          {activeTab === 'pipeline' && <PipelineRunnerView key="pipeline" />}
          {activeTab === 'architecture' && <ArchitectureView key="architecture" />}
          {activeTab === 'state-machine' && <StateMachineView key="state-machine" />}
          {activeTab === 'raci' && <RaciView key="raci" />}
          {activeTab === 'config' && <ConfigView key="config" />}
        </AnimatePresence>
      </main>
    </div>
  );
}
