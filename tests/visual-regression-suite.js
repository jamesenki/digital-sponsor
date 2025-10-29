/**
 * Digital Sponsor - Visual Regression Testing Suite
 * 
 * Automated visual testing to prevent UI issues like blank pages
 * and ensure consistent user experience across deployments
 */

const { test, expect, devices } = require('@playwright/test')
const path = require('path')

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3001'
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')

// Pages to test for visual regression
const TEST_PAGES = [
  { path: '/', name: 'home', waitFor: '[data-testid="digital-sponsor-app"]' },
  { path: '/chat', name: 'chat', waitFor: '.chat-container' },
  { path: '/literature', name: 'literature', waitFor: '.literature-container' },
  { path: '/step-work', name: 'step-work', waitFor: '.step-work-container' },
  { path: '/crisis', name: 'crisis', waitFor: '.crisis-container' },
  { path: '/dashboard', name: 'dashboard', waitFor: '.dashboard-container' }
]

// Viewport configurations for responsive testing
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 }
]

// Device-specific tests
const MOBILE_DEVICES = [
  'iPhone 12',
  'Samsung Galaxy S21',
  'iPad'
]

/**
 * Utility function to hide dynamic elements before screenshot
 */
async function hideDynamicElements(page) {
  await page.addStyleTag({
    content: `
      /* Hide dynamic content that changes between tests */
      [data-testid="timestamp"],
      [data-testid="session-id"],
      [data-testid="random-quote"],
      .dynamic-time,
      .session-timestamp,
      .live-clock {
        visibility: hidden !important;
      }
      
      /* Normalize animations for consistent screenshots */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  })
}

/**
 * Wait for page to be fully loaded and stable
 */
async function waitForPageStability(page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle')
  
  // Wait for any lazy-loaded content
  await page.waitForTimeout(1000)
  
  // Wait for fonts to load
  await page.evaluate(() => {
    return document.fonts.ready
  })
}

/**
 * Validate that page rendered correctly (not blank)
 */
async function validatePageRender(page, pageName) {
  // Check if main content is visible
  const mainContent = await page.locator('main').count()
  const navigation = await page.locator('nav').count()
  const crisisButton = await page.locator('[data-testid="crisis-button"]').count()
  
  if (mainContent === 0) {
    throw new Error(`${pageName}: Main content not found - possible blank page`)
  }
  
  if (navigation === 0) {
    throw new Error(`${pageName}: Navigation not found`)
  }
  
  if (crisisButton === 0) {
    throw new Error(`${pageName}: Crisis button not found`)
  }
  
  // Check for JavaScript errors
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  
  // Check if page has actual content (not just loading spinner)
  const bodyText = await page.textContent('body')
  if (!bodyText || bodyText.trim().length < 50) {
    throw new Error(`${pageName}: Page appears to have minimal content`)
  }
  
  console.log(`✅ ${pageName}: Page validation passed`)
}

/**
 * Main visual regression test suite
 */
test.describe('Visual Regression Tests', () => {
  
  // Desktop browser tests
  VIEWPORTS.forEach(viewport => {
    TEST_PAGES.forEach(page => {
      test(`${page.name} - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: viewport
        })
        
        const testPage = await context.newPage()
        
        try {
          // Navigate to page
          await testPage.goto(`${BASE_URL}${page.path}`)
          
          // Wait for page-specific element
          await testPage.waitForSelector(page.waitFor, { timeout: 10000 })
          
          // Wait for stability
          await waitForPageStability(testPage)
          
          // Validate render
          await validatePageRender(testPage, `${page.name}-${viewport.name}`)
          
          // Hide dynamic elements
          await hideDynamicElements(testPage)
          
          // Take screenshot
          await expect(testPage).toHaveScreenshot(
            `${page.name}-${viewport.name}.png`,
            {
              fullPage: true,
              threshold: 0.2, // 20% difference threshold
              animations: 'disabled'
            }
          )
          
          console.log(`📸 Screenshot captured: ${page.name}-${viewport.name}`)
          
        } catch (error) {
          console.error(`❌ Test failed for ${page.name}-${viewport.name}:`, error.message)
          
          // Take a debug screenshot
          await testPage.screenshot({
            path: `${SCREENSHOT_DIR}/debug-${page.name}-${viewport.name}.png`,
            fullPage: true
          })
          
          throw error
        } finally {
          await context.close()
        }
      })
    })
  })
  
  // Mobile device-specific tests
  MOBILE_DEVICES.forEach(deviceName => {
    TEST_PAGES.forEach(page => {
      test(`${page.name} - ${deviceName}`, async ({ browser }) => {
        const device = devices[deviceName]
        const context = await browser.newContext({
          ...device
        })
        
        const testPage = await context.newPage()
        
        try {
          await testPage.goto(`${BASE_URL}${page.path}`)
          await testPage.waitForSelector(page.waitFor, { timeout: 10000 })
          await waitForPageStability(testPage)
          await validatePageRender(testPage, `${page.name}-${deviceName}`)
          await hideDynamicElements(testPage)
          
          // Test mobile-specific interactions
          if (page.name === 'chat') {
            // Test mobile keyboard interaction
            await testPage.tap('textarea')
            await testPage.fill('textarea', 'Test message')
            
            // Verify keyboard doesn't break layout
            await testPage.waitForTimeout(500)
          }
          
          await expect(testPage).toHaveScreenshot(
            `${page.name}-${deviceName.replace(/\s+/g, '-').toLowerCase()}.png`,
            {
              fullPage: true,
              threshold: 0.2,
              animations: 'disabled'
            }
          )
          
        } catch (error) {
          console.error(`❌ Mobile test failed for ${page.name}-${deviceName}:`, error.message)
          throw error
        } finally {
          await context.close()
        }
      })
    })
  })
})

/**
 * Component-specific visual regression tests
 */
test.describe('Component Visual Tests', () => {
  
  test('Crisis Button - All States', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    
    // Default state
    const crisisButton = page.locator('[data-testid="crisis-button"]')
    await expect(crisisButton).toBeVisible()
    await expect(crisisButton).toHaveScreenshot('crisis-button-default.png')
    
    // Hover state (simulate with CSS)
    await page.addStyleTag({
      content: '[data-testid="crisis-button"] { background-color: var(--crisis-600) !important; }'
    })
    await expect(crisisButton).toHaveScreenshot('crisis-button-hover.png')
    
    // Focus state
    await crisisButton.focus()
    await expect(crisisButton).toHaveScreenshot('crisis-button-focus.png')
  })
  
  test('Navigation - All States', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    
    const navigation = page.locator('nav')
    await expect(navigation).toBeVisible()
    
    // Default navigation state
    await expect(navigation).toHaveScreenshot('navigation-default.png')
    
    // Navigate to different page
    await page.click('nav a[href="/chat"]')
    await page.waitForSelector('.chat-container')
    await expect(navigation).toHaveScreenshot('navigation-chat-active.png')
  })
  
  test('Error Boundary - Error State', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    
    // Trigger error boundary
    await page.evaluate(() => {
      throw new Error('Test error for visual regression')
    })
    
    // Wait for error boundary to appear
    await page.waitForSelector('[data-testid="error-boundary"]', { timeout: 5000 })
    
    const errorBoundary = page.locator('[data-testid="error-boundary"]')
    await expect(errorBoundary).toHaveScreenshot('error-boundary.png')
  })
})

/**
 * Accessibility visual tests
 */
test.describe('Accessibility Visual Tests', () => {
  
  test('High Contrast Mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    
    // Add high contrast styles
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          :root {
            --primary-500: #000000;
            --neutral-700: #000000;
            --neutral-600: #000000;
            --crisis-500: #ff0000;
          }
          
          body {
            background: white !important;
            color: black !important;
          }
          
          button, a {
            border: 2px solid black !important;
          }
        }
      `
    })
    
    await expect(page).toHaveScreenshot('high-contrast-home.png', {
      fullPage: true
    })
  })
  
  test('Focus Indicators', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    
    // Test tab navigation and focus indicators
    await page.keyboard.press('Tab') // Crisis button
    await expect(page).toHaveScreenshot('focus-crisis-button.png')
    
    await page.keyboard.press('Tab') // First nav item
    await expect(page).toHaveScreenshot('focus-navigation.png')
  })
})

/**
 * Performance visual tests
 */
test.describe('Performance Visual Tests', () => {
  
  test('Loading States', async ({ page }) => {
    // Slow down network to capture loading states
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 2000)
    })
    
    await page.goto(`${BASE_URL}/chat`)
    
    // Capture loading spinner
    const loadingSpinner = page.locator('.loading-spinner')
    if (await loadingSpinner.isVisible()) {
      await expect(loadingSpinner).toHaveScreenshot('loading-spinner.png')
    }
  })
  
  test('Offline Mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    
    // Set offline
    await page.setOffline(true)
    await page.reload()
    
    // Wait for offline indicator
    await page.waitForSelector('text=Offline', { timeout: 5000 })
    
    await expect(page).toHaveScreenshot('offline-mode.png', {
      fullPage: true
    })
  })
})

/**
 * Test configuration and utilities
 */
test.beforeAll(async () => {
  console.log('🎭 Starting Visual Regression Test Suite')
  console.log(`📍 Testing URL: ${BASE_URL}`)
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOT_DIR}`)
})

test.beforeEach(async ({ page }) => {
  // Set up console error tracking
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text())
    }
  })
  
  // Set up page error tracking
  page.on('pageerror', error => {
    console.error('Page error:', error.message)
  })
})

test.afterAll(async () => {
  console.log('✅ Visual Regression Test Suite Complete')
  console.log('📊 Review screenshot comparisons for any visual changes')
})

module.exports = {
  TEST_PAGES,
  VIEWPORTS,
  MOBILE_DEVICES,
  hideDynamicElements,
  waitForPageStability,
  validatePageRender
}