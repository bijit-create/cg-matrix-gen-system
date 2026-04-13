import { generateAgentResponse, generateWithGroundedSearch } from './api';
import { Prompts } from './prompts';
import { IntakeSchema, ConstructSchema, SubskillSchema, CGMapperSchema, MisconceptionSchema, ContentScopeSchema, GenerationSchema, QASchema } from './schemas';
import misconceptionCatalog from '../knowledge_base/student_misconceptions_catalog.json';
// imageGen is used on-demand from the UI, not in the pipeline
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
            const contextStr = JSON.stringify(payload, null, 2);
            const res = await generateAgentResponse(prompt, contextStr, schema);
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

        // --- Custom Hess Matrix Agent ---
        const matrixPayload = {
            construct: this.artifacts.construct,
            subskills: approvedSubskills,
            target_questions: this.config.count,
            grade: grade,
            subject: this.artifacts.intake?.subject || '',
            learning_objective: this.config.lo,
            skill: this.config.skill,
            approved_knowledge_points: knowledgeSummary,
        };

        try {
            const cgOutput = await this.runAgent('Custom Hess Matrix Agent', Prompts.CGMapperAgent, matrixPayload, CGMapperSchema);
            const matrix = cgOutput.matrix || {};
            // Extract counts for backward compat
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
            // Log the matrix
            const active = Object.entries(cellData).filter(([_, d]: [string, any]) => d.status === 'active');
            const inactive = Object.entries(cellData).filter(([_, d]: [string, any]) => d.status !== 'active');
            this.log('Custom Hess Matrix Agent', `${active.length} active cells, ${inactive.length} inactive. Total: ${cgOutput.total_questions || 0} questions.`);
        } catch (e: any) {
            this.log('Custom Hess Matrix Agent', `Failed: ${e.message}. Using default matrix.`);
            this.artifacts.cgPlan = { R1: 2, U1: 3, U2: 3, A2: 4, A3: 0, AN2: 1, AN3: 0 };
            if (this.config.onData) this.config.onData('cgPlan', this.artifacts.cgPlan);
        }

        // --- Misconception Agent ---
        this.log('Misconception Agent', 'Starting processing...');
        const loLower = this.config.lo.toLowerCase();
        const skillLower = this.config.skill.toLowerCase();

        const catalogSubset = (misconceptionCatalog as any[]).filter((m: any) => {
            const mSubject = (m.SUBJECT || '').toLowerCase();
            const subjectMatch = subject.includes('math') ? mSubject === 'math'
                : subject.includes('sci') ? mSubject === 'science' : true;
            if (!subjectMatch) return false;
            const mText = `${m.TOPIC_CLUSTER} ${m.TOPIC} ${m.MISCONCEPTION}`.toLowerCase();
            const keywords = `${loLower} ${skillLower}`.split(/\s+/).filter((w: string) => w.length > 3);
            return keywords.some((kw: string) => mText.includes(kw));
        });

        const catalogMatches = catalogSubset.map((m: any) => ({
            id: m.ID, topic: m.TOPIC, misconception: m.MISCONCEPTION,
            type: m.TYPE, prevalence: m.PREVALENCE, source: m.SOURCE, source_url: m.SOURCE_URL
        }));

        this.log('Misconception Agent', `Found ${catalogMatches.length} catalog matches.`);
        let misconceptionOutput: any[] = [];

        if (catalogMatches.length >= 4) {
            const payload = {
                construct: this.artifacts.construct,
                subskills: approvedSubskills,
                learning_objective: this.config.lo,
                skill: this.config.skill,
                catalog_matches: catalogMatches.slice(0, 30),
                instruction: 'Select 4-8 most relevant misconceptions from catalog_matches. Do NOT invent new ones.'
            };
            misconceptionOutput = await this.runAgent('Misconception Agent', Prompts.MisconceptionAgent, payload, MisconceptionSchema);
        } else {
            this.log('Misconception Agent', `Catalog insufficient. Searching online...`);
            const sourceUrls = [...new Set((misconceptionCatalog as any[])
                .filter((m: any) => subject.includes('math') ? (m.SUBJECT || '').toLowerCase() === 'math'
                    : subject.includes('sci') ? (m.SUBJECT || '').toLowerCase() === 'science' : true)
                .map((m: any) => m.SOURCE_URL).filter(Boolean)
            )].slice(0, 6);

            try {
                const searchResult = await generateWithGroundedSearch(
                    `Search for research-backed student misconceptions about: "${this.config.lo}" / "${this.config.skill}" (${subject}, grade ${grade}). Check: ${sourceUrls.join(', ')}, MOSART, AAAS Project 2061. Report misconception text + source. If none found, say "NO_MISCONCEPTIONS_FOUND".`,
                    JSON.stringify({ lo: this.config.lo, skill: this.config.skill })
                );
                if (searchResult.text.includes('NO_MISCONCEPTIONS_FOUND')) {
                    misconceptionOutput = [];
                } else {
                    misconceptionOutput = await this.runAgent('Misconception Agent', Prompts.MisconceptionAgent, {
                        instruction: 'Parse research findings into structured misconceptions. Only include those with cited sources.',
                        research_findings: searchResult.text, catalog_matches: catalogMatches, learning_objective: this.config.lo
                    }, MisconceptionSchema);
                }
            } catch (e: any) {
                this.log('Misconception Agent', `Search failed: ${e.message}`);
                misconceptionOutput = catalogMatches.slice(0, 8).map((m: any, i: number) => ({
                    misconception_id: m.id || `M-${i+1}`, misconception_text: m.misconception,
                    type: (m.type || 'conceptual').toLowerCase(), prevalence: m.prevalence || 'unknown',
                    incorrect_reasoning: `Source: ${m.source}`
                }));
            }
        }

        this.artifacts.misconceptions = misconceptionOutput;
        if (this.config.onData) {
            this.config.onData('misconceptions', misconceptionOutput);
            if (misconceptionOutput.length === 0) this.config.onData('misconceptions_not_found', true);
        }

        // GATE 3: Hess Matrix & Misconception Approval
        if (this.config.onStateChange) this.config.onStateChange('waiting', 5);
        return this.artifacts;
    }

    // ===== GATE 3 APPROVED → Research + Generation + QA + Images → GATE 4 =====
    public async executePhase3(approvedCgPlan: Record<string, number>, approvedMisconceptions: any[]) {
        if (this.config.onStateChange) this.config.onStateChange('running', 7);
        this.artifacts.cgPlan = approvedCgPlan;
        this.artifacts.approvedMisconceptions = approvedMisconceptions;

        const grade = this.artifacts.intake?.grade || '';
        const subjectName = this.artifacts.intake?.subject || '';
        const approvedContentScope = this.artifacts.approvedContentScope || [];
        const sourcedContent = this.artifacts.sourcedContent || [];
        // --- Research Agent — always search for exemplar questions ---
        this.log('Research Agent', 'Searching internet for exemplar-quality questions...');
        let exemplarQuestions = '';
        try {
            const res = await generateWithGroundedSearch(
                `Find 8-12 high-quality assessment questions about: "${this.config.lo}" (${subjectName}, Grade ${grade}).
Search: NCERT Exemplar, CBSE sample papers, state board exemplars, KVS/NVS papers, Olympiad banks (SOF/HBCSE), DIKSHA, Khan Academy.
For each: exact question text, source citation, cognitive level, what makes it good. Only REAL questions — say "NO_EXEMPLARS_FOUND" if none.`,
                JSON.stringify({ topic: this.config.lo, skill: this.config.skill, grade, subject: subjectName })
            );
            exemplarQuestions = res.text || '';
            if (exemplarQuestions.includes('NO_EXEMPLARS_FOUND')) {
                this.log('Research Agent', 'No exemplars found. Generating from construct only.');
                exemplarQuestions = '';
            } else {
                this.log('Research Agent', 'Found reference questions. Using as quality benchmark.');
            }
        } catch (e: any) {
            this.log('Research Agent', `Research failed: ${e.message}`);
        }

        // --- Generation Agent per CG cell ---
        const allQuestions: any[] = [];
        let globalQId = 1;
        const cellsToGenerate = Object.entries(approvedCgPlan).filter(([_, num]) => (num as number) > 0) as [string, number][];

        // Build compact scope list
        const scopeList = approvedContentScope.map((k: any) => k.knowledge_point).join('\n');
        const cellDataMap = this.artifacts.cellData || {};

        // Split large cells into batches of max 3 to avoid JSON overflow
        const batches: { cell: string, num: number, startId: number }[] = [];
        for (const [cell, num] of cellsToGenerate) {
            let remaining = num;
            while (remaining > 0) {
                const batch = Math.min(remaining, 3);
                batches.push({ cell, num: batch, startId: globalQId });
                globalQId += batch;
                remaining -= batch;
            }
        }

        // --- Step 1: Content Selection per cell (lightweight, no question generation) ---
        this.log('Content Selector', 'Selecting content for each cell...');
        const cellContentMap: Record<string, string[]> = {};
        const allScopePoints = approvedContentScope.map((k: any) => k.knowledge_point);

        for (const [cell] of cellsToGenerate) {
            const thisCellDef = cellDataMap[cell]?.definition || cell;
            try {
                const selection = await generateAgentResponse(
                    `You are selecting knowledge points for a specific CG matrix cell. Pick 3-8 knowledge points that are MOST appropriate for this cell's cognitive level. Return a JSON array of strings (just the selected points).

Cell: ${cell}
Cell Definition: ${thisCellDef}
Grade: ${grade}, Subject: ${subjectName}

Rules:
- R1 cells: pick facts, definitions, labels that can be recalled
- U1/U2 cells: pick concepts that can be explained or compared
- A2 cells: pick rules/procedures that can be applied to new cases
- AN2 cells: pick relationships/patterns that can be analyzed
- Select DIFFERENT points than other cells where possible`,
                    JSON.stringify(allScopePoints),
                    { type: 'ARRAY' as any, items: { type: 'STRING' as any } }
                );
                cellContentMap[cell] = selection || allScopePoints.slice(0, 5);
                this.log('Content Selector', `${cell}: ${selection.length} points selected.`);
            } catch {
                cellContentMap[cell] = allScopePoints.slice(0, 5);
                this.log('Content Selector', `${cell}: fallback to first 5 points.`);
            }
        }

        // --- Step 2: Generate questions per batch using only selected content ---
        for (const batch of batches) {
            const thisCellDef = cellDataMap[batch.cell]?.definition || batch.cell;
            const cellScope = (cellContentMap[batch.cell] || []).join('\n- ');
            this.log('Generation Agent', `Generating ${batch.num} item(s) for ${batch.cell}...`);

            const genPayload = {
                lo: this.config.lo,
                skill: this.config.skill,
                grade: grade || 'unknown',
                subject: subjectName || 'unknown',
                cell: batch.cell,
                cell_definition: thisCellDef,
                count: batch.num,
                start_id: batch.startId,
                misconceptions: approvedMisconceptions.slice(0, 4).map((m: any) => m.text || m.misconception_text || ''),
                selected_content: cellScope
            };

            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const cellQuestions = await this.runAgent('Generation Agent', Prompts.GenerationAgent, genPayload, GenerationSchema);
                    allQuestions.push(...cellQuestions);
                    break;
                } catch (e: any) {
                    if (attempt === 0) {
                        this.log('Generation Agent', `Attempt 1 failed for ${batch.cell}: ${e.message?.slice(0, 60)}. Retrying...`);
                    } else {
                        this.log('Generation Agent', `Failed for ${batch.cell} after 2 attempts.`);
                    }
                }
            }

            // Emit partial results so UI updates progressively
            if (this.config.onData) this.config.onData('questions', [...allQuestions]);
        }

        this.artifacts.questions = allQuestions;
        if (this.config.onData) this.config.onData('questions', allQuestions);
        this.log('Generation Agent', `Generated ${allQuestions.length}/${Object.values(approvedCgPlan).reduce((a: number, b) => a + (b as number), 0)} total items.`);

        if (this.config.onStateChange) this.config.onStateChange('running', 8);

        // --- Layer 1: Rule-Based QA (instant, no API call) ---
        this.log('Rule-Based QA', 'Running heuristic checks...');
        const ruleResults = runRuleBasedQA(allQuestions, this.config.lo);
        const ruleFlags = ruleResults.reduce((sum, r) => sum + r.flags.length, 0);
        const ruleFails = ruleResults.filter(r => !r.pass).length;
        this.log('Rule-Based QA', `${ruleFlags} flags across ${allQuestions.length} items. ${ruleFails} items have critical/major issues.`);
        if (this.config.onData) this.config.onData('ruleQAResults', ruleResults);

        // --- Layer 2: AI SME QA (Gemini-powered deep semantic checks) ---
        this.log('AI SME QA', 'Starting deep semantic review...');
        let aiQaResults: any[] = [];
        try {
            const qaPayload = {
                questions: allQuestions.map((q: any) => ({
                    question_id: q.question_id, cg_cell: q.cg_cell, question_type: q.question_type,
                    stem: q.stem, options: q.options, correct_answer: q.correct_answer,
                    rationale: q.rationale, steps: q.steps
                })),
                construct: this.artifacts.construct,
                misconceptions: approvedMisconceptions.slice(0, 8),
                cg_plan: approvedCgPlan,
                learning_objective: this.config.lo,
                grade: grade,
                approved_content_scope: scopeList
            };
            aiQaResults = await this.runAgent('AI SME QA', Prompts.QAAgent, qaPayload, QASchema);
            this.log('AI SME QA', `${aiQaResults.filter((r: any) => r.pass).length} passed, ${aiQaResults.filter((r: any) => !r.pass).length} flagged.`);
        } catch (e: any) {
            this.log('AI SME QA', `Failed: ${e.message}. Using rule-based results only.`);
        }

        // Merge both QA layers
        const mergedQA = allQuestions.map((q: any) => {
            const qId = q.question_id || q.id;
            const rule = ruleResults.find(r => r.question_id === qId);
            const ai = aiQaResults.find((r: any) => r.question_id === qId);
            const allIssues: string[] = [];
            const allSuggestions: string[] = [];

            // Add rule-based flags
            if (rule) {
                rule.flags.forEach(f => allIssues.push(`[${f.category}/${f.severity}] ${f.message}`));
            }
            // Add AI flags
            if (ai?.issues) {
                ai.issues.forEach((issue: string) => {
                    if (!allIssues.some(existing => existing.includes(issue.slice(0, 30)))) {
                        allIssues.push(`[AI-SME] ${issue}`);
                    }
                });
            }
            if (ai?.suggestions) {
                allSuggestions.push(...ai.suggestions);
            }

            const hasCritical = allIssues.some(i => i.includes('/critical]')) || ai?.severity === 'critical';
            const hasMajor = allIssues.some(i => i.includes('/major]')) || ai?.severity === 'major';

            return {
                question_id: qId,
                pass: !hasCritical && !hasMajor && (ai?.pass !== false),
                issues: allIssues,
                suggestions: allSuggestions,
                severity: hasCritical ? 'critical' : hasMajor ? 'major' : (ai?.severity || 'none'),
                rule_flags: rule?.flags || [],
                ai_pass: ai?.pass
            };
        });

        this.artifacts.qaResults = mergedQA;
        if (this.config.onData) this.config.onData('qaResults', mergedQA);
        const totalPass = mergedQA.filter(r => r.pass).length;
        this.log('QA Summary', `Final: ${totalPass}/${mergedQA.length} passed (rule-based + AI SME combined).`);

        // Image generation is now on-demand per question (user clicks "Generate Image" button)

        // GATE 4: Final Set Approval
        if (this.config.onStateChange) this.config.onStateChange('waiting', 9);
        return this.artifacts;
    }
}
