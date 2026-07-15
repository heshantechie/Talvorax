import fs from 'fs';

async function generate() {
  const html = "<h1>John Doe</h1><p>Software Engineer</p><p>Skills: JavaScript, React, Node.js, Python, Supabase</p><p>Experience: 5 years building web applications</p>";
  try {
    const res = await fetch("http://localhost:3002/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html })
    });
    
    if (!res.ok) {
        console.error("Failed:", await res.text());
        return;
    }

    const buffer = await res.arrayBuffer();
    fs.writeFileSync("test_resume.pdf", Buffer.from(buffer));
    console.log("Created test_resume.pdf successfully!");
  } catch (err) {
      console.error(err);
  }
}

generate();
