import { generateAgentResponse, generateWithGroundedSearch } from './api';
import { Prompts } from './prompts';
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
                chapter_content: this.summarizeContent(this.config.chapterContent || "Not provided.", 4000),
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

    // ===== GATE 1 APPROVED → Content Scoping → GATE 2 =====
    public async executeContentScoping(approvedSubskills: any[], sourcedContent: string[] = []) {
        if (this.config.onStateChange) this.config.onStateChange('running', 3);
        this.artifacts.approvedSubskills = approvedSubskills;
        this.artifacts.sourcedContent = sourcedContent;

        this.log('Content Scoping Agent', 'Analyzing content to extract knowledge points...');
        const scopePayload = {
            learning_objective: this.config.lo,
            skill: this.config.skill,
            grade: this.artifacts.intake?.grade || 'unknown',
            subject: this.artifacts.intake?.subject || 'unknown',
            construct: this.artifacts.construct,
            subskills: approvedSubskills,
            chapter_content: this.summarizeContent(this.config.chapterContent || 'No content provided.'),
            ...(sourcedContent.length > 0 && { sourced_references: sourcedContent.slice(0, 5) })
        };

        try {
            const scopeOutput = await this.runAgent('Content Scoping Agent', Prompts.ContentScopingAgent, scopePayload, ContentScopeSchema);
            this.artifacts.contentScope = scopeOutput;
            if (this.config.onData) this.config.onData('contentScope', scopeOutput);

            const core = scopeOutput.filter((k: any) => k.scope_type === 'core').length;
            const supporting = scopeOutput.filter((k: any) => k.scope_type === 'supporting').length;
            const advanced = scopeOutput.filter((k: any) => k.scope_type === 'advanced').length;
            this.log('Content Scoping Agent', `Extracted ${scopeOutput.length} knowledge points: ${core} core, ${supporting} supporting, ${advanced} advanced (flagged).`);
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
            const catalogSubset = (misconceptionCatalog as any[]).filter((m: any) => {
                const mSubject = (m.SUBJECT || '').toLowerCase();
                const subjectMatch = subject.includes('math') ? mSubject === 'math' : subject.includes('sci') ? mSubject === 'science' : true;
                if (!subjectMatch) return false;
                const mText = `${m.TOPIC_CLUSTER} ${m.TOPIC} ${m.MISCONCEPTION}`.toLowerCase();
                const keywords = `${loLower} ${skillLower}`.split(/\s+/).filter((w: string) => w.length > 3);
                return keywords.some((kw: string) => mText.includes(kw));
            });
            const catalogMatches = catalogSubset.map((m: any) => ({
                id: m.ID, topic: m.TOPIC, misconception: m.MISCONCEPTION,
                type: m.TYPE, prevalence: m.PREVALENCE, source: m.SOURCE
            }));
            this.log('Misconception Agent', `${catalogMatches.length} catalog matches.`);

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

        // Cell-specific cognitive rules
        const cellRules: Record<string, string> = {
            R1: `R1 — Remember DOK1: Student IDENTIFIES/RECALLS/NAMES facts from memory. No explaining or comparing. Pattern: "What is...?", "Name the...", "Which is a...?"`,
            U1: `U1 — Understand DOK1: Student EXPLAINS/INTERPRETS defining characteristics. No comparing multiple cases. Pattern: "Why is...?", "What happens when...?"`,
            U2: `U2 — Understand DOK2: Student COMPARES/CLASSIFIES using explicit criteria. No applying rules to new cases. Pattern: "Compare X and Y", "Classify into..."`,
            A2: `A2 — Apply DOK2: Student APPLIES learned rules to NEW concrete examples. Present NOVEL scenarios. Pattern: "Kabir has... How should he classify?"`,
            A3: `A3 — Apply DOK3: Student APPLIES rules across MULTIPLE STEPS. Non-routine problems.`,
            AN2: `AN2 — Analyze DOK2: Student ANALYZES/INFERS patterns in structured data. Pattern: "Look at this data and find...", "What pattern?"`,
            AN3: `AN3 — Analyze DOK3: Student DETECTS ERRORS/EVALUATES REASONING. Pattern: "Find the mistake in..."`
        };

        // Assign types to each question position
        const typeMap: Record<string, string[]> = {
            R1: ['mcq', 'fill_blank', 'picture_mcq', 'match', 'mcq'],
            U1: ['mcq', 'fill_blank', 'picture_mcq', 'fill_blank', 'mcq'],
            U2: ['mcq', 'match', 'picture_mcq', 'arrange', 'mcq'],
            A2: ['mcq', 'error_analysis', 'picture_mcq', 'error_analysis', 'mcq'],
            A3: ['error_analysis', 'mcq', 'error_analysis'],
            AN2: ['mcq', 'error_analysis', 'mcq', 'error_analysis'],
            AN3: ['error_analysis', 'error_analysis', 'mcq'],
        };
        const typesForCell = typeMap[cell] || ['mcq', 'mcq', 'mcq'];

        // Generate questions IN PARALLEL (requestQueue handles concurrency)
        const startId = (this.artifacts.allQuestions || []).length + 1;

        const typeInstructions: Record<string, string> = {
            mcq: `MCQ with 4 options (A,B,C,D). 1 correct (correct=true). Wrong options need "why_wrong". Fill "options" array.`,
            picture_mcq: `PICTURE-BASED MCQ. Short stem. 4 visual options. Each option needs "image_desc" (e.g. "a bowl of rice"). Set needs_image=true. Fill "options" array.`,
            fill_blank: `Fill-in-the-blank. Put ##answer## in stem. Set answer field.`,
            error_analysis: `Error analysis. "steps" array (3-4 steps). 1-2 wrong (correct=false) with "fix". Stem: "Find the incorrect step."`,
            match: `Match-the-following. "pairs" array with 4-5 strings like "Rice → Plant-based".`,
            arrange: `Arrange-in-order. "items" array with 4-5 items in correct order.`,
        };

        const questionPromises = Array.from({ length: count }, (_, qi) => {
            const qType = typesForCell[qi % typesForCell.length];
            const contentPoint = cellScope[qi % cellScope.length] || cellScope[0] || this.config.skill;
            const qId = `${cell}-${startId + qi}`;

            const prompt = `${Prompts.GenerationAgent}
${cellRules[cell] || ''}
Cell: ${thisCellDef}
Generate 1 "${qType}" question. ${typeInstructions[qType] || typeInstructions.mcq}
Content: ${contentPoint}
Grade: ${grade}, Subject: ${subjectName}, Skill: ${this.config.skill}
${misconceptions.length > 0 ? 'Misconceptions: ' + misconceptions.slice(0, 2).join('; ') : ''}
LANGUAGE: Simple English, Indian names, short stems, no negative phrasing.`;

            return generateAgentResponse('Generation Agent', prompt, JSON.stringify({ id: qId, type: qType, cell }), GenerationSchema)
                .then(q => {
                    this.log('Generation Agent', `${qId}: ${qType} ✓`);
                    return { ...q, cell, type: qType };
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

        // Auto-generate images for picture_mcq questions
        const pictureMcqs = cellQuestions.filter(q => q.type === 'picture_mcq');
        if (pictureMcqs.length > 0) {
            this.log('Image Agent', `Generating images for ${pictureMcqs.length} picture MCQ(s)...`);
            const { generateImageContent } = await import('./api');
            const { normalizeToCanvas } = await import('./imageGen');
            const imageResults: Record<string, string> = {};

            for (const q of pictureMcqs) {
                const qId = q.id || q.question_id;
                // Generate stem image
                try {
                    const stemPrompt = `A simple flat vector educational diagram for: "${q.stem}". Minimalist style, solid white background, clear bold labels, child-friendly, 4:3 aspect ratio. Show the question visually with a "?" mark.`;
                    const rawImg = await generateImageContent(stemPrompt);
                    const { dataUrl } = await normalizeToCanvas(rawImg);
                    imageResults[qId] = dataUrl;
                    this.log('Image Agent', `${qId}: stem image ✓`);
                } catch (e: any) {
                    this.log('Image Agent', `${qId}: stem image failed`);
                }

                // Generate option images
                if (q.options) {
                    for (const opt of q.options) {
                        const desc = opt.image_desc || opt.text;
                        if (!desc) continue;
                        const optKey = `${qId}_opt_${opt.label || 'X'}`;
                        try {
                            const optPrompt = `A simple flat vector illustration of "${desc}". Minimalist, solid white background, clear bold outlines, child-friendly, no text labels, 4:3 aspect ratio.`;
                            const rawImg = await generateImageContent(optPrompt);
                            const { dataUrl } = await normalizeToCanvas(rawImg);
                            imageResults[optKey] = dataUrl;
                        } catch {
                            // Skip failed option images
                        }
                    }
                    this.log('Image Agent', `${qId}: option images done`);
                }
            }
            if (Object.keys(imageResults).length > 0 && this.config.onData) {
                this.config.onData('questionImages', imageResults);
            }
        }

        // Run rule-based QA
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

        // AI SME QA
        let aiQaResults: any[] = [];
        try {
            const qaPayload = {
                questions: allQuestions.map((q: any) => ({
                    question_id: q.question_id, cg_cell: q.cg_cell, question_type: q.question_type,
                    stem: q.stem, options: q.options, correct_answer: q.correct_answer, rationale: q.rationale
                })),
                learning_objective: this.config.lo,
                grade: this.artifacts.intake?.grade || 'unknown'
            };
            aiQaResults = await this.runAgent('AI SME QA', Prompts.QAAgent, qaPayload, QASchema);
        } catch (e: any) {
            this.log('AI SME QA', `Failed: ${e.message?.slice(0, 60)}`);
        }

        // Merge
        const mergedQA = allQuestions.map((q: any) => {
            const qId = q.question_id || q.id;
            const rule = ruleResults.find(r => r.question_id === qId);
            const ai = aiQaResults.find((r: any) => r.question_id === qId);
            const allIssues: string[] = [];
            if (rule) rule.flags.forEach(f => allIssues.push(`[${f.category}/${f.severity}] ${f.message}`));
            if (ai?.issues) ai.issues.forEach((issue: string) => allIssues.push(`[AI-SME] ${issue}`));
            const hasCritical = allIssues.some(i => i.includes('/critical]')) || ai?.severity === 'critical';
            const hasMajor = allIssues.some(i => i.includes('/major]')) || ai?.severity === 'major';
            return {
                question_id: qId, pass: !hasCritical && !hasMajor,
                issues: allIssues, suggestions: ai?.suggestions || [],
                severity: hasCritical ? 'critical' : hasMajor ? 'major' : 'none'
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
