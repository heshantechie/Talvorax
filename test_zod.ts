import { z } from "zod";

const safeNumber = (minVal = -100, maxVal = 100) => z.preprocess((val) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.match(/-?\d+(\.\d+)?/);
    if (match) return parseFloat(match[0]);
  }
  return 0;
}, z.number().min(minVal).max(maxVal));

const schema = z.object({
  score: safeNumber(0, 100).catch(0),
  penalty: safeNumber(-100, 0).catch(0)
});

console.log(schema.safeParse({ score: 85, penalty: 0 }));
console.log(schema.safeParse({ score: "85", penalty: "-5" }));
console.log(schema.safeParse({ score: "85/100", penalty: "None" }));
