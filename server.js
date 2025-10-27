
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8081;

// Serve static files from current directory (not build)
app.use(express.static(__dirname));

// Handle all routes to serve index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Digital Sponsor app serving at http://172.22.234.178:${PORT}`);
  console.log(`📱 Ready for investor mobile testing!`);
  console.log(`🎬 Built by AI agents with comprehensive SDLC process`);
});
