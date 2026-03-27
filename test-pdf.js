import fs from 'fs';

async function test() {
  try {
    const res = await fetch('http://localhost:3001/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '<h1>Hello World</h1>' })
    });
    
    if (!res.ok) {
        const text = await res.text();
        console.error('Server returned:', res.status, text);
        process.exit(1);
    }
    
    console.log('Success, received PDF of length:', (await res.blob()).size);
  } catch (err) {
    console.error('Network Error:', err);
  }
}
test();
