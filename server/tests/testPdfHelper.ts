export function createTestPdfBuffer(textContent: string): Buffer {
  const words = textContent.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const w of words) {
    if ((currentLine + ' ' + w).length > 50) {
      lines.push(currentLine.trim());
      currentLine = w;
    } else {
      currentLine += (currentLine ? ' ' : '') + w;
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const textOps = lines.map((l) => `(${l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) '`).join('\n');
  const streamBody = `BT\n/F1 12 Tf\n15 TL\n50 750 Td\n${textOps}\nET`;
  const streamBytes = Buffer.from(streamBody, 'utf-8');

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamBytes.length} >>
stream
${streamBody}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
500
%%EOF`;

  return Buffer.from(pdfString, 'utf-8');
}
