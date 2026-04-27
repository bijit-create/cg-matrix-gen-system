import { Type, Schema } from '@google/genai';

// These correspond strictly to the Prompt instructions provided by the User

export const IntakeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        task_id: { type: Type.STRING },
        grade: { type: Type.STRING },
        subject: { type: Type.STRING },
        learning_objective: { type: Type.STRING },
        skill: { type: Type.STRING },
        target_question_count: { type: Type.INTEGER },
        allowed_question_types: { type: Type.ARRAY, items: { type: Type.STRING } },
        CG_constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
        source_artifacts: { type: Type.ARRAY, items: { type: Type.STRING } },
        ambiguities: { type: Type.ARRAY, items: { type: Type.STRING } },
        missing_information: { type: Type.ARRAY, items: { type: Type.STRING } },
        readiness_status: { type: Type.STRING, enum: ['ready', 'blocked'] }
    },
    required: ["task_id", "grade", "subject", "learning_objective", "skill", "target_question_count", "readiness_status"]
};

export const ConstructSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        construct_statement: { type: Type.STRING },
        evidence_of_mastery: { type: Type.STRING },
        non_evidence_or_out_of_scope: { type: Type.STRING },
        construct_boundaries: { type: Type.STRING },
        bundled_constructs_flag: { type: Type.BOOLEAN },
        notes_for_subskill_agent: { type: Type.STRING }
    },
    required: ["construct_statement", "evidence_of_mastery", "non_evidence_or_out_of_scope", "bundled_constructs_flag"]
};

export const SubskillSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            subskill_id: { type: Type.STRING },
            subskill_description: { type: Type.STRING },
            role_in_construct: { type: Type.STRING },
            prerequisite_subskills: { type: Type.ARRAY, items: { type: Type.STRING } },
            complexity_level: { type: Type.STRING },
            suitable_CG_cells: { type: Type.ARRAY, items: { type: Type.STRING } },
            assessment_notes: { type: Type.STRING }
        },
        required: ["subskill_id", "subskill_description", "role_in_construct", "complexity_level", "suitable_CG_cells"]
    }
};

const CellSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        count: { type: Type.INTEGER },
        definition: { type: Type.STRING },
        status: { type: Type.STRING, enum: ['active', 'not_required', 'not_applicable'] }
    },
    required: ["count", "definition", "status"]
};

export const CGMapperSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        matrix: {
            type: Type.OBJECT,
            properties: {
                R1: CellSchema, U1: CellSchema, U2: CellSchema,
                A2: CellSchema, A3: CellSchema, AN2: CellSchema, AN3: CellSchema
            },
            required: ["R1", "U1", "U2", "A2", "A3", "AN2", "AN3"]
        },
        total_questions: { type: Type.INTEGER },
        risk_flags: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["matrix", "total_questions"]
};

export const MisconceptionSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            misconception_id: { type: Type.STRING },
            misconception_text: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['conceptual', 'procedural', 'factual'] },
            prevalence: { type: Type.STRING, enum: ['common', 'moderate', 'rare'] },
            incorrect_reasoning: { type: Type.STRING },
            related_subskills: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["misconception_id", "misconception_text", "type", "prevalence", "incorrect_reasoning"]
    }
};

export const ContentScopeSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            category: { type: Type.STRING },
            knowledge_point: { type: Type.STRING },
            source: { type: Type.STRING },
            grade_level: { type: Type.STRING, enum: ['primary', 'middle', 'high'] },
            scope_type: { type: Type.STRING, enum: ['core', 'supporting', 'advanced'] },
            needs_visual: { type: Type.BOOLEAN },
            flag: { type: Type.STRING }
        },
        required: ["id", "category", "knowledge_point", "source", "grade_level", "scope_type"]
    }
};

// Single question schema — Gemini generates ONE complete question per call
export const GenerationSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        type: { type: Type.STRING },
        stem: { type: Type.STRING },
        answer: { type: Type.STRING },
        rationale: { type: Type.STRING },
        needs_image: { type: Type.BOOLEAN },
        // Required when needs_image=true. Describes what the image should
        // DEPICT (the answer subject), not what the question text says.
        // Used by the image-gen step to build the final gpt-image-2 prompt.
        image_desc: { type: Type.STRING },
        // The misconception this question PROBES — picked from the approved
        // list passed in the prompt. Empty string means "no listed misconception
        // applies"; the audit treats that as a warn, not a fail. Required so the
        // generator must declare intent rather than guess.
        misconception_id_targeted: { type: Type.STRING },
        // Plain-text echo of the reasoning error this item is designed to
        // catch — used by the rationale and the audit's coverage check.
        misconception_reasoning_error: { type: Type.STRING },
        // MCQ: 4 options. Each wrong option must trace either to a
        // misconception_id from the approved list or to a typed
        // reasoning_error (e.g., 'over-generalisation', 'size-based-classification').
        options: { type: Type.ARRAY, items: {
            type: Type.OBJECT,
            properties: {
                label: { type: Type.STRING },
                text: { type: Type.STRING },
                correct: { type: Type.BOOLEAN },
                why_wrong: { type: Type.STRING },
                image_desc: { type: Type.STRING },
                misconception_id: { type: Type.STRING },
                reasoning_error: { type: Type.STRING }
            },
            required: ["label", "text", "correct", "why_wrong"]
        }},
        // Error analysis: steps
        steps: { type: Type.ARRAY, items: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                correct: { type: Type.BOOLEAN },
                fix: { type: Type.STRING },
                // Typed physics/math error categories when applicable
                error_type: { type: Type.STRING }
            },
            required: ["text", "correct"]
        }},
        // Match: pairs as "left → right" strings
        pairs: { type: Type.ARRAY, items: { type: Type.STRING } },
        // Arrange: items in correct order
        items: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["id", "type", "stem", "answer", "rationale", "misconception_id_targeted", "misconception_reasoning_error"]
};

export const QASchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question_id: { type: Type.STRING },
            pass: { type: Type.BOOLEAN },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            severity: { type: Type.STRING, enum: ['critical', 'major', 'minor', 'none'] }
        },
        required: ["question_id", "pass", "issues", "severity"]
    }
};

// Grade scope profile — output of GradeScopeAgent, injected into generation prompts.
export const GradeScopeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        notation: { type: Type.STRING },
        number_range: { type: Type.STRING },
        vocabulary: { type: Type.STRING },
        familiar_contexts: { type: Type.ARRAY, items: { type: Type.STRING } },
        in_scope: { type: Type.ARRAY, items: { type: Type.STRING } },
        out_of_scope: { type: Type.ARRAY, items: { type: Type.STRING } },
        stem_cap_words: { type: Type.INTEGER },
        concrete_lock: { type: Type.BOOLEAN }
    },
    required: ["notation", "number_range", "vocabulary", "familiar_contexts", "in_scope", "out_of_scope", "concrete_lock"]
};
