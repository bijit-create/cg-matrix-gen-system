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

export const GenerationSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question_id: { type: Type.STRING },
            cg_cell: { type: Type.STRING },
            question_type: { type: Type.STRING, enum: ['mcq', 'picture_mcq', 'stimulus_based', 'fill_blank', 'one_word', 'error_analysis', 'rearrange', 'match', 'arrange'] },
            stem: { type: Type.STRING },
            correct_answer: { type: Type.STRING },
            rationale: { type: Type.STRING },
            targeted_subskill: { type: Type.STRING },
            difficulty: { type: Type.INTEGER },
            needs_image: { type: Type.BOOLEAN },
            image_generation_prompt: { type: Type.STRING },
            stimulus_description: { type: Type.STRING },
            // MCQ / picture_mcq fields
            options: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING },
                        text: { type: Type.STRING },
                        is_correct: { type: Type.BOOLEAN },
                        targeted_misconception: { type: Type.STRING },
                        distractor_rationale: { type: Type.STRING },
                        image_description: { type: Type.STRING }
                    },
                    required: ["label", "text", "is_correct"]
                }
            },
            // Error Analysis fields
            steps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        step_number: { type: Type.INTEGER },
                        text: { type: Type.STRING },
                        is_correct: { type: Type.BOOLEAN },
                        correct_version: { type: Type.STRING }
                    },
                    required: ["step_number", "text", "is_correct"]
                }
            },
            // Rearrange fields
            rearrange_steps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        movable_fixed: { type: Type.STRING, enum: ['Fixed', 'Movable'] }
                    },
                    required: ["text", "movable_fixed"]
                }
            },
            distractor_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            // Match the Following fields
            match_pairs: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        left: { type: Type.STRING },
                        right: { type: Type.STRING }
                    },
                    required: ["left", "right"]
                }
            },
            // Arrange the Following fields
            arrange_items: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["question_id", "cg_cell", "question_type", "stem", "correct_answer", "rationale"]
    }
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
