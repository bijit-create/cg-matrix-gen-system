import * as xlsx from 'xlsx';

export const parseUploadedFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
        return parseExcel(file);
    } else if (extension === 'docx') {
        return parseDocx(file);
    } else if (extension === 'pdf') {
        return parsePdf(file);
    }
    
    throw new Error(`Unsupported file type: .${extension}. Please upload PDF, DOCX, or Excel files.`);
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

const parseExcel = async (file: File): Promise<string> => {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const data = new Uint8Array(arrayBuffer);
    const workbook = xlsx.read(data, { type: 'array' });
    let extractedText = '';
    
    workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        extractedText += `\n--- Sheet: ${sheetName} ---\n`;
        extractedText += json.map((row: any) => row.join(' | ')).join('\n');
    });
    
    return extractedText.trim();
};

const parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    // Dynamic import to avoid Vite static analysis issues with CommonJS mammoth
    const mammoth = await import('mammoth/mammoth.browser.js');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
};

const parsePdf = async (file: File): Promise<string> => {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set the worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
    
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
    const pdf = await loadingTask.promise;
    
    let extractedText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        extractedText += strings.join(' ') + '\n';
    }
    
    return extractedText.trim();
};
