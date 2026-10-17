import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function readFileText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['txt', 'csv', 'md'].includes(ext)) {
    return await file.text();
  }

  if (['xlsx', 'xls'].includes(ext)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      return workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const formattedRows = rawRows
          .map((r) => {
            if (!Array.isArray(r)) return String(r || '').trim();
            const cleanCells = r
              .map((c) => String(c ?? '').trim())
              .filter((c) => Boolean(c));
            if (cleanCells.length === 0) return '';
            return cleanCells.join(' | ');
          })
          .filter(Boolean);
        return `[Bảng Excel - Sheet: ${name}]\n` + formattedRows.join('\n');
      }).join('\n\n');
    } catch {
      return `[Tệp Excel: ${file.name}]`;
    }
  }

  if (ext === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // 1. Extract raw text
      const rawResult = await mammoth.extractRawText({ arrayBuffer });
      const rawText = rawResult.value || '';

      // 2. Extract HTML to preserve structured tables
      let tableText = '';
      try {
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        const html = htmlResult.value || '';
        if (html.includes('<tr')) {
          const trMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
          if (trMatches) {
            const tableRows = trMatches.map((tr) => {
              const tdMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
              if (!tdMatches) return '';
              const cells = tdMatches.map((td) => {
                const withNewlines = td
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<\/p>/gi, '\n')
                  .replace(/<\/div>/gi, '\n')
                  .replace(/<\/li>/gi, '\n')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/&nbsp;/gi, ' ');
                const cleanLines = withNewlines
                  .split(/\r?\n/)
                  .map((l) => l.replace(/[ \t]+/g, ' ').trim())
                  .filter(Boolean);
                return cleanLines.join('; ');
              }).filter((c) => Boolean(c));
              return cells.length > 0 ? cells.join(' | ') : '';
            }).filter(Boolean);
            if (tableRows.length > 0) {
              tableText = `[Bảng cấu trúc Word]:\n` + tableRows.join('\n');
            }
          }
        }
      } catch {
        // ignore html parsing error
      }

      return (tableText ? tableText : rawText).trim() || `[Tệp Word: ${file.name}]`;
    } catch {
      return `[Tệp Word: ${file.name}]`;
    }
  }

  // For PDF or other document files
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Try PDF stream text extraction (extract string tokens inside parentheses)
    const bytes = new Uint8Array(arrayBuffer);
    const latinDecoder = new TextDecoder('latin1');
    const rawLatin = latinDecoder.decode(bytes);

    const pdfTextBlocks: string[] = [];
    const streamRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;
    while ((match = streamRegex.exec(rawLatin)) !== null) {
      const block = match[0];
      const stringMatches = block.match(/\(([^)]+)\)/g);
      if (stringMatches) {
        const line = stringMatches
          .map((s) => s.slice(1, -1))
          .join('')
          .trim();
        if (line.length > 2) {
          pdfTextBlocks.push(line);
        }
      }
    }

    if (pdfTextBlocks.length > 2) {
      return pdfTextBlocks.join('\n');
    }

    // 2. Fallback text decoder
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const raw = textDecoder.decode(arrayBuffer);
    const cleaned = raw.replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\r\n\s]/g, ' ');
    const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 2);
    if (lines.length > 3) {
      return lines.join('\n');
    }
    const words = cleaned.replace(/\s+/g, ' ').trim();
    if (words.length > 15) {
      return words;
    }
  } catch {
    // fallback
  }

  return `[Tệp tài liệu: ${file.name} - Đã tải lên thành công để phân tích PPCT và YCCĐ].`;
}
