const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../docs/screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshots() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    if (!msg.text().includes('DOM') && !msg.text().includes('Failed to load')) {
      console.log('PAGE:', msg.text());
    }
  });

  try {
    // Screenshot 1: Landing/Login page
    console.log('1. Capturing landing page...');
    await page.goto('https://commonsolution.org', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-landing-page.png'),
      fullPage: false
    });
    console.log('✓ Landing page captured');

    // Try to register with a demo code
    console.log('Switching to Register tab...');
    await page.evaluate(() => {
      const registerTab = document.querySelector('button[data-tab="register"]');
      if (registerTab) registerTab.click();
    });
    await delay(1000);

    // Fill registration form with demo data
    const testEmail = `demo_${Date.now()}@test.com`;
    const testPassword = 'TestPass123!';
    const demoCode = 'DS-GENERAL-DEMO2026';

    console.log('Registering new account with demo code...');
    await page.type('#registerEmail', testEmail, { delay: 20 });
    await page.type('#registerPassword', testPassword, { delay: 20 });

    // Find and fill invitation code field
    await page.evaluate((code) => {
      const codeInput = document.querySelector('#invitationCode') ||
                       document.querySelector('input[placeholder*="code" i]') ||
                       document.querySelector('input[name*="code" i]');
      if (codeInput) {
        codeInput.value = code;
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, demoCode);

    // Find and fill first name if exists
    await page.evaluate(() => {
      const nameInput = document.querySelector('#registerFirstName') ||
                       document.querySelector('input[placeholder*="name" i]');
      if (nameInput) {
        nameInput.value = 'Demo';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await delay(500);

    // Screenshot registration form
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'register-form.png'),
      fullPage: false
    });

    // Submit registration
    console.log('Submitting registration...');
    await page.evaluate(() => {
      const form = document.getElementById('registerForm');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });

    await delay(5000);

    // Check if registration succeeded
    const pageText = await page.evaluate(() => document.body.innerText);
    const registrationSuccess = pageText.includes('Welcome') ||
                                pageText.includes('successful') ||
                                pageText.includes('Dashboard');

    console.log('Registration result - contains Welcome:', pageText.includes('Welcome'));

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-after-register.png'),
      fullPage: false
    });

    // If successful, navigate to each tab
    if (registrationSuccess || pageText.includes('Ask Questions')) {
      console.log('✓ Registration/Login successful!');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-dashboard.png'),
        fullPage: false
      });
      console.log('✓ Dashboard captured');

      const sections = [
        { name: 'Ask Questions', file: '03-chat-interface.png' },
        { name: 'Step Work', file: '04-step-work.png' },
        { name: 'Resources', file: '05-literature-search.png' },
        { name: 'Emergency', file: '06-crisis-support.png' }
      ];

      for (const section of sections) {
        console.log(`Navigating to ${section.name}...`);
        const clicked = await page.evaluate((text) => {
          const tabs = document.querySelectorAll('.nav-tab, [class*="tab"], button, a');
          for (const tab of tabs) {
            if (tab.textContent.trim() === text || tab.textContent.includes(text)) {
              tab.click();
              return true;
            }
          }
          return false;
        }, section.name);

        console.log(`  Clicked ${section.name}:`, clicked);
        await delay(2000);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, section.file),
          fullPage: false
        });
        console.log(`✓ ${section.name} captured`);
      }

      console.log('\n✓ All screenshots captured successfully!');
    } else {
      console.log('Registration may have failed. Current page state saved.');
      console.log('Page text snippet:', pageText.substring(0, 500));
    }

    console.log('\nScreenshots saved to docs/screenshots/');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'error-state.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

takeScreenshots();
