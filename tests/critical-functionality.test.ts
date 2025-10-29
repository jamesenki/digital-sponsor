/**
 * Critical Functionality Tests
 * 
 * Tests for all identified issues and core app functionality
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001'

test.describe('Critical Functionality Tests', () => {
  
  // Test 1: AI Chat Functionality
  test.describe('AI Chat Functionality', () => {
    test('Chat interface loads and displays welcome message', async ({ page }) => {
      await page.goto(`${BASE_URL}/chat`)
      
      // Wait for chat container to load
      await page.waitForSelector('[data-testid="chat-container"]', { timeout: 10000 })
      
      // Verify welcome message is displayed
      const welcomeMessage = page.locator('[data-testid="message-assistant"]').first()
      await expect(welcomeMessage).toBeVisible()
      await expect(welcomeMessage).toContainText("Hello! I'm your Digital Sponsor")
    })

    test('User can type and send messages', async ({ page }) => {
      await page.goto(`${BASE_URL}/chat`)
      await page.waitForSelector('[data-testid="chat-input"]')
      
      // Type a message
      const testMessage = "What does Step 1 mean?"
      await page.fill('[data-testid="chat-input"]', testMessage)
      
      // Verify send button is enabled
      const sendButton = page.locator('[data-testid="send-button"]')
      await expect(sendButton).toBeEnabled()
      
      // Send message
      await page.click('[data-testid="send-button"]')
      
      // Verify user message appears
      const userMessage = page.locator('[data-testid="message-user"]').last()
      await expect(userMessage).toContainText(testMessage)
      
      // Verify loading indicator appears
      await expect(page.locator('[data-testid="loading-message"]')).toBeVisible()
    })

    test('Chat handles API errors gracefully', async ({ page }) => {
      // Block chat API requests to simulate server error
      await page.route('**/api/chat', route => route.abort())
      
      await page.goto(`${BASE_URL}/chat`)
      await page.waitForSelector('[data-testid="chat-input"]')
      
      // Send a message
      await page.fill('[data-testid="chat-input"]', 'Test message')
      await page.click('[data-testid="send-button"]')
      
      // Verify error handling
      await expect(page.locator('text=having trouble connecting')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=crisis button')).toBeVisible()
    })

    test('Chat respects character limit', async ({ page }) => {
      await page.goto(`${BASE_URL}/chat`)
      await page.waitForSelector('[data-testid="chat-input"]')
      
      // Type a very long message (over 500 characters)
      const longMessage = 'a'.repeat(600)
      await page.fill('[data-testid="chat-input"]', longMessage)
      
      // Check that input is limited to 500 characters
      const inputValue = await page.inputValue('[data-testid="chat-input"]')
      expect(inputValue.length).toBeLessThanOrEqual(500)
      
      // Verify character counter is shown
      await expect(page.locator('.char-count')).toBeVisible()
    })

    test('Enter key sends message', async ({ page }) => {
      await page.goto(`${BASE_URL}/chat`)
      await page.waitForSelector('[data-testid="chat-input"]')
      
      await page.fill('[data-testid="chat-input"]', 'Test enter key')
      await page.press('[data-testid="chat-input"]', 'Enter')
      
      // Verify message was sent (input should be cleared)
      const inputValue = await page.inputValue('[data-testid="chat-input"]')
      expect(inputValue).toBe('')
    })
  })

  // Test 2: Enhanced Step Worksheets
  test.describe('Enhanced Step Worksheets', () => {
    test('Step worksheet loads with prayer and instructions', async ({ page }) => {
      await page.goto(`${BASE_URL}/step-work`)
      
      // Navigate to a specific step (e.g., Step 1)
      await page.click('text=Step 1')
      
      // Verify step worksheet components are present
      await expect(page.locator('[data-testid="step-1-worksheet"]')).toBeVisible()
      
      // Check for step prayer
      await expect(page.locator('.step-prayer')).toBeVisible()
      await expect(page.locator('text=🙏 Step Prayer')).toBeVisible()
      
      // Check for instructions
      await expect(page.locator('.step-instructions')).toBeVisible()
      await expect(page.locator('text=📝 Instructions')).toBeVisible()
      
      // Check for reflection questions
      await expect(page.locator('.reflection-questions')).toBeVisible()
      await expect(page.locator('text=💭 Reflection Questions')).toBeVisible()
    })

    test('Rich text editor is functional', async ({ page }) => {
      await page.goto(`${BASE_URL}/step-work`)
      await page.click('text=Step 1')
      
      // Wait for content editor
      await page.waitForSelector('[data-testid="step-content-editor"]')
      
      // Click in the editor
      await page.click('[data-testid="step-content-editor"]')
      
      // Type some content
      await page.type('[data-testid="step-content-editor"]', 'This is my step work content.')
      
      // Test formatting buttons
      await page.click('button[title="Bold"]')
      await page.type('[data-testid="step-content-editor"]', 'Bold text')
      
      // Verify content was entered
      const editorContent = await page.textContent('[data-testid="step-content-editor"]')
      expect(editorContent).toContain('This is my step work content.')
      expect(editorContent).toContain('Bold text')
    })

    test('Add question to worksheet functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/step-work`)
      await page.click('text=Step 1')
      
      // Click "Add to Worksheet" button for first question
      await page.click('.add-question-btn', { first: true })
      
      // Verify question was added to editor
      const editorContent = await page.textContent('[data-testid="step-content-editor"]')
      expect(editorContent).toContain('Q1:')
      expect(editorContent).toContain('A:')
    })

    test('Word count updates correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/step-work`)
      await page.click('text=Step 1')
      
      await page.click('[data-testid="step-content-editor"]')
      await page.type('[data-testid="step-content-editor"]', 'One two three four five words')
      
      // Check word count (should be at least 6 words)
      await expect(page.locator('text=6 words')).toBeVisible()
    })

    test('Export functionality works', async ({ page }) => {
      await page.goto(`${BASE_URL}/step-work`)
      await page.click('text=Step 1')
      
      // Add some content
      await page.click('[data-testid="step-content-editor"]')
      await page.type('[data-testid="step-content-editor"]', 'Test content for export')
      
      // Set up download handling
      const downloadPromise = page.waitForEvent('download')
      
      // Click export button
      await page.click('button[title="Export as HTML"]')
      
      // Verify download started
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('Step_1_Worksheet.html')
    })

    test('Different steps have different content', async ({ page }) => {
      await page.goto(`${BASE_URL}/step-work`)
      
      // Test Step 1
      await page.click('text=Step 1')
      await expect(page.locator('text=powerless over alcohol')).toBeVisible()
      
      // Test Step 4
      await page.click('text=Step 4')
      await expect(page.locator('text=moral inventory')).toBeVisible()
      await expect(page.locator('text=resentment inventory')).toBeVisible()
    })
  })

  // Test 3: Navigation and UI Issues
  test.describe('Navigation and UI', () => {
    test('Navigation buttons are professional and functional', async ({ page }) => {
      await page.goto(`${BASE_URL}`)
      
      // Check that header doesn't have goofy emoji buttons
      const header = page.locator('header')
      await expect(header).toBeVisible()
      
      // Should have "Resources" button instead of emoji
      await expect(page.locator('button:has-text("Resources")')).toBeVisible()
      
      // Should NOT have random emoji buttons
      await expect(page.locator('button:has-text("📚")')).not.toBeVisible()
      await expect(page.locator('button:has-text("📊")')).not.toBeVisible()
    })

    test('Main navigation works correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}`)
      
      // Test navigation to different pages
      const navItems = [
        { text: 'Chat', url: '/chat' },
        { text: 'Literature', url: '/literature' },
        { text: 'Steps', url: '/step-work' },
        { text: 'Crisis', url: '/crisis' }
      ]

      for (const item of navItems) {
        await page.click(`nav a:has-text("${item.text}")`)
        await expect(page).toHaveURL(new RegExp(item.url))
        
        // Verify page loaded correctly (no blank pages)
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('h1, h2')).toBeVisible()
      }
    })

    test('Crisis button is always visible and functional', async ({ page }) => {
      const pages = ['/', '/chat', '/literature', '/step-work', '/crisis']
      
      for (const path of pages) {
        await page.goto(`${BASE_URL}${path}`)
        
        // Crisis button should be visible
        const crisisButton = page.locator('[data-testid="crisis-button"]')
        await expect(crisisButton).toBeVisible()
        
        // Should be clickable
        await expect(crisisButton).toBeEnabled()
        
        // Should have proper accessibility
        await expect(crisisButton).toHaveAttribute('aria-label')
      }
    })

    test('Header status indicators are appropriate', async ({ page }) => {
      await page.goto(`${BASE_URL}`)
      
      // Check for appropriate status indicators
      await expect(page.locator('text=Digital Sponsor')).toBeVisible()
      await expect(page.locator('text=🔒 Anonymous')).toBeVisible()
      await expect(page.locator('text=Online').or(page.locator('text=Offline'))).toBeVisible()
    })
  })

  // Test 4: User Registration Acceptance Tests (for Azure migration)
  test.describe('User Registration (Future Azure Feature)', () => {
    test('Anonymous mode works without registration', async ({ page }) => {
      await page.goto(`${BASE_URL}`)
      
      // Verify app works without any registration
      await expect(page.locator('text=🔒 Anonymous')).toBeVisible()
      
      // Should be able to use all features
      await page.goto(`${BASE_URL}/chat`)
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible()
      
      await page.goto(`${BASE_URL}/step-work`)
      await expect(page.locator('text=Step')).toBeVisible()
      
      // No registration prompts should appear
      await expect(page.locator('text=sign up').or(page.locator('text=register'))).not.toBeVisible()
    })

    test('Acceptance test: Optional registration flow (Azure)', async ({ page }) => {
      // This test defines the expected behavior when registration is implemented
      await page.goto(`${BASE_URL}`)
      
      // When registration is implemented, there should be an optional way to create account
      // but app should still work without it
      
      // Test that anonymous usage continues to work
      await expect(page.locator('text=🔒 Anonymous')).toBeVisible()
      
      // Future registration should:
      // 1. Be completely optional
      // 2. Maintain anonymity (no real names required)
      // 3. Only be for syncing data across devices
      // 4. Include clear privacy policy
      // 5. Follow AA Tradition 12 (anonymity)
      
      console.log('Registration will be implemented in Azure migration phase')
      console.log('Requirements: Optional, anonymous, privacy-focused')
    })

    test('Data privacy compliance check', async ({ page }) => {
      await page.goto(`${BASE_URL}`)
      
      // Verify no personal data is collected currently
      const localStorage = await page.evaluate(() => Object.keys(localStorage))
      const sessionStorage = await page.evaluate(() => Object.keys(sessionStorage))
      
      // Should not contain personal data keys
      const personalDataKeys = ['name', 'email', 'phone', 'address', 'birthday', 'fullName']
      personalDataKeys.forEach(key => {
        expect(localStorage).not.toContain(key)
        expect(sessionStorage).not.toContain(key)
      })
      
      // Verify privacy indicators
      await expect(page.locator('text=🔒 Anonymous')).toBeVisible()
      await expect(page.locator('text=Privacy')).toBeVisible()
    })
  })

  // Test 5: API Connectivity and Error Handling
  test.describe('API Connectivity', () => {
    test('Backend health check responds correctly', async ({ page }) => {
      const response = await page.request.get(`${BASE_URL}/api/health`)
      expect(response.ok()).toBeTruthy()
      
      const healthData = await response.json()
      expect(healthData).toHaveProperty('status')
    })

    test('Crisis API is always available', async ({ page }) => {
      const response = await page.request.get(`${BASE_URL}/api/crisis`)
      expect(response.ok()).toBeTruthy()
      
      const crisisData = await response.json()
      expect(crisisData).toHaveProperty('resources')
      expect(Array.isArray(crisisData.resources)).toBeTruthy()
    })

    test('Chat API returns appropriate responses', async ({ page }) => {
      const response = await page.request.post(`${BASE_URL}/api/chat`, {
        data: {
          message: 'Test message',
          session_id: 'test-session'
        }
      })
      
      expect(response.ok()).toBeTruthy()
      
      const chatData = await response.json()
      expect(chatData).toHaveProperty('response')
      expect(chatData.response).toHaveProperty('message')
      expect(chatData).toHaveProperty('compliance')
      expect(chatData.compliance.aa_traditions).toBeTruthy()
    })

    test('Session creation works', async ({ page }) => {
      const response = await page.request.post(`${BASE_URL}/api/sessions`, {
        data: {}
      })
      
      expect(response.ok()).toBeTruthy()
      
      const sessionData = await response.json()
      expect(sessionData).toHaveProperty('session_id')
      expect(sessionData).toHaveProperty('anonymous')
      expect(sessionData.anonymous).toBeTruthy()
    })
  })

  // Test 6: Offline Functionality
  test.describe('Offline Capability', () => {
    test('App handles offline mode gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}`)
      
      // Go offline
      await page.setOffline(true)
      
      // Verify offline indicator appears
      await expect(page.locator('text=Offline')).toBeVisible()
      
      // Crisis button should still be visible and clickable
      await expect(page.locator('[data-testid="crisis-button"]')).toBeVisible()
      
      // Step work should still be accessible (local storage)
      await page.goto(`${BASE_URL}/step-work`)
      await expect(page.locator('text=Step')).toBeVisible()
    })

    test('Chat shows appropriate offline message', async ({ page }) => {
      await page.goto(`${BASE_URL}/chat`)
      
      // Go offline
      await page.setOffline(true)
      await page.reload()
      
      // Should show offline banner
      await expect(page.locator('text=Offline mode')).toBeVisible()
      
      // Input should be disabled
      await expect(page.locator('[data-testid="chat-input"]')).toBeDisabled()
    })
  })

  // Test 7: Mobile Responsiveness
  test.describe('Mobile Responsiveness', () => {
    test('App is mobile responsive', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 } // iPhone size
      })
      
      const page = await context.newPage()
      await page.goto(`${BASE_URL}`)
      
      // Check that navigation works on mobile
      await expect(page.locator('nav')).toBeVisible()
      
      // Check that content fits
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const windowWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyScrollWidth).toBeLessThanOrEqual(windowWidth + 5) // 5px tolerance
      
      // Crisis button should be appropriately sized for touch
      const crisisButton = page.locator('[data-testid="crisis-button"]')
      const buttonBox = await crisisButton.boundingBox()
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44) // Minimum touch target
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44)
    })
  })
})

test.describe('Performance and Accessibility', () => {
  test('Pages load within performance budget', async ({ page }) => {
    const startTime = Date.now()
    await page.goto(`${BASE_URL}`)
    await page.waitForSelector('main')
    const loadTime = Date.now() - startTime
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('Basic accessibility compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}`)
    
    // Check for proper heading structure
    const h1Elements = await page.locator('h1').count()
    expect(h1Elements).toBeGreaterThan(0)
    
    // Check for alt text on images
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      await expect(img).toHaveAttribute('alt')
    }
    
    // Check for proper form labels
    const inputs = page.locator('input, textarea')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const hasLabel = await input.getAttribute('aria-label') !== null ||
                      await input.getAttribute('aria-labelledby') !== null ||
                      await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0
      
      expect(hasLabel).toBeTruthy()
    }
  })
})