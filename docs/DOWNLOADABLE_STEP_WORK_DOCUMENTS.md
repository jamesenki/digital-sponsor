# Digital Sponsor - Downloadable Step Work Documents

## Overview

Digital Sponsor provides comprehensive, literature-based step work guides and templates that users can download in formats compatible with Microsoft Word, Excel, and PDF. These documents follow the "recipe book" approach to AA, providing clear, sequential guidance based on the Big Book and Twelve Steps and Twelve Traditions.

## Document Categories

### 1. Step Work Guides (12 Documents)
Each step has a dedicated guide with literature references, questions, and templates.

#### Step 1 Guide: Powerlessness and Unmanageability
**Filename**: `Step_1_Powerlessness_Guide.docx`
**Based on**: Big Book Chapter 1, 12&12 Step 1

**Content Structure**:
```markdown
# Step 1: Powerlessness and Unmanageability

## Literature Foundation
- Big Book References: Chapter 1 (Pages 20-24)
- 12&12 References: Step 1 (Pages 21-24)
- Key Quotes with Page Numbers

## Understanding Powerlessness
### Definition from Literature
[Direct quotes from Big Book about powerlessness]

### Self-Assessment Questions
1. When did you first realize you had a problem with alcohol?
2. Describe three specific examples of your life becoming unmanageable
3. What attempts have you made to control your drinking?
[Space for answers]

## Unmanageability Worksheet
| Area of Life | Before AA | Specific Examples | Impact on Others |
|--------------|-----------|-------------------|------------------|
| Work/Career  |           |                   |                  |
| Relationships|           |                   |                  |
| Finances     |           |                   |                  |
| Health       |           |                   |                  |
| Legal        |           |                   |                  |

## Reflection Prompts
[Literature-based questions for deeper understanding]

## Next Steps
- Meeting suggestions
- Literature to study
- Preparation for Step 2
```

#### Step 4 Guide: Moral Inventory (Extended)
**Filename**: `Step_4_Moral_Inventory_Complete.xlsx`
**Based on**: Big Book Chapter 4, 12&12 Step 4

**Excel Workbook Sheets**:
1. **Instructions** - Complete guidance from literature
2. **Resentment Inventory** - Formatted table with formulas
3. **Fear Inventory** - Literature-based fear analysis
4. **Sexual Conduct** - Privacy-focused worksheet
5. **Harms to Others** - Foundation for Steps 8-9
6. **Assets Inventory** - Positive qualities and growth areas

### 2. Tradition Study Guides (12 Documents)
Each tradition has a study guide for group work and personal understanding.

#### Example: Tradition 1 Study Guide
**Filename**: `Tradition_1_Unity_Study.docx`

**Content**:
```markdown
# Tradition 1: Unity and Common Welfare

## Text of Tradition
"Our common welfare should come first; personal recovery depends upon A.A. unity."

## Literature Study
### 12&12 References
- Pages 129-135
- Key concepts and historical context

### Discussion Questions
1. How does group unity support individual recovery?
2. What threatens AA unity in your experience?
3. Examples of putting common welfare first

## Group Activities
- Unity assessment checklist
- Discussion facilitator guide
- Case studies from literature

## Personal Reflection
[Space for individual thoughts and experiences]
```

### 3. Principle-Based Worksheets (24 Documents)
Combined step and tradition principles with practical application guides.

#### Example: Honesty Principle Worksheet
**Filename**: `Honesty_Principle_Workbook.docx`

**Content Structure**:
- Literature foundations (Steps 1, 4, 5, 8, 9)
- Self-assessment tools
- Daily practice exercises
- Progress tracking templates

### 4. Meeting and Study Templates

#### Big Book Study Template
**Filename**: `Big_Book_Study_Template.docx`

```markdown
# Big Book Study Session Template

## Chapter: _______________
## Date: _______________
## Facilitator: _______________

## Pre-Study Questions
1. What did you learn from the previous chapter?
2. What questions do you have going into this chapter?

## Chapter Analysis
### Key Points (List 3-5 main concepts)
1. _________________________________
2. _________________________________
3. _________________________________

### Important Quotes (With page numbers)
- Quote 1: "_________________________" (Page ___)
- Quote 2: "_________________________" (Page ___)

### Personal Application
How does this chapter apply to your recovery?
[Large space for answers]

## Discussion Questions
[Generated based on chapter content]

## Action Items
What will you do differently based on this study?
[Space for commitments]
```

## Technical Implementation

### Document Generation Service

```python
class StepWorkDocumentGenerator:
    def __init__(self):
        self.template_path = 'templates/step_work'
        self.literature_db = AALiteratureDatabase()
        self.supported_formats = ['docx', 'xlsx', 'pdf', 'odt']
    
    def generate_step_guide(self, step_number, format='docx'):
        """Generate step work guide with literature integration"""
        
        # Load step-specific content from literature
        step_content = self.literature_db.get_step_content(step_number)
        
        # Create document from template
        if format == 'docx':
            return self.create_word_document(step_number, step_content)
        elif format == 'xlsx':
            return self.create_excel_workbook(step_number, step_content)
        elif format == 'pdf':
            return self.create_pdf_document(step_number, step_content)
    
    def create_word_document(self, step_number, content):
        """Create Word document with interactive elements"""
        from docx import Document
        from docx.shared import Inches
        
        doc = Document()
        
        # Header with step information
        header = doc.sections[0].header
        header_para = header.paragraphs[0]
        header_para.text = f"Digital Sponsor - Step {step_number} Work Guide"
        
        # Title
        title = doc.add_heading(f'Step {step_number}: {content["title"]}', 0)
        
        # Literature foundation section
        doc.add_heading('Literature Foundation', level=1)
        
        # Add literature references
        for ref in content['literature_references']:
            para = doc.add_paragraph()
            para.add_run(f"• {ref['source']}: ").bold = True
            para.add_run(f"{ref['chapter']} (Pages {ref['pages']})")
        
        # Key quotes section
        doc.add_heading('Key Literature Quotes', level=1)
        for quote in content['key_quotes']:
            quote_para = doc.add_paragraph()
            quote_para.add_run(f'"{quote["text"]}"').italic = True
            quote_para.add_run(f' - {quote["source"]}, Page {quote["page"]}')
        
        # Worksheet sections
        doc.add_heading('Step Work Questions', level=1)
        for i, question in enumerate(content['questions'], 1):
            doc.add_paragraph(f'{i}. {question}')
            
            # Add space for answers
            for _ in range(5):
                doc.add_paragraph('_' * 60)
        
        # Tables for structured work
        if content.get('worksheets'):
            for worksheet in content['worksheets']:
                self.add_worksheet_table(doc, worksheet)
        
        return doc
    
    def create_excel_workbook(self, step_number, content):
        """Create Excel workbook with formulas and validation"""
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
        from openpyxl.utils import get_column_letter
        
        wb = openpyxl.Workbook()
        
        # Remove default sheet
        wb.remove(wb.active)
        
        # Instructions sheet
        instructions_sheet = wb.create_sheet('Instructions')
        self.create_instructions_sheet(instructions_sheet, step_number, content)
        
        # Step-specific worksheets
        if step_number == 4:
            # Step 4 gets multiple specialized sheets
            self.create_resentment_sheet(wb, content)
            self.create_fear_sheet(wb, content)
            self.create_sexual_conduct_sheet(wb, content)
            self.create_harms_sheet(wb, content)
        elif step_number == 8:
            self.create_amends_list_sheet(wb, content)
        
        # Progress tracking sheet
        progress_sheet = wb.create_sheet('Progress')
        self.create_progress_tracker(progress_sheet)
        
        return wb
    
    def create_resentment_sheet(self, workbook, content):
        """Create structured resentment inventory sheet"""
        sheet = workbook.create_sheet('Resentment Inventory')
        
        # Headers
        headers = [
            'Person/Institution/Principle',
            'The Cause (What they did)',
            'Affects my...',
            'My Part (What I did)',
            'Character Defect',
            'What I Should Have Done'
        ]
        
        for col, header in enumerate(headers, 1):
            cell = sheet.cell(row=1, column=col)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="DDDDDD", end_color="DDDDDD", fill_type="solid")
        
        # Add literature guidance as comments
        guidance = content.get('resentment_guidance', [])
        for i, guide in enumerate(guidance):
            sheet.cell(row=2, column=i+1).comment = guide
        
        # Format columns
        sheet.column_dimensions['A'].width = 20
        sheet.column_dimensions['B'].width = 30
        sheet.column_dimensions['C'].width = 15
        sheet.column_dimensions['D'].width = 30
        sheet.column_dimensions['E'].width = 15
        sheet.column_dimensions['F'].width = 25
        
        # Add rows for entries (100 rows for comprehensive inventory)
        for row in range(2, 102):
            for col in range(1, 7):
                sheet.cell(row=row, column=col).alignment = Alignment(wrap_text=True, vertical='top')
        
        return sheet
```

### Document Download API

```python
@app.route('/api/documents/download/<document_type>/<identifier>')
@rate_limit('20/hour')
def download_step_work_document(document_type, identifier):
    """
    Download step work documents
    
    document_type: 'step', 'tradition', 'principle', 'template'
    identifier: step number, tradition number, etc.
    """
    
    # Validate request
    if document_type not in ['step', 'tradition', 'principle', 'template']:
        return jsonify({'error': 'Invalid document type'}), 400
    
    # Get format from query params
    format = request.args.get('format', 'docx')
    if format not in ['docx', 'xlsx', 'pdf', 'odt']:
        return jsonify({'error': 'Unsupported format'}), 400
    
    try:
        # Generate document
        generator = StepWorkDocumentGenerator()
        
        if document_type == 'step':
            step_num = int(identifier)
            if not 1 <= step_num <= 12:
                return jsonify({'error': 'Invalid step number'}), 400
            
            document = generator.generate_step_guide(step_num, format)
            filename = f'Step_{step_num}_Work_Guide.{format}'
            
        elif document_type == 'tradition':
            tradition_num = int(identifier)
            if not 1 <= tradition_num <= 12:
                return jsonify({'error': 'Invalid tradition number'}), 400
            
            document = generator.generate_tradition_guide(tradition_num, format)
            filename = f'Tradition_{tradition_num}_Study.{format}'
        
        # Save to temporary file
        temp_path = f'/tmp/{filename}'
        
        if format == 'docx':
            document.save(temp_path)
        elif format == 'xlsx':
            document.save(temp_path)
        elif format == 'pdf':
            document.save(temp_path)
        
        # Return file for download
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=filename,
            mimetype=get_mimetype(format)
        )
        
    except Exception as e:
        logger.error(f"Document generation failed: {e}")
        return jsonify({'error': 'Document generation failed'}), 500
    
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.unlink(temp_path)

@app.route('/api/documents/list')
def list_available_documents():
    """List all available downloadable documents"""
    
    documents = {
        'step_guides': [
            {
                'id': f'step_{i}',
                'title': f'Step {i} Work Guide',
                'description': get_step_description(i),
                'formats': ['docx', 'pdf'],
                'download_url': f'/api/documents/download/step/{i}'
            }
            for i in range(1, 13)
        ],
        'tradition_studies': [
            {
                'id': f'tradition_{i}',
                'title': f'Tradition {i} Study Guide',
                'description': get_tradition_description(i),
                'formats': ['docx', 'pdf'],
                'download_url': f'/api/documents/download/tradition/{i}'
            }
            for i in range(1, 13)
        ],
        'special_worksheets': [
            {
                'id': 'step_4_complete',
                'title': 'Complete 4th Step Inventory Workbook',
                'description': 'Comprehensive Excel workbook for moral inventory',
                'formats': ['xlsx'],
                'download_url': '/api/documents/download/step/4?format=xlsx'
            },
            {
                'id': 'big_book_study',
                'title': 'Big Book Study Template',
                'description': 'Chapter-by-chapter study guide template',
                'formats': ['docx', 'pdf'],
                'download_url': '/api/documents/download/template/big_book_study'
            }
        ]
    }
    
    return jsonify(documents)
```

### Frontend Integration

```javascript
// Document Download Component
class StepWorkDocuments extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            documents: {},
            downloading: false,
            selectedFormat: 'docx'
        };
    }
    
    async componentDidMount() {
        // Load available documents
        const response = await fetch('/api/documents/list');
        const documents = await response.json();
        this.setState({ documents });
    }
    
    async downloadDocument(documentType, identifier, format = 'docx') {
        this.setState({ downloading: true });
        
        try {
            const response = await fetch(
                `/api/documents/download/${documentType}/${identifier}?format=${format}`
            );
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = this.getFilename(documentType, identifier, format);
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
            } else {
                throw new Error('Download failed');
            }
            
        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed. Please try again.');
        } finally {
            this.setState({ downloading: false });
        }
    }
    
    render() {
        const { documents } = this.state;
        
        return (
            <div className="step-work-documents">
                <h2>📄 Step Work Documents</h2>
                <p>Download literature-based guides and worksheets for your recovery work.</p>
                
                <div className="document-sections">
                    
                    {/* Step Guides */}
                    <section className="document-section">
                        <h3>Step Work Guides</h3>
                        <div className="document-grid">
                            {documents.step_guides?.map(doc => (
                                <div key={doc.id} className="document-card">
                                    <h4>{doc.title}</h4>
                                    <p>{doc.description}</p>
                                    
                                    <div className="download-options">
                                        {doc.formats.map(format => (
                                            <button
                                                key={format}
                                                className={`download-btn format-${format}`}
                                                onClick={() => this.downloadDocument(
                                                    'step', 
                                                    doc.id.split('_')[1], 
                                                    format
                                                )}
                                                disabled={this.state.downloading}
                                            >
                                                📁 {format.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                    
                    {/* Tradition Studies */}
                    <section className="document-section">
                        <h3>Tradition Study Guides</h3>
                        <div className="document-grid">
                            {documents.tradition_studies?.map(doc => (
                                <div key={doc.id} className="document-card">
                                    <h4>{doc.title}</h4>
                                    <p>{doc.description}</p>
                                    
                                    <div className="download-options">
                                        {doc.formats.map(format => (
                                            <button
                                                key={format}
                                                className={`download-btn format-${format}`}
                                                onClick={() => this.downloadDocument(
                                                    'tradition',
                                                    doc.id.split('_')[1],
                                                    format
                                                )}
                                            >
                                                📁 {format.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                    
                    {/* Special Worksheets */}
                    <section className="document-section">
                        <h3>Specialized Worksheets</h3>
                        <div className="document-grid">
                            {documents.special_worksheets?.map(doc => (
                                <div key={doc.id} className="document-card special">
                                    <h4>{doc.title}</h4>
                                    <p>{doc.description}</p>
                                    
                                    <div className="download-options">
                                        {doc.formats.map(format => (
                                            <button
                                                key={format}
                                                className={`download-btn format-${format} special`}
                                                onClick={() => window.open(doc.download_url)}
                                            >
                                                ⭐ {format.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
                
                <div className="usage-instructions">
                    <h3>📋 How to Use These Documents</h3>
                    <ul>
                        <li><strong>Word Documents (.docx):</strong> Interactive guides with spaces for writing</li>
                        <li><strong>Excel Workbooks (.xlsx):</strong> Structured worksheets with formulas</li>
                        <li><strong>PDF Files (.pdf):</strong> Print-friendly versions for offline use</li>
                        <li><strong>All documents:</strong> Based exclusively on AA-approved literature</li>
                    </ul>
                    
                    <div className="privacy-note">
                        <strong>Privacy Note:</strong> These documents are designed for personal use. 
                        Any sensitive personal information you enter remains on your device only.
                    </div>
                </div>
            </div>
        );
    }
}
```

## Document Content Standards

### Literature-Based Content Only
- All questions and prompts sourced from Big Book or 12&12
- Direct quotes with page number references
- No personal opinions or non-approved interpretations
- Clear citation of all sources

### Accessibility Features
- Large print options (14pt+ fonts)
- High contrast formatting
- Screen reader compatible structure
- Alternative format availability (audio transcripts)

### Privacy Protection
- No cloud storage integration
- Local-only file processing
- No user data embedded in documents
- Clear privacy instructions included

### Version Control
- Document version tracking
- Update notifications for revised content
- Archive of previous versions
- Change logs for significant updates

This comprehensive document system provides users with practical, literature-based tools for working the AA program while maintaining complete privacy and adherence to AA principles.