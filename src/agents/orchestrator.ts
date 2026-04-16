import { generateAgentResponse, generateWithGroundedSearch } from './api';
import { Prompts, CellRules, TypeInstructions, TypeRotation } from './prompts';
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
            const miscStopwords = new Set(['student', 'students', 'think', 'believe', 'understand', 'learn', 'know', 'that', 'this', 'with', 'from', 'they', 'their', 'about', 'when', 'what', 'which', 'have', 'does', 'will', 'been', 'being', 'some', 'only', 'also', 'into', 'than', 'each', 'other', 'make', 'like', 'just', 'over', 'such']);
            const topicKeywords = `${loLower} ${skillLower}`
                .replace(/[^a-z\s]/g, '')
                .split(/\s+/)
                .filter((w: string) => w.length >= 4 && !miscStopwords.has(w));

            const catalogScored = (misconceptionCatalog as any[])
                .filter((m: any) => {
                    const mSubject = (m.SUBJECT || '').toLowerCase();
                    return subject.includes('math') ? mSubject === 'math' : subject.includes('sci') ? mSubject === 'science' : true;
                })
                .map((m: any) => {
                    const mText = `${m.TOPIC_CLUSTER || ''} ${m.TOPIC || ''} ${m.MISCONCEPTION || ''}`.toLowerCase();
                    const matchCount = topicKeywords.filter((kw: string) => mText.includes(kw)).length;
                    // Bonus for TOPIC match (more relevant than random keyword in misconception text)
                    const topicText = `${m.TOPIC_CLUSTER || ''} ${m.TOPIC || ''}`.toLowerCase();
                    const topicBonus = topicKeywords.filter((kw: string) => topicText.includes(kw)).length * 2;
                    return { m, score: matchCount + topicBonus };
                })
                .filter(s => s.score >= 2) // Require at least 2 keyword matches
                .sort((a, b) => b.score - a.score)
                .slice(0, 20); // Top 20 most relevant

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
                try {
                    const searchResult = await generateWithGroundedSearch('Misconception Agent',
                        `Search for student misconceptions about: "${this.config.lo}" (${subject}, grade ${grade}). Check: ${sourceUrls.join(', ')}, MOSART, AAAS. If none, say "NO_MISCONCEPTIONS_FOUND".`,
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
        const cellContentMap: Record<string, string[]> = {};

        for (const { cell } of cellQueue) {
            const thisCellDef = cellDataMap[cell]?.definition || cell;
            try {
                const selection = await generateAgentResponse(
                    'Content Selector',
                    `Pick 3-8 knowledge points MOST appropriate for cell ${cell} (${thisCellDef}). Grade: ${grade}, Subject: ${subjectName}. Return JSON array of strings.
R1=facts/definitions, U1/U2=concepts to explain/compare, A2=rules to apply, AN2=patterns to analyze. Pick DIFFERENT points per cell.`,
                    JSON.stringify(allScopePoints),
                    { type: 'ARRAY' as any, items: { type: 'STRING' as any } }
                );
                cellContentMap[cell] = selection || allScopePoints.slice(0, 5);
                this.log('Content Selector', `${cell}: ${(selection || []).length} points.`);
            } catch {
                cellContentMap[cell] = allScopePoints.slice(0, 5);
            }
        }
        this.artifacts.cellContentMap = cellContentMap;

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
        const misconceptions = (this.artifacts.approvedMisconceptions || []).slice(0, 4).map((m: any) => m.text || m.misconception_text || '');

        this.log('Generation Agent', `Cell ${cellIndex + 1}/${cellQueue.length}: Generating ${count} item(s) for ${cell}...`);

        // Use externalized dicts from prompts.ts
        const typesForCell = TypeRotation[cell] || ['mcq', 'mcq', 'mcq'];
        const startId = (this.artifacts.allQuestions || []).length + 1;

        // Distribute content uniquely
        const distributedContent: string[] = [];
        if (cellScope.length === 0) {
            for (let i = 0; i < count; i++) distributedContent.push(this.config.skill);
        } else {
            const shuffled = [...cellScope].sort(() => Math.random() - 0.5);
            for (let i = 0; i < count; i++) {
                if (i < shuffled.length) distributedContent.push(shuffled[i]);
                else {
                    const a = shuffled[i % shuffled.length];
                    const b = shuffled[(i + 1) % shuffled.length];
                    distributedContent.push(a !== b ? `${a} AND ${b}` : a);
                }
            }
        }

        // --- TWO-STAGE GENERATION (parallel Stage 1, then sequential Stage 2) ---
        const questionPromises = Array.from({ length: count }, (_, qi) => {
            const qType = typesForCell[qi % typesForCell.length];
            const contentPoint = distributedContent[qi];
            const qId = `${cell}-${startId + qi}`;
            const otherPoints = distributedContent.filter((_, i) => i !== qi).slice(0, 3).join('; ');

            // STAGE 1: Create question (creative, temp 0.4)
            const stage1Prompt = `${Prompts.GenerationStage1}
${CellRules[cell] || ''}
Cell: ${thisCellDef}
Generate 1 "${qType}". ${TypeInstructions[qType] || TypeInstructions.mcq}
Content: "${contentPoint}"
Other questions test: ${otherPoints}. DO NOT overlap.
Grade: ${grade}, Subject: ${subjectName}, Skill: ${this.config.skill}
${misconceptions.length > 0 ? 'Misconceptions: ' + misconceptions.slice(0, 2).join('; ') : ''}`;

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
                        return { ...polished, cell, type: qType, id: qId };
                    } catch {
                        // Stage 2 failed — use Stage 1 draft
                        this.log('Generation Agent', `${qId}: ${qType} ✓ (stage 1 only)`);
                        return { ...draft, cell, type: qType, id: qId };
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
