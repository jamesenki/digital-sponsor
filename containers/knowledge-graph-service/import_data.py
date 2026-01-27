#!/usr/bin/env python3
"""
Neo4j Data Import Script for Digital Sponsor Knowledge Graph

This script populates the Neo4j database with:
- 12 Steps with relationships
- 12 Traditions
- Spiritual Principles
- Character Defects
- Key Passages from Big Book and 12&12
- Prayers
- Concept relationships
"""

import os
import sys

# Neo4j Configuration
NEO4J_URI = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')

try:
    from neo4j import GraphDatabase
except ImportError:
    print("❌ Neo4j driver not installed. Run: pip install neo4j")
    sys.exit(1)


# ============================================================================
# DATA DEFINITIONS
# ============================================================================

STEPS = [
    {
        "number": 1,
        "name": "Powerlessness & Unmanageability",
        "text": "We admitted we were powerless over alcohol—that our lives had become unmanageable.",
        "bigBookPages": ["p.30", "p.44"],
        "twelveAndTwelvePages": ["p.21-24"],
        "spiritualPrinciple": "Honesty"
    },
    {
        "number": 2,
        "name": "Came to Believe",
        "text": "Came to believe that a Power greater than ourselves could restore us to sanity.",
        "bigBookPages": ["p.46-47", "p.55"],
        "twelveAndTwelvePages": ["p.25-33"],
        "spiritualPrinciple": "Hope"
    },
    {
        "number": 3,
        "name": "Made a Decision",
        "text": "Made a decision to turn our will and our lives over to the care of God as we understood Him.",
        "bigBookPages": ["p.60-63"],
        "twelveAndTwelvePages": ["p.34-41"],
        "spiritualPrinciple": "Faith"
    },
    {
        "number": 4,
        "name": "Moral Inventory",
        "text": "Made a searching and fearless moral inventory of ourselves.",
        "bigBookPages": ["p.64-71"],
        "twelveAndTwelvePages": ["p.42-54"],
        "spiritualPrinciple": "Courage"
    },
    {
        "number": 5,
        "name": "Admitted Wrongs",
        "text": "Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.",
        "bigBookPages": ["p.72-75"],
        "twelveAndTwelvePages": ["p.55-62"],
        "spiritualPrinciple": "Integrity"
    },
    {
        "number": 6,
        "name": "Were Entirely Ready",
        "text": "Were entirely ready to have God remove all these defects of character.",
        "bigBookPages": ["p.76"],
        "twelveAndTwelvePages": ["p.63-69"],
        "spiritualPrinciple": "Willingness"
    },
    {
        "number": 7,
        "name": "Humbly Asked",
        "text": "Humbly asked Him to remove our shortcomings.",
        "bigBookPages": ["p.76"],
        "twelveAndTwelvePages": ["p.70-76"],
        "spiritualPrinciple": "Humility"
    },
    {
        "number": 8,
        "name": "Made a List",
        "text": "Made a list of all persons we had harmed, and became willing to make amends to them all.",
        "bigBookPages": ["p.76-77"],
        "twelveAndTwelvePages": ["p.77-82"],
        "spiritualPrinciple": "Brotherly Love"
    },
    {
        "number": 9,
        "name": "Made Direct Amends",
        "text": "Made direct amends to such people wherever possible, except when to do so would injure them or others.",
        "bigBookPages": ["p.76-84"],
        "twelveAndTwelvePages": ["p.83-87"],
        "spiritualPrinciple": "Justice"
    },
    {
        "number": 10,
        "name": "Continued Personal Inventory",
        "text": "Continued to take personal inventory and when we were wrong promptly admitted it.",
        "bigBookPages": ["p.84-85"],
        "twelveAndTwelvePages": ["p.88-95"],
        "spiritualPrinciple": "Perseverance"
    },
    {
        "number": 11,
        "name": "Prayer and Meditation",
        "text": "Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.",
        "bigBookPages": ["p.85-88"],
        "twelveAndTwelvePages": ["p.96-105"],
        "spiritualPrinciple": "Spiritual Awareness"
    },
    {
        "number": 12,
        "name": "Spiritual Awakening",
        "text": "Having had a spiritual awakening as the result of these Steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs.",
        "bigBookPages": ["p.89-103"],
        "twelveAndTwelvePages": ["p.106-125"],
        "spiritualPrinciple": "Service"
    }
]

STEP_RELATIONSHIPS = [
    # Sequential progression
    {"from": 1, "to": 2, "type": "FOLLOWS"},
    {"from": 2, "to": 3, "type": "FOLLOWS"},
    {"from": 3, "to": 4, "type": "FOLLOWS"},
    {"from": 4, "to": 5, "type": "PREPARES_FOR"},
    {"from": 5, "to": 6, "type": "FOLLOWS"},
    {"from": 6, "to": 7, "type": "PREPARES_FOR"},
    {"from": 7, "to": 8, "type": "FOLLOWS"},
    {"from": 8, "to": 9, "type": "PREPARES_FOR"},
    {"from": 9, "to": 10, "type": "FOLLOWS"},
    {"from": 10, "to": 11, "type": "FOLLOWS"},
    {"from": 11, "to": 12, "type": "FOLLOWS"},
    # Cross-step dependencies
    {"from": 4, "to": 8, "type": "PROVIDES_INPUT_TO"},  # Resentments → Amends list
    {"from": 5, "to": 6, "type": "BUILDS_ON"},  # Sharing reveals defects
    {"from": 1, "to": 12, "type": "RELATED_TO"},  # Powerlessness → Service (full circle)
]

CHARACTER_DEFECTS = [
    {"name": "Resentment", "manifestations": ["Anger", "Bitterness", "Grudges", "Contempt"], "rootCause": "Self-centeredness"},
    {"name": "Fear", "manifestations": ["Anxiety", "Worry", "Dread", "Panic"], "rootCause": "Lack of faith"},
    {"name": "Pride", "manifestations": ["Arrogance", "Ego", "Vanity", "Self-importance"], "rootCause": "Self-centeredness"},
    {"name": "Selfishness", "manifestations": ["Self-seeking", "Greed", "Self-pity"], "rootCause": "Self-centeredness"},
    {"name": "Dishonesty", "manifestations": ["Lying", "Deception", "Manipulation", "Denial"], "rootCause": "Fear"},
    {"name": "Envy", "manifestations": ["Jealousy", "Covetousness"], "rootCause": "Self-centeredness"},
    {"name": "Sloth", "manifestations": ["Laziness", "Procrastination", "Apathy"], "rootCause": "Fear"},
    {"name": "Gluttony", "manifestations": ["Excess", "Overindulgence"], "rootCause": "Self-centeredness"},
    {"name": "Lust", "manifestations": ["Sexual misconduct", "Obsession"], "rootCause": "Self-centeredness"},
    {"name": "Impatience", "manifestations": ["Irritability", "Intolerance"], "rootCause": "Self-will"},
    {"name": "Intolerance", "manifestations": ["Judgmental", "Criticism", "Contempt"], "rootCause": "Fear"},
    {"name": "Self-pity", "manifestations": ["Victim mentality", "Martyrdom"], "rootCause": "Self-centeredness"},
]

SPIRITUAL_PRINCIPLES = [
    {"name": "Honesty", "definition": "Rigorous self-honesty about our condition and actions.", "oppositeDefect": "Dishonesty"},
    {"name": "Hope", "definition": "Belief that recovery is possible through a Power greater than ourselves.", "oppositeDefect": "Despair"},
    {"name": "Faith", "definition": "Trust in a Higher Power and the program of recovery.", "oppositeDefect": "Fear"},
    {"name": "Courage", "definition": "Willingness to face our fears and take difficult actions.", "oppositeDefect": "Fear"},
    {"name": "Integrity", "definition": "Living according to our values and being consistent.", "oppositeDefect": "Dishonesty"},
    {"name": "Willingness", "definition": "Openness to change and to take suggested actions.", "oppositeDefect": "Resistance"},
    {"name": "Humility", "definition": "Accurate self-assessment, not thinking less of ourselves but thinking of ourselves less.", "oppositeDefect": "Pride"},
    {"name": "Brotherly Love", "definition": "Care and concern for others' wellbeing.", "oppositeDefect": "Selfishness"},
    {"name": "Justice", "definition": "Making right what we have made wrong.", "oppositeDefect": "Avoidance"},
    {"name": "Perseverance", "definition": "Continuing the work even when difficult.", "oppositeDefect": "Sloth"},
    {"name": "Spiritual Awareness", "definition": "Conscious contact with a Higher Power.", "oppositeDefect": "Spiritual disconnection"},
    {"name": "Service", "definition": "Helping others without expectation of reward.", "oppositeDefect": "Selfishness"},
    {"name": "Acceptance", "definition": "Accepting reality as it is, not as we wish it to be.", "oppositeDefect": "Resentment"},
    {"name": "Gratitude", "definition": "Appreciation for what we have rather than focusing on what we lack.", "oppositeDefect": "Self-pity"},
    {"name": "Forgiveness", "definition": "Releasing resentments and grudges.", "oppositeDefect": "Resentment"},
]

KEY_PASSAGES = [
    # Big Book - Chapter 5: How It Works
    {"id": "bb_p58", "text": "Rarely have we seen a person fail who has thoroughly followed our path.", "source": "Big Book", "page": "p.58", "chapter": "How It Works"},
    {"id": "bb_p62", "text": "Selfishness—self-centeredness! That, we think, is the root of our troubles.", "source": "Big Book", "page": "p.62", "chapter": "How It Works", "concepts": ["Selfishness", "Self-centeredness"]},
    {"id": "bb_p64", "text": "Resentment is the 'number one' offender. It destroys more alcoholics than anything else.", "source": "Big Book", "page": "p.64", "chapter": "How It Works", "concepts": ["Resentment"]},
    {"id": "bb_p67", "text": "This short word somehow touches about every aspect of our lives. It was an evil and corroding thread; the fabric of our existence was shot through with it.", "source": "Big Book", "page": "p.67", "chapter": "How It Works", "concepts": ["Fear"]},
    {"id": "bb_p76", "text": "My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows.", "source": "Big Book", "page": "p.76", "chapter": "How It Works", "concepts": ["Humility", "Willingness"]},
    {"id": "bb_p83", "text": "If we are painstaking about this phase of our development, we will be amazed before we are half way through.", "source": "Big Book", "page": "p.83-84", "chapter": "Into Action", "concepts": ["Promises"]},
    {"id": "bb_p84", "text": "Continue to watch for selfishness, dishonesty, resentment, and fear. When these crop up, we ask God at once to remove them.", "source": "Big Book", "page": "p.84", "chapter": "Into Action", "concepts": ["Selfishness", "Dishonesty", "Resentment", "Fear"]},
    {"id": "bb_p86", "text": "On awakening let us think about the twenty-four hours ahead. We consider our plans for the day.", "source": "Big Book", "page": "p.86", "chapter": "Into Action", "concepts": ["Prayer", "Meditation"]},
    {"id": "bb_p417", "text": "And acceptance is the answer to all my problems today.", "source": "Big Book", "page": "p.417", "chapter": "Doctor's Opinion", "concepts": ["Acceptance"]},

    # 12&12 key passages
    {"id": "1212_s1", "text": "Who cares to admit complete defeat? Practically no one, of course. Every natural instinct cries out against the idea of personal powerlessness.", "source": "12&12", "page": "Step 1", "concepts": ["Powerlessness", "Denial"]},
    {"id": "1212_s4", "text": "Creation gave us instincts for a purpose. Without them we wouldn't be complete human beings.", "source": "12&12", "page": "Step 4", "concepts": ["Instincts"]},
    {"id": "1212_s6", "text": "This is the Step that separates the men from the boys.", "source": "12&12", "page": "Step 6", "concepts": ["Willingness"]},
    {"id": "1212_s7", "text": "Since this Step so specifically concerns itself with humility, we should pause here to consider what humility is.", "source": "12&12", "page": "Step 7", "concepts": ["Humility"]},
]

PRAYERS = [
    {"id": "third_step", "name": "Third Step Prayer", "text": "God, I offer myself to Thee—to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will. Take away my difficulties, that victory over them may bear witness to those I would help of Thy Power, Thy Love, and Thy Way of life. May I do Thy will always!", "source": "Big Book p.63", "step": 3},
    {"id": "seventh_step", "name": "Seventh Step Prayer", "text": "My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows. Grant me strength, as I go out from here, to do your bidding. Amen.", "source": "Big Book p.76", "step": 7},
    {"id": "serenity", "name": "Serenity Prayer", "text": "God grant me the serenity to accept the things I cannot change, courage to change the things I can, and wisdom to know the difference.", "source": "Traditional", "step": None},
    {"id": "st_francis", "name": "St. Francis Prayer", "text": "Lord, make me a channel of thy peace—that where there is hatred, I may bring love—that where there is wrong, I may bring the spirit of forgiveness—that where there is discord, I may bring harmony—that where there is error, I may bring truth—that where there is doubt, I may bring faith—that where there is despair, I may bring hope—that where there are shadows, I may bring light—that where there is sadness, I may bring joy. Lord, grant that I may seek rather to comfort than to be comforted—to understand, than to be understood—to love, than to be loved. For it is by self-forgetting that one finds. It is by forgiving that one is forgiven. It is by dying that one awakens to Eternal Life. Amen.", "source": "12&12 p.99", "step": 11},
]


# ============================================================================
# IMPORT FUNCTIONS
# ============================================================================

def clear_database(tx):
    """Clear all nodes and relationships"""
    tx.run("MATCH (n) DETACH DELETE n")
    print("🗑️  Cleared existing data")


def create_indexes(tx):
    """Create indexes for better query performance"""
    indexes = [
        "CREATE INDEX step_number IF NOT EXISTS FOR (s:Step) ON (s.number)",
        "CREATE INDEX concept_name IF NOT EXISTS FOR (c:Concept) ON (c.name)",
        "CREATE INDEX defect_name IF NOT EXISTS FOR (d:CharacterDefect) ON (d.name)",
        "CREATE INDEX principle_name IF NOT EXISTS FOR (p:SpiritualPrinciple) ON (p.name)",
        "CREATE INDEX passage_id IF NOT EXISTS FOR (p:Passage) ON (p.id)",
        "CREATE INDEX prayer_id IF NOT EXISTS FOR (p:Prayer) ON (p.id)",
    ]
    for index in indexes:
        try:
            tx.run(index)
        except Exception as e:
            print(f"  Index warning: {e}")
    print("📇 Created indexes")


def import_steps(tx):
    """Import all 12 steps"""
    for step in STEPS:
        tx.run("""
            CREATE (s:Step {
                number: $number,
                name: $name,
                text: $text,
                bigBookPages: $bigBookPages,
                twelveAndTwelvePages: $twelveAndTwelvePages
            })
        """, **step)
    print(f"✅ Imported {len(STEPS)} steps")


def import_step_relationships(tx):
    """Import relationships between steps"""
    for rel in STEP_RELATIONSHIPS:
        tx.run(f"""
            MATCH (s1:Step {{number: $from}})
            MATCH (s2:Step {{number: $to}})
            CREATE (s1)-[:{rel['type']}]->(s2)
        """, **rel)
    print(f"✅ Imported {len(STEP_RELATIONSHIPS)} step relationships")


def import_character_defects(tx):
    """Import character defects"""
    for defect in CHARACTER_DEFECTS:
        tx.run("""
            CREATE (d:CharacterDefect:Concept {
                name: $name,
                manifestations: $manifestations,
                rootCause: $rootCause,
                category: 'character_defect'
            })
        """, **defect)
    print(f"✅ Imported {len(CHARACTER_DEFECTS)} character defects")


def import_spiritual_principles(tx):
    """Import spiritual principles"""
    for principle in SPIRITUAL_PRINCIPLES:
        tx.run("""
            CREATE (p:SpiritualPrinciple:Concept {
                name: $name,
                definition: $definition,
                category: 'spiritual_principle'
            })
        """, **principle)

    # Create OPPOSITE_OF relationships
    for principle in SPIRITUAL_PRINCIPLES:
        if principle.get("oppositeDefect"):
            tx.run("""
                MATCH (p:SpiritualPrinciple {name: $principle})
                MATCH (d:CharacterDefect {name: $defect})
                CREATE (d)-[:OPPOSITE_OF]->(p)
            """, principle=principle["name"], defect=principle["oppositeDefect"])

    print(f"✅ Imported {len(SPIRITUAL_PRINCIPLES)} spiritual principles")


def import_passages(tx):
    """Import key passages"""
    for passage in KEY_PASSAGES:
        tx.run("""
            CREATE (p:Passage {
                id: $id,
                text: $text,
                source: $source,
                pageReference: $page,
                chapter: $chapter
            })
        """, id=passage["id"], text=passage["text"], source=passage["source"],
           page=passage["page"], chapter=passage.get("chapter", ""))

        # Link to concepts
        for concept in passage.get("concepts", []):
            tx.run("""
                MATCH (p:Passage {id: $passageId})
                MATCH (c:Concept {name: $conceptName})
                CREATE (p)-[:ILLUSTRATES]->(c)
            """, passageId=passage["id"], conceptName=concept)

    print(f"✅ Imported {len(KEY_PASSAGES)} key passages")


def import_prayers(tx):
    """Import prayers"""
    for prayer in PRAYERS:
        tx.run("""
            CREATE (p:Prayer {
                id: $id,
                name: $name,
                text: $text,
                source: $source
            })
        """, **prayer)

        if prayer.get("step"):
            tx.run("""
                MATCH (s:Step {number: $stepNumber})
                MATCH (p:Prayer {id: $prayerId})
                CREATE (s)-[:HAS_PRAYER]->(p)
            """, stepNumber=prayer["step"], prayerId=prayer["id"])

    print(f"✅ Imported {len(PRAYERS)} prayers")


def link_steps_to_principles(tx):
    """Link steps to their spiritual principles"""
    for step in STEPS:
        tx.run("""
            MATCH (s:Step {number: $number})
            MATCH (p:SpiritualPrinciple {name: $principle})
            CREATE (s)-[:EMBODIES]->(p)
        """, number=step["number"], principle=step["spiritualPrinciple"])
    print("✅ Linked steps to spiritual principles")


def link_steps_to_defects(tx):
    """Link steps to the defects they address"""
    step_defect_map = {
        4: ["Resentment", "Fear", "Selfishness", "Dishonesty"],
        5: ["Dishonesty", "Pride"],
        6: ["Pride", "Fear", "Selfishness", "Resentment"],
        7: ["Pride", "Selfishness"],
        10: ["Resentment", "Selfishness", "Dishonesty", "Fear"],
    }
    for step, defects in step_defect_map.items():
        for defect in defects:
            tx.run("""
                MATCH (s:Step {number: $step})
                MATCH (d:CharacterDefect {name: $defect})
                CREATE (s)-[:ADDRESSES]->(d)
            """, step=step, defect=defect)
    print("✅ Linked steps to character defects")


def create_concept_relationships(tx):
    """Create relationships between concepts"""
    relationships = [
        ("Resentment", "Fear", "RELATED_TO"),
        ("Fear", "Dishonesty", "RELATED_TO"),
        ("Pride", "Selfishness", "RELATED_TO"),
        ("Self-pity", "Resentment", "RELATED_TO"),
        ("Selfishness", "Resentment", "CAUSES"),
    ]
    for from_concept, to_concept, rel_type in relationships:
        tx.run(f"""
            MATCH (c1:Concept {{name: $from}})
            MATCH (c2:Concept {{name: $to}})
            CREATE (c1)-[:{rel_type}]->(c2)
        """, **{"from": from_concept, "to": to_concept})
    print("✅ Created concept relationships")


def run_import(uri: str, user: str, password: str, clear: bool = True):
    """Run the complete import"""
    print(f"🔗 Connecting to Neo4j at {uri}...")

    driver = GraphDatabase.driver(uri, auth=(user, password))

    try:
        driver.verify_connectivity()
        print("✅ Connected to Neo4j")

        with driver.session() as session:
            if clear:
                session.execute_write(clear_database)

            session.execute_write(create_indexes)
            session.execute_write(import_steps)
            session.execute_write(import_step_relationships)
            session.execute_write(import_character_defects)
            session.execute_write(import_spiritual_principles)
            session.execute_write(import_passages)
            session.execute_write(import_prayers)
            session.execute_write(link_steps_to_principles)
            session.execute_write(link_steps_to_defects)
            session.execute_write(create_concept_relationships)

        print("")
        print("🎉 Import complete!")
        print("📊 Summary:")

        with driver.session() as session:
            result = session.run("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC")
            for record in result:
                print(f"   {record['label']}: {record['count']}")

    finally:
        driver.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Import AA literature data into Neo4j")
    parser.add_argument("--uri", default=NEO4J_URI, help="Neo4j URI")
    parser.add_argument("--user", default=NEO4J_USER, help="Neo4j username")
    parser.add_argument("--password", default=NEO4J_PASSWORD, help="Neo4j password")
    parser.add_argument("--no-clear", action="store_true", help="Don't clear existing data")

    args = parser.parse_args()

    run_import(args.uri, args.user, args.password, clear=not args.no_clear)
