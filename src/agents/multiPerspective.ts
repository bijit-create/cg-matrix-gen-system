/**
 * Multi-Perspective AI Evaluation
 *
 * For qualitative decisions, calls AI 3 times with different framings,
 * then quantitatively combines the responses.
 *
 * Used for: image decisions, question quality review
 */

import { generateAgentResponse } from './api';
import { Type } from '@google/genai';

// --- Shared schema for yes/no decisions with confidence ---
const DECISION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    decision: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },  // 0-100
    reason: { type: Type.STRING },
  },
  required: ['decision', 'confidence', 'reason'],
};

const QA_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pass: { type: Type.BOOLEAN },
    issues: { type: Type.ARRAY, items: { type: Type.STRING } },
    score: { type: Type.NUMBER },  // 0-100
  },
  required: ['pass', 'score'],
};

// =============================================================
// IMAGE DECISION — 3 perspectives
// =============================================================

export async function evaluateImageNeed(
  stem: string, qType: string, subject: string, grade: string
): Promise<{ needsImage: boolean; confidence: number; reasons: string[] }> {

  const perspectives = [
    // Perspective 1: Student lens — would a student struggle without an image?
    {
      agent: 'Image Analysis',
      prompt: `You are a Grade ${grade} ${subject} student. Read this question and decide: would you understand it BETTER with a picture? Not "would a picture be nice" but "do I NEED a picture to understand what's being asked?"
Question: "${stem}"
Type: ${qType}
Return decision (true/false), confidence (0-100), reason.`
    },
    // Perspective 2: Teacher lens — does the pedagogy require visual support?
    {
      agent: 'Image Analysis',
      prompt: `You are an experienced ${subject} teacher for Grade ${grade}. This question will appear in a digital assessment. Decide: does this question REQUIRE a visual element (diagram, picture, chart) to be a valid assessment item? A question about identifying objects needs images. A question about definitions does not.
Question: "${stem}"
Type: ${qType}
Return decision (true/false), confidence (0-100), reason.`
    },
    // Perspective 3: Assessment designer lens — does adding an image change what's being measured?
    {
      agent: 'Image Analysis',
      prompt: `You are an assessment design expert (TIMSS/PISA). Decide: would adding an image to this question change the CONSTRUCT being measured? If adding an image shifts it from testing recall to testing visual identification, then the image is essential to the intended construct. If the image is just decoration, it's not needed.
Question: "${stem}"
Type: ${qType}
Subject: ${subject}, Grade: ${grade}
Return decision (true/false), confidence (0-100), reason.`
    },
  ];

  // Run all 3 in parallel
  const results = await Promise.allSettled(
    perspectives.map(p =>
      generateAgentResponse(p.agent, p.prompt, '{}', DECISION_SCHEMA, false)
    )
  );

  // Collect successful responses
  const votes: { decision: boolean; confidence: number; reason: string }[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      votes.push(r.value);
    }
  }

  if (votes.length === 0) {
    return { needsImage: false, confidence: 0, reasons: ['All perspectives failed'] };
  }

  // Quantitative combination: weighted vote by confidence
  let yesWeight = 0;
  let noWeight = 0;
  const reasons: string[] = [];

  for (const v of votes) {
    const weight = v.confidence / 100;
    if (v.decision) yesWeight += weight;
    else noWeight += weight;
    reasons.push(`${v.decision ? 'YES' : 'NO'} (${v.confidence}%): ${v.reason}`);
  }

  const needsImage = yesWeight > noWeight;
  const totalWeight = yesWeight + noWeight;
  const confidence = Math.round((Math.max(yesWeight, noWeight) / totalWeight) * 100);

  return { needsImage, confidence, reasons };
}

// =============================================================
// QA REVIEW — 3 perspectives
// =============================================================

export async function evaluateQuestionQuality(
  question: any, subject: string, grade: string, lo: string
): Promise<{
  pass: boolean;
  overallScore: number;
  issues: string[];
  perspectives: { lens: string; score: number; issues: string[] }[];
}> {
  const stem = question.stem || '';
  const qType = question.type || 'mcq';
  const options = (question.options || []).map((o: any) => `${o.label || '?'}. ${o.text || ''}`).join('\n');
  const answer = question.answer || question.correct_answer || '';

  const qSummary = `Type: ${qType}\nStem: ${stem}\n${options ? 'Options:\n' + options : ''}\nAnswer: ${answer}`;

  const perspectives = [
    // Perspective 1: Factual accuracy
    {
      lens: 'Factual',
      prompt: `You are a ${subject} subject matter expert for Grade ${grade}. Check this question for FACTUAL accuracy ONLY.
- Is the marked answer actually correct?
- Are there any factual errors in the stem or options?
- Are units correct? Are names/terms accurate?
- Could more than one option be considered correct?

Question:
${qSummary}

LO: ${lo}
Return: pass (true if no factual errors), score (0-100), issues (list of factual problems found, empty if none).`
    },
    // Perspective 2: Pedagogical quality
    {
      lens: 'Pedagogical',
      prompt: `You are a curriculum and assessment specialist. Check this question for PEDAGOGICAL quality ONLY.
- Does the question test the intended cognitive level (${question.cell || 'unknown'})?
- Is the question diagnostic — does a wrong answer reveal a specific gap?
- Are distractors plausible and based on real student misconceptions?
- Is the stem clear and unambiguous?
- Does the question avoid: negative phrasing, "all of the above", verbatim textbook copying?

Question:
${qSummary}

LO: ${lo}
Grade: ${grade}
Return: pass (true if pedagogically sound), score (0-100), issues (list of pedagogical problems, empty if none).`
    },
    // Perspective 3: Language and accessibility
    {
      lens: 'Language',
      prompt: `You are a language and accessibility reviewer for educational content in India. Check this question for LANGUAGE quality ONLY.
- Is it written in correct UK English? (colour not color, organise not organize)
- Is the vocabulary appropriate for Grade ${grade}?
- Is the sentence structure simple enough for the grade level?
- Are there any cultural biases or unfamiliar contexts for Indian government school students?
- Is the language gender-neutral and inclusive?

Question:
${qSummary}

Return: pass (true if language is appropriate), score (0-100), issues (list of language problems, empty if none).`
    },
  ];

  // Run all 3 in parallel
  const results = await Promise.allSettled(
    perspectives.map(p =>
      generateAgentResponse('AI SME QA', p.prompt, '{}', QA_SCHEMA, false)
    )
  );

  // Collect and combine
  const perspectiveResults: { lens: string; score: number; issues: string[] }[] = [];
  const allIssues: string[] = [];
  let totalScore = 0;
  let validCount = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const lens = perspectives[i].lens;
    if (r.status === 'fulfilled' && r.value) {
      const v = r.value;
      const score = v.score || (v.pass ? 80 : 40);
      const issues = (v.issues || []).map((issue: string) => `[${lens}] ${issue}`);
      perspectiveResults.push({ lens, score, issues });
      allIssues.push(...issues);
      totalScore += score;
      validCount++;
    } else {
      perspectiveResults.push({ lens, score: 50, issues: [`[${lens}] Review failed`] });
    }
  }

  const overallScore = validCount > 0 ? Math.round(totalScore / validCount) : 50;
  // Pass if overall score >= 60 AND no single perspective has critical issues (score < 30)
  const hasCriticalFail = perspectiveResults.some(p => p.score < 30);
  const pass = overallScore >= 60 && !hasCriticalFail;

  return { pass, overallScore, issues: allIssues, perspectives: perspectiveResults };
}
