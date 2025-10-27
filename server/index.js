
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const securityMiddleware = require('./security');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/digital_sponsor',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json({ limit: '10mb' }));
securityMiddleware(app);

// Anonymous crisis support endpoint (no auth required)
app.post('/api/crisis/report', async (req, res) => {
  try {
    const schema = Joi.object({
      severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
      location: Joi.string().optional(),
      anonymous: Joi.boolean().default(true)
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Anonymous crisis logging (no user identification)
    const anonymousData = {
      timestamp: new Date(),
      severity: value.severity,
      location_hash: value.location ? hashLocation(value.location) : null,
      session_id: generateAnonymousId()
    };

    // Store for aggregate analysis only
    await pool.query(
      'INSERT INTO crisis_reports (severity, location_hash, session_id) VALUES ($1, $2, $3)',
      [anonymousData.severity, anonymousData.location_hash, anonymousData.session_id]
    );

    // Return immediate crisis resources
    const resources = await getCrisisResources(value.location);
    
    res.json({
      status: 'help_available',
      resources: resources,
      message: 'You are not alone. Help is available.'
    });

  } catch (error) {
    console.error('Crisis report error:', error);
    res.status(500).json({ 
      error: 'Service temporarily unavailable',
      emergency_contacts: [
        { name: 'National Suicide Prevention Lifeline', number: '988' },
        { name: 'Crisis Text Line', number: '741741', text: 'HOME' }
      ]
    });
  }
});

// Anonymous 4th step endpoint
app.post('/api/step-work/save', async (req, res) => {
  try {
    const schema = Joi.object({
      step_number: Joi.number().min(1).max(12).required(),
      content: Joi.string().max(10000).required(),
      anonymous: Joi.boolean().default(true)
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Encrypt content before storage
    const encryptedContent = encrypt(value.content);
    const sessionId = generateAnonymousId();

    await pool.query(
      'INSERT INTO step_work (step_number, encrypted_content, session_id) VALUES ($1, $2, $3)',
      [value.step_number, encryptedContent, sessionId]
    );

    res.json({
      status: 'saved',
      message: 'Step work saved securely and anonymously',
      session_id: sessionId
    });

  } catch (error) {
    console.error('Step work save error:', error);
    res.status(500).json({ error: 'Unable to save step work' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    version: '1.0.0',
    generated_by: 'Noosphere AI Framework'
  });
});

// Helper functions
function hashLocation(location) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(location).digest('hex').substring(0, 8);
}

function generateAnonymousId() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

function encrypt(text) {
  // Simplified encryption for demo - production would use more robust encryption
  const crypto = require('crypto');
  const key = process.env.ENCRYPTION_KEY || 'demo-key-not-for-production';
  const cipher = crypto.createCipher('aes192', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

async function getCrisisResources(location) {
  return [
    {
      name: 'National Suicide Prevention Lifeline',
      number: '988',
      available: '24/7',
      type: 'call'
    },
    {
      name: 'Crisis Text Line',
      number: '741741',
      text: 'HOME',
      available: '24/7',
      type: 'text'
    },
    {
      name: 'AA Hotline',
      number: '1-818-487-2317',
      available: '24/7',
      type: 'call'
    }
  ];
}

app.listen(port, () => {
  console.log(`🚀 Digital Sponsor API running on port ${port}`);
  console.log('📱 Mobile-optimized backend ready');
  console.log('🔒 HIPAA-inspired security enabled');
});

module.exports = app;
