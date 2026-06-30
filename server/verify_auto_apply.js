import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyToJob } from './services/autoApplyWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

// Create a dummy resume PDF for testing upload
const dummyPdfPath = path.join(__dirname, 'temp_test_resume.pdf');
fs.writeFileSync(dummyPdfPath, 'PDF DUMMY CONTENT FOR TESTING AUTO APPLY WORKER');

// Host mock application form
app.get('/apply', (req, res) => {
  res.send(`
    <html>
      <head><title>Mock Job Board Application</title></head>
      <body>
        <h1>Apply for Software Engineer Role</h1>
        <form id="job-form" action="/submit" method="POST" enctype="multipart/form-data">
          <div>
            <label for="fullNameInput">Full Name:</label>
            <input type="text" id="fullNameInput" name="candidate_name" placeholder="John Doe" />
          </div>
          <div>
            <label for="emailInput">Email Address:</label>
            <input type="email" id="emailInput" name="candidate_email" placeholder="john@example.com" />
          </div>
          <div>
            <label for="linkedinInput">LinkedIn Profile URL:</label>
            <input type="url" id="linkedinInput" name="linkedin" placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label for="resumeInput">Attach CV / Resume:</label>
            <input type="file" id="resumeInput" name="resume_file" />
          </div>
          <div>
            <label for="customQuestionInput">Why are you a good fit for this role?</label>
            <textarea id="customQuestionInput" name="fit_reason" placeholder="Describe your experience"></textarea>
          </div>
          <button type="submit" id="submit-button">Submit Application</button>
        </form>
      </body>
    </html>
  `);
});

// Handle mock submission
app.post('/submit', upload.single('resume_file'), (req, res) => {
  const { candidate_name, candidate_email, linkedin, fit_reason } = req.body;
  const file = req.file;

  console.log('--- Mock Form Received Submission ---');
  console.log('Name:', candidate_name);
  console.log('Email:', candidate_email);
  console.log('LinkedIn:', linkedin);
  console.log('Fit Reason:', fit_reason);
  console.log('Uploaded File Name:', file ? file.originalname : 'None');
  console.log('-------------------------------------');

  if (candidate_name && candidate_email && linkedin && file && fit_reason) {
    res.send(`
      <html>
        <body>
          <h1 id="success">Application submitted successfully!</h1>
          <p>Thank you, your application was received.</p>
        </body>
      </html>
    `);
  } else {
    res.status(400).send(`
      <html>
        <body>
          <h1>Submission Error</h1>
          <p>Please ensure all fields are filled including the resume file.</p>
        </body>
      </html>
    `);
  }
});

const server = app.listen(4444, async () => {
  console.log('Mock Form Server running at http://localhost:4444/apply');

  // Mocks for applyToJob
  const mockSupabaseAdmin = {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ data: {}, error: null })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: {}, error: null })
        })
      })
    }),
    storage: {
      from: () => ({
        download: () => Promise.resolve({
          data: {
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
          },
          error: null
        }),
        upload: () => Promise.resolve({ data: { path: 'mock_screenshot.png' }, error: null })
      })
    }
  };

  const mockCallAIProxy = async (messages) => {
    const userMessage = messages[messages.length - 1].content;
    if (userMessage.includes('map page inputs')) {
      // Mock mapping response
      return JSON.stringify({
        "0": "full_name",
        "1": "email",
        "2": "linkedin_url",
        "3": "resume",
        "4": "custom_question"
      });
    } else if (userMessage.includes('custom question')) {
      // Mock answer generation
      return "I have extensive experience with TypeScript, React, and server automation, matching the requirements perfectly.";
    }
    return "{}";
  };

  try {
    console.log('Starting verification test...');
    await applyToJob({
      supabaseAdmin: mockSupabaseAdmin,
      callAIProxy: mockCallAIProxy,
      applicationId: 'mock-application-uuid',
      userId: 'mock-user-uuid',
      jobUrl: 'http://localhost:4444/apply',
      userSettings: {
        linkedin_url: 'https://linkedin.com/in/john-doe-test',
        notice_period: 'Immediate',
        expected_salary: '100k USD'
      },
      profile: {
        file_url: 'resumes/mock-user-uuid/resume.pdf',
        parsed_profile: {
          full_name: 'John Doe Testing',
          email: 'johndoe@test.com'
        }
      },
      jobDescription: 'Seeking a Senior Software Engineer with strong automation skills.',
      authToken: 'mock-auth-token'
    });

    console.log('Verification completed successfully!');
  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(dummyPdfPath)) fs.unlinkSync(dummyPdfPath);
      // Clean uploaded test files
      const uploadsDir = path.join(__dirname, 'uploads');
      if (fs.existsSync(uploadsDir)) {
        fs.readdirSync(uploadsDir).forEach(f => fs.unlinkSync(path.join(uploadsDir, f)));
        fs.rmdirSync(uploadsDir);
      }
    } catch (_) {}
    server.close();
  }
});
