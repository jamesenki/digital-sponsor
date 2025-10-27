# Digital Sponsor 🤝

> AI-powered AA literature companion for those who cannot access traditional sponsorship

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AA Traditions Compliant](https://img.shields.io/badge/AA%20Traditions-Compliant-green.svg)](docs/AA_TRADITIONS_COMPLIANCE.md)
[![Privacy First](https://img.shields.io/badge/Privacy-First-blue.svg)](docs/COPYRIGHT_AND_LICENSING_ANALYSIS.md)

## Vision

Digital Sponsor serves as a supplemental recovery tool for individuals who face barriers to traditional AA sponsorship - whether due to geographic isolation, neurodivergence, social anxiety, or physical limitations. Built with strict adherence to AA Traditions, particularly anonymity (Tradition 12) and non-endorsement (Tradition 6).

## Core Features

- **📖 Literature-Based Q&A**: RAG-powered chatbot trained exclusively on AA-approved literature
- **🔍 Smart Search**: Full-text search across Big Book, 12&12, and Daily Reflections  
- **📋 4th Step Workspace**: Private, encrypted moral inventory workspace
- **📍 Meeting Finder**: Location-based meeting search with privacy protection
- **📄 Step Work Documents**: Downloadable Word/Excel templates for each step
- **🆘 Crisis Support**: Always-accessible emergency resources

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/digital-sponsor.git
cd digital-sponsor

# Install dependencies
npm install
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development services
docker-compose up -d

# Run the application
npm run dev
```

## Project Structure

```
digital-sponsor/
├── frontend/              # React PWA application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API and utility services
│   │   └── hooks/         # Custom React hooks
│   └── public/            # Static assets
├── backend/               # Node.js API services
│   ├── api/               # Express API routes
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   └── utils/             # Utility functions
├── ai/                    # RAG system and AI services
│   ├── rag_system/        # Retrieval-Augmented Generation
│   ├── embeddings/        # Vector embedding services
│   ├── literature/        # Literature processing pipeline
│   └── models/            # AI model configurations
├── infrastructure/        # Deployment and infrastructure
│   ├── docker/            # Docker configurations
│   ├── terraform/         # Infrastructure as Code
│   └── k8s/              # Kubernetes manifests
├── docs/                  # Project documentation
├── scripts/               # Automation scripts
└── tests/                 # Test suites
```

## AA Traditions Compliance

Digital Sponsor operates in strict accordance with AA Traditions:

- **Tradition 6**: No endorsements of outside enterprises
- **Tradition 7**: Self-supporting through user-targeted advertising
- **Tradition 11**: Attraction rather than promotion
- **Tradition 12**: Complete user anonymity and privacy protection

See [AA Traditions Compliance](docs/AA_TRADITIONS_COMPLIANCE.md) for detailed implementation.

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Individual feature development
- `hotfix/*` - Critical production fixes

### Commit Convention
```
type(scope): description

feat(chat): add literature citation system
fix(auth): resolve session timeout issue
docs(readme): update installation instructions
```

## Privacy & Security

- **Anonymous Usage**: No user accounts or personal data collection
- **Client-Side Encryption**: Sensitive data encrypted before transmission
- **Session-Only Storage**: Personal content deleted after session ends
- **Privacy-First Analytics**: Aggregate, anonymous usage statistics only

## Literature Usage

Digital Sponsor uses AA literature under Fair Use provisions:
- Educational and service purposes only
- Proper attribution with page references
- Excerpt-based responses with citations
- No commercial exploitation of AA content

See [Copyright Analysis](docs/COPYRIGHT_AND_LICENSING_ANALYSIS.md) for legal details.

## Contributing

We welcome contributions that align with AA principles and traditions:

1. **Read the guidelines**: [Contributing Guide](CONTRIBUTING.md)
2. **Check traditions compliance**: Ensure changes respect AA Traditions
3. **Test thoroughly**: Include tests for new features
4. **Document changes**: Update relevant documentation

### Contributor Code of Conduct

- Respect AA anonymity and traditions
- No endorsement of outside enterprises
- Focus on recovery and service
- Maintain respectful, professional communication

## API Documentation

### Core Endpoints

```bash
# Chat with RAG system
POST /api/chat/query
{
  "message": "What does the Big Book say about powerlessness?",
  "context": ["previous", "conversation", "messages"]
}

# Search AA literature
GET /api/literature/search?q=resentment&source=big_book

# Find meetings
GET /api/meetings/search?location=Los Angeles&radius=10

# Download step work documents
GET /api/documents/download/step/4?format=docx
```

See [API Documentation](docs/API.md) for complete reference.

## Deployment

### Environment Configuration

```bash
# Required Environment Variables
NODE_ENV=production
API_PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

### Production Deployment

```bash
# Build for production
npm run build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Deploy with Kubernetes
kubectl apply -f infrastructure/k8s/
```

## Monitoring & Observability

- **Application Metrics**: Response time, error rate, user engagement
- **RAG Performance**: Query accuracy, citation correctness, response relevance
- **Infrastructure**: CPU, memory, network, database performance
- **Business Metrics**: User satisfaction, feature adoption, retention

## Support & Community

- **Documentation**: [docs/](docs/)
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and community support
- **Security**: Email security@digitalsponsor.org for security issues

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Alcoholics Anonymous**: For the literature and principles that guide this service
- **AA World Services**: For making AA literature available
- **The AA Community**: For feedback and guidance on traditions compliance
- **Open Source Contributors**: For the tools and libraries that make this possible

## Disclaimer

Digital Sponsor is not affiliated with, endorsed by, or sponsored by Alcoholics Anonymous World Services, Inc. This is an independent service created to supplement, not replace, traditional AA fellowship and sponsorship.

---

*"Our primary purpose is to stay sober and help other alcoholics to achieve sobriety."* - AA Preamble