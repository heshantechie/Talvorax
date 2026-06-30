import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';

const safeParseJSON = (text) => {
  try {
    let clean = text.replace(/```json\s*/ig, '').replace(/```\s*/g, '').trim();
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);
    return JSON.parse(clean);
  } catch { return null; }
};

export const applyToJob = async ({
  supabaseAdmin,
  callAIProxy,
  applicationId,
  userId,
  jobUrl,
  userSettings,
  profile,
  jobDescription,
  authToken
}) => {
  const logs = [];
  const logStep = async (msg) => {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}`;
    console.log(`[AutoApply][App: ${applicationId}] ${msg}`);
    logs.push(formattedMsg);
    await supabaseAdmin
      .from('auto_apply_applications')
      .update({ error_log: logs.join('\n') })
      .eq('id', applicationId);
  };

  const uploadScreenshot = async (page) => {
    try {
      const buffer = await page.screenshot({ fullPage: true });
      const filePath = `screenshots/${applicationId}.png`;
      const { data, error } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, buffer, { contentType: 'image/png', upsert: true });
      if (error) {
        console.error('Error uploading screenshot:', error.message);
        return null;
      }
      return filePath;
    } catch (err) {
      console.error('Screenshot capturing failed:', err.message);
      return null;
    }
  };

  let tempPdfPath = null;
  let browser = null;

  try {
    await logStep('Starting application process...');

    // 1. Download Resume PDF from Supabase Storage
    if (profile.file_url) {
      await logStep('Downloading resume PDF from storage...');
      const { data: fileBuffer, error: downloadError } = await supabaseAdmin.storage
        .from('resumes')
        .download(profile.file_url);

      if (downloadError) {
        throw new Error(`Failed to download resume PDF from storage: ${downloadError.message}`);
      }

      const tempDir = os.tmpdir();
      tempPdfPath = path.join(tempDir, `resume_${userId}_${Date.now()}.pdf`);
      
      const arrayBuffer = await fileBuffer.arrayBuffer();
      fs.writeFileSync(tempPdfPath, Buffer.from(arrayBuffer));
      await logStep(`Resume PDF downloaded and saved to temp path.`);
    } else {
      await logStep('No resume file URL found in candidate profile. Proceeding without file upload.');
    }

    // 2. Launch Puppeteer Headless Browser
    await logStep('Launching Puppeteer headless browser...');
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || 
      (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null);

    const launchOpts = {
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    };
    if (chromiumPath && fs.existsSync(chromiumPath)) {
      launchOpts.executablePath = chromiumPath;
    }

    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // 3. Navigate to Job Apply URL
    await logStep(`Navigating to job application page: ${jobUrl}...`);
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await logStep('Page loaded successfully.');

    // 4. Captcha Detection
    const pageTitle = await page.title();
    const pageBody = await page.evaluate(() => document.body.innerText);
    if (
      pageBody.includes('CF-Chl-Bypass') || 
      pageBody.includes('Attention Required!') || 
      pageTitle.includes('Cloudflare') ||
      pageBody.includes('reCAPTCHA')
    ) {
      await logStep('Security wall or Captcha detected. Manual intervention is required.');
      const path = await uploadScreenshot(page);
      await supabaseAdmin
        .from('auto_apply_applications')
        .update({
          status: 'needs_manual_action',
          screenshot_url: path,
          error_log: logs.join('\n')
        })
        .eq('id', applicationId);
      return;
    }

    // 5. Scan elements
    await logStep('Scanning page DOM for form input fields...');
    const inputs = await page.evaluate(() => {
      const elList = Array.from(document.querySelectorAll('input, textarea, select'));
      return elList.map((el, i) => {
        let label = '';
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) label = labelEl.innerText;
        }
        if (!label) {
          const parentLabel = el.closest('label');
          if (parentLabel) label = parentLabel.innerText;
        }
        if (!label) {
          const divParent = el.closest('div');
          if (divParent) {
            const siblings = Array.from(divParent.childNodes);
            const textNode = siblings.find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
            if (textNode) label = textNode.textContent.trim();
          }
        }
        return {
          index: i,
          tagName: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          labelText: label.trim()
        };
      });
    });

    const fillableInputs = inputs.filter(inp => 
      inp.tagName === 'textarea' || 
      inp.tagName === 'select' || 
      (inp.tagName === 'input' && inp.type !== 'hidden' && inp.type !== 'submit' && inp.type !== 'button' && inp.type !== 'checkbox' && inp.type !== 'radio')
    );

    await logStep(`Found ${fillableInputs.length} fillable input fields.`);

    if (fillableInputs.length === 0) {
      await logStep('No form fields detected. This job might require external redirect or application is closed.');
      const path = await uploadScreenshot(page);
      await supabaseAdmin
        .from('auto_apply_applications')
        .update({
          status: 'needs_manual_action',
          screenshot_url: path,
          error_log: logs.join('\n')
        })
        .eq('id', applicationId);
      return;
    }

    // 6. AI Mapping
    await logStep('Calling Gemini to map page inputs to candidate profile...');
    const mappingPrompt = `You are a browser autofill mapping assistant.
We have the following candidate profile details:
- full_name: "${profile.parsed_profile?.full_name || ''}"
- email: "${profile.parsed_profile?.email || ''}"
- linkedin_url: "${userSettings?.linkedin_url || ''}"
- github_url: "${userSettings?.github_url || ''}"
- portfolio_url: "${userSettings?.portfolio_url || ''}"
- notice_period: "${userSettings?.notice_period || ''}"
- expected_salary: "${userSettings?.expected_salary || ''}"
- resume: (the file field for uploading resume PDF)

And these HTML form elements found:
${JSON.stringify(fillableInputs, null, 2)}

Match each element index to a candidate profile detail key.
If an input is for custom open-ended questions like "Why work here?" or "Describe a project", map it to "custom_question".
If it is irrelevant or a captcha/search box, map it to "ignore".

Return ONLY a JSON object mapping index strings to field keys. No markdown markdown blocks.
Example response:
{
  "0": "full_name",
  "1": "email",
  "2": "resume",
  "3": "custom_question"
}`;

    const mappingRes = await callAIProxy([
      { role: 'system', content: 'You are an AI mapping system. Return ONLY valid raw JSON.' },
      { role: 'user', content: mappingPrompt }
    ], authToken);

    const mapping = safeParseJSON(mappingRes) || {};
    await logStep(`AI mappings received: ${JSON.stringify(mapping)}`);

    // 7. Fill fields
    for (const [idxStr, key] of Object.entries(mapping)) {
      if (key === 'ignore') continue;
      const index = parseInt(idxStr);
      const input = fillableInputs.find(inp => inp.index === index);
      if (!input) continue;

      const selector = input.id 
        ? `#${input.id}` 
        : input.name 
          ? `${input.tagName}[name="${input.name}"]` 
          : null;

      if (!selector) continue;

      try {
        if (key === 'resume') {
          if (tempPdfPath) {
            await logStep('Uploading Resume PDF...');
            const fileElement = await page.$(selector);
            if (fileElement) {
              await fileElement.uploadFile(tempPdfPath);
              await logStep('Resume PDF file attached.');
            }
          }
        } else if (key === 'custom_question') {
          await logStep(`Generating AI answer for question: "${input.labelText || input.placeholder}"...`);
          const customPrompt = `Write a short, highly professional, 1-paragraph answer to this application question: "${input.labelText || input.placeholder}".
Use the candidate's resume and job description:

RESUME:
${JSON.stringify(profile.parsed_profile)}

JOB DESCRIPTION:
${jobDescription}

Keep the answer under 150 words. Write only the response text.`;

          const generatedAnswer = await callAIProxy([
            { role: 'system', content: 'You write short, factual, professional responses on behalf of candidates.' },
            { role: 'user', content: customPrompt }
          ], authToken);

          await page.focus(selector);
          await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
          await page.type(selector, generatedAnswer.trim(), { delay: 10 });
          await logStep('Dynamic AI answer typed.');
        } else {
          // Standard text values
          let val = '';
          if (key === 'full_name') val = profile.parsed_profile?.full_name || '';
          else if (key === 'email') val = profile.parsed_profile?.email || '';
          else if (key === 'linkedin_url') val = userSettings?.linkedin_url || '';
          else if (key === 'github_url') val = userSettings?.github_url || '';
          else if (key === 'portfolio_url') val = userSettings?.portfolio_url || '';
          else if (key === 'notice_period') val = userSettings?.notice_period || '';
          else if (key === 'expected_salary') val = userSettings?.expected_salary || '';

          if (val) {
            await logStep(`Filling ${key} with value...`);
            await page.focus(selector);
            await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
            await page.type(selector, val, { delay: 10 });
          }
        }
      } catch (err) {
        await logStep(`[Warning] Failed to fill field ${input.labelText || input.name}: ${err.message}`);
      }
    }

    // 8. Submit Form
    await logStep('Locating submit button...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], .submit-btn, #submit');
    if (submitBtn) {
      await logStep('Submitting application...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await logStep('Submission clicked. Verifying page status...');

      const currentUrl = page.url();
      const bodyText = await page.evaluate(() => document.body.innerText);
      const successWords = ['submitted', 'thank you', 'success', 'application received', 'confirmation'];
      const isSuccess = successWords.some(kw => bodyText.toLowerCase().includes(kw)) || currentUrl !== jobUrl;

      if (isSuccess) {
        await logStep('Success confirmation page identified.');
        const screenshotPath = await uploadScreenshot(page);
        await supabaseAdmin
          .from('auto_apply_applications')
          .update({
            status: 'applied',
            applied_at: new Date().toISOString(),
            screenshot_url: screenshotPath,
            error_log: logs.join('\n')
          })
          .eq('id', applicationId);
        await logStep('Application successfully logged as Applied.');
      } else {
        throw new Error('Submit button clicked but success page could not be programmatically verified.');
      }
    } else {
      await logStep('No submit button identified. Setting status to Needs Manual Action.');
      const screenshotPath = await uploadScreenshot(page);
      await supabaseAdmin
        .from('auto_apply_applications')
        .update({
          status: 'needs_manual_action',
          screenshot_url: screenshotPath,
          error_log: logs.join('\n')
        })
        .eq('id', applicationId);
    }

  } catch (error) {
    await logStep(`[Fatal Error] Application failed: ${error.message}`);
    let screenshotPath = null;
    if (browser) {
      const pageList = await browser.pages();
      if (pageList.length > 0) {
        screenshotPath = await uploadScreenshot(pageList[0]);
      }
    }
    await supabaseAdmin
      .from('auto_apply_applications')
      .update({
        status: 'failed',
        screenshot_url: screenshotPath,
        error_log: logs.join('\n')
      })
      .eq('id', applicationId);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try {
        fs.unlinkSync(tempPdfPath);
      } catch (err) {
        console.error('Temp resume deletion error:', err.message);
      }
    }
  }
};
