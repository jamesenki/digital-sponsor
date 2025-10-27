# Contributing to Digital Sponsor

Thank you for your interest in contributing to Digital Sponsor! This project serves the AA community by providing literature-based guidance to those who cannot access traditional sponsorship.

## Code of Conduct

### AA Traditions Compliance
All contributions must respect AA Traditions, particularly:
- **Tradition 6**: No endorsements of outside enterprises
- **Tradition 7**: Self-supporting, no outside contributions of money/property
- **Tradition 11**: Attraction rather than promotion  
- **Tradition 12**: Anonymity at the level of press, radio, films, and public communications

### Community Standards
- Be respectful and professional in all communications
- Focus on recovery and service to the AA community
- Respect contributor anonymity - use usernames, not real names
- Keep discussions focused on technical and service aspects

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- Git
- Familiarity with AA literature and principles

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/digital-sponsor.git
   cd digital-sponsor
   ```

2. **Set up development environment**
   ```bash
   npm run setup:dev
   ```

3. **Start development services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   npm run dev
   ```

4. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/description`: Individual feature development
- `hotfix/description`: Critical production fixes

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-description
   ```

2. **Make your changes**
   - Follow existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure AA Traditions compliance

3. **Test your changes**
   ```bash
   npm run lint
   npm run test
   npm run type-check
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description of changes"
   ```

### Commit Message Convention
We use conventional commits for clear change tracking:

```
type(scope): description

feat(chat): add literature citation system
fix(auth): resolve session timeout issue
docs(readme): update installation instructions
test(rag): add accuracy testing for step queries
refactor(api): simplify route organization
```

**Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`

## Contribution Guidelines

### Code Quality Standards

#### Frontend (React/TypeScript)
- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Implement responsive design for mobile-first
- Ensure accessibility (WCAG 2.1 AA compliance)
- Use semantic HTML and ARIA attributes

#### Backend (Node.js/Express)
- Use TypeScript for API development
- Implement proper error handling and logging
- Follow RESTful API design principles
- Include comprehensive input validation
- Maintain security best practices

#### AI/ML (Python)
- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Implement proper error handling
- Document AI model decisions and parameters
- Test accuracy and performance metrics

### Testing Requirements

#### Required Tests
- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: API endpoint testing
- **RAG Accuracy Tests**: Literature response validation
- **E2E Tests**: Critical user flows
- **Accessibility Tests**: WCAG compliance

#### Test Categories
```bash
# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:accessibility
```

### AA Literature Compliance

#### Content Guidelines
- All responses must be sourced from AA-approved literature
- Include proper citations with page references
- Never add personal opinions or interpretations
- Respect copyright and fair use principles

#### Testing Literature Accuracy
```python
# Example accuracy test
def test_step_1_powerlessness_response():
    query = "What does powerlessness mean in Step 1?"
    response = rag_system.query(query)
    
    assert "powerless over alcohol" in response.content.lower()
    assert response.citations[0].source == "Alcoholics Anonymous (Big Book)"
    assert response.citations[0].page in [21, 22, 23]  # Known pages
    assert response.accuracy_score > 0.95
```

### Privacy and Security

#### Privacy Requirements
- No collection of personally identifiable information
- Session-only data storage for sensitive content
- Client-side encryption for 4th step work
- Anonymous usage analytics only

#### Security Checklist
- [ ] Input validation and sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting implementation
- [ ] Secure session management
- [ ] HTTPS enforcement

### Documentation

#### Required Documentation Updates
- Update README.md for new features
- Add/update API documentation
- Include inline code comments
- Update user guides for UI changes
- Document configuration changes

#### Documentation Standards
- Use clear, concise language
- Include code examples where helpful
- Maintain up-to-date API references
- Provide troubleshooting guides

## Pull Request Process

### Before Submitting

1. **Ensure compliance**
   - [ ] Code follows style guidelines
   - [ ] Tests pass and coverage is maintained
   - [ ] Documentation is updated
   - [ ] AA Traditions are respected
   - [ ] Security requirements are met

2. **Test thoroughly**
   ```bash
   npm run lint
   npm run test
   npm run build
   npm run security:audit
   ```

### Pull Request Template

```markdown
## Description
Brief description of changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work)
- [ ] Documentation update

## AA Traditions Compliance
- [ ] No endorsements of outside enterprises
- [ ] Maintains user anonymity
- [ ] Serves AA's primary purpose
- [ ] Uses attraction rather than promotion

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] RAG accuracy validated (if applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
- [ ] Security implications considered
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs all tests
   - Security scanning
   - Code quality analysis
   - Performance impact assessment

2. **Human Review**
   - Code quality and style
   - AA Traditions compliance
   - Security considerations
   - Documentation adequacy

3. **Approval Requirements**
   - 2+ approvals from maintainers
   - All automated checks passing
   - Security review (for sensitive changes)
   - AA compliance verification

## Issue Reporting

### Bug Reports
Include the following information:
- Environment details (OS, browser, Node.js version)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or error logs
- Impact on users

### Feature Requests
Consider these questions:
- Does this serve AA's primary purpose?
- Is it compliant with AA Traditions?
- How does it help isolated or underserved alcoholics?
- What's the implementation complexity?

### Security Issues
**Do not create public issues for security vulnerabilities.**
Email: security@digitalsponsor.org

## Community

### Communication Channels
- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code review and discussion

### Recognition
Contributors may be recognized in:
- CHANGELOG.md for significant contributions
- README.md contributors section
- Release notes for major features

**Note**: Recognition respects AA anonymity principles - only usernames/handles are used.

## Resources

### AA Literature References
- [AA.org Literature](https://www.aa.org/literature)
- [AA Traditions](https://www.aa.org/the-twelve-traditions)
- [AA Guidelines](https://www.aa.org/aa-guidelines)

### Technical Resources
- [React Documentation](https://react.dev)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Python Style Guide](https://pep8.org)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

Thank you for contributing to Digital Sponsor and helping serve the AA community!