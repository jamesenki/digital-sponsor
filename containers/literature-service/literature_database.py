#!/usr/bin/env python3
"""
Comprehensive Digital Sponsor Literature Database
Includes official AA 12 Steps, 12 Traditions, recovery concepts, and crisis resources
"""

# 12 Steps with detailed explanations
TWELVE_STEPS = [
    {
        "id": "step1",
        "title": "Step 1: We admitted we were powerless over alcohol",
        "content": "We admitted we were powerless over alcohol — that our lives had become unmanageable. This is the foundation of recovery. Powerlessness means recognizing that willpower alone is not enough to overcome addiction. Unmanageability encompasses the chaos, broken relationships, failed commitments, and loss of control that characterize active addiction. Admitting powerlessness is paradoxically empowering, as it opens the door to receiving help.",
        "type": "twelve_steps",
        "step": 1,
        "keywords": ["powerless", "unmanageable", "admission", "foundation", "willpower", "control"],
        "themes": ["surrender", "honesty", "acceptance"],
        "relevanceScore": 1.0
    },
    {
        "id": "step2", 
        "title": "Step 2: Came to believe that a Power greater than ourselves could restore us to sanity",
        "content": "Came to believe that a Power greater than ourselves could restore us to sanity. This step introduces the concept of hope and spiritual awakening. The 'Power greater than ourselves' can be God, the group, or any source of strength beyond individual will. Sanity refers to sound thinking and rational decision-making, often lost during active addiction. This step requires openness to possibilities beyond self-reliance.",
        "type": "twelve_steps",
        "step": 2,
        "keywords": ["higher power", "sanity", "belief", "hope", "spiritual", "restoration"],
        "themes": ["faith", "openness", "hope"],
        "relevanceScore": 0.95
    },
    {
        "id": "step3",
        "title": "Step 3: Made a decision to turn our will and our lives over to the care of God",
        "content": "Made a decision to turn our will and our lives over to the care of God as we understood Him. This step involves making a conscious choice to let go of self-direction and trust in a higher power. 'As we understood Him' emphasizes personal spiritual concepts rather than specific religious doctrine. Turning over our will means surrendering the illusion of control and being willing to follow guidance from a power greater than ourselves.",
        "type": "twelve_steps",
        "step": 3,
        "keywords": ["decision", "surrender", "will", "God", "understood", "care"],
        "themes": ["surrender", "trust", "decision"],
        "relevanceScore": 0.93
    },
    {
        "id": "step4",
        "title": "Step 4: Made a searching and fearless moral inventory of ourselves", 
        "content": "Made a searching and fearless moral inventory of ourselves. This involves honest self-examination to identify character defects, resentments, fears, and sexual conduct that have caused harm. 'Searching' means thorough and complete. 'Fearless' means facing uncomfortable truths without retreat. The moral inventory typically includes writing lists of resentments, fears, sexual conduct, and harms caused to others. This step requires courage and honesty.",
        "type": "twelve_steps",
        "step": 4,
        "keywords": ["inventory", "moral", "fearless", "searching", "resentments", "fears", "self-examination"],
        "themes": ["honesty", "courage", "self-awareness"],
        "relevanceScore": 0.92
    },
    {
        "id": "step5",
        "title": "Step 5: Admitted to God, to ourselves, and to another human being the exact nature of our wrongs",
        "content": "Admitted to God, to ourselves, and to another human being the exact nature of our wrongs. This step involves sharing the moral inventory from Step 4 with another person, usually a sponsor. Admission to God acknowledges spiritual accountability. Admission to ourselves requires self-honesty. Admission to another human being breaks the cycle of isolation and secrecy. 'Exact nature' means being specific and complete, not vague or general.",
        "type": "twelve_steps", 
        "step": 5,
        "keywords": ["admitted", "exact nature", "wrongs", "another person", "sponsor", "accountability"],
        "themes": ["honesty", "vulnerability", "accountability"],
        "relevanceScore": 0.90
    },
    {
        "id": "step6",
        "title": "Step 6: Were entirely ready to have God remove all these defects of character",
        "content": "Were entirely ready to have God remove all these defects of character. This step focuses on willingness and readiness for spiritual transformation. 'Entirely ready' suggests complete willingness without reservation. Character defects are patterns of behavior, thinking, and reacting that cause harm to ourselves and others. Examples include selfishness, dishonesty, fear, and resentment. Readiness requires recognizing that these defects are obstacles to spiritual growth.",
        "type": "twelve_steps",
        "step": 6,
        "keywords": ["entirely ready", "character defects", "remove", "willingness", "transformation"],
        "themes": ["willingness", "transformation", "spiritual growth"],
        "relevanceScore": 0.88
    },
    {
        "id": "step7",
        "title": "Step 7: Humbly asked Him to remove our shortcomings",
        "content": "Humbly asked Him to remove our shortcomings. This step involves prayer and humility in requesting spiritual help. 'Humbly' means without pride or arrogance, recognizing our need for divine assistance. Shortcomings refer to the character defects identified in previous steps. The request acknowledges that we cannot remove these defects through willpower alone. This step often involves daily prayer and ongoing spiritual practice.",
        "type": "twelve_steps",
        "step": 7, 
        "keywords": ["humbly", "asked", "shortcomings", "remove", "prayer", "humility"],
        "themes": ["humility", "prayer", "spiritual help"],
        "relevanceScore": 0.87
    },
    {
        "id": "step8",
        "title": "Step 8: Made a list of all persons we had harmed, and became willing to make amends",
        "content": "Made a list of all persons we had harmed, and became willing to make amends to them all. This step involves identifying everyone we have hurt through our addiction and character defects. The list should be comprehensive, including family, friends, employers, and institutions. 'Became willing' emphasizes the importance of attitude - we must be genuinely ready to make amends, not just going through motions. Willingness often develops gradually as we work with a sponsor.",
        "type": "twelve_steps",
        "step": 8,
        "keywords": ["list", "persons harmed", "willing", "amends", "comprehensive", "attitude"],
        "themes": ["accountability", "willingness", "preparation"],
        "relevanceScore": 0.85
    },
    {
        "id": "step9",
        "title": "Step 9: Made direct amends to such people wherever possible, except when to do so would injure them or others",
        "content": "Made direct amends to such people wherever possible, except when to do so would injure them or others. This step involves taking action to repair the harm we have caused. 'Direct amends' usually means face-to-face conversation, but can include letters or other appropriate contact. We must be prepared to make financial restitution when appropriate. The exception clause protects others from additional harm that might result from our amends. Timing and approach should be discussed with a sponsor.",
        "type": "twelve_steps",
        "step": 9,
        "keywords": ["direct amends", "wherever possible", "injure", "repair harm", "restitution"],
        "themes": ["action", "repair", "wisdom"],
        "relevanceScore": 0.83
    },
    {
        "id": "step10",
        "title": "Step 10: Continued to take personal inventory and when we were wrong promptly admitted it",
        "content": "Continued to take personal inventory and when we were wrong promptly admitted it. This is a maintenance step for ongoing spiritual growth. Personal inventory can be daily reflection on our thoughts, feelings, and actions. 'Promptly admitted it' prevents the accumulation of guilt and resentment. This step helps us catch mistakes quickly and maintain honest relationships. Regular inventory keeps us spiritually fit and prevents relapse into old patterns.",
        "type": "twelve_steps",
        "step": 10,
        "keywords": ["continued", "personal inventory", "promptly admitted", "ongoing", "daily reflection"],
        "themes": ["maintenance", "honesty", "ongoing growth"],
        "relevanceScore": 0.82
    },
    {
        "id": "step11", 
        "title": "Step 11: Sought through prayer and meditation to improve our conscious contact with God",
        "content": "Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out. This step emphasizes spiritual practice and connection. Prayer involves speaking to our higher power; meditation involves listening. 'Conscious contact' means an aware, intentional relationship with the divine. Praying for God's will rather than our own desires represents spiritual maturity and surrender.",
        "type": "twelve_steps",
        "step": 11,
        "keywords": ["prayer", "meditation", "conscious contact", "God's will", "power", "spiritual practice"],
        "themes": ["spirituality", "connection", "surrender"],
        "relevanceScore": 0.80
    },
    {
        "id": "step12",
        "title": "Step 12: Having had a spiritual awakening as the result of these Steps, we tried to carry this message to alcoholics",
        "content": "Having had a spiritual awakening as the result of these Steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs. This step is about service and spiritual transformation. A spiritual awakening means a fundamental change in our relationship with life and others. Carrying the message involves helping other alcoholics achieve sobriety. Practicing these principles in all affairs means applying spiritual principles to every aspect of life, not just recovery.",
        "type": "twelve_steps",
        "step": 12,
        "keywords": ["spiritual awakening", "carry message", "practice principles", "all affairs", "service"],
        "themes": ["service", "spiritual awakening", "transformation"],
        "relevanceScore": 0.78
    }
]

# 12 Traditions with explanations  
TWELVE_TRADITIONS = [
    {
        "id": "tradition1",
        "title": "Tradition 1: Our common welfare should come first",
        "content": "Our common welfare should come first; personal recovery depends upon A.A. unity. This tradition emphasizes that the group's well-being takes priority over individual desires. Unity means working together toward common goals despite personal differences. When the group is healthy and unified, it provides a strong foundation for individual recovery. Disruption of group unity can jeopardize everyone's sobriety. Personal recovery flourishes in an environment of mutual support and shared purpose.",
        "type": "twelve_traditions", 
        "tradition": 1,
        "keywords": ["common welfare", "personal recovery", "unity", "group health", "mutual support"],
        "themes": ["unity", "group welfare", "cooperation"],
        "relevanceScore": 0.90
    },
    {
        "id": "tradition2",
        "title": "Tradition 2: For our group purpose there is but one ultimate authority",
        "content": "For our group purpose there is but one ultimate authority — a loving God as He may express Himself in our group conscience. Our leaders are but trusted servants; they do not govern. This tradition establishes spiritual guidance rather than human authority. Group conscience emerges through prayer, discussion, and collective wisdom. Leaders serve rather than rule, and their authority comes from the group's trust, not personal power. This prevents domination by strong personalities and ensures decisions reflect spiritual principles.",
        "type": "twelve_traditions",
        "tradition": 2, 
        "keywords": ["ultimate authority", "loving God", "group conscience", "trusted servants", "spiritual guidance"],
        "themes": ["spiritual guidance", "service", "collective wisdom"],
        "relevanceScore": 0.88
    },
    {
        "id": "tradition3",
        "title": "Tradition 3: The only requirement for A.A. membership is a desire to stop drinking",
        "content": "The only requirement for A.A. membership is a desire to stop drinking. This tradition ensures inclusivity and removes barriers to membership. No other qualifications are needed - not religious belief, social status, or even success in staying sober. The desire to stop drinking is often all that newcomers can bring. This low barrier for entry reflects A.A.'s primary purpose of helping alcoholics achieve sobriety. Anyone with this desire is welcome, regardless of their background or circumstances.",
        "type": "twelve_traditions",
        "tradition": 3,
        "keywords": ["only requirement", "desire to stop drinking", "membership", "inclusivity", "low barrier"],
        "themes": ["inclusivity", "accessibility", "primary purpose"],
        "relevanceScore": 0.85
    },
    {
        "id": "tradition4", 
        "title": "Tradition 4: Each group should be autonomous except in matters affecting other groups",
        "content": "Each group should be autonomous except in matters affecting other groups or A.A. as a whole. This tradition grants groups the freedom to operate according to their own conscience while maintaining responsibility to the broader fellowship. Autonomy allows groups to meet local needs and preferences. However, actions that could harm other groups or A.A.'s reputation require wider consideration. This balance protects both local flexibility and overall unity.",
        "type": "twelve_traditions",
        "tradition": 4,
        "keywords": ["autonomous", "affecting other groups", "freedom", "local needs", "responsibility"],
        "themes": ["autonomy", "responsibility", "balance"],
        "relevanceScore": 0.82
    },
    {
        "id": "tradition5",
        "title": "Tradition 5: Each group has but one primary purpose",
        "content": "Each group has but one primary purpose — to carry its message to the alcoholic who still suffers. This tradition maintains focus on A.A.'s core mission of helping alcoholics achieve sobriety. While groups may engage in fellowship activities, the primary purpose must remain paramount. This prevents groups from being distracted by other worthy causes. Carrying the message includes both sharing experience and providing hope to newcomers. Everything else is secondary to this fundamental purpose.",
        "type": "twelve_traditions",
        "tradition": 5,
        "keywords": ["primary purpose", "carry message", "alcoholic who suffers", "core mission", "focus"],
        "themes": ["purpose", "focus", "service"],
        "relevanceScore": 0.87
    },
    {
        "id": "tradition6",
        "title": "Tradition 6: An A.A. group ought never endorse, finance, or lend the A.A. name",
        "content": "An A.A. group ought never endorse, finance, or lend the A.A. name to any related facility or outside enterprise, lest problems of money, property, and prestige divert us from our primary purpose. This tradition protects A.A.'s independence and prevents conflicts of interest. Endorsing outside enterprises could create financial entanglements and compromise A.A.'s spiritual mission. Money, property, and prestige can become obstacles to spiritual growth. By avoiding these entanglements, A.A. maintains its focus on spiritual solutions.",
        "type": "twelve_traditions", 
        "tradition": 6,
        "keywords": ["never endorse", "finance", "A.A. name", "money property prestige", "primary purpose"],
        "themes": ["independence", "spiritual focus", "avoiding entanglements"],
        "relevanceScore": 0.80
    }
]

# Recovery concepts and principles
RECOVERY_CONCEPTS = [
    {
        "id": "concept_surrender",
        "title": "The Concept of Surrender in Recovery",
        "content": "Surrender in recovery means letting go of the illusion of control and accepting help from others and a higher power. It is not defeat, but rather the beginning of victory over addiction. Surrender involves admitting that our way of managing life has failed and being open to new approaches. This paradox - that giving up control leads to gaining real control over our lives - is fundamental to recovery. Surrender is often a gradual process rather than a single event.",
        "type": "recovery_concepts",
        "keywords": ["surrender", "control", "illusion", "defeat", "victory", "paradox"],
        "themes": ["surrender", "acceptance", "spiritual principle"],
        "relevanceScore": 0.95
    },
    {
        "id": "concept_acceptance",
        "title": "Acceptance and Serenity in Recovery",
        "content": "Acceptance means acknowledging reality without trying to change what cannot be changed. The Serenity Prayer encapsulates this principle: 'God, grant me the serenity to accept the things I cannot change, courage to change the things I can, and wisdom to know the difference.' Acceptance does not mean passive resignation, but rather focusing energy on what we can influence. Fighting reality causes suffering; accepting it brings peace and clarity for appropriate action.",
        "type": "recovery_concepts",
        "keywords": ["acceptance", "serenity", "reality", "serenity prayer", "wisdom", "peace"],
        "themes": ["acceptance", "serenity", "wisdom"],
        "relevanceScore": 0.93
    },
    {
        "id": "concept_sponsorship",
        "title": "The Role of Sponsorship in Recovery",
        "content": "Sponsorship is a relationship between two people in recovery where a more experienced member (sponsor) guides a newer member (sponsee) through the steps and principles of recovery. Sponsors share their experience, strength, and hope while providing accountability and support. This relationship is based on service, not authority. Sponsors help sponsees work the steps, understand program literature, and navigate challenges in recovery. The relationship benefits both parties through mutual learning and spiritual growth.",
        "type": "recovery_concepts",
        "keywords": ["sponsorship", "experienced member", "guidance", "accountability", "service", "mutual learning"],
        "themes": ["mentorship", "service", "relationship"],
        "relevanceScore": 0.90
    },
    {
        "id": "concept_fellowship",
        "title": "Fellowship and Community in Recovery", 
        "content": "Fellowship refers to the bonds of understanding and support among people in recovery. It goes beyond friendship to include shared experience of addiction and recovery. Fellowship provides acceptance, belonging, and mutual aid. Members support each other through difficult times and celebrate successes together. This community aspect helps overcome the isolation common in addiction. Fellowship meetings, social activities, and informal connections all contribute to a supportive recovery environment.",
        "type": "recovery_concepts",
        "keywords": ["fellowship", "bonds", "shared experience", "belonging", "mutual aid", "community"],
        "themes": ["community", "support", "belonging"],
        "relevanceScore": 0.88
    }
]

# Crisis support and emergency resources
CRISIS_RESOURCES = [
    {
        "id": "crisis_immediate_help",
        "title": "Immediate Crisis Support - When You Want to Drink",
        "content": "If you are experiencing strong urges to drink or are in immediate crisis, remember these emergency steps: 1) Call your sponsor or another recovering person immediately. 2) Attend a meeting, even if you don't feel like it. 3) Use the HALT check - are you Hungry, Angry, Lonely, or Tired? Address these basic needs. 4) Play the tape through - remember where drinking led you before. 5) Remember that cravings are temporary and will pass. 6) Pray or meditate if that is part of your program. 7) Call a crisis hotline if you feel unsafe.",
        "type": "crisis_support",
        "keywords": ["urges to drink", "crisis", "sponsor", "meeting", "HALT", "cravings", "temporary"],
        "themes": ["crisis intervention", "immediate help", "coping skills"],
        "relevanceScore": 1.0
    },
    {
        "id": "crisis_suicide_prevention",
        "title": "Suicide Prevention and Mental Health Crisis",
        "content": "If you are having thoughts of suicide or self-harm, please reach out for help immediately. Call the National Suicide Prevention Lifeline at 988 (US) or emergency services at 911. Remember that suicidal thoughts are symptoms of treatable conditions, not character flaws. Recovery communities understand that mental health struggles and addiction often occur together. You are not alone, and help is available. Crisis counselors are trained to help you through difficult moments and connect you with ongoing support.",
        "type": "crisis_support", 
        "keywords": ["suicide", "self-harm", "lifeline", "988", "emergency", "mental health", "help available"],
        "themes": ["suicide prevention", "mental health", "emergency resources"],
        "relevanceScore": 1.0
    },
    {
        "id": "crisis_relapse_prevention",
        "title": "Relapse Prevention and Early Warning Signs",
        "content": "Relapse often begins with emotional and mental changes before physical drinking occurs. Warning signs include: isolation from recovery support, skipping meetings, not calling sponsor, increased stress without coping strategies, romanticizing past drinking, and neglecting self-care. If you notice these signs, take immediate action: reconnect with your support network, increase meeting attendance, be honest with your sponsor about your struggles, review your recovery program, and consider professional counseling if needed.",
        "type": "crisis_support",
        "keywords": ["relapse prevention", "warning signs", "isolation", "support network", "professional counseling"],
        "themes": ["relapse prevention", "early intervention", "support"],
        "relevanceScore": 0.95
    }
]

# Combine all literature sources
def get_complete_literature_database():
    """Return the complete literature database"""
    return {
        "twelve_steps": TWELVE_STEPS,
        "twelve_traditions": TWELVE_TRADITIONS, 
        "recovery_concepts": RECOVERY_CONCEPTS,
        "crisis_resources": CRISIS_RESOURCES
    }

def get_all_literature_items():
    """Return all literature items in a single list for search"""
    all_items = []
    all_items.extend(TWELVE_STEPS)
    all_items.extend(TWELVE_TRADITIONS)
    all_items.extend(RECOVERY_CONCEPTS) 
    all_items.extend(CRISIS_RESOURCES)
    return all_items

# For backward compatibility with existing mock data
MOCK_LITERATURE = TWELVE_STEPS[:3]  # Keep first 3 steps as before

if __name__ == "__main__":
    print("Digital Sponsor Literature Database")
    print(f"Total items: {len(get_all_literature_items())}")
    print(f"12 Steps: {len(TWELVE_STEPS)}")
    print(f"12 Traditions: {len(TWELVE_TRADITIONS)}")
    print(f"Recovery Concepts: {len(RECOVERY_CONCEPTS)}")
    print(f"Crisis Resources: {len(CRISIS_RESOURCES)}")