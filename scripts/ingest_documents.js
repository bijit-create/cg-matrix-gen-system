import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsx from 'xlsx';
import pdfParse from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../../');
const outputDir = path.resolve(__dirname, '../src/knowledge_base');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const filesToProcess = [
  'student_misconceptions_catalog.xlsx',
  'Error Analysis.xlsx',
  'ENGLISH Grade 2 - CLMS - local.xlsx',
  'Subjective Rearrange.xlsx',
  'Question Framework (1).pdf',
  'Question Framework (2).pdf'
];

async function ingestExcel(fileName) {
  try {
    const filePath = path.join(sourceDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }
    console.log(`Processing ${fileName}...`);
    const workbook = xlsx.readFile(filePath);
    const data = {};
    workbook.SheetNames.forEach(sheetName => {
      data[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    });
    const baseName = fileName.replace('.xlsx', '').replace(/\s+/g, '_').replace(/[\(\)]/g, '');
    fs.writeFileSync(path.join(outputDir, `${baseName}.json`), JSON.stringify(data, null, 2));
    console.log(`Saved ${baseName}.json`);
  } catch (err) {
    console.error(`Error processing ${fileName}:`, err);
  }
}

async function ingestPdf(fileName) {
  try {
    const filePath = path.join(sourceDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }
    console.log(`Processing ${fileName}...`);
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const baseName = fileName.replace('.pdf', '').replace(/\s+/g, '_').replace(/[\(\)]/g, '');
    fs.writeFileSync(path.join(outputDir, `${baseName}.txt`), data.text);
    console.log(`Saved ${baseName}.txt`);
  } catch (err) {
    console.error(`Error processing ${fileName}:`, err);
  }
}

async function main() {
  console.log(`Looking for documents in: ${sourceDir}`);
  for (const file of filesToProcess) {
    if (file.endsWith('.xlsx')) {
      await ingestExcel(file);
    } else if (file.endsWith('.pdf')) {
      await ingestPdf(file);
    }
  }
  console.log('Ingestion complete!');
}

main().catch(console.error);
