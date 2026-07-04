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
  let pageToProcess = null;

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
    const getChromiumPath = () => {
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      if (process.platform === 'win32') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      }
      const systemPaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ];
      for (const p of systemPaths) {
        if (fs.existsSync(p)) return p;
      }
      try {
        return puppeteer.executablePath();
      } catch (_) {}
      return '/usr/bin/chromium';
    };

    const chromiumPath = getChromiumPath();

    const launchOpts = {
      headless: "new",
      executablePath: chromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    };

    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

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

      // 5. Scan elements
      await logStep(`Scanning page DOM for form input fields (Attempt ${redirectCount + 1})...`);
      const inputs = await pageToProcess.evaluate(() => {
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
                const fileElement = await pageToProcess.$(selector);
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

              await pageToProcess.focus(selector);
              await pageToProcess.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
              await pageToProcess.type(selector, generatedAnswer.trim(), { delay: 10 });
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
                await pageToProcess.focus(selector);
                await pageToProcess.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
                await pageToProcess.type(selector, val, { delay: 10 });
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
          await logStep('Submission clicked. Verifying page status...');

          const currentUrl = pageToProcess.url();
          const bodyText = await pageToProcess.evaluate(() => document.body.innerText);
          const successWords = ['submitted', 'thank you', 'success', 'application received', 'confirmation'];
          const isSuccess = successWords.some(kw => bodyText.toLowerCase().includes(kw)) || currentUrl !== jobUrl;

          if (isSuccess) {
            await logStep('Success confirmation page identified.');
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
            throw new Error('Submit button clicked but success page could not be programmatically verified.');
          }
        } else {
          await logStep('Form detected but no submit button identified.');
        }
      }

      // No form filled yet. Let's see if we can find a redirect button to go to the actual page.
      await logStep('Checking for external redirect/Apply button...');
      const redirectBtnInfo = await pageToProcess.evaluate(() => {
        const selectorStr = 'a, button, [role="button"], input[type="button"], input[type="submit"], div, span';
        const elements = Array.from(document.querySelectorAll(selectorStr));
        
        const primaryKeywords = [
          'apply on company site',
          'apply on company website',
          'apply on employer\'s site',
          'apply on employer website',
          'apply on company\'s website',
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
          // Check visibility
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (
            rect.width === 0 || 
            rect.height === 0 || 
            style.display === 'none' || 
            style.visibility === 'hidden' || 
            parseFloat(style.opacity) === 0
          ) {
            return;
          }

          // Check if element is interactive
          const tagName = el.tagName.toLowerCase();
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

          if (!text) return;

          const href = el.href || '';
          const className = el.className || '';
          const id = el.id || '';

          let score = 0;
          let matched = false;

          // Keyword matching
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

          if (!matched) return; // Must match one of the keywords

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
          const negativePatterns = ['share', 'social', 'print', 'email', 'save', 'favorite', 'report', 'flag', 'back', 'cancel', 'signin', 'login', 'register', 'signup'];
          negativePatterns.forEach(pattern => {
            if (text.includes(pattern) || cNameLower.includes(pattern) || idLower.includes(pattern)) {
              score -= 40;
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

          // Href heuristics
          if (href) {
            if (href.startsWith('javascript:') || href.startsWith('#')) {
              score -= 20;
            } else if (href.includes('apply') || href.includes('redirect')) {
              score += 20;
            }
          }

          candidates.push({
            index,
            text: text.substring(0, 50),
            tagName: el.tagName.toLowerCase(),
            href,
            score
          });
        });

        candidates.sort((a, b) => b.score - a.score);
        return candidates[0] || null;
      });

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
