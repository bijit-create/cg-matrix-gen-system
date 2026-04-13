// Export utility — generates Excel doc + image ZIP for the completed question set

import * as XLSX from 'xlsx';

interface ExportQuestion {
  id: string;
  cell: string;
  type: string;
  stem: string;
  correct_answer: string;
  rationale: string;
  needs_image: boolean;
  options?: any[];
  steps?: any[];
  match_pairs?: any[];
  arrange_items?: string[];
  pairs?: string[];
  items?: string[];
}

interface ExportData {
  questions: ExportQuestion[];
  questionImages: Record<string, string>;
  metadata: {
    lo: string;
    skill: string;
    count: number;
    construct: string;
    grade?: string;
    subject?: string;
    skillCode?: string;
    loCode?: string;
  };
  qaResults: any[];
}

// Convert base64 data URL to Uint8Array
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Build a flat row for each question (matching the ALL Type Questions format)
function questionToRow(q: ExportQuestion, qaResult: any, metadata: any) {
  const base: Record<string, any> = {
    'Question ID': q.id,
    'Grade': metadata.grade || '',
    'Subject': metadata.subject || '',
    'Skill Code': metadata.skillCode || '',
    'LO Code': metadata.loCode || '',
    'LO Description': metadata.lo,
    'Skill Description': metadata.skill,
    'CG Cell': q.cell,
    'Question Type': q.type,
    'Question Stem': q.stem,
    'Correct Answer': q.correct_answer || '',
    'Rationale': q.rationale || '',
    'Needs Image': q.needs_image ? 'Yes' : 'No',
    'QA Status': qaResult?.pass ? 'Passed' : 'Flagged',
    'QA Issues': (qaResult?.issues || []).join(' | '),
  };

  // MCQ / picture_mcq options
  if (q.options && q.options.length > 0) {
    q.options.forEach((opt: any, i: number) => {
      const label = opt.label || String.fromCharCode(65 + i);
      base[`Option ${label}`] = opt.text || '';
      base[`Option ${label} Correct`] = (opt.correct || opt.is_correct) ? 'Yes' : 'No';
      base[`Option ${label} Why Wrong`] = opt.why_wrong || opt.distractor_rationale || '';
      if (opt.image_desc) base[`Option ${label} Image Desc`] = opt.image_desc;
    });
  }

  // Error analysis steps
  if (q.steps && q.steps.length > 0) {
    q.steps.forEach((step: any, i: number) => {
      base[`Step ${i + 1}`] = step.text || '';
      base[`Step ${i + 1} Correct`] = step.correct ? 'Correct' : 'Incorrect';
      if (!step.correct && step.fix) base[`Step ${i + 1} Fix`] = step.fix;
    });
  }

  // Match pairs
  const pairs = q.pairs || (q.match_pairs || []).map((p: any) => `${p.left} → ${p.right}`);
  if (pairs.length > 0) {
    pairs.forEach((pair: string, i: number) => {
      const [left, right] = pair.split(' → ');
      base[`Match Left ${i + 1}`] = left || pair;
      base[`Match Right ${i + 1}`] = right || '';
    });
  }

  // Arrange items
  const arrangeItems = q.items || q.arrange_items || [];
  if (arrangeItems.length > 0) {
    arrangeItems.forEach((item: string, i: number) => {
      base[`Arrange Item ${i + 1}`] = item;
    });
  }

  return base;
}

export async function exportToExcelAndZip(data: ExportData): Promise<void> {
  const { questions, questionImages, metadata, qaResults } = data;

  // --- 1. Build Excel workbook ---
  const wb = XLSX.utils.book_new();

  // Questions sheet
  const rows = questions.map(q => {
    const qa = qaResults.find((r: any) => r.question_id === q.id);
    return questionToRow(q, qa, metadata);
  });
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length).slice(0, 10)) + 2
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Questions');

  // Summary sheet
  const summary = [
    { Field: 'Learning Objective', Value: metadata.lo },
    { Field: 'Skill', Value: metadata.skill },
    { Field: 'Construct', Value: metadata.construct },
    { Field: 'Grade', Value: metadata.grade || '' },
    { Field: 'Subject', Value: metadata.subject || '' },
    { Field: 'Total Questions', Value: questions.length },
    { Field: 'QA Passed', Value: qaResults.filter((r: any) => r.pass).length },
    { Field: 'QA Flagged', Value: qaResults.filter((r: any) => !r.pass).length },
    { Field: 'Types', Value: [...new Set(questions.map(q => q.type))].join(', ') },
    { Field: 'Cells', Value: [...new Set(questions.map(q => q.cell))].join(', ') },
    { Field: 'Export Date', Value: new Date().toISOString() },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // --- 2. Build ZIP with images ---
  // Dynamic import jszip (bundled with xlsx)
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Add Excel file to zip
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const skillCode = metadata.skillCode || 'questions';
  const fileName = `${skillCode}_${new Date().toISOString().slice(0, 10)}`;
  zip.file(`${fileName}.xlsx`, excelBuffer);

  // Add images folder
  const imgFolder = zip.folder('images');
  let imageCount = 0;

  if (imgFolder) {
    for (const [key, dataUrl] of Object.entries(questionImages)) {
      if (!dataUrl || !dataUrl.startsWith('data:')) continue;
      try {
        const bytes = dataUrlToBytes(dataUrl);
        const ext = dataUrl.includes('image/svg') ? 'svg' : 'png';
        // Key format: "R1-1" for stem, "R1-1_opt_A" for option
        imgFolder.file(`${key}.${ext}`, bytes);
        imageCount++;
      } catch {
        // Skip invalid images
      }
    }
  }

  // --- 3. Generate and download ZIP ---
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_export.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`Exported: ${questions.length} questions, ${imageCount} images → ${fileName}_export.zip`);
}
