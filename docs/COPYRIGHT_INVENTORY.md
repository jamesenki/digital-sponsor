# AA Copyrighted Material Inventory

This document provides a comprehensive inventory of all AA (Alcoholics Anonymous) copyrighted
material used in the Digital Sponsor project.

**Last Updated:** January 2026 **Purpose:** Transparency and compliance documentation for potential
AA World Services outreach

---

## Summary

| Material                                   | Copyright Holder         | Status                        | Primary Files                                    |
| ------------------------------------------ | ------------------------ | ----------------------------- | ------------------------------------------------ |
| Big Book (Alcoholics Anonymous)            | AA World Services, Inc.  | Protected (varies by edition) | step_workbook_content.py, literature_database.py |
| Twelve Steps text                          | AA World Services, Inc.  | Protected until ~2047         | Multiple                                         |
| Twelve Traditions text                     | AA World Services, Inc.  | Protected until ~2047         | Multiple                                         |
| Twelve Steps and Twelve Traditions (12&12) | AA World Services, Inc.  | Protected until ~2047         | step_workbook_content.py                         |
| AA Pamphlets                               | AA World Services, Inc.  | Protected                     | massive_literature_database.py                   |
| Daily Reflections                          | AA World Services, Inc.  | Protected until ~2085         | Referenced only                                  |
| AA Grapevine Articles                      | The A.A. Grapevine, Inc. | Protected                     | grapevine_content.py                             |
| Official AA Prayers                        | AA World Services, Inc.  | Protected                     | step_workbook_content.py                         |

**Total indexed pieces:** ~2,382 AA literature items **Lines of code containing AA content:**
~3,000-5,000

---

## Detailed Inventory by File

### 1. containers/step-work-service/step_workbook_content.py

**Content Type:** Step work guidance with AA literature integration

**Copyrighted Material:**

- Complete text of all 12 Steps (official AA wording)
- Twelve Steps and Twelve Traditions (12&12) excerpts with page references:
  - Step 1 discussion (p. 21)
  - Step 2-12 discussions with specific page citations
- Big Book excerpts with page references:
  - Doctor's Opinion (p. xxviii)
  - Chapter 5: How It Works (p. 58-60)
  - Various passages (p. 30, 44-47, 55, 62-63, 72-73, 75-76, 83-84, 86-87, 89)
- Official AA Prayers (marked as OFFICIAL in code):
  - Third Step Prayer (Big Book p. 63)
  - Seventh Step Prayer (Big Book p. 76)
  - Eleventh Step Prayer (Big Book p. 86-87)
  - AA Responsibility Declaration (1965 International Convention)
- Journaling questions derived from copyrighted literature

**Approximate Lines:** ~700

---

### 2. containers/literature-service/literature_database.py

**Content Type:** Searchable database of AA recovery concepts

**Copyrighted Material:**

- Full text of all 12 Steps with detailed explanations
- Full text of all 12 Traditions with detailed explanations
- Recovery concepts derived from AA literature:
  - Surrender
  - Acceptance
  - Sponsorship
  - Fellowship
  - Service

**Approximate Lines:** ~450

---

### 3. containers/literature-service/massive_literature_database.py

**Content Type:** Comprehensive AA literature metadata and indexing

**Copyrighted Material:**

- Big Book chapter metadata (11 main chapters)
- Personal Stories section references (82 individual stories)
- 12&12 chapter references (24 chapters: 12 Steps + 12 Traditions)
- AA Pamphlet titles and descriptions (40+):
  - "Is A.A. For You?"
  - "This is A.A."
  - "A Newcomer Asks"
  - "Living Sober"
  - "A.A. for Women"
  - "Young People and A.A."
  - "LGBT Alcoholics in A.A."
  - "Sponsorship"
  - And many others

**Approximate Lines:** ~400

---

### 4. containers/literature-service/grapevine_content.py

**Content Type:** Full-text AA Grapevine magazine articles

**Copyrighted Material:**

- **Explicitly marked "Copyright (c) The A.A. Grapevine, Inc."**
- Full-text articles by Bill W.:
  - "Tradition Ten" (September 1948)
  - "A Fragment Of History" (July 1953)
  - "The Next Frontier: Emotional Sobriety" (January 1958)
  - "Leadership In AA: Ever A Vital Need" (April 1959)
  - "Bill W.'s Letter To Dr. Carl Gustav Jung" (January 1961)
  - "Spiritual Experiences" (July 1962)
  - "In Remembrance of Ebby" (June 1966)
- Additional articles from other authors

**Approximate Lines:** ~1,000+

**Risk Level:** HIGH - These are full verbatim reproductions with explicit copyright notices

---

### 5. Data Files

#### data-preserve/grapevine/grapevine_articles.json

- JSON format of Grapevine articles
- Full-text content with metadata

#### data-preserve/grapevine-subscription/grapevine_full_articles.json

- Grapevine subscription content archive
- Full-text articles

#### data-preserve/sql/\*.sql

- populate-literature.sql
- expand-literature-phase1.sql through expand-literature-phase4.sql
- setup-database.sql
- init.sql

**Content:** Database seed files containing:

- All 12 Steps complete text
- All 12 Traditions complete text
- Big Book page references and excerpts
- 12&12 page references and excerpts
- Comments noting "Educational Fair Use - AA World Services Content"

---

## Copyright Risk Assessment

| Risk Level | Content Type               | Current Use                | Notes                         |
| ---------- | -------------------------- | -------------------------- | ----------------------------- |
| **HIGH**   | Full Grapevine articles    | Verbatim reproduction      | Explicitly copyrighted        |
| **MEDIUM** | 12&12 extended passages    | Multiple paragraphs quoted | Fair use arguable             |
| **MEDIUM** | Big Book extended passages | Multiple paragraphs quoted | Fair use arguable             |
| **LOW**    | 12 Steps/Traditions text   | Standard AA text           | Widely quoted across internet |
| **LOW**    | Page references/citations  | Academic-style citations   | Standard practice             |

---

## Fair Use Considerations

This project operates under a fair use rationale documented in
`docs/COPYRIGHT_AND_LICENSING_ANALYSIS.md`:

1. **Purpose:** Non-commercial, educational, service-oriented
2. **Nature:** Published factual/instructional works
3. **Amount:** Excerpts with citations (except Grapevine)
4. **Market Effect:** Supplements rather than replaces AA literature

**Mitigations in place:**

- 500-word response limit on AI-generated content
- Page citations directing users to original sources
- Non-commercial operation
- Service to AA community

---

## Existing Compliance Documentation

1. **docs/COPYRIGHT_AND_LICENSING_ANALYSIS.md** - Legal analysis and fair use rationale
2. **docs/AA_TRADITIONS_COMPLIANCE.md** - Operational compliance with AA Traditions

---

## Contact Information

**For licensing inquiries:**

- AA World Services, Inc.
- 475 Riverside Drive, New York, NY 10115
- Website: aa.org
- Licensing: Contact through aa.org

**For Grapevine content:**

- The A.A. Grapevine, Inc.
- Website: aagrapevine.org

---

## Project Intent

This inventory is prepared in good faith as part of planned outreach to AA World Services. The
project creator is an AA member who built this tool to serve the fellowship and seeks to operate in
full compliance with AA's wishes regarding their copyrighted materials.
