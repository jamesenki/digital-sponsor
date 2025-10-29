/**
 * AA Step Work Document Templates
 * 
 * Traditional AA step work formats with complete anonymity
 * Based on standard AA literature and common sponsor guidance
 */

export interface StepWorkEntry {
  id: string
  stepNumber: number
  title: string
  date?: string
  content: any
  isComplete: boolean
  privacy: 'local_only' | 'shareable'
}

export interface ResentmentEntry {
  id: string
  person: string
  cause: string
  affects: {
    selfEsteem: boolean
    pride: boolean
    personalRelations: boolean
    sexRelations: boolean
    security: boolean
    ambitions: boolean
    pocketbook: boolean
    other: string
  }
  myPart: string
  characterDefect: string
  notes?: string
}

export interface FearEntry {
  id: string
  fear: string
  cause: string
  affects: {
    selfEsteem: boolean
    pride: boolean
    personalRelations: boolean
    sexRelations: boolean
    security: boolean
    ambitions: boolean
    pocketbook: boolean
    other: string
  }
  notes?: string
}

export interface AmendsEntry {
  id: string
  person: string
  harm: string
  willingness: 'willing' | 'not_ready' | 'impossible'
  method: string
  timing: string
  notes?: string
  completed: boolean
  completedDate?: string
}

export const stepWorkTemplates = {
  step1: {
    title: "Step 1 - Powerlessness and Unmanageability",
    subtitle: "We admitted we were powerless over alcohol—that our lives had become unmanageable.",
    sections: [
      {
        title: "Examples of Powerlessness Over Alcohol",
        description: "List specific examples of how alcohol controlled you:",
        prompts: [
          "Times I couldn't stop after one drink",
          "Times I drank when I didn't plan to",
          "Times I drank despite negative consequences",
          "Physical reactions I couldn't control",
          "Mental obsession with drinking"
        ]
      },
      {
        title: "Examples of Unmanageability",
        description: "List ways your life became unmanageable:",
        prompts: [
          "Relationships that suffered",
          "Work or school problems",
          "Financial difficulties",
          "Health issues",
          "Legal problems",
          "Broken promises to myself and others",
          "Things I did while drinking that I regret"
        ]
      },
      {
        title: "Reflection Questions",
        questions: [
          "What does powerlessness mean to me?",
          "How did I try to control my drinking and what happened?",
          "What areas of my life became unmanageable?",
          "Am I ready to admit complete defeat over alcohol?"
        ]
      }
    ]
  },

  step2: {
    title: "Step 2 - Coming to Believe",
    subtitle: "Came to believe that a Power greater than ourselves could restore us to sanity.",
    sections: [
      {
        title: "Understanding Insanity",
        description: "Examples of insane thinking and behavior:",
        prompts: [
          "Repeating the same drinking patterns expecting different results",
          "Believing I could control my drinking",
          "Irrational thoughts and behaviors while drinking",
          "Denial despite obvious consequences"
        ]
      },
      {
        title: "Exploring Higher Power",
        description: "My understanding of a Power greater than myself:",
        prompts: [
          "What does Higher Power mean to me?",
          "What evidence do I see of a power greater than myself?",
          "How has this power been working in my life?",
          "What keeps me from believing?",
          "How do I see this power working in other people's lives?"
        ]
      },
      {
        title: "Coming to Believe",
        questions: [
          "How has my thinking changed since coming to AA?",
          "What role does the group play as a higher power?",
          "What would restoration to sanity look like for me?",
          "Am I willing to believe, even if I'm not sure yet?"
        ]
      }
    ]
  },

  step3: {
    title: "Step 3 - Decision to Turn Will and Life Over",
    subtitle: "Made a decision to turn our will and our lives over to the care of God as we understood Him.",
    sections: [
      {
        title: "Understanding Will",
        description: "Areas where I try to control:",
        prompts: [
          "People I try to control and how",
          "Situations I try to manage",
          "Outcomes I try to force",
          "How self-will has caused problems"
        ]
      },
      {
        title: "Turning Over My Life", 
        description: "What turning my life over means:",
        prompts: [
          "Areas of my life I need to surrender",
          "What I'm afraid to let go of",
          "How I can practice letting go daily",
          "What 'Thy will be done' means to me"
        ]
      },
      {
        title: "The Decision",
        questions: [
          "Am I ready to let go of self-will?",
          "What is my concept of God's will for me?",
          "How will I practice this decision daily?",
          "What does 'care of God' mean to me?"
        ]
      }
    ]
  },

  step4: {
    title: "Step 4 - Searching and Fearless Moral Inventory",
    subtitle: "Made a searching and fearless moral inventory of ourselves.",
    description: "This inventory helps us understand our patterns, resentments, fears, and character defects.",
    sections: {
      resentments: {
        title: "Resentment Inventory",
        description: "List people, institutions, or principles with whom you feel angry or resentful:",
        columns: ["Person/Institution", "The Cause", "Affects My:", "My Part", "Character Defect"]
      },
      fears: {
        title: "Fear Inventory", 
        description: "List your fears and what they affect:",
        columns: ["Fear", "Why", "Affects My:", "Notes"]
      },
      sexConduct: {
        title: "Sex Conduct (Optional)",
        description: "Where have I been selfish, dishonest, or inconsiderate?",
        note: "This section is optional and very personal. Work with your sponsor."
      }
    }
  },

  step8: {
    title: "Step 8 - List of People We Had Harmed",
    subtitle: "Made a list of all persons we had harmed, and became willing to make amends to them all.",
    sections: [
      {
        title: "People I Have Harmed",
        description: "List people you have harmed and the nature of the harm:",
        note: "Focus on your actions, not their reactions"
      },
      {
        title: "Willingness Assessment",
        description: "For each person, assess your willingness to make amends:",
        levels: ["Willing Now", "Need More Time", "Willing But Impossible"]
      }
    ]
  },

  step9: {
    title: "Step 9 - Making Direct Amends",
    subtitle: "Made direct amends to such people wherever possible, except when to do so would injure them or others.",
    sections: [
      {
        title: "Amends Planning",
        description: "Plan how to make each amends:",
        note: "Always consult with your sponsor before making amends"
      },
      {
        title: "Living Amends",
        description: "Some amends are made through changed behavior over time"
      }
    ]
  }
}

export const stepWorkPrompts = {
  general: [
    "Be thorough and honest",
    "This is between you and your Higher Power",
    "Share with your sponsor when ready", 
    "Take your time - there's no rush",
    "Remember: Progress, not perfection"
  ],
  
  privacy: [
    "Your step work is completely private",
    "Nothing is stored on our servers",
    "You control what to share and with whom",
    "You can work offline anytime"
  ]
}

export const stepWorkGuidance = {
  step1: {
    bigBookPages: "Pages 30-43",
    keyQuote: "We admitted we were powerless over alcohol—that our lives had become unmanageable.",
    timeEstimate: "1-2 weeks",
    sponsorGuidance: "Work closely with your sponsor. Be specific with examples."
  },
  
  step4: {
    bigBookPages: "Pages 64-71", 
    keyQuote: "Made a searching and fearless moral inventory of ourselves.",
    timeEstimate: "2-4 weeks",
    sponsorGuidance: "This is thorough work. Don't rush. Your sponsor will guide you through each section."
  }
}