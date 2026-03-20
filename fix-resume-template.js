import fs from 'fs';

const path = 'components/ResumeAnalyzer.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix horizontal overflow
// container widths are hardcoded to 850px while wrapper is 800px.
content = content.replace(/width: '850px'/g, "width: '100%'");
// also make sure boxSizing: 'border-box' is everywhere, but it is already.

// 2. Fix text overlapping & line-height issues
// Remove negative tracking (tracking-tight)
content = content.replace(/tracking-tight/g, "");
// set proper line-height (leading-snug -> leading-normal)
content = content.replace(/leading-snug/g, "leading-normal");
// replace items-baseline with items-start for consistent flex alignment
content = content.replace(/items-baseline/g, "items-start");

// 3. Prevent long string overflow (dates, company names)
// add shrink-0 to dates so they aren't crushed and add break-words min-w-0 to the left child
content = content.replace(/whitespace-nowrap font-normal/g, "whitespace-nowrap shrink-0 font-normal");
content = content.replace(/whitespace-nowrap font-medium/g, "whitespace-nowrap shrink-0 font-medium");

// Add overflowWrap / wordBreak to the main styles so content wraps
content = content.replace(/boxSizing: 'border-box'/g, "boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word'");

// Fix standard fonts for PDF stability
content = content.replace(/font-serif/g, "font-[Times_New_Roman,serif]");
content = content.replace(/font-sans/g, "font-[Arial,Helvetica,sans-serif]");

// Write back
fs.writeFileSync(path, content);
console.log('ResumeAnalyzer layout fixed successfully.');
