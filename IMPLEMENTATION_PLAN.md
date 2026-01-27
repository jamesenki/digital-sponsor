# Digital Sponsor - Implementation Plan

## Current State Assessment (January 2026)

### What's Working
- ✅ Custom domain: https://digitalsponsor.commonsolution.org
- ✅ User registration with demo invite codes
- ✅ User login (demo mode)
- ✅ Service status display (demo mode)
- ✅ Backend services deployed and healthy (HTTP only)

### What's Broken
1. **Chat** - Demo mode gives canned responses, real service blocked by mixed content
2. **Literature Search** - Fails due to mixed content (HTTPS frontend → HTTP backend)
3. **Step Work** - Only shows alert popups, no actual functionality
4. **Dashboard** - Just navigation links, no real content

### Root Cause
The frontend is served via HTTPS but all backend services only support HTTP. Browsers block these "mixed content" requests for security.

---

## Solution Options

### Option A: HTTPS Proxy (Recommended)
Set up Azure Application Gateway or Cloudflare to proxy HTTPS → HTTP to backends.
- **Pros**: Real backend functionality, production-ready
- **Cons**: Additional cost, setup complexity

### Option B: Full Demo Mode (Quick Win)
Implement complete offline demo functionality in the frontend.
- **Pros**: Works immediately, no infrastructure changes
- **Cons**: Not using real AI, static content

### Option C: Azure Static Web App API Routes
Use SWA's built-in API feature to proxy requests server-side.
- **Pros**: Free, built into current infrastructure
- **Cons**: Limited functionality, cold starts

---

## Phase 1: Make Demo Mode Fully Functional (Immediate)

### Task 1.1: Fix Chat Demo Mode
**Status**: Partially done - needs better responses
- [ ] Add more varied recovery-focused demo responses
- [ ] Implement basic context awareness (detect step numbers, emotions)
- [ ] Add typing delay for realism

### Task 1.2: Implement Literature Search Demo
**Status**: Not started
- [ ] Create embedded demo literature database (top 20 passages)
- [ ] Implement client-side fuzzy search
- [ ] Display formatted results with source citations

### Task 1.3: Build Step Work Functionality
**Status**: Not started
- [ ] Create Step 1-12 content (prayers, reflections, questions)
- [ ] Build step work modal/page component
- [ ] Add local storage for saving progress
- [ ] Include traditional AA prayers for each step

### Task 1.4: Enhance Dashboard
**Status**: Not started
- [ ] Show user's step work progress
- [ ] Display recent chat history summary
- [ ] Add daily reflection/meditation feature
- [ ] Show sobriety date tracker (if entered)

---

## Phase 2: Enable Real Backend Connectivity

### Task 2.1: Set Up HTTPS Proxy
- [ ] Configure Cloudflare proxy for commonsolution.org
- [ ] Add DNS records for service subdomains
- [ ] Enable SSL/TLS termination at Cloudflare
- [ ] Update frontend config to use HTTPS endpoints

### Task 2.2: Backend CORS Updates
- [ ] Update all services to allow commonsolution.org origin
- [ ] Test cross-origin requests
- [ ] Verify authentication flow works end-to-end

### Task 2.3: Connect Real Services
- [ ] Switch chat to real Azure OpenAI service
- [ ] Connect literature search to real embedding service
- [ ] Enable real user persistence in Cosmos DB

---

## Phase 3: Production Polish

### Task 3.1: User Experience
- [ ] Add loading states for all async operations
- [ ] Implement proper error handling with retry
- [ ] Add offline detection and graceful degradation
- [ ] Mobile responsiveness testing

### Task 3.2: Analytics & Monitoring
- [ ] Add Application Insights tracking
- [ ] Implement user engagement metrics
- [ ] Set up error alerting

### Task 3.3: Content & Features
- [ ] Add Big Book chapter summaries
- [ ] Include daily readings integration
- [ ] Add meeting finder (AA.org integration)
- [ ] Implement sponsor/sponsee matching (future)

---

## Atomic Tasks - Phase 1 Details

### 1.1 Chat Demo Enhancement
```
File: public/index.html
Location: demoResponses array and sendMessage function

Tasks:
1. Expand demoResponses to 20+ varied responses
2. Add keyword detection for steps (step 1, step 2, etc.)
3. Add emotion detection (struggling, grateful, scared)
4. Return contextually appropriate responses
5. Test all paths
```

### 1.2 Literature Search Demo
```
File: public/index.html
Location: searchLiterature function

Tasks:
1. Create demoLiterature array with 20 key passages
2. Include: Big Book Ch 5, 12x12 excerpts, prayers
3. Implement simple keyword matching
4. Format results with chapter/page references
5. Add "demo mode" indicator
```

### 1.3 Step Work Implementation
```
File: public/index.html
Location: openStep function and new stepworkTab content

Tasks:
1. Create stepContent object with all 12 steps
2. Each step includes: prayer, reflection questions, key literature
3. Build modal UI for step display
4. Add localStorage for progress tracking
5. Show completion status on step cards
```

### 1.4 Dashboard Enhancement
```
File: public/index.html
Location: dashboardTab content

Tasks:
1. Add progress summary section
2. Show steps completed count
3. Add daily meditation card
4. Include motivational quote rotation
5. Add sobriety calculator widget
```

---

## Files to Modify

| File | Changes |
|------|---------|
| public/index.html | All frontend functionality |
| public/admin.html | Admin features (lower priority) |

## Files Archived (Obsolete)
Moved to `archive/docs-obsolete/`:
- ADMIN_DNS_SETUP.md
- BROWSER_ACCESS_FIX.md
- CLOUDFLARE_AUTH_FIX.md
- CLOUDFLARE_SSL_SETUP.md
- DEPLOYED_SERVICES.md
- DEPLOYMENT_STATUS.md
- FRONTEND_AUTH_UPDATE_NEEDED.md
- HTTPS_ACCESS_GUIDE.md
- IMPLEMENT_CLOUDFLARE_NOW.md
- QUICK_LOGIN_FIX.md
- REDEPLOYMENT_GUIDE.md
- docs-archive.md
- PRODUCTION_REMEDIATION_PLAN.md
- MASSIVE_LITERATURE_ACHIEVEMENT.md

## Success Criteria

### Phase 1 Complete When:
- [ ] User can have meaningful chat conversations (demo)
- [ ] User can search and find AA literature passages (demo)
- [ ] User can work through all 12 steps with prayers and questions
- [ ] Dashboard shows personalized progress and daily content

### Phase 2 Complete When:
- [ ] All features work with real backend services
- [ ] User data persists across sessions
- [ ] AI responses come from Azure OpenAI

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1 | 4 major tasks | Medium - all frontend JS |
| Phase 2 | 3 major tasks | High - infrastructure |
| Phase 3 | 3 major tasks | Medium - polish |

**Recommendation**: Complete Phase 1 first to have a fully functional demo, then pursue Phase 2 for production.
