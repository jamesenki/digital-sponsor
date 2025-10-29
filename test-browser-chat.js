// Quick browser test to check chat functionality
const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Testing Chat in Browser...');
  
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });
    
    // Navigate to chat page
    console.log('🌐 Navigating to chat page...');
    await page.goto('http://localhost:3001/chat', { waitUntil: 'networkidle2' });
    
    // Wait for React to load
    await page.waitForTimeout(3000);
    
    // Check if chat container exists
    const chatContainer = await page.$('[data-testid="chat-container"]');
    if (chatContainer) {
      console.log('✅ Chat container found!');
    } else {
      console.log('❌ Chat container not found');
      
      // Check what's actually on the page
      const bodyText = await page.evaluate(() => document.body.textContent);
      console.log('Page content preview:', bodyText.substring(0, 200) + '...');
    }
    
    // Check for chat input
    const chatInput = await page.$('[data-testid="chat-input"]');
    if (chatInput) {
      console.log('✅ Chat input found!');
    } else {
      console.log('❌ Chat input not found');
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
})();