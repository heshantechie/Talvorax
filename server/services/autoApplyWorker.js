import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { validateUrlForSSRF } from '../utils/ssrf.js';


const safeParseJSON = (text) => {
  try {
    let clean = text.replace(/```json\s*/ig, '').replace(/```\s*/g, '').trim();
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);
    return JSON.parse(clean);
  } catch { return null; }
};

const findChromiumInPath = () => {
  const binaryNames = ['chromium', 'chromium-browser', 'google-chrome', 'chrome'];
  const pathEnv = process.env.PATH || '';
  const paths = pathEnv.split(path.delimiter);
  for (const p of paths) {
    for (const bin of binaryNames) {
      const fullPath = path.join(p, bin);
      try {
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      } catch (_) {}
    }
  }
  return null;
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
  let pageToProcess = null;

  try {
    await logStep('Starting application process...');
    
    // 0. Pre-validate jobUrl to prevent SSRF
    await logStep('Validating job URL...');
    try {
      await validateUrlForSSRF(jobUrl);
    } catch (err) {
      throw new Error(`Security validation failed for job URL: ${err.message}`);
    }

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
    await logStep('Launching serverless Chromium browser...');
    
    const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_ID;
    const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !isRailway;
    
    let executablePath;
    // Priority 1: Explicit path override (set this on Railway dashboard)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    // Priority 2: Railway/Nix — use system chromium found dynamically
    } else if (isRailway) {
      const candidates = [
        '/root/.nix-profile/bin/chromium',
        '/home/railway/.nix-profile/bin/chromium',
        '/run/current-system/sw/bin/chromium',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      ];
      const pathBinary = findChromiumInPath();
      if (pathBinary) {
        candidates.unshift(pathBinary);
      }
      try {
        const whichPath = execSync('which chromium').toString().trim();
        if (whichPath && fs.existsSync(whichPath)) {
          candidates.unshift(whichPath);
        }
      } catch (err) {}
      const foundPath = candidates.find(p => fs.existsSync(p));
      if (foundPath) {
        executablePath = foundPath;
      } else {
        await logStep(`[Warning] None of the searched Chromium paths found. PATH env: ${process.env.PATH}. Searched: ${candidates.join(', ')}`);
        executablePath = '/run/current-system/sw/bin/chromium'; // Fallback
      }
    // Priority 3: Local dev — resolve system chrome path
    } else if (isDev) {
      executablePath = process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/chromium';
    // Priority 4: Vercel/AWS Lambda — use @sparticuz/chromium
    } else {
      executablePath = await chromium.executablePath();
    }

    await logStep(`Using Chromium executable: ${executablePath}`);

    const launchArgs = [
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ];

    if (process.env.RAILWAY_ENVIRONMENT || process.env.PUPPETEER_DISABLE_SANDBOX === 'true') {
      launchArgs.push('--no-sandbox', '--disable-setuid-sandbox');
    }

    browser = await puppeteer.launch({
      args: launchArgs,
      executablePath,
      headless: 'new',
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Enable request interception for SSRF protection
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.isInterceptResolutionHandled()) return;
      
      const requestUrl = request.url();
      if (request.isNavigationRequest() || request.resourceType() === 'document') {
        try {
          await validateUrlForSSRF(requestUrl);
          request.continue();
        } catch (error) {
          console.error(`[Security] Aborting request due to SSRF violation: ${requestUrl} - ${error.message}`);
          request.abort('accessdenied');
        }
      } else {
        request.continue();
      }
    });

    // Stealth Settings to evade bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      window.chrome = {
        runtime: {},
      };
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // 3. Navigate to Job Apply URL
    await logStep(`Navigating to job application page: ${jobUrl}...`);
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await logStep('Page loaded successfully.');

    pageToProcess = page;
    let redirectCount = 0;
    const maxRedirects = 3;
    let formFilledAndSubmitted = false;

    // Helper to handle click and follow redirect (same tab or new tab)
    const clickAndFollowRedirect = async (currentPage, elementHandle) => {
      const browserInstance = currentPage.browser();
      
      let targetPromiseResolve;
      const targetPromise = new Promise(resolve => {
        targetPromiseResolve = resolve;
      });
      
      const onTargetCreated = async (target) => {
        if (target.type() === 'page') {
          const newPage = await target.page();
          targetPromiseResolve(newPage);
        }
      };
      
      browserInstance.on('targetcreated', onTargetCreated);
      
      try {
        let samePageNavigated = false;
        let newPage = null;
        
        const samePageNavPromise = currentPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
          .then(() => { samePageNavigated = true; });
          
        // Click the element with fallback to browser-context click
        const clickPromise = (async () => {
          try {
            await elementHandle.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' })).catch(() => {});
            await elementHandle.click();
          } catch (clickErr) {
            await elementHandle.evaluate(el => el.click()).catch(() => {});
          }
        })();
        
        await Promise.race([
          samePageNavPromise,
          targetPromise.then(p => { newPage = p; }),
          clickPromise.then(() => new Promise(resolve => setTimeout(resolve, 5000))),
          new Promise(resolve => setTimeout(resolve, 15000))
        ]);
        
        if (newPage) {
          await logStep('New tab detected, switching viewport and target page.');
          await newPage.setViewport({ width: 1280, height: 900 });
          
          // Wait for URL to change from about:blank
          let retries = 0;
          while (newPage.url() === 'about:blank' && retries < 10) {
            await new Promise(r => setTimeout(r, 500));
            retries++;
          }
          
          // Wait for the new page to finish loading
          await newPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
          return newPage;
        }
        
        return currentPage;
      } finally {
        browserInstance.off('targetcreated', onTargetCreated);
      }
    };

    while (redirectCount < maxRedirects) {
      // Safe delay to let dynamically loaded client-side scripts render elements
      await new Promise(r => setTimeout(r, 4000));

      // 4. Captcha Detection
      const pageTitle = await pageToProcess.title();
      const pageBody = await pageToProcess.evaluate(() => document.body.innerText);
      if (
        pageBody.includes('CF-Chl-Bypass') || 
        pageBody.includes('Attention Required!') || 
        pageTitle.includes('Cloudflare') ||
        pageBody.includes('reCAPTCHA')
      ) {
        await logStep('Security wall or Captcha detected. Manual intervention is required.');
        const path = await uploadScreenshot(pageToProcess);
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

      // Auto check any consent/terms/privacy checkboxes before scanning and filling other elements
      await pageToProcess.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        checkboxes.forEach(cb => {
          let labelText = '';
          if (cb.id) {
            const labelEl = document.querySelector(`label[for="${cb.id}"]`);
            if (labelEl) labelText = labelEl.innerText.toLowerCase();
          }
          if (!labelText) {
            const parentLabel = cb.closest('label');
            if (parentLabel) labelText = parentLabel.innerText.toLowerCase();
          }
          if (!labelText) {
            const parentDiv = cb.closest('div');
            if (parentDiv) labelText = parentDiv.innerText.toLowerCase();
          }

          const termsKeywords = ['agree', 'terms', 'privacy', 'consent', 'accept', 'declare', 'policy', 'acknowledge'];
          const matches = termsKeywords.some(kw => labelText.includes(kw));
          if (matches && !cb.checked) {
            cb.click();
          }
        });
      });

      // 5. Scan elements
      await logStep(`Scanning page DOM for form input fields (Attempt ${redirectCount + 1})...`);
      const inputs = await pageToProcess.evaluate(() => {
        const elList = Array.from(document.querySelectorAll('input, textarea, select'));
        
        // Group radio buttons by name to process them as a single entity
        const radioGroups = new Map();
        const mappedElements = [];
        
        elList.forEach((el) => {
          const tagName = el.tagName.toLowerCase();
          const type = el.type || '';
          
          if (tagName === 'input' && type === 'radio') {
            const name = el.name;
            if (name) {
              if (!radioGroups.has(name)) {
                radioGroups.set(name, []);
              }
              radioGroups.get(name).push(el);
              return;
            }
          }
          
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
          
          mappedElements.push({
            tagName,
            type,
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            labelText: label.trim()
          });
        });
        
        // Add grouped radio buttons
        for (const [name, radios] of radioGroups.entries()) {
          let groupLabel = '';
          const firstRadio = radios[0];
          const fieldset = firstRadio.closest('fieldset');
          if (fieldset) {
            const legend = fieldset.querySelector('legend');
            if (legend) groupLabel = legend.innerText;
          }
          if (!groupLabel) {
            const parentDiv = firstRadio.closest('div');
            if (parentDiv) {
              const sibling = parentDiv.parentElement ? parentDiv.parentElement.querySelector('h3, h4, label, .label, p') : null;
              if (sibling) groupLabel = sibling.innerText;
            }
          }
          
          const options = radios.map(r => {
            let optionLabel = '';
            if (r.id) {
              const lEl = document.querySelector(`label[for="${r.id}"]`);
              if (lEl) optionLabel = lEl.innerText;
            }
            if (!optionLabel) {
              const parentL = r.closest('label');
              if (parentL) optionLabel = parentL.innerText;
            }
            return {
              value: r.value,
              id: r.id || '',
              labelText: optionLabel.trim() || r.value
            };
          });
          
          mappedElements.push({
            tagName: 'input',
            type: 'radio_group',
            name: name,
            labelText: groupLabel.trim() || `Select ${name}`,
            options: options
          });
        }
        
        return mappedElements.map((el, i) => ({ index: i, ...el }));
      });

      const fillableInputs = inputs.filter(inp => 
        inp.tagName === 'textarea' || 
        inp.tagName === 'select' || 
        inp.type === 'radio_group' ||
        (inp.tagName === 'input' && inp.type !== 'hidden' && inp.type !== 'submit' && inp.type !== 'button' && inp.type !== 'checkbox' && inp.type !== 'radio')
      );

      await logStep(`Found ${fillableInputs.length} fillable input fields.`);

      let hasRealForm = false;
      let mapping = {};

      if (fillableInputs.length > 0) {
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

        mapping = safeParseJSON(mappingRes) || {};
        await logStep(`AI mappings received: ${JSON.stringify(mapping)}`);

        const hasFields = Object.values(mapping).some(val => val !== 'ignore');
        if (hasFields) {
          hasRealForm = true;
        }
      }

      if (hasRealForm) {
        // 7. Fill fields
        for (const [idxStr, key] of Object.entries(mapping)) {
          if (key === 'ignore') continue;
          const index = parseInt(idxStr);
          const input = fillableInputs.find(inp => inp.index === index);
          if (!input) continue;

          // For radio groups, we don't use standard selectors
          const isRadio = input.type === 'radio_group';
          const selector = !isRadio 
            ? (input.id ? `#${input.id}` : (input.name ? `${input.tagName}[name="${input.name}"]` : null))
            : null;

          if (!selector && !isRadio) continue;

          try {
            if (key === 'resume') {
              if (tempPdfPath) {
                await logStep('Uploading Resume PDF...');
                const fileElement = await pageToProcess.$(selector);
                if (fileElement) {
                  await fileElement.uploadFile(tempPdfPath);
                  await logStep('Resume PDF file attached.');
                }
              }
            } else if (isRadio) {
              await logStep(`Selecting AI option for radio group: "${input.labelText}"...`);
              const optionsStr = input.options.map(opt => `Value: "${opt.value}", Label: "${opt.labelText}"`).join('\n');
              const choicePrompt = `Choose the correct option for this job application question: "${input.labelText}".
Options:
${optionsStr}

Candidate Profile Details:
- full_name: "${profile.parsed_profile?.full_name || ''}"
- notice_period: "${userSettings?.notice_period || ''}"
- expected_salary: "${userSettings?.expected_salary || ''}"
- resume_details: ${JSON.stringify(profile.parsed_profile)}

Return ONLY the exact Value of the chosen option. Do not return any other text.`;

              const chosenValue = await callAIProxy([
                { role: 'system', content: 'You are an AI form filler. Return ONLY the exact value of the correct option.' },
                { role: 'user', content: choicePrompt }
              ], authToken);

              const trimmedValue = chosenValue.trim();
              const optionToSelect = input.options.find(opt => opt.value === trimmedValue || opt.labelText.toLowerCase() === trimmedValue.toLowerCase());
              
              if (optionToSelect) {
                const radioSelector = `#${optionToSelect.id}`;
                await pageToProcess.evaluate((sel, name, val) => {
                  let el = document.querySelector(sel);
                  if (!el) {
                    el = document.querySelector(`input[type="radio"][name="${name}"][value="${val}"]`);
                  }
                  if (el) {
                    el.click();
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }, radioSelector, input.name, optionToSelect.value);
                await logStep(`Selected radio option: "${optionToSelect.labelText}"`);
              } else {
                await logStep(`Warning: AI returned choice "${trimmedValue}" which did not match options. Selecting default option.`);
                const firstOption = input.options[0];
                if (firstOption) {
                  await pageToProcess.evaluate((name, val) => {
                    const el = document.querySelector(`input[type="radio"][name="${name}"][value="${val}"]`);
                    if (el) {
                      el.click();
                      el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }, input.name, firstOption.value);
                }
              }
            } else if (key === 'custom_question') {
              if (input.tagName === 'select') {
                await logStep(`Selecting AI option for dropdown: "${input.labelText || input.placeholder}"...`);
                const options = await pageToProcess.evaluate((sel) => {
                  const select = document.querySelector(sel);
                  if (!select) return [];
                  return Array.from(select.options).map(opt => ({ value: opt.value, text: opt.text }));
                }, selector);

                const optionsStr = options.map(opt => `Value: "${opt.value}", Text: "${opt.text}"`).join('\n');
                const choicePrompt = `Choose the correct option for this job application dropdown question: "${input.labelText || input.placeholder}".
Options:
${optionsStr}

Candidate Profile Details:
- full_name: "${profile.parsed_profile?.full_name || ''}"
- notice_period: "${userSettings?.notice_period || ''}"
- expected_salary: "${userSettings?.expected_salary || ''}"
- resume_details: ${JSON.stringify(profile.parsed_profile)}

Return ONLY the exact Value of the chosen option. Do not return any other text.`;

                const chosenValue = await callAIProxy([
                  { role: 'system', content: 'You are an AI form filler. Return ONLY the exact value of the correct option.' },
                  { role: 'user', content: choicePrompt }
                ], authToken);

                const trimmedValue = chosenValue.trim();
                await pageToProcess.evaluate((sel, val) => {
                  const select = document.querySelector(sel);
                  if (!select) return;
                  const options = Array.from(select.options);
                  const bestOption = options.find(opt => opt.value === val || opt.text.toLowerCase().includes(val.toLowerCase()));
                  if (bestOption) {
                    select.value = bestOption.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }, selector, trimmedValue);
                await logStep(`Selected option value: "${trimmedValue}"`);
              } else {
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

                await pageToProcess.focus(selector);
                await pageToProcess.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
                await pageToProcess.type(selector, generatedAnswer.trim(), { delay: 10 });
                await logStep('Dynamic AI answer typed.');
              }
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
                await logStep(`Filling ${key} with value: ${val}`);
                if (input.tagName === 'select') {
                  await pageToProcess.evaluate((sel, value) => {
                    const select = document.querySelector(sel);
                    if (!select) return;
                    const valLower = value.toLowerCase();
                    const options = Array.from(select.options);
                    const bestOption = options.find(opt => 
                      opt.value.toLowerCase() === valLower || 
                      opt.text.toLowerCase().includes(valLower)
                    );
                    if (bestOption) {
                      select.value = bestOption.value;
                      select.dispatchEvent(new Event('change', { bubbles: true }));
                      select.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }, selector, val);
                } else {
                  await pageToProcess.focus(selector);
                  await pageToProcess.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
                  await pageToProcess.type(selector, val, { delay: 10 });
                }
              }
            }
          } catch (err) {
            await logStep(`[Warning] Failed to fill field ${input.labelText || input.name}: ${err.message}`);
          }
        }

        // 8. Submit Form
        await logStep('Locating submit button...');
        const submitBtn = await pageToProcess.$('button[type="submit"], input[type="submit"], .submit-btn, #submit');
        if (submitBtn) {
          await logStep('Submitting application...');
          await Promise.all([
            pageToProcess.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
            submitBtn.click()
          ]);
          await logStep('Submission clicked. Checking for validation errors or success...');

          // Wait a short time for client-side validation messages to render
          await new Promise(r => setTimeout(r, 4000));

          // Check for form validation errors on the page
          const validationErrorFound = await pageToProcess.evaluate(() => {
            const errorKeywords = [
              'required field', 'please fill', 'must enter', 'invalid email', 
              'error occurred', 'fix errors', 'correct fields', 'invalid value',
              'cannot be blank', 'is required', 'error', 'invalid', 'blank', 'empty'
            ];
            
            const visibleErrorElements = Array.from(document.querySelectorAll('.error, .invalid, .danger, .alert, [role="alert"], .warning-text, .error-message'));
            
            for (const el of visibleErrorElements) {
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && el.innerText.trim().length > 0) {
                const txt = el.innerText.toLowerCase();
                const hasErrorKeyword = errorKeywords.some(kw => txt.includes(kw));
                if (hasErrorKeyword) {
                  return `Visible error element found: ${el.innerText.trim()}`;
                }
              }
            }
            
            const bodyText = document.body.innerText.toLowerCase();
            const genericFormErrorKeywords = [
              'required field', 'please fill', 'must enter', 'invalid email', 
              'error occurred', 'fix errors', 'correct fields', 'invalid value',
              'cannot be blank', 'is required'
            ];
            for (const kw of genericFormErrorKeywords) {
              if (bodyText.includes(kw)) {
                const isFormError = bodyText.includes('please') || bodyText.includes('invalid') || bodyText.includes('correct');
                if (isFormError) {
                  return `Page contains error keyword: "${kw}"`;
                }
              }
            }
            
            return null;
          });

          if (validationErrorFound) {
            throw new Error(`Form submission failed validation check: ${validationErrorFound}`);
          }

          const currentUrl = pageToProcess.url();
          const currentUrlLower = currentUrl.toLowerCase();
          const isFalseSuccessRedirect = 
            currentUrlLower.endsWith('/login') || 
            currentUrlLower.endsWith('/signup') || 
            currentUrlLower.endsWith('/signin') || 
            currentUrlLower.endsWith('/register') ||
            currentUrlLower === jobUrl.toLowerCase() + '/login' ||
            currentUrlLower === jobUrl.toLowerCase() + '/signup';

          if (isFalseSuccessRedirect) {
            throw new Error(`Application redirected to login/signup page: ${currentUrl}`);
          }

          const bodyText = await pageToProcess.evaluate(() => document.body.innerText);

          // Call Gemini to strictly verify if it's a success screen
          await logStep('Verifying submission confirmation with Gemini AI...');
          const successVerificationPrompt = `You are a job application verification agent.
Analyze the following text displayed on a web page after clicking the submit button:
---
${bodyText.substring(0, 1500)}
---

Determine if this text represents a successful job application confirmation screen (e.g. "application submitted", "thank you for applying", "confirmation number", etc.).
If there are form errors, sign-in demands, captcha blocks, or generic search portals, it is NOT a success.

Return ONLY a JSON object in this format:
{
  "is_success": true/false,
  "reason": "1-sentence explanation of why it is or isn't a success",
  "confirmation_id": "extract confirmation/reference code if present, otherwise 'N/A'",
  "message": "success message or thank you statement if present, otherwise 'N/A'"
}`;

          const verificationResStr = await callAIProxy([
            { role: 'system', content: 'You are a parsing system. Return ONLY valid raw JSON.' },
            { role: 'user', content: successVerificationPrompt }
          ], authToken);

          const verificationResult = safeParseJSON(verificationResStr) || { is_success: false, reason: 'AI parsing failed', confirmation_id: 'N/A', message: 'N/A' };
          await logStep(`Gemini verification result: ${JSON.stringify(verificationResult)}`);

          if (verificationResult.is_success) {
            await logStep('Success confirmation page verified by AI.');
            
            const successMsg = verificationResult.message !== 'N/A' ? verificationResult.message : 'Your application was submitted successfully.';
            const confirmationId = verificationResult.confirmation_id;

            await logStep(`Parsed Confirmation Code: ${confirmationId}`);
            await logStep(`Parsed Success Message: ${successMsg}`);

            // Prepend metadata tags to logs array
            logs.unshift(`[SUCCESS_CONFIRMATION_ID] ${confirmationId}`);
            logs.unshift(`[SUCCESS_CONFIRMATION_MSG] ${successMsg}`);

            const screenshotPath = await uploadScreenshot(pageToProcess);
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
            formFilledAndSubmitted = true;
            break;
          } else {
            throw new Error(`Application submission could not be verified: ${verificationResult.reason}`);
          }
        } else {
          await logStep('Form detected but no submit button identified.');
        }
      }

      // No form filled yet. Let's see if we can find a redirect button to go to the actual page.
      await logStep('Checking for external redirect/Apply button...');
      const redirectBtnInfoResult = await pageToProcess.evaluate(() => {
        const selectorStr = 'a, button, [role="button"], input[type="button"], input[type="submit"], div, span';
        const elements = Array.from(document.querySelectorAll(selectorStr));
        
        const primaryKeywords = [
          'apply on company site',
          'apply on company website',
          'apply on employer\'s site',
          'apply on employer website',
          'apply on company\'s website',
          'apply on company',
          'apply online',
          'apply now',
          'apply for this job',
          'apply to this job',
          'apply on linkedin',
          'apply via linkedin',
          'linkedin',
          'apply on indeed',
          'apply via indeed',
          'indeed',
          'apply on glassdoor',
          'glassdoor',
          'apply on ziprecruiter',
          'ziprecruiter',
          'quick apply',
          'easy apply',
          'apply directly',
          'visit website',
          'visit site',
          'visit page',
          'apply via',
          'go to job',
          'continue to application',
          'continue to job',
          'proceed to application'
        ];

        const secondaryKeywords = [
          'apply',
          'submit application'
        ];

        const candidates = [];
        elements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const tagName = el.tagName.toLowerCase();

          // Check visibility - allow <a> tags with valid hrefs even if bounding rect is 0 (due to nested block children)
          let isVisible = (rect.width > 0 && rect.height > 0) || el.offsetWidth > 0 || el.offsetHeight > 0;
          if (tagName === 'a' && el.href && !el.href.startsWith('javascript:') && !el.href.startsWith('#')) {
            isVisible = true;
          }

          if (
            !isVisible || 
            style.display === 'none' || 
            style.visibility === 'hidden' || 
            parseFloat(style.opacity) === 0
          ) {
            return;
          }

          // Check if element is interactive
          const isInteractive = ['a', 'button', 'input'].includes(tagName) || 
                               el.getAttribute('role') === 'button' || 
                               style.cursor === 'pointer' ||
                               (el.className && el.className.toLowerCase().includes('apply')) ||
                               (el.id && el.id.toLowerCase().includes('apply'));

          if (!isInteractive) return;

          // Get text representation including labels, alt, title, etc.
          let text = (el.innerText || el.textContent || el.value || el.title || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim().toLowerCase();
          if (!text) {
            const img = el.querySelector('img, svg');
            if (img) {
              text = (img.getAttribute('alt') || img.getAttribute('title') || img.title || '').trim().toLowerCase();
            }
          }

          const href = el.href || '';
          const className = el.className || '';
          const id = el.id || '';

          let score = 0;
          let matched = false;

          // Keyword matching
          if (text) {
            const matchedPrimary = primaryKeywords.find(kw => text.includes(kw));
            if (matchedPrimary) {
              matched = true;
              if (text === matchedPrimary) {
                score += 100;
              } else if (text.startsWith(matchedPrimary)) {
                score += 80;
              } else {
                score += 50;
              }
            } else {
              const matchedSecondary = secondaryKeywords.find(kw => text.includes(kw));
              if (matchedSecondary) {
                matched = true;
                if (text === matchedSecondary) {
                  score += 70;
                } else if (text.startsWith(matchedSecondary)) {
                  score += 60;
                } else {
                  score += 30;
                }
              }
            }
          }

          // If no keyword match, we can still accept it if it is a link with an external href and is not negative
          if (!matched) {
            if (tagName === 'a' && href && !href.startsWith('javascript:') && !href.startsWith('#')) {
              score += 15;
            } else {
              return; // Discard non-link elements without keywords
            }
          }

          // Size bonuses
          if (rect.width > 120 && rect.height > 35) {
            score += 30;
          } else if (rect.width > 80 && rect.height > 25) {
            score += 10;
          }

          // Class/ID patterns
          const cNameLower = className.toLowerCase();
          const idLower = id.toLowerCase();
          
          if (cNameLower.includes('cta') || cNameLower.includes('btn-primary') || cNameLower.includes('btn-apply') || cNameLower.includes('apply-btn')) {
            score += 25;
          }
          if (idLower.includes('cta') || idLower.includes('apply')) {
            score += 25;
          }

          // De-prioritize negative patterns in class/id/text
          const negativePatterns = ['share', 'social', 'print', 'email', 'save', 'favorite', 'report', 'flag', 'back', 'cancel', 'signin', 'login', 'register', 'signup', 'terms', 'privacy', 'cookie', 'about', 'contact', 'help', 'faq', 'feedback', 'home', 'blog'];
          negativePatterns.forEach(pattern => {
            if (text.includes(pattern) || cNameLower.includes(pattern) || idLower.includes(pattern)) {
              score -= 80;
            }
          });

          // Check parents for sidebar/related/recommendations/footer
          let parent = el.parentElement;
          let dePrioritizedParent = false;
          while (parent) {
            const parentTagName = parent.tagName.toLowerCase();
            if (parentTagName === 'footer' || parentTagName === 'header' || parentTagName === 'nav' || parentTagName === 'aside') {
              dePrioritizedParent = true;
              break;
            }
            const pClass = (parent.className || '').toLowerCase();
            const pId = (parent.id || '').toLowerCase();
            if (
              pClass.includes('recommend') || pClass.includes('related') || pClass.includes('sidebar') || pClass.includes('footer') || pClass.includes('header') || pClass.includes('nav') ||
              pId.includes('recommend') || pId.includes('related') || pId.includes('sidebar') || pId.includes('footer') || pId.includes('header') || pId.includes('nav')
            ) {
              dePrioritizedParent = true;
              break;
            }
            parent = parent.parentElement;
          }

          if (dePrioritizedParent) {
            score -= 50;
          }

          // Href heuristics and bonuses
          if (href) {
            if (href.startsWith('javascript:') || href.startsWith('#')) {
              score -= 30;
            } else {
              const hrefLower = href.toLowerCase();
              if (hrefLower.includes('apply') || hrefLower.includes('redirect') || hrefLower.includes('/land/') || hrefLower.includes('/ad/')) {
                score += 30;
              }
            }
          }

          candidates.push({
            index,
            text: text.substring(0, 50),
            tagName,
            href: href.substring(0, 150),
            score
          });
        });

        candidates.sort((a, b) => b.score - a.score);
        return {
          bestCandidate: candidates[0] || null,
          topCandidates: candidates.slice(0, 5)
        };
      });

      const redirectBtnInfo = redirectBtnInfoResult?.bestCandidate;
      if (redirectBtnInfoResult?.topCandidates) {
        await logStep(`Top candidates evaluated: ${JSON.stringify(redirectBtnInfoResult.topCandidates)}`);
      }

      if (redirectBtnInfo) {
        await logStep(`Found redirect button: "${redirectBtnInfo.text}". Clicking to follow link...`);
        
        await pageToProcess.evaluate((idx) => {
          const selectorStr = 'a, button, [role="button"], input[type="button"], input[type="submit"], div, span';
          const elements = Array.from(document.querySelectorAll(selectorStr));
          const el = elements[idx];
          if (el) el.setAttribute('data-talvorax-redirect-target', 'true');
        }, redirectBtnInfo.index);

        const elementHandle = await pageToProcess.$('[data-talvorax-redirect-target="true"]');
        if (elementHandle) {
          const nextPage = await clickAndFollowRedirect(pageToProcess, elementHandle);
          if (nextPage !== pageToProcess) {
            pageToProcess = nextPage;
          } else {
            // Clean up the attribute if we stay on same page
            await pageToProcess.evaluate(() => {
              const el = document.querySelector('[data-talvorax-redirect-target="true"]');
              if (el) el.removeAttribute('data-talvorax-redirect-target');
            }).catch(() => {});
          }
          redirectCount++;
          await new Promise(r => setTimeout(r, 3000));
        } else {
          await logStep('Failed to resolve redirect button element handle.');
          break;
        }
      } else {
        await logStep('No redirect or application form found on this page.');
        break;
      }
    }

    if (!formFilledAndSubmitted) {
      await logStep('Form could not be auto-submitted. Setting status to Needs Manual Action.');
      const screenshotPath = await uploadScreenshot(pageToProcess);
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
      try {
        screenshotPath = await uploadScreenshot(pageToProcess || page);
      } catch (_) {
        const pageList = await browser.pages();
        if (pageList.length > 0) {
          screenshotPath = await uploadScreenshot(pageList[0]);
        }
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
