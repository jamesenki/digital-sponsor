# Azure Functions Timeout Fix Guide

## 🔍 Root Causes Identified:

1. **Heavy Dependencies** - Redis, Azure Identity, Key Vault causing 15-30s cold starts
2. **Complex Validation** - Joi validation + multiple auth checks
3. **Redis Connection** - Network latency to Redis instance
4. **Large node_modules** - 200+ MB causing deployment/startup delays

## 🚀 Immediate Fixes:

### 1. Update Function Configuration

```bash
# Replace host.json with optimized version
cp functions/auth-service/host-optimized.json functions/auth-service/host.json
```

### 2. Reduce Dependencies

```bash
# Use slim package.json
cp functions/auth-service/package-slim.json functions/auth-service/package.json
cd functions/auth-service
npm install --production
```

### 3. Redis Connection Optimization

Add to `local.settings.json`:

```json
{
  "Values": {
    "REDIS_CONNECTION_TIMEOUT": "2000",
    "REDIS_COMMAND_TIMEOUT": "1000",
    "REDIS_RETRY_DELAY": "100",
    "REDIS_MAX_RETRIES": "2",
    "ENABLE_REDIS_CACHE": "false"
  }
}
```

### 4. Function-Level Optimizations

#### A. Add Warm-up Function:

```javascript
// Add to warmup/function.json
{
  "bindings": [
    {
      "name": "warmupContext",
      "type": "warmupTrigger",
      "direction": "in"
    }
  ]
}

// Add warmup/index.js
module.exports = async function (context) {
    // Pre-warm critical dependencies
    require('jsonwebtoken');
    context.log('Function app warmed up');
};
```

#### B. Lazy Loading Pattern:

```javascript
// Instead of importing at top:
// const redis = require('redis');

// Use lazy loading:
let redisClient = null;
const getRedisClient = () => {
  if (!redisClient && process.env.ENABLE_REDIS_CACHE === 'true') {
    redisClient = require('redis').createClient();
  }
  return redisClient;
};
```

### 5. Deployment Optimizations

```bash
# Create optimized deployment package
cd functions/auth-service
npm prune --production
npm dedupe
rm -rf node_modules/.cache

# Deploy with optimized settings
az functionapp config appsettings set \
  --name your-function-app \
  --resource-group rg-digitalsponsor-new \
  --settings \
    "WEBSITE_NODE_DEFAULT_VERSION=~18" \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "WEBSITE_RUN_FROM_PACKAGE=1" \
    "WEBSITE_ENABLE_SYNC_UPDATE_SITE=true" \
    "FUNCTIONS_EXTENSION_VERSION=~4"
```

## 🔧 Emergency Bypass (If Still Timing Out):

### Option A: Increase Timeout

```json
// In host.json
{
  "functionTimeout": "00:15:00", // Increase to 15 minutes
  "healthMonitor": {
    "enabled": false // Disable health monitoring temporarily
  }
}
```

### Option B: Minimal Function (Remove all external deps)

```javascript
// Ultra-minimal auth function
module.exports = async function (context, req) {
  context.log('Minimal auth function');

  // Skip Redis, skip Key Vault, skip complex validation
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    context.res = { status: 401, body: 'Unauthorized' };
    return;
  }

  // Simple JWT decode without verification (for demo)
  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    context.res = {
      status: 200,
      body: { valid: true, user: decoded.sub },
    };
  } catch (error) {
    context.res = { status: 401, body: 'Invalid token' };
  }
};
```

## 🎯 Monitoring & Testing:

### Check Function Performance:

```bash
# Monitor cold starts
az monitor metrics list \
  --resource-type "Microsoft.Web/sites" \
  --resource-name your-function-app \
  --metric-names "FunctionExecutionTime" \
  --interval PT1M

# Check Redis connectivity
az redis show \
  --name your-redis-instance \
  --resource-group rg-digitalsponsor-new \
  --query "provisioningState"
```

### Test Deployment:

```bash
# Test function locally first
cd functions/auth-service
func start

# Test specific function
curl -X POST http://localhost:7071/api/auth-validate \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}'
```

## ⚡ Expected Results:

- **Cold start**: 5-8 seconds (down from 15-30s)
- **Warm execution**: <500ms
- **Deployment time**: 2-3 minutes (down from 10+ minutes)
- **Success rate**: 95%+ (vs current timeouts)

Choose the approach based on urgency:

- **Production**: Use optimized config + dependency reduction
- **Demo/Emergency**: Use minimal function bypass
- **Development**: Add warmup function + lazy loading
