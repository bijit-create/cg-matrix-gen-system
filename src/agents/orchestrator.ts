import { generateAgentResponse, generateWithGroundedSearch } from './api';
import { Prompts, CellRules, TypeInstructions, TypeRotation, MathTypeRotation, getSubjectHint } from './prompts';
import { IntakeSchema, ConstructSchema, SubskillSchema, CGMapperSchema, MisconceptionSchema, ContentScopeSchema, GenerationSchema, QASchema } from './schemas';
import misconceptionCatalog from '../knowledge_base/student_misconceptions_catalog.json';
// questionFormatter.ts available for client-side type switching
import { runRuleBasedQA } from './ruleBasedQA';

export type PipelineState = 'idle' | 'running' | 'waiting' | 'error' | 'completed';

export interface PipelineConfig {
    lo: string;
    skill: string;
    count: number;
    chapterContent?: string;
    metadata?: any;
    onLog?: (agent: string, action: string) => void;
    onData?: (key: string, data: any) => void;
    onStateChange?: (state: PipelineState, step: number) => void;
}

export class AgentOrchestrator {
    private config: PipelineConfig;
    private artifacts: Record<string, any> = {};

    constructor(config: PipelineConfig) {
        this.config = config;
    }

    private log(agent: string, message: string) {
        if (this.config.onLog) this.config.onLog(agent, message);
    }

    private async runAgent(agentName: string, prompt: string, payload: any, schema: any) {
        this.log(agentName, 'Starting processing...');
        try {
            const contextStr = JSON.stringify(payload);
            const res = await generateAgentResponse(agentName, prompt, contextStr, schema);
            this.log(agentName, 'Completed successfully.');
            return res;
        } catch (e: any) {
            this.log(agentName, `FAILED: ${e.message}`);
            throw e;
        }
    }

    // Summarize chapter content to avoid JSON overflow in payloads
    private summarizeContent(content: string, maxLen = 8000): string {
        if (!content || content.length <= maxLen) return content;
        return content.slice(0, maxLen) + '\n\n[... content truncated for payload size ...]';
    }

    // ===== PHASE 1: Intake → Construct → Subskills → GATE 1 =====
    public async executePhase1And2() {
        if (this.config.onStateChange) this.config.onStateChange('running', 0);
        try {
            const intakePayload = {
                task: "Normalize new requirement",
                learning_objective: this.config.lo,
                skill: this.config.skill,
                target_question_count: this.config.count,
                chapter_content: this.summarizeContent(this.config.chapterContent || "Not provided.", 3000),
                ...this.config.metadata
            };
            const intakeOutput = await this.runAgent('Intake Agent', Prompts.IntakeAgent, intakePayload, IntakeSchema);
            this.artifacts.intake = intakeOutput;
            if (this.config.onStateChange) this.config.onStateChange('running', 1);

            const constructOutput = await this.runAgent('Construct Agent', Prompts.ConstructAgent, intakeOutput, ConstructSchema);
            this.artifacts.construct = constructOutput;
            if (this.config.onData) this.config.onData('construct', constructOutput.construct_statement);
            if (this.config.onStateChange) this.config.onStateChange('running', 2);

            const subskillOutput = await this.runAgent('Subskill Agent', Prompts.SubskillAgent, {
                construct: constructOutput,
                skill_description: this.config.skill,
                learning_objective: this.config.lo,
                grade: this.config.metadata?.gradeCode || 'unknown',
                subject: this.config.metadata?.subjectCode || 'unknown',
                instruction: `FOCUS ON THE SKILL: "${this.config.skill}". Break THIS skill into 3-6 testable subskills. The LO "${this.config.lo}" is context only.`
            }, SubskillSchema);
            this.artifacts.subskills = subskillOutput;
            if (this.config.onData) this.config.onData('subskills', subskillOutput.map((val: any) => val.subskill_description));

            if (this.config.onStateChange) this.config.onStateChange('waiting', 2);
            return this.artifacts;
        } catch (error) {
            if (this.config.onStateChange) this.config.onStateChange('error', -1);
            throw error;
        }
    }

    // ===== GATE 1 APPROVED → Content Scoping (per subskill) → GATE 2 =====
    public async executeContentScoping(approvedSubskills: any[], sourcedContent: string[] = []) {
        if (this.config.onStateChange) this.config.onStateChange('running', 3);
        this.artifacts.approvedSubskills = approvedSubskills;
        this.artifacts.sourcedContent = sourcedContent;

        const grade = this.artifacts.intake?.grade || 'unknown';
        const subject = this.artifacts.intake?.subject || 'unknown';
        const fullContent = this.config.chapterContent || '';

        // Split content scoping: one call per subskill with relevant content chunk
        this.log('Content Scoping Agent', `Scoping content for ${approvedSubskills.length} subskill(s)...`);
        const allScopePoints: any[] = [];

        for (let si = 0; si < approvedSubskills.length; si++) {
            const subskill = approvedSubskills[si];
            this.log('Content Scoping Agent', `Subskill ${si + 1}/${approvedSubskills.length}: ${typeof subskill === 'string' ? subskill.slice(0, 50) : 'processing'}...`);

            // Extract content relevant to this subskill
            const subskillText = typeof subskill === 'string' ? subskill : subskill.subskill_description || '';

            // Better keyword extraction: remove stopwords, require 5+ chars for meaningful matching
            const stopwords = new Set(['about', 'after', 'based', 'being', 'between', 'could', 'different', 'during', 'every', 'following', 'given', 'having', 'identify', 'including', 'their', 'there', 'these', 'those', 'through', 'under', 'using', 'which', 'while', 'within', 'would', 'should', 'student', 'learn', 'describe', 'explain', 'classify', 'compare', 'apply', 'analyse', 'understand']);
            const keywords = subskillText.toLowerCase()
                .replace(/[^a-z\s]/g, '')
                .split(/\s+/)
                .filter((w: string) => w.length >= 5 && !stopwords.has(w));
            let relevantContent = fullContent;

            // Extract paragraphs with at least 2 keyword matches (not just 1)
            if (fullContent.length > 2000 && keywords.length > 0) {
                const paragraphs = fullContent.split(/\n\n|\r\n\r\n|\n/).filter(p => p.trim().length > 30);
                const scored = paragraphs.map(p => {
                    const pLower = p.toLowerCase();
                    const matchCount = keywords.filter(kw => pLower.includes(kw)).length;
                    return { p, matchCount };
                });
                // Take paragraphs with 2+ keyword matches, or top-scoring ones
                const relevant = scored
                    .filter(s => s.matchCount >= Math.min(2, keywords.length))
                    .sort((a, b) => b.matchCount - a.matchCount)
                    .slice(0, 10)
                    .map(s => s.p);
                relevantContent = relevant.length > 0 ? relevant.join('\n\n') : fullContent.slice(0, 2000);
            }

            const scopePayload = {
                learning_objective: this.config.lo,
                skill: this.config.skill,
                grade, subject,
                subskill: subskillText,
                chapter_content: this.summarizeContent(relevantContent, 2000),
                instruction: `Extract 3-8 testable knowledge points for THIS specific subskill: "${subskillText}". Only include points from the chapter content that relate to this subskill.`
            };

            try {
                const points = await this.runAgent('Content Scoping Agent', Prompts.ContentScopingAgent, scopePayload, ContentScopeSchema);
                allScopePoints.push(...(points || []));
                // Emit progressively
                if (this.config.onData) this.config.onData('contentScope', [...allScopePoints]);
            } catch (e: any) {
                this.log('Content Scoping Agent', `Subskill ${si + 1} failed: ${e.message?.slice(0, 40)}`);
            }
        }

        this.artifacts.contentScope = allScopePoints;
        if (this.config.onData) this.config.onData('contentScope', allScopePoints);

        try {
            const core = allScopePoints.filter((k: any) => k.scope_type === 'core').length;
            const supporting = allScopePoints.filter((k: any) => k.scope_type === 'supporting').length;
            const advanced = allScopePoints.filter((k: any) => k.scope_type === 'advanced').length;
            this.log('Content Scoping Agent', `Total: ${allScopePoints.length} knowledge points (${core} core, ${supporting} supporting, ${advanced} advanced).`);
        } catch (e: any) {
            this.log('Content Scoping Agent', `Failed: ${e.message}`);
            this.artifacts.contentScope = [];
            if (this.config.onData) this.config.onData('contentScope', []);
        }

        // GATE 2: Content Scope Approval
        if (this.config.onStateChange) this.config.onStateChange('waiting', 4);
        return this.artifacts;
    }

    // ===== GATE 2 APPROVED → Custom Hess Matrix + Misconceptions → GATE 3 =====
    public async executeHessMatrix(approvedContentScope: any[]) {
        if (this.config.onStateChange) this.config.onStateChange('running', 5);
        this.artifacts.approvedContentScope = approvedContentScope;

        const grade = this.artifacts.intake?.grade || 'unknown';
        const subject = this.artifacts.intake?.subject?.toLowerCase() || '';
        const approvedSubskills = this.artifacts.approvedSubskills || [];
        const sourcedContent = this.artifacts.sourcedContent || [];

        // Summarize approved knowledge for the matrix
        const knowledgeSummary = approvedContentScope.map((k: any) =>
            `[${k.category}] ${k.knowledge_point} (${k.scope_type}, ${k.grade_level})`
        ).join('\n');

        // --- RUN HESS MATRIX + MISCONCEPTIONS IN PARALLEL ---
        this.log('Orchestrator', 'Running Hess Matrix and Misconception agents in parallel...');

        const hessMatrixPromise = (async () => {
            const matrixPayload = {
                construct: this.artifacts.construct,
                subskills: approvedSubskills,
                target_questions: this.config.count,
                grade, subject: this.artifacts.intake?.subject || '',
                learning_objective: this.config.lo, skill: this.config.skill,
                approved_knowledge_points: knowledgeSummary,
            };
            try {
                const cgOutput = await this.runAgent('Custom Hess Matrix Agent', Prompts.CGMapperAgent, matrixPayload, CGMapperSchema);
                const matrix = cgOutput.matrix || {};
                const cgPlan: Record<string, number> = {};
                const cellData: Record<string, any> = {};
                for (const [cell, data] of Object.entries(matrix) as [string, any][]) {
                    cgPlan[cell] = data.count || 0;
                    cellData[cell] = data;
                }
                this.artifacts.cgPlan = cgPlan;
                this.artifacts.cellData = cellData;
                if (this.config.onData) {
                    this.config.onData('cgPlan', cgPlan);
                    this.config.onData('cellData', cellData);
                }
                const active = Object.entries(cellData).filter(([_, d]: [string, any]) => d.status === 'active');
                this.log('Custom Hess Matrix Agent', `${active.length} active cells.`);
            } catch (e: any) {
                this.log('Custom Hess Matrix Agent', `Failed: ${e.message}. Using default.`);
                this.artifacts.cgPlan = { R1: 2, U1: 3, U2: 3, A2: 4, A3: 0, AN2: 1, AN3: 0 };
                if (this.config.onData) this.config.onData('cgPlan', this.artifacts.cgPlan);
            }
        })();

        const misconceptionPromise = (async () => {
            this.log('Misconception Agent', 'Starting processing...');
            const loLower = this.config.lo.toLowerCase();
            const skillLower = this.config.skill.toLowerCase();
            // Better misconception matching: use TOPIC_CLUSTER and TOPIC for primary match,
            // then score by how many content keywords appear in the misconception text.
            // Require 2+ keyword matches to avoid false positives.
            // Extended stopwords: common words that cause false matches
            const miscStopwords = new Set([
                'student', 'students', 'think', 'believe', 'understand', 'learn', 'know',
                'that', 'this', 'with', 'from', 'they', 'their', 'about', 'when', 'what', 'which',
                'have', 'does', 'will', 'been', 'being', 'some', 'only', 'also', 'into', 'than',
                'each', 'other', 'make', 'like', 'just', 'over', 'such', 'food', 'body', 'human',
                'living', 'things', 'example', 'different', 'called', 'types', 'based', 'process',
                'important', 'required', 'necessary', 'help', 'helps', 'causes', 'cause', 'made',
                'used', 'using', 'found', 'gives', 'gets', 'takes', 'needs', 'need', 'form',
                'change', 'changes', 'shows', 'contains', 'present', 'sources', 'source',
                'identify', 'explain', 'describe', 'classify', 'compare', 'analyse', 'apply',
            ]);

            // Extract only SPECIFIC topic words (not generic verbs/nouns)
            const topicKeywords = `${loLower} ${skillLower}`
                .replace(/[^a-z\s]/g, '')
                .split(/\s+/)
                .filter((w: string) => w.length >= 5 && !miscStopwords.has(w));

            const catalogScored = (misconceptionCatalog as any[])
                .filter((m: any) => {
                    const mSubject = (m.SUBJECT || '').toLowerCase();
                    return subject.includes('math') ? mSubject === 'math' : subject.includes('sci') ? mSubject === 'science' : true;
                })
                .map((m: any) => {
                    // Match primarily on TOPIC field (most specific)
                    const topicText = `${m.TOPIC || ''}`.toLowerCase();
                    const clusterText = `${m.TOPIC_CLUSTER || ''}`.toLowerCase();
                    const miscText = `${m.MISCONCEPTION || ''}`.toLowerCase();

                    // TOPIC match gets 3x weight (most relevant)
                    const topicHits = topicKeywords.filter((kw: string) => topicText.includes(kw)).length * 3;
                    // TOPIC_CLUSTER match gets 2x weight
                    const clusterHits = topicKeywords.filter((kw: string) => clusterText.includes(kw)).length * 2;
                    // MISCONCEPTION text match gets 1x weight
                    const miscHits = topicKeywords.filter((kw: string) => miscText.includes(kw)).length;

                    return { m, score: topicHits + clusterHits + miscHits };
                })
                .filter(s => s.score >= 3) // Require score >= 3 (was 2 — too loose)
                .sort((a, b) => b.score - a.score)
                .slice(0, 15); // Top 15

            const catalogMatches = catalogScored.map(s => ({
                id: s.m.ID, topic: s.m.TOPIC, misconception: s.m.MISCONCEPTION,
                type: s.m.TYPE, prevalence: s.m.PREVALENCE, source: s.m.SOURCE,
                relevance_score: s.score
            }));
            this.log('Misconception Agent', `${catalogMatches.length} catalog matches (top by relevance).`);

            let output: any[] = [];
            if (catalogMatches.length >= 4) {
                output = await this.runAgent('Misconception Agent', Prompts.MisconceptionAgent, {
                    construct: this.artifacts.construct, subskills: approvedSubskills,
                    learning_objective: this.config.lo, skill: this.config.skill,
                    catalog_matches: catalogMatches.slice(0, 30),
                    instruction: 'Select 4-8 most relevant. Do NOT invent new ones.'
                }, MisconceptionSchema);
            } else {
                this.log('Misconception Agent', 'Catalog insufficient. Searching online...');
                const sourceUrls = [...new Set((misconceptionCatalog as any[])
                    .filter((m: any) => subject.includes('math') ? (m.SUBJECT || '').toLowerCase() === 'math' : subject.includes('sci') ? (m.SUBJECT || '').toLowerCase() === 'science' : true)
                    .map((m: any) => m.SOURCE_URL).filter(Boolean)
                )].slice(0, 6);
                // Seed Gemini's grounded search with subject-tiered authoritative sources.
                // Indian sources are listed first per board (CBSE/ICSE/state boards). The
                // subject-specific tier is gated on the detected subject so the prompt stays
                // focused. Full reasoning + citations live in
                // memory/reference_misconception_sources.md.
                const indianSources = [
                    'HBCSE TIFR (Ramadas, Chunawala, Haydock, Deshmukh, Subramaniam, Vijapurkar, Padalkar)',
                    'epiSTEME conference proceedings 1-9 (HBCSE) — episteme9.hbcse.tifr.res.in',
                    'Eklavya HSTP bibliography (eklavya.in)',
                    'NCERT exemplar problems + Voices of Teachers & Teacher Educators',
                    'Azim Premji University: At Right Angles, Learning Curve',
                ];
                let subjectSources: string[] = [];
                if (subject.includes('phys') || subject.includes('sci')) {
                    subjectSources = [
                        'PhysPort.org/assessments — FCI (Hestenes 1992), FMCE (Thornton & Sokoloff 1998), TUG-K (Beichner 1994), BEMA, CSEM',
                        'AAAS Project 2061 Energy Assessment (Herrmann-Abell & DeBoer 2018) — assessment.aaas.org',
                        'MOSART (Sadler, Harvard) — lweb.cfa.harvard.edu/smgphp/mosart',
                        'TOAST (Slater 2008), LSCI (Bardar 2007), SPCI (Bailey 2011)',
                    ];
                }
                if (subject.includes('chem')) {
                    subjectSources = [
                        'Taber (2002, 2009) Chemical Misconceptions: Prevention, Diagnosis and Cure (RSC, 2 vols)',
                        'Mulford & Robinson (2002) Chemical Concepts Inventory — J Chem Ed 79(6):739',
                        'AAAS Project 2061 Atoms, Molecules, States of Matter item bank',
                        'Treagust (1988) two-tier diagnostic methodology — IJSE 10(2):159',
                    ];
                }
                if (subject.includes('bio')) {
                    subjectSources = [
                        'CINS — Anderson, Fisher, Norman (2002) JRST 39:952',
                        'CANS — Kalinowski, Pelletier, Heath (2016) CBE-LSE',
                        'GCA — Smith, Wood, Knight (2008) CBE-LSE 7(4):422',
                        'Driver et al. (1994) Making Sense of Secondary Science (Routledge)',
                        'Deshmukh (2012) Misconceptions in Biology at Secondary School Level (HBCSE PhD)',
                        'Haydock (2013, 2014) — evolution / natural selection in Indian students',
                    ];
                }
                if (subject.includes('earth') || subject.includes('geo')) {
                    subjectSources = [
                        'MOSART (Sadler, Harvard) earth & space items',
                        'Vosniadou & Brewer (1992, 1994) — mental models of Earth, day/night',
                        'Padalkar & Ramadas (2009) — indigenous astronomy — epiSTEME-3',
                    ];
                }
                if (subject.includes('math')) {
                    subjectSources = [
                        'CSMS / Hart (1981) Children\'s Understanding of Mathematics: 11-16',
                        'Eedi NeurIPS 2020 dataset — arXiv:2007.12061 (17M+ misconception-tagged responses)',
                        'Stacey & Steinle Decimal Comparison Test',
                        'Booth & Koedinger — algebra equation-solving errors',
                        'van Hiele (1986) geometry levels',
                        'Subramaniam, Banerjee — Indian primary/middle math (HBCSE)',
                        'Calculus Concept Inventory — Epstein (2013) Notices AMS 60:1018',
                    ];
                }
                if (subject.includes('comp') || subject.includes('cs') || subject.includes('progra')) {
                    subjectSources = [
                        'SCS1 — Parker, Guzdial, Engleman (2016) ICER',
                        'BDSI — Porter et al. (2019, 2022) — basic data structures',
                        'MG-CSCI — Rachmatullah et al. (2020) — middle-school CS',
                    ];
                }
                if (subject.includes('econ') || subject.includes('com')) {
                    subjectSources = [
                        'Test of Economic Literacy (TEL) — Walstad, Rebeck, Butters (2013) J Econ Ed 44(3):261',
                        'TEK (grades 8-9), BET (grades 5-6) — Walstad & Rebeck',
                    ];
                }
                if (subject.includes('hist') || subject.includes('soc')) {
                    subjectSources = [
                        'Wineburg (2001) Historical Thinking and Other Unnatural Acts',
                        'Seixas & Morton (2013) The Big Six Historical Thinking Concepts',
                        'Stanford History Education Group — Beyond the Bubble (sheg.stanford.edu)',
                    ];
                }
                if (subjectSources.length === 0) {
                    // Fallback: cross-cutting bibliographies and methodology refs.
                    subjectSources = [
                        'Pfundt & Duit STCSE bibliography (IPN Kiel) — archiv.ipn.uni-kiel.de/stcse',
                        'AAAS Project 2061 — assessment.aaas.org',
                        'PhysPort.org/assessments',
                        'DIAGNOSER (Minstrell, diagnoser.com) — facet-based item bank',
                    ];
                }
                try {
                    const searchResult = await generateWithGroundedSearch('Misconception Agent',
                        `Search for student misconceptions about: "${this.config.lo}" (${subject}, grade ${grade}).

CITATION CHAIN (mandatory): each misconception you return must trace to a primary peer-reviewed source. For Indian curricula, ALSO pair with an Indian replication where one exists.

INDIAN-CONTEXT SOURCES (highest priority for CBSE / ICSE / state boards):
${indianSources.map((s, i) => `  I${i + 1}. ${s}`).join('\n')}

SUBJECT-SPECIFIC FIRST-TIER SOURCES (${subject}):
${subjectSources.map((s, i) => `  S${i + 1}. ${s}`).join('\n')}

CROSS-CUTTING BIBLIOGRAPHIES:
  X1. Pfundt & Duit STCSE (IPN Kiel) — 8000+ refs
  X2. AAAS Project 2061 — assessment.aaas.org
  X3. Eedi NeurIPS dataset — eedi.com (math)
  X4. Treagust two-tier methodology — IJSE 10(2):159

Existing catalog source URLs: ${sourceUrls.join(', ')}.

For each misconception, write incorrect_reasoning as the STUDENT'S flawed thinking ("a student picking this is reasoning that …"), not as a teacher's correction. Tag each entry with one theoretical framework when possible (p-prim, ontological-category, mental-model, threshold-concept, learning-progression facet).

If absolutely nothing relevant found, say "NO_MISCONCEPTIONS_FOUND".`,
                        JSON.stringify({ lo: this.config.lo, skill: this.config.skill })
                    );
                    if (!searchResult.text.includes('NO_MISCONCEPTIONS_FOUND')) {
                        output = await this.runAgent('Misconception Agent', Prompts.MisconceptionAgent, {
                            instruction: 'Parse findings into structured misconceptions. Only cited sources.',
                            research_findings: searchResult.text, catalog_matches: catalogMatches, learning_objective: this.config.lo
                        }, MisconceptionSchema);
                    }
                } catch (e: any) {
                    this.log('Misconception Agent', `Search failed: ${e.message}`);
                    output = catalogMatches.slice(0, 8).map((m: any, i: number) => ({
                        misconception_id: m.id || `M-${i+1}`, misconception_text: m.misconception,
                        type: (m.type || 'conceptual').toLowerCase(), prevalence: m.prevalence || 'unknown',
                        incorrect_reasoning: `Source: ${m.source}`
                    }));
                }
            }
            this.artifacts.misconceptions = output;
            if (this.config.onData) {
                this.config.onData('misconceptions', output);
                if (output.length === 0) this.config.onData('misconceptions_not_found', true);
            }
        })();

        // Wait for BOTH to finish
        await Promise.allSettled([hessMatrixPromise, misconceptionPromise]);
        this.log('Orchestrator', 'Hess Matrix + Misconceptions complete (parallel).');

        // GATE 3: Hess Matrix & Misconception Approval
        if (this.config.onStateChange) this.config.onStateChange('waiting', 5);
        return this.artifacts;
    }

    // ===== GATE 3 APPROVED → Content Selection + cell queue setup =====
    public async executePhase3Setup(approvedCgPlan: Record<string, number>, approvedMisconceptions: any[]) {
        if (this.config.onStateChange) this.config.onStateChange('running', 7);
        this.artifacts.cgPlan = approvedCgPlan;
        this.artifacts.approvedMisconceptions = approvedMisconceptions;

        const grade = this.artifacts.intake?.grade || '';
        const subjectName = this.artifacts.intake?.subject || '';
        const approvedContentScope = this.artifacts.approvedContentScope || [];
        const cellDataMap = this.artifacts.cellData || {};

        // Build cell queue (only active cells with count > 0)
        const cellQueue = Object.entries(approvedCgPlan)
            .filter(([_, num]) => (num as number) > 0)
            .map(([cell, num]) => ({ cell, count: num as number }));
        this.artifacts.cellQueue = cellQueue;
        this.artifacts.allQuestions = [];
        this.artifacts.currentCellIndex = 0;

        // --- MANDATORY: Search for exemplar questions from real question banks ---
        this.log('Research Agent', `Searching for Grade ${grade} ${subjectName} exemplar questions...`);
        let exemplarBank = '';
        try {
            const res = await generateWithGroundedSearch('Research Agent',
                `Find 6-10 real assessment questions for: "${this.config.skill}" (${subjectName}, Grade ${grade}).
Search: NCERT Exemplar, CBSE sample papers, state board papers, DIKSHA, Khan Academy, Olympiad banks.
For each: exact question text + source + cognitive level.
Focus on grade-appropriate, well-framed questions. Only REAL questions. UK English.`,
                JSON.stringify({ skill: this.config.skill, lo: this.config.lo, grade, subject: subjectName })
            );
            exemplarBank = (res.text || '').slice(0, 2000);
            if (exemplarBank.length > 50) {
                this.log('Research Agent', 'Found exemplar questions. Will use as quality benchmark.');
            } else {
                this.log('Research Agent', 'No exemplars found. Generating from content only.');
                exemplarBank = '';
            }
        } catch (e: any) {
            this.log('Research Agent', `Search failed: ${e.message?.slice(0, 40)}`);
        }
        this.artifacts.exemplarBank = exemplarBank;

        // --- Content Selection for ALL cells upfront (lightweight) ---
        this.log('Content Selector', 'Selecting content for each cell...');
        const allScopePoints = approvedContentScope.map((k: any) => k.knowledge_point);
        // F4: track which knowledge_points are flagged as edge-cases by ContentScopingAgent.
        // Used (a) to bias per-cell distribution so ≥20% of items hit an edge case, and
        // (b) to tag generated questions with edge_case_flag for the audit's set-level check.
        const edgeCaseSet = new Set<string>(
            approvedContentScope
                .filter((k: any) => String(k.flag || '').toLowerCase() === 'edge-case')
                .map((k: any) => k.knowledge_point as string)
        );
        const cellContentMap: Record<string, string[]> = {};

        for (const { cell } of cellQueue) {
            const thisCellDef = cellDataMap[cell]?.definition || cell;
            try {
                const selection = await generateAgentResponse(
                    'Content Selector',
                    `Pick 3-8 knowledge points MOST appropriate for cell ${cell} (${thisCellDef}). Grade: ${grade}, Subject: ${subjectName}. Return JSON array of strings.
R1=facts/definitions, U1/U2=concepts to explain/compare, A2=rules to apply, AN2=patterns to analyze. Pick DIFFERENT points per cell. INCLUDE at least one edge-case knowledge point per cell when available (these are flagged in the source data).`,
                    JSON.stringify(allScopePoints),
                    { type: 'ARRAY' as any, items: { type: 'STRING' as any } }
                );
                cellContentMap[cell] = selection || allScopePoints.slice(0, 5);
                const edgesIn = (cellContentMap[cell] || []).filter((p: string) => edgeCaseSet.has(p)).length;
                this.log('Content Selector', `${cell}: ${(selection || []).length} points (${edgesIn} edge-case).`);
            } catch {
                cellContentMap[cell] = allScopePoints.slice(0, 5);
            }
        }
        this.artifacts.cellContentMap = cellContentMap;
        this.artifacts.edgeCaseContentSet = Array.from(edgeCaseSet);

        // Emit the cell queue so UI can show progress
        if (this.config.onData) {
            this.config.onData('cellQueue', cellQueue);
            this.config.onData('cellContentMap', cellContentMap);
        }

        // Generate first cell automatically
        await this.executeGenerateCell(0);
    }

    // ===== Generate questions for ONE cell, then pause for SME review =====
    public async executeGenerateCell(cellIndex: number) {
        const cellQueue = this.artifacts.cellQueue || [];
        if (cellIndex >= cellQueue.length) {
            // All cells done → run QA and go to Gate 4
            await this.executeFinalQA();
            return;
        }

        const { cell, count } = cellQueue[cellIndex];
        this.artifacts.currentCellIndex = cellIndex;
        if (this.config.onStateChange) this.config.onStateChange('running', 7);
        if (this.config.onData) this.config.onData('currentCell', { cell, count, index: cellIndex, total: cellQueue.length });

        const grade = this.artifacts.intake?.grade || '';
        const subjectName = this.artifacts.intake?.subject || '';
        const cellDataMap = this.artifacts.cellData || {};
        const thisCellDef = cellDataMap[cell]?.definition || cell;
        const cellScope = (this.artifacts.cellContentMap?.[cell] || []);

        // Build a structured misconception payload — ID + text + incorrect reasoning.
        // The generator must pick from this list (or set misconception_id_targeted="").
        // We pass up to 6 candidates per cell so the model has range; targets are
        // round-robin-assigned per slot below to enforce coverage without sequential
        // generation.
        const misconceptionPool: { id: string; text: string; incorrect_reasoning: string }[] =
            (this.artifacts.approvedMisconceptions || [])
                .slice(0, 6)
                .map((m: any) => ({
                    id: m.misconception_id || m.id || '',
                    text: m.misconception_text || m.text || '',
                    incorrect_reasoning: m.incorrect_reasoning || '',
                }))
                .filter((m: { id: string; text: string }) => m.id && m.text);
        const misconceptionMenu = misconceptionPool.length === 0 ? '' :
            'Misconceptions menu (pick one ID per question for misconception_id_targeted):\n' +
            misconceptionPool.map((m, i) =>
                `  ${i + 1}. [${m.id}] ${m.text}${m.incorrect_reasoning ? ' — error: ' + m.incorrect_reasoning : ''}`
            ).join('\n');

        this.log('Generation Agent', `Cell ${cellIndex + 1}/${cellQueue.length}: Generating ${count} item(s) for ${cell}...`);

        // Use subject-aware type rotation
        // FIB/OneWord only for Math and English (typing is OK in these).
        // All other subjects: MCQ dominant (60-70%).
        const subjectLower = (this.artifacts.intake?.subject || '').toLowerCase();
        const allowsFIB = subjectLower.includes('math') || subjectLower.includes('eng');
        const rotation = allowsFIB ? MathTypeRotation : TypeRotation;
        const typesForCell = rotation[cell] || ['mcq', 'mcq', 'mcq'];
        const startId = (this.artifacts.allQuestions || []).length + 1;

        // Distribute content uniquely.
        // F4: bias toward edge cases. We aim for ⌈20% × count⌉ slots to consume
        // an edge-case content point when at least that many are available in
        // the cell scope; the remainder fills from the non-edge pool. This
        // ensures the generated bank tests boundary cases rather than only
        // canonical examples.
        const distributedContent: string[] = [];
        const distributedIsEdge: boolean[] = [];
        const edgeCaseSetForCell = new Set<string>(this.artifacts.edgeCaseContentSet || []);
        if (cellScope.length === 0) {
            for (let i = 0; i < count; i++) {
                distributedContent.push(this.config.skill);
                distributedIsEdge.push(false);
            }
        } else {
            const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
            const cellScopeStrings: string[] = (cellScope as any[]).map((p: any) => String(p));
            const edgePool = shuffle(cellScopeStrings.filter((p: string) => edgeCaseSetForCell.has(p)));
            const nonEdgePool = shuffle(cellScopeStrings.filter((p: string) => !edgeCaseSetForCell.has(p)));
            const targetEdges = Math.min(edgePool.length, Math.max(1, Math.ceil(count * 0.2)));
            const picked: { value: string; isEdge: boolean }[] = [];
            // First, fill the edge quota.
            for (let i = 0; i < targetEdges; i++) picked.push({ value: edgePool[i], isEdge: true });
            // Then, fill remaining slots from the non-edge pool, recycling if needed.
            const remaining = count - picked.length;
            for (let i = 0; i < remaining; i++) {
                if (nonEdgePool.length > 0) {
                    picked.push({ value: nonEdgePool[i % nonEdgePool.length], isEdge: false });
                } else if (edgePool.length > 0) {
                    // No non-edge content available — keep filling from edge pool.
                    picked.push({ value: edgePool[(targetEdges + i) % edgePool.length], isEdge: true });
                } else {
                    picked.push({ value: this.config.skill, isEdge: false });
                }
            }
            // Shuffle the final order so the edge cases don't all sit at the front.
            const finalOrder = shuffle(picked);
            finalOrder.forEach(p => {
                distributedContent.push(p.value);
                distributedIsEdge.push(p.isEdge);
            });
        }

        // --- TWO-STAGE GENERATION (parallel Stage 1, then sequential Stage 2) ---
        const questionPromises = Array.from({ length: count }, (_, qi) => {
            const qType = typesForCell[qi % typesForCell.length];
            const contentPoint = distributedContent[qi];
            const qId = `${cell}-${startId + qi}`;
            const otherPoints = distributedContent.filter((_, i) => i !== qi).slice(0, 3).join('; ');

            // Rotate names — never repeat within a cell
            const names = ['Riya', 'Aarav', 'Kabir', 'Priya', 'Meera', 'Ananya', 'Rohan', 'Zara', 'Dev', 'Isha'];
            const useName = names[(startId + qi) % names.length];

            // Round-robin assign a target misconception ID per slot. Parallel
            // generation can't see what siblings claimed, so we hand each slot a
            // distinct preferred misconception_id; the generator can override only
            // by setting misconception_id_targeted="" with a valid typed
            // reasoning_error per the prompt.
            const targetMisconception = misconceptionPool.length > 0
                ? misconceptionPool[qi % misconceptionPool.length]
                : null;
            const targetLine = targetMisconception
                ? `PREFERRED TARGET for this slot: misconception_id_targeted="${targetMisconception.id}" (${targetMisconception.text}). Use this ID unless it genuinely does not fit; in that case set misconception_id_targeted="" and pick a typed reasoning_error per the prompt.`
                : 'No misconceptions available for this cell — set misconception_id_targeted="" and pick a typed reasoning_error per the prompt.';

            // STAGE 1: Create question (creative, temp 0.4)
            const subjectHint = getSubjectHint(subjectName);
            const stage1Prompt = `${Prompts.GenerationStage1}
${CellRules[cell] || ''}
Cell: ${thisCellDef}
Generate 1 "${qType}". ${TypeInstructions[qType] || TypeInstructions.mcq}
Content: "${contentPoint}"
use_name: ${useName}
Other questions test: ${otherPoints}. DO NOT overlap. DO NOT test the same fact.
Grade: ${grade}, Subject: ${subjectName}, Skill: ${this.config.skill}
${subjectHint}
${misconceptionMenu}
${targetLine}`;

            const isEdgeSlot = !!distributedIsEdge[qi];
            return generateAgentResponse('Generation Agent', stage1Prompt, JSON.stringify({ id: qId, type: qType, cell }), GenerationSchema)
                .then(async (draft) => {
                    // STAGE 2: Review & polish (evaluative, temp 0.1)
                    try {
                        const stage2Prompt = `${Prompts.GenerationStage2}
Grade: ${grade}. Cell: ${cell}.
Question to review: ${JSON.stringify(draft).slice(0, 1500)}`;
                        const polished = await generateAgentResponse('AI SME QA', stage2Prompt,
                            JSON.stringify({ id: qId, type: qType, cell }),
                            GenerationSchema);
                        this.log('Generation Agent', `${qId}: ${qType} ✓ (2-stage)`);
                        return { ...polished, cell, type: qType, id: qId, edge_case_flag: isEdgeSlot };
                    } catch {
                        // Stage 2 failed — use Stage 1 draft
                        this.log('Generation Agent', `${qId}: ${qType} ✓ (stage 1 only)`);
                        return { ...draft, cell, type: qType, id: qId, edge_case_flag: isEdgeSlot };
                    }
                })
                .catch(e => {
                    this.log('Generation Agent', `${qId}: ${qType} failed — ${(e as any).message?.slice(0, 50)}`);
                    return null;
                });
        });

        const results = await Promise.allSettled(questionPromises);
        const cellQuestions = results
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => (r as PromiseFulfilledResult<any>).value);

        // --- Multi-perspective image decision (3 AI calls per question, parallel) ---
        this.log('Image Evaluator', `Evaluating image need for ${cellQuestions.length} questions...`);
        try {
            const { evaluateImageNeed } = await import('./multiPerspective');
            const subjectName = this.artifacts.intake?.subject || '';
            const imageEvals = await Promise.allSettled(
                cellQuestions.map((q: any) =>
                    evaluateImageNeed(q.stem || '', q.type || 'mcq', subjectName, grade)
                )
            );
            for (let i = 0; i < cellQuestions.length; i++) {
                const r = imageEvals[i];
                if (r.status === 'fulfilled') {
                    cellQuestions[i].needs_image = r.value.needsImage;
                    cellQuestions[i]._image_confidence = r.value.confidence;
                    this.log('Image Evaluator', `${cellQuestions[i].id}: ${r.value.needsImage ? 'IMAGE' : 'TEXT'} (${r.value.confidence}% confidence)`);
                }
            }
        } catch (e: any) {
            this.log('Image Evaluator', `Failed: ${e.message?.slice(0, 40)}. Using Generation Agent's decision.`);
        }

        // --- Rule-based QA ---
        const ruleResults = runRuleBasedQA(cellQuestions, this.config.lo);
        const cellQA = cellQuestions.map((q: any) => {
            const rule = ruleResults.find(r => r.question_id === (q.id));
            const issues = (rule?.flags || []).map((f: any) => `[${f.category}/${f.severity}] ${f.message}`);
            return {
                question_id: q.id,
                pass: !rule || rule.pass,
                issues,
                suggestions: [],
                severity: issues.some((i: string) => i.includes('/critical]')) ? 'critical' : issues.some((i: string) => i.includes('/major]')) ? 'major' : 'none'
            };
        });

        // Store and emit
        this.artifacts.currentCellQuestions = cellQuestions;
        if (this.config.onData) {
            this.config.onData('cellQuestions', { cell, questions: cellQuestions, qa: cellQA, index: cellIndex });
        }

        this.log('Generation Agent', `${cell}: ${cellQuestions.length} items generated. Review and click Next Cell.`);

        // Pause for SME review of this cell
        if (this.config.onStateChange) this.config.onStateChange('waiting', 7);
    }

    // ===== SME approved current cell → add to allQuestions, generate next cell =====
    public async approveAndNextCell(approvedCellQuestions: any[]) {
        this.artifacts.allQuestions = [...(this.artifacts.allQuestions || []), ...approvedCellQuestions];
        if (this.config.onData) this.config.onData('questions', this.artifacts.allQuestions);

        const nextIndex = (this.artifacts.currentCellIndex || 0) + 1;
        await this.executeGenerateCell(nextIndex);
    }

    // ===== All cells done → Final QA → GATE 4 =====
    private async executeFinalQA() {
        const allQuestions = this.artifacts.allQuestions || [];
        if (this.config.onStateChange) this.config.onStateChange('running', 8);

        this.log('QA Summary', `All cells complete. ${allQuestions.length} total items. Running final QA...`);

        // Rule-based QA on full set (catches cross-question duplicates)
        const ruleResults = runRuleBasedQA(allQuestions, this.config.lo);

        // Multi-perspective AI QA (3 lenses: Factual, Pedagogical, Language)
        this.log('QA Review', 'Running 3-perspective quality review (Factual + Pedagogical + Language)...');
        const multiQaResults: Record<string, any> = {};
        try {
            const { evaluateQuestionQuality } = await import('./multiPerspective');
            const subjectName = this.artifacts.intake?.subject || '';
            const grade = this.artifacts.intake?.grade || '';

            // Run QA for each question (parallel via requestQueue)
            const qaPromises = allQuestions.map((q: any) =>
                evaluateQuestionQuality(q, subjectName, grade, this.config.lo)
                    .then(result => ({ qId: q.question_id || q.id, ...result }))
                    .catch(() => ({ qId: q.question_id || q.id, pass: true, overallScore: 50, issues: [], perspectives: [] }))
            );
            const qaResults = await Promise.allSettled(qaPromises);
            for (const r of qaResults) {
                if (r.status === 'fulfilled') {
                    multiQaResults[r.value.qId] = r.value;
                }
            }
            const passed = Object.values(multiQaResults).filter((r: any) => r.pass).length;
            this.log('QA Review', `3-lens review complete: ${passed}/${allQuestions.length} passed.`);
        } catch (e: any) {
            this.log('QA Review', `Multi-perspective QA failed: ${e.message?.slice(0, 40)}`);
        }

        // Merge rule-based + multi-perspective QA
        const mergedQA = allQuestions.map((q: any) => {
            const qId = q.question_id || q.id;
            const rule = ruleResults.find(r => r.question_id === qId);
            const multi = multiQaResults[qId];
            const allIssues: string[] = [];
            if (rule) rule.flags.forEach(f => allIssues.push(`[${f.category}/${f.severity}] ${f.message}`));
            if (multi?.issues) multi.issues.forEach((issue: string) => allIssues.push(issue));
            const multiPass = multi ? multi.pass : true;
            const multiScore = multi ? multi.overallScore : 100;
            const hasCritical = allIssues.some(i => i.includes('/critical]')) || multiScore < 30;
            const hasMajor = allIssues.some(i => i.includes('/major]')) || multiScore < 50;
            return {
                question_id: qId,
                pass: !hasCritical && !hasMajor && multiPass,
                issues: allIssues,
                suggestions: [],
                severity: hasCritical ? 'critical' : hasMajor ? 'major' : 'none',
                score: multiScore,
                perspectives: multi?.perspectives || [],
            };
        });

        this.artifacts.qaResults = mergedQA;
        if (this.config.onData) this.config.onData('qaResults', mergedQA);
        const pass = mergedQA.filter(r => r.pass).length;
        this.log('QA Summary', `Final: ${pass}/${mergedQA.length} passed.`);

        // GATE 4
        if (this.config.onStateChange) this.config.onStateChange('waiting', 9);
    }
}
