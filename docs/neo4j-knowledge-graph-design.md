# Neo4j Knowledge Graph Design for Digital Sponsor

## Executive Summary

This document outlines a Neo4j-based knowledge graph design for Digital Sponsor, analyzing specific
use cases that would benefit, degrade, or remain neutral with this architecture change.

---

## Schema Design

### Node Types

```cypher
// ============================================================================
// CORE LITERATURE NODES
// ============================================================================

// Individual Steps
(:Step {
  number: INTEGER,           // 1-12
  name: STRING,              // "Powerlessness & Unmanageability"
  text: STRING,              // Official step wording
  bigBookPages: [STRING],    // ["p.30", "p.44"]
  twelveAndTwelvePages: [STRING]
})

// Individual Traditions
(:Tradition {
  number: INTEGER,
  name: STRING,
  text: STRING,
  shortForm: STRING,
  longForm: STRING
})

// Literature Sources
(:Book {
  id: STRING,                // "big_book", "twelve_and_twelve"
  title: STRING,
  author: STRING,
  yearPublished: INTEGER,
  isConferenceApproved: BOOLEAN
})

// Chapters within books
(:Chapter {
  id: STRING,
  title: STRING,
  chapterNumber: INTEGER,
  pageStart: INTEGER,
  pageEnd: INTEGER
})

// Specific passages/quotes
(:Passage {
  id: STRING,
  text: STRING,
  pageReference: STRING,     // "p.64"
  isKeyPassage: BOOLEAN,
  context: STRING            // "Discussion of resentment inventory"
})

// Prayers (official and traditional)
(:Prayer {
  id: STRING,
  name: STRING,              // "Third Step Prayer"
  text: STRING,
  isOfficial: BOOLEAN,
  source: STRING             // "Big Book p.63"
})

// ============================================================================
// CONCEPT NODES
// ============================================================================

// Core recovery concepts
(:Concept {
  id: STRING,                // "resentment", "fear", "selfishness"
  name: STRING,
  definition: STRING,
  category: STRING           // "character_defect", "spiritual_principle", "symptom"
})

// Spiritual Principles (one for each step)
(:SpiritualPrinciple {
  id: STRING,
  name: STRING,              // "Honesty", "Hope", "Faith"
  definition: STRING,
  oppositeDefect: STRING     // "Dishonesty", "Despair", "Doubt"
})

// Character Defects
(:CharacterDefect {
  id: STRING,
  name: STRING,              // "Pride", "Fear", "Resentment"
  manifestations: [STRING],  // How it shows up in behavior
  rootCause: STRING          // Often "self-centeredness"
})

// Instincts (from Step 4 framework)
(:Instinct {
  id: STRING,
  name: STRING,              // "Security", "Social", "Sexual"
  healthyExpression: STRING,
  unhealthyExpression: STRING
})

// ============================================================================
// USER DATA NODES
// ============================================================================

// User profile
(:User {
  id: STRING,
  sobrietyDate: DATE,
  homeGroup: STRING,
  currentStep: INTEGER
})

// Step work session
(:StepWorkSession {
  id: STRING,
  stepNumber: INTEGER,
  version: INTEGER,
  status: STRING,            // "in_progress", "completed"
  startedAt: DATETIME,
  completedAt: DATETIME
})

// Resentment inventory entry (Step 4)
(:Resentment {
  id: STRING,
  whoOrWhat: STRING,
  cause: STRING,
  affectsSelfEsteem: BOOLEAN,
  affectsSecurity: BOOLEAN,
  affectsAmbitions: BOOLEAN,
  affectsRelations: BOOLEAN,
  affectsSexRelations: BOOLEAN,
  myPart: STRING
})

// Fear inventory entry (Step 4)
(:Fear {
  id: STRING,
  fear: STRING,
  whyDoIHaveIt: STRING,
  selfRelianceFailed: STRING
})

// Person harmed (Step 8)
(:PersonHarmed {
  id: STRING,
  name: STRING,
  relationship: STRING,
  harmDone: STRING,
  willingnessLevel: INTEGER  // 1-10
})

// Amend record (Step 9)
(:Amend {
  id: STRING,
  status: STRING,            // "not_started", "in_progress", "completed", "living_amends"
  dateAttempted: DATE,
  dateCompleted: DATE,
  howItWent: STRING,
  unexpectedOutcomes: STRING
})

// Daily inventory (Step 10)
(:DailyInventory {
  id: STRING,
  date: DATE,
  wasResentful: BOOLEAN,
  wasSelfish: BOOLEAN,
  wasDishonest: BOOLEAN,
  wasAfraid: BOOLEAN,
  owesApology: BOOLEAN,
  reflection: STRING
})

// Meditation session (Step 11)
(:MeditationSession {
  id: STRING,
  date: DATE,
  duration: INTEGER,         // minutes
  type: STRING,              // "morning", "evening", "spot_check"
  journalEntry: STRING
})

// Service work (Step 12)
(:ServiceWork {
  id: STRING,
  date: DATE,
  type: STRING,              // "sponsorship", "meeting_service", "twelfth_step_call"
  description: STRING,
  hoursSpent: FLOAT
})
```

### Relationship Types

```cypher
// ============================================================================
// LITERATURE RELATIONSHIPS
// ============================================================================

// Step → Step (progression and dependencies)
(:Step)-[:FOLLOWS]->(:Step)                    // Step 2 FOLLOWS Step 1
(:Step)-[:PREPARES_FOR]->(:Step)               // Step 4 PREPARES_FOR Step 5
(:Step)-[:PROVIDES_INPUT_TO]->(:Step)          // Step 4 PROVIDES_INPUT_TO Step 8
(:Step)-[:BUILDS_ON]->(:Step)                  // Step 6 BUILDS_ON Step 5

// Step → Literature
(:Step)-[:DISCUSSED_IN {pages: [STRING]}]->(:Chapter)
(:Step)-[:HAS_PRAYER]->(:Prayer)
(:Passage)-[:EXPLAINS]->(:Step)
(:Passage)-[:ILLUSTRATES]->(:Concept)

// Book structure
(:Book)-[:CONTAINS]->(:Chapter)
(:Chapter)-[:CONTAINS]->(:Passage)
(:Chapter)-[:NEXT]->(:Chapter)

// Concept relationships
(:Concept)-[:RELATED_TO]->(:Concept)           // Fear RELATED_TO Resentment
(:Concept)-[:OPPOSITE_OF]->(:Concept)          // Humility OPPOSITE_OF Pride
(:Concept)-[:CAUSES]->(:Concept)               // Self-centeredness CAUSES Resentment
(:Concept)-[:REMEDY_FOR]->(:Concept)           // Acceptance REMEDY_FOR Resentment

// Step ↔ Concept
(:Step)-[:ADDRESSES]->(:Concept)               // Step 4 ADDRESSES Resentment
(:Step)-[:EMBODIES]->(:SpiritualPrinciple)     // Step 1 EMBODIES Honesty
(:Step)-[:REMOVES]->(:CharacterDefect)         // Step 6/7 REMOVES Pride

// Instinct relationships
(:Instinct)-[:WHEN_THREATENED_CAUSES]->(:CharacterDefect)
(:Resentment)-[:AFFECTS]->(:Instinct)

// ============================================================================
// USER JOURNEY RELATIONSHIPS
// ============================================================================

// User → Step Work
(:User)-[:WORKING_ON]->(:StepWorkSession)
(:User)-[:COMPLETED]->(:StepWorkSession)
(:StepWorkSession)-[:FOR_STEP]->(:Step)
(:StepWorkSession)-[:VERSION_OF]->(:StepWorkSession)  // Version tracking

// Step 4 inventory
(:StepWorkSession)-[:CONTAINS]->(:Resentment)
(:StepWorkSession)-[:CONTAINS]->(:Fear)
(:Resentment)-[:REVEALS]->(:CharacterDefect)
(:Resentment)-[:AFFECTS]->(:Instinct)
(:Fear)-[:MANIFESTS_AS]->(:CharacterDefect)

// Step 8 → Step 9 flow
(:Resentment)-[:LED_TO_HARM]->(:PersonHarmed)   // Connect Step 4 to Step 8
(:PersonHarmed)-[:REQUIRES]->(:Amend)           // Connect Step 8 to Step 9
(:Amend)-[:FOR_PERSON]->(:PersonHarmed)

// Daily practice
(:User)-[:LOGGED]->(:DailyInventory)
(:User)-[:LOGGED]->(:MeditationSession)
(:User)-[:PERFORMED]->(:ServiceWork)
(:DailyInventory)-[:IDENTIFIED]->(:Resentment)  // New resentments from Step 10

// ============================================================================
// CROSS-REFERENCE RELATIONSHIPS
// ============================================================================

// Literature cross-references
(:Passage)-[:REFERENCES]->(:Passage)            // Cross-book references
(:Passage)-[:QUOTED_IN]->(:Passage)
(:Concept)-[:MENTIONED_IN]->(:Passage)

// Thematic connections
(:Passage)-[:ABOUT]->(:Concept)
(:Prayer)-[:ADDRESSES]->(:Concept)
(:Step)-[:RELATED_TO]->(:Tradition)            // Step 12 ↔ Tradition 5
```

---

## Visual Schema Diagram

```
                                    ┌─────────────┐
                                    │    Book     │
                                    │ (Big Book,  │
                                    │  12&12)     │
                                    └──────┬──────┘
                                           │ CONTAINS
                                           ▼
┌─────────────┐                    ┌─────────────┐
│  Tradition  │◄──RELATED_TO──────►│   Chapter   │
└─────────────┘                    └──────┬──────┘
       ▲                                  │ CONTAINS
       │                                  ▼
       │ RELATED_TO              ┌─────────────┐
       │                         │   Passage   │──ILLUSTRATES──►┌─────────────┐
       │                         └──────┬──────┘                │   Concept   │
       │                                │                       └──────┬──────┘
       │                                │ EXPLAINS                     │
       │                                ▼                               │
       │                         ┌─────────────┐◄──ADDRESSES───────────┘
       └─────────────────────────│    Step     │
                                 └──────┬──────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
       ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
       │   Prayer    │          │  Spiritual  │          │  Character  │
       │             │          │  Principle  │          │   Defect    │
       └─────────────┘          └─────────────┘          └─────────────┘
                                                                 ▲
                                                                 │ REVEALS
                                                                 │
┌─────────────┐     WORKING_ON    ┌─────────────┐    CONTAINS   ┌─────────────┐
│    User     │──────────────────►│  StepWork   │──────────────►│ Resentment  │
└─────────────┘                   │   Session   │               └──────┬──────┘
       │                          └─────────────┘                      │
       │ LOGGED                                                        │ LED_TO_HARM
       ▼                                                               ▼
┌─────────────┐                                                ┌─────────────┐
│   Daily     │                                                │   Person    │
│  Inventory  │                                                │   Harmed    │
└─────────────┘                                                └──────┬──────┘
                                                                      │ REQUIRES
                                                                      ▼
                                                               ┌─────────────┐
                                                               │    Amend    │
                                                               └─────────────┘
```

---

## Specific Use Cases Analysis

### CASES THAT WOULD SIGNIFICANTLY BENEFIT

#### 1. **"Trace the concept of resentment across all literature"**

**Current approach:** Multiple keyword searches, manual aggregation

```javascript
// Current: 3 separate searches, client-side joining
const step4Results = search('resentment step 4');
const bigBookResults = search('resentment Big Book');
const dailyReflections = search('resentment Daily Reflections');
// Manual deduplication and ordering
```

**With Neo4j:**

```cypher
MATCH path = (c:Concept {name: "Resentment"})<-[:ABOUT|ILLUSTRATES|ADDRESSES*1..3]-(content)
WHERE content:Passage OR content:Step OR content:Prayer
RETURN content,
       [rel IN relationships(path) | type(rel)] AS connectionType,
       length(path) AS depth
ORDER BY depth, content.pageReference
```

**Benefit:** Single query returns structured, ordered results with relationship context. Shows HOW
concepts are connected, not just that they appear together.

---

#### 2. **"What should I discuss with my sponsor about my Step 4?"**

**Current approach:** Generic suggestions, no personalization

```javascript
// Current: Return static list of discussion topics
return ['Review your resentments', 'Discuss patterns you noticed'];
```

**With Neo4j:**

```cypher
// Find user's Step 4, analyze patterns, suggest discussion points
MATCH (u:User {id: $userId})-[:COMPLETED]->(s:StepWorkSession {stepNumber: 4})
MATCH (s)-[:CONTAINS]->(r:Resentment)-[:REVEALS]->(cd:CharacterDefect)
WITH cd, count(r) AS frequency
ORDER BY frequency DESC
LIMIT 5

MATCH (cd)<-[:ADDRESSES]-(step:Step)
MATCH (cd)<-[:ILLUSTRATES]-(p:Passage)
RETURN cd.name AS defect,
       frequency,
       collect(DISTINCT step.number) AS relevantSteps,
       collect(DISTINCT p.pageReference)[0..3] AS literatureReferences
```

**Benefit:** Personalized insights like "Pride appeared in 7 of your resentments. The Big Book
discusses this on p.62. Steps 6 and 7 address this directly."

---

#### 3. **"Step 8 list builder - pull from Step 4"**

**Current approach:** Text matching on names

```python
# Current: String matching across JSON
step4_names = [r['who'] for r in step4_resentments]
step4_names += [h['person'] for h in step4_harms]
```

**With Neo4j:**

```cypher
// Pull everyone harmed from Step 4 with full context
MATCH (u:User {id: $userId})-[:COMPLETED]->(s4:StepWorkSession {stepNumber: 4})
MATCH (s4)-[:CONTAINS]->(r:Resentment)
WHERE r.myPart IS NOT NULL AND r.myPart <> ""

// Find or suggest PersonHarmed nodes
MERGE (ph:PersonHarmed {name: r.whoOrWhat, userId: $userId})
SET ph.sourceResentmentId = r.id,
    ph.harmContext = r.myPart

RETURN ph.name,
       r.cause AS originalResentment,
       r.myPart AS myPartInIt,
       EXISTS((ph)-[:REQUIRES]->(:Amend)) AS hasAmend
```

**Benefit:** Maintains provenance (where each name came from), prevents duplicates, tracks whether
amends exist.

---

#### 4. **"Show me how the steps connect"**

**Current approach:** Static documentation

```javascript
// Current: Hardcoded array
const stepFlow = [
  { from: 4, to: 5, label: 'Share inventory' },
  { from: 4, to: 8, label: 'Names from resentments' },
  // ...manually maintained
];
```

**With Neo4j:**

```cypher
// Dynamic step relationship visualization
MATCH (s1:Step)-[r]->(s2:Step)
WHERE type(r) IN ['FOLLOWS', 'PREPARES_FOR', 'PROVIDES_INPUT_TO', 'BUILDS_ON']
RETURN s1.number AS from,
       s2.number AS to,
       type(r) AS relationship,
       CASE type(r)
         WHEN 'PROVIDES_INPUT_TO' THEN 'Your Step ' + s1.number + ' work feeds into Step ' + s2.number
         WHEN 'PREPARES_FOR' THEN 'Step ' + s1.number + ' prepares you for Step ' + s2.number
         ELSE 'Step ' + s1.number + ' → Step ' + s2.number
       END AS explanation
```

**Benefit:** Relationships are data, not code. Can be updated without deployment.

---

#### 5. **"What's the opposite of [character defect]? How do I develop it?"**

**Current approach:** Lookup table or AI generation

```javascript
// Current: Hardcoded mapping
const opposites = { pride: 'humility', fear: 'faith' };
```

**With Neo4j:**

```cypher
MATCH (defect:CharacterDefect {name: $defectName})
MATCH (defect)-[:OPPOSITE_OF]->(principle:SpiritualPrinciple)
MATCH (principle)<-[:EMBODIES]-(step:Step)
MATCH (step)-[:HAS_PRAYER]->(prayer:Prayer)
OPTIONAL MATCH (principle)<-[:ILLUSTRATES]-(passage:Passage)

RETURN principle.name AS remedy,
       principle.definition,
       collect(DISTINCT step.number) AS stepsToWork,
       prayer.text AS relevantPrayer,
       collect(DISTINCT passage.pageReference)[0..5] AS readings
```

**Benefit:** Returns actionable guidance: "The opposite of Pride is Humility. Work Steps 6-7. Read
Big Book p.76. Use the Seventh Step Prayer."

---

#### 6. **"Recovery journey analytics"**

**Current approach:** Aggregate queries across multiple tables

```sql
-- Current: Multiple queries
SELECT COUNT(*) FROM resentments WHERE user_id = ?;
SELECT COUNT(*) FROM amends WHERE user_id = ? AND status = 'completed';
SELECT AVG(duration) FROM meditation_sessions WHERE user_id = ?;
```

**With Neo4j:**

```cypher
// Comprehensive recovery dashboard in one query
MATCH (u:User {id: $userId})

// Step progress
OPTIONAL MATCH (u)-[:COMPLETED]->(completed:StepWorkSession)
OPTIONAL MATCH (u)-[:WORKING_ON]->(current:StepWorkSession)

// Character defect patterns
OPTIONAL MATCH (u)-[:COMPLETED]->(s4:StepWorkSession {stepNumber: 4})
               -[:CONTAINS]->(r:Resentment)-[:REVEALS]->(cd:CharacterDefect)

// Amends progress
OPTIONAL MATCH (u)-[:COMPLETED]->(s8:StepWorkSession {stepNumber: 8})
               -[:CONTAINS]->(ph:PersonHarmed)-[:REQUIRES]->(a:Amend)

// Daily practice
OPTIONAL MATCH (u)-[:LOGGED]->(di:DailyInventory)
WHERE di.date > date() - duration('P30D')

RETURN {
  stepsCompleted: count(DISTINCT completed),
  currentStep: current.stepNumber,
  topDefects: collect(DISTINCT cd.name)[0..3],
  amendsProgress: {
    total: count(DISTINCT ph),
    completed: size([a IN collect(a) WHERE a.status = 'completed'])
  },
  last30Days: {
    inventoriesTaken: count(DISTINCT di),
    averageResentmentsPerDay: avg(size([d IN collect(di) WHERE d.wasResentful]))
  }
} AS dashboard
```

**Benefit:** Single query returns complete dashboard. Graph traversal is natural for connected data.

---

### CASES THAT WOULD DEGRADE

#### 1. **Simple keyword search**

**Current approach:** Fast text search with scoring

```python
# Current: O(n) scan with scoring, very fast for 2400 items
for item in literature:
    if query in item['content']:
        score += 2
```

**With Neo4j:**

```cypher
// Requires full-text index setup, more overhead
CALL db.index.fulltext.queryNodes('literatureIndex', $query)
YIELD node, score
RETURN node, score
```

**Degradation:**

- **Latency:** Neo4j full-text search adds ~10-50ms overhead vs. in-memory search
- **Complexity:** Requires index maintenance, configuration
- **Overkill:** For simple "find text" queries, current approach is faster

**Recommendation:** Keep vector search for semantic queries, use Neo4j only for relationship
queries.

---

#### 2. **Bulk data export (GDPR)**

**Current approach:** Simple JSON dump

```python
# Current: Direct serialization
user_data = {
    'stepWork': get_user_step_work(user_id),
    'chats': get_user_chats(user_id)
}
return json.dumps(user_data)
```

**With Neo4j:**

```cypher
// Must traverse all relationships, complex serialization
MATCH (u:User {id: $userId})-[*1..5]->(related)
RETURN u, collect(related)
// Then flatten graph structure to JSON
```

**Degradation:**

- **Complexity:** Graph → JSON transformation is non-trivial
- **Performance:** Deep traversals can be slow
- **Data shape:** Users expect flat JSON, not graph structure

**Recommendation:** Maintain parallel simple data store for exports, or build dedicated export
views.

---

#### 3. **High-frequency writes (daily inventory, meditation logs)**

**Current approach:** Append-only writes

```python
# Current: Simple insert, O(1)
inventory = DailyInventory(user_id=user_id, date=today, ...)
db.insert(inventory)
```

**With Neo4j:**

```cypher
// Create node AND relationships
MATCH (u:User {id: $userId})
CREATE (u)-[:LOGGED]->(di:DailyInventory {
  date: date(),
  wasResentful: $wasResentful,
  ...
})
// If new resentment identified, create more relationships
FOREACH (r IN $newResentments |
  CREATE (di)-[:IDENTIFIED]->(res:Resentment {whoOrWhat: r.who, ...})
)
```

**Degradation:**

- **Write amplification:** Each inventory creates multiple nodes/relationships
- **Transaction overhead:** More complex writes = higher latency
- **Lock contention:** User node becomes hotspot

**Recommendation:** Batch daily writes, or use write-through cache.

---

#### 4. **Simple CRUD on user profiles**

**Current approach:** Direct document update

```python
# Current: Single document update
users.update_one({'_id': user_id}, {'$set': {'homeGroup': new_group}})
```

**With Neo4j:**

```cypher
MATCH (u:User {id: $userId})
SET u.homeGroup = $newGroup
RETURN u
```

**Degradation:**

- **Minimal benefit:** No relationships involved, graph adds no value
- **Operational overhead:** Another database to maintain
- **Cost:** Neo4j licensing/hosting for simple operations

**Recommendation:** Keep user profiles in document store, sync to graph only for relationship-heavy
operations.

---

#### 5. **Real-time chat context retrieval**

**Current approach:** Embeddings + vector similarity

```python
# Current: Fast vector lookup
similar_passages = vector_search(user_message, top_k=5)
context = [p['content'] for p in similar_passages]
```

**With Neo4j:**

```cypher
// Would need to embed query, then match
// Neo4j vector search exists but adds latency
CALL db.index.vector.queryNodes('passageEmbeddings', 5, $queryEmbedding)
YIELD node, score
RETURN node.content
```

**Degradation:**

- **Latency critical:** Chat needs <100ms response, graph adds overhead
- **Vector search:** Neo4j's vector capabilities are newer, less optimized than dedicated solutions
- **No relationship benefit:** Finding similar text doesn't need graph traversal

**Recommendation:** Keep vector search separate. Use graph only for relationship enrichment after
initial retrieval.

---

### CASES THAT ARE NEUTRAL

| Use Case                 | Graph Benefit | Alternative Equally Good |
| ------------------------ | ------------- | ------------------------ |
| User authentication      | None          | Document store           |
| Session management       | None          | Redis/memory             |
| Meditation timer         | None          | Client-side              |
| Static content serving   | None          | CDN/files                |
| Email sending            | None          | Queue + SMTP             |
| Basic analytics (counts) | Minimal       | SQL aggregates           |

---

## Hybrid Architecture Recommendation

```
┌─────────────────────────────────────────────────────────────────────┐
│                        QUERY ROUTING LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Find passages about fear"     →  Vector Search (existing)         │
│  "How does fear connect to..."  →  Neo4j Graph                      │
│  "Save my inventory"            →  Document Store (Cosmos DB)       │
│  "Get user profile"             →  Document Store                   │
│  "Show step relationships"      →  Neo4j Graph                      │
│  "Export my data"               →  Document Store                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Vector     │    │    Neo4j     │    │  Cosmos DB   │
│   Search     │    │    Graph     │    │  (Documents) │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ • Semantic   │    │ • Literature │    │ • User data  │
│   similarity │    │   relations  │    │ • Step work  │
│ • Fast text  │    │ • Concept    │    │ • Chat logs  │
│   retrieval  │    │   mapping    │    │ • Sessions   │
│ • Chat       │    │ • User       │    │ • Profiles   │
│   context    │    │   journey    │    │ • Exports    │
│              │    │   analytics  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
       ▲                   ▲                   ▲
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌──────────────┐
                    │   Sync       │
                    │   Service    │
                    │ (Event-driven│
                    │  replication)│
                    └──────────────┘
```

---

## Implementation Priority

### Phase 1: Literature Graph Only (Low Risk)

- Import static literature (Big Book, 12&12, concepts)
- No user data, read-only
- Use for: "How does X relate to Y?" queries
- **Effort:** 1-2 weeks

### Phase 2: Step Relationship Queries

- Add step-to-step relationships
- Power the step workbook with dynamic connections
- **Effort:** 1 week

### Phase 3: User Journey Graph (Higher Risk)

- Sync user step work to graph
- Enable personalized insights
- **Effort:** 2-3 weeks
- **Risk:** Data synchronization complexity

---

## Cost-Benefit Summary

| Factor                        | Benefit                                    | Cost/Risk                               |
| ----------------------------- | ------------------------------------------ | --------------------------------------- |
| **Query expressiveness**      | High - relationship queries become trivial | Learning curve for Cypher               |
| **Insight generation**        | High - "Why" not just "What"               | Requires graph modeling expertise       |
| **Personalization**           | High - user journey analysis               | Data sync complexity                    |
| **Literature navigation**     | High - cross-reference traversal           | Initial data import effort              |
| **Operational overhead**      | N/A                                        | Medium - another DB to maintain         |
| **Latency (simple queries)**  | Negative                                   | +10-50ms overhead                       |
| **Latency (complex queries)** | Positive                                   | Graph often faster than JOINs           |
| **Development velocity**      | Mixed                                      | New paradigm, but powerful once learned |

---

## Conclusion

**Recommended approach:** Implement Neo4j for the **literature knowledge graph** and **step
relationships** only. Keep user data in the existing document store with event-driven sync to the
graph for analytics.

This gives the benefits of relationship queries without the risks of migrating primary data storage.
