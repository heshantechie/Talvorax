import fs from 'fs';
import * as pdf from 'pdf-parse';

const buffer = fs.readFileSync('../test_resume.pdf');
const parseFunction = pdf.PDFParse || pdf.default || pdf;

console.log(typeof parseFunction);
if (typeof parseFunction === 'function') {
  parseFunction(buffer).then(data => console.log('Parsed text length:', data.text.length)).catch(console.error);
}
