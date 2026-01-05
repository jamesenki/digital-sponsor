#!/usr/bin/env python3
"""
Step 4 Digital Workbook - Complete Moral Inventory System
Interactive workbook for Step 4 with guided prompts and structured inventory
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from step_work_data_model import ResentmentEntry, FearEntry, SexConductEntry, HarmEntry, StepWorkDataManager
import json

class Step4WorkbookGuide:
    """Complete Step 4 workbook with prompts, examples, and guidance"""
    
    def __init__(self):
        self.data_manager = StepWorkDataManager()
    
    def get_introduction(self) -> Dict[str, Any]:
        """Step 4 introduction and preparation"""
        return {
            "title": "Step 4: Made a searching and fearless moral inventory of ourselves",
            "big_book_reference": "\"Made a searching and fearless moral inventory of ourselves\" - Page 59",
            "introduction": """
            Working Step 4 is about getting honest with ourselves. We're going to look at our resentments, 
            fears, and sexual conduct. This isn't about beating ourselves up - it's about getting free from 
            the things that have been driving our drinking and keeping us sick.
            
            Remember: You are not your mistakes. You are not your character defects. This inventory is 
            about identifying what needs to change so you can live a sober, happy life.
            """,
            "preparation_instructions": [
                "Set aside quiet time when you won't be interrupted",
                "Have your sponsor's phone number ready if you need support", 
                "Remember this is between you and your Higher Power - be rigorously honest",
                "Work at your own pace - this isn't a race",
                "You can save and return to your work anytime"
            ],
            "prayer_before_starting": "Dear God, it is I who has made my life a mess. I have done it, but I cannot undo it. My mistakes are mine, and I will begin a searching and fearless moral inventory. I will write down my wrongs, but I will also include that which is good. I pray for the strength to complete this inventory with rigorous honesty. Amen.",
            "sections": [
                {"name": "Resentments", "description": "People, institutions, and principles we're angry at"},
                {"name": "Fears", "description": "What we're afraid of and why"},
                {"name": "Sex Conduct", "description": "Where we've been selfish, dishonest, or inconsiderate"},
                {"name": "Harms Done", "description": "People we've hurt and how"}
            ]
        }
    
    def get_resentment_instructions(self) -> Dict[str, Any]:
        """Detailed instructions for resentment inventory"""
        return {
            "title": "Resentment Inventory",
            "big_book_quote": "\"Resentment is the 'number one' offender. It destroys more alcoholics than anything else.\" - Page 64",
            "instructions": """
            List everyone and everything you resent. Don't think about whether it's justified or not - 
            just write down what makes you angry or resentful. We'll figure out our part later.
            """,
            "columns": [
                {
                    "name": "I'm resentful at",
                    "description": "Person, institution, or principle",
                    "examples": ["My boss", "My ex-wife", "The government", "God", "Myself"]
                },
                {
                    "name": "The Cause", 
                    "description": "What they did or what happened",
                    "examples": [
                        "Fired me unfairly",
                        "Left me for someone else", 
                        "Took my money in taxes",
                        "Let bad things happen",
                        "Made poor choices"
                    ]
                },
                {
                    "name": "Affects my",
                    "description": "Which part of self was hurt",
                    "options": [
                        "Self-esteem (pride, ego)",
                        "Security (safety, money, job)", 
                        "Ambitions (goals, dreams)",
                        "Personal relations (family, friends)",
                        "Sex relations (intimacy, romance)"
                    ]
                },
                {
                    "name": "My Part",
                    "description": "What did I do wrong? Where was I at fault?",
                    "guidance": "This is the hard part. Be honest about your role. Even if they were 90% wrong, what was your 10%?"
                }
            ],
            "example_entry": {
                "person": "My former business partner",
                "cause": "Stole $10,000 from our business and destroyed my credit",
                "affects_my": ["Security", "Self-esteem"],
                "my_part": "I didn't check the books regularly, ignored red flags, and let greed cloud my judgment when choosing partners"
            },
            "helpful_tips": [
                "Start with the biggest resentments first",
                "Include resentments against institutions, principles, and yourself",
                "If you can't find your part, ask your sponsor for help",
                "Sometimes our 'part' is what we did AFTER they hurt us",
                "Be specific - vague answers won't help you get free"
            ]
        }
    
    def get_fear_instructions(self) -> Dict[str, Any]:
        """Instructions for fear inventory"""
        return {
            "title": "Fear Inventory", 
            "big_book_quote": "\"Fear is an evil and corroding thread; the fabric of our lives was shot through with it.\" - Page 67",
            "instructions": """
            List your fears - what you're afraid of and why. Fear often drives our worst decisions 
            and keeps us stuck. Getting honest about our fears is the first step to becoming fearless.
            """,
            "columns": [
                {
                    "name": "My Fear",
                    "description": "What am I afraid of?",
                    "examples": [
                        "Financial insecurity",
                        "Being alone", 
                        "Death",
                        "Rejection",
                        "Failure",
                        "Success",
                        "Intimacy",
                        "Confrontation"
                    ]
                },
                {
                    "name": "Why I have this fear",
                    "description": "Where does this fear come from?",
                    "examples": [
                        "Lost my job before and couldn't pay bills",
                        "Parents abandoned me as a child",
                        "Watched my father die painfully", 
                        "Been rejected by people I loved",
                        "Failed at important things before"
                    ]
                },
                {
                    "name": "How it affects me",
                    "description": "What does this fear make me do or not do?",
                    "examples": [
                        "I hoard money and can't enjoy life",
                        "I stay in bad relationships rather than be alone",
                        "I avoid taking risks that could help me grow",
                        "I isolate and push people away first"
                    ]
                },
                {
                    "name": "New thought pattern",
                    "description": "What would I think/do if I weren't afraid?",
                    "examples": [
                        "I can trust that my Higher Power will provide for my needs",
                        "I can be alone and still be okay - I have value",
                        "Death is part of life, and I can live fully today",
                        "Some people will reject me, but the right people will accept me"
                    ]
                }
            ],
            "guided_questions": [
                "What am I most afraid of losing?",
                "What am I most afraid of happening?", 
                "What am I most afraid of people finding out about me?",
                "What am I afraid I'll never have or achieve?",
                "What fear has controlled my decisions the most?"
            ]
        }
    
    def get_sex_conduct_instructions(self) -> Dict[str, Any]:
        """Instructions for sex conduct inventory"""
        return {
            "title": "Sex Conduct Inventory",
            "big_book_quote": "\"We reviewed our own conduct over the years past. Where had we been selfish, dishonest, or inconsiderate?\" - Page 69",
            "instructions": """
            Review your sexual and romantic relationships honestly. This isn't about judging your sexuality - 
            it's about looking at where you've been selfish, dishonest, or harmful to others.
            """,
            "privacy_note": "This section is especially private. Remember you can delete your data anytime.",
            "columns": [
                {
                    "name": "Where was I selfish?",
                    "description": "How did I put my needs first without considering others?",
                    "examples": [
                        "Had affairs to feel better about myself",
                        "Used people for sex without caring about their feelings",
                        "Pressured partners into things they didn't want",
                        "Withheld intimacy to punish my partner"
                    ]
                },
                {
                    "name": "Where was I dishonest?", 
                    "description": "What lies did I tell or truths did I hide?",
                    "examples": [
                        "Lied about other relationships",
                        "Hid my sexual behavior from my spouse",
                        "Pretended to love someone I didn't",
                        "Lied about my sexual history or health"
                    ]
                },
                {
                    "name": "Where was I inconsiderate?",
                    "description": "How did I disregard others' feelings or needs?",
                    "examples": [
                        "Had sex when my partner wasn't interested",
                        "Flirted with others in front of my partner",
                        "Didn't consider the emotional impact of casual sex",
                        "Ignored my partner's need for emotional intimacy"
                    ]
                },
                {
                    "name": "Whom did I hurt?",
                    "description": "Who was affected by my sexual conduct?",
                    "examples": [
                        "My spouse/partner",
                        "My children", 
                        "Sexual partners I used",
                        "The people I cheated with",
                        "Myself"
                    ]
                }
            ],
            "reflection_questions": [
                "What patterns do I see in my sexual relationships?",
                "How has my sexual conduct affected my ability to have healthy intimacy?",
                "What fears or insecurities drive my sexual behavior?",
                "What do I want my sexual conduct to look like in sobriety?"
            ]
        }
    
    def get_character_defects_analysis(self) -> Dict[str, Any]:
        """Analysis of character defects revealed in inventory"""
        return {
            "title": "Character Defects Analysis",
            "instructions": """
            Look at your inventory and identify the character defects that keep showing up. 
            These are the things that drive our harmful behavior.
            """,
            "common_defects": [
                {
                    "name": "Selfishness",
                    "description": "Putting our needs first regardless of impact on others",
                    "shows_up_as": ["Taking more than giving", "Inconsiderate behavior", "Using others"]
                },
                {
                    "name": "Self-seeking",
                    "description": "Always looking for what we can get out of situations",
                    "shows_up_as": ["Hidden motives", "Manipulative behavior", "Exploitation"]
                },
                {
                    "name": "Dishonesty", 
                    "description": "Lying to ourselves and others",
                    "shows_up_as": ["Outright lies", "Omitting truth", "Self-deception", "Promises we don't keep"]
                },
                {
                    "name": "Fear",
                    "description": "Making decisions based on fear rather than faith",
                    "shows_up_as": ["Avoiding risks", "People pleasing", "Isolation", "Aggression as defense"]
                },
                {
                    "name": "Inconsideration",
                    "description": "Not thinking about how our actions affect others", 
                    "shows_up_as": ["Thoughtless behavior", "Breaking commitments", "Ignoring others' needs"]
                },
                {
                    "name": "Pride",
                    "description": "Thinking we're better than others or that we know best",
                    "shows_up_as": ["Arrogance", "Refusing help", "Blaming others", "False superiority"]
                }
            ],
            "analysis_questions": [
                "Which character defect shows up most in my resentments?",
                "Which defect has caused the most harm in my life?", 
                "Which defect am I most ready to let go of?",
                "Which defect am I most afraid to let go of?"
            ]
        }
    
    def get_assets_section(self) -> Dict[str, Any]:
        """Positive qualities and assets inventory"""
        return {
            "title": "Assets and Positive Qualities",
            "instructions": """
            Step 4 isn't just about what's wrong with us. List your positive qualities, talents, 
            and assets. Recovery is about building on our strengths, not just removing defects.
            """,
            "categories": [
                {
                    "name": "Character Assets",
                    "examples": ["Honest", "Loyal", "Hardworking", "Compassionate", "Creative", "Intelligent", "Funny", "Generous"]
                },
                {
                    "name": "Skills and Talents", 
                    "examples": ["Good listener", "Problem solver", "Artist", "Athlete", "Teacher", "Leader", "Organizer"]
                },
                {
                    "name": "Relationships",
                    "examples": ["Good friend", "Loving parent", "Supportive family member", "Mentor to others"]
                },
                {
                    "name": "Achievements",
                    "examples": ["Education", "Career accomplishments", "Overcame challenges", "Helped others", "Created something"]
                }
            ],
            "reflection_questions": [
                "What do people say they appreciate about me?",
                "What am I naturally good at?",
                "When do I feel most like myself?",
                "How can I use these assets to help others in recovery?"
            ]
        }

    def save_resentment(self, session_id: str, resentment_data: Dict[str, Any]) -> str:
        """Save a resentment entry"""
        return self.data_manager.save_step4_entry(session_id, "resentment", resentment_data)
    
    def save_fear(self, session_id: str, fear_data: Dict[str, Any]) -> str:
        """Save a fear entry"""
        return self.data_manager.save_step4_entry(session_id, "fear", fear_data)
    
    def get_progress_summary(self, session_id: str) -> Dict[str, Any]:
        """Get Step 4 progress summary"""
        inventory = self.data_manager.get_step4_inventory(session_id)
        if not inventory:
            return {
                "sections_completed": 0,
                "total_entries": 0,
                "completion_percentage": 0,
                "next_recommended_section": "resentments"
            }
        
        sections_completed = 0
        if inventory.resentments: sections_completed += 1
        if inventory.fears: sections_completed += 1  
        if inventory.sex_conduct: sections_completed += 1
        if inventory.harms_done: sections_completed += 1
        
        total_entries = (
            len(inventory.resentments) + 
            len(inventory.fears) + 
            len(inventory.sex_conduct) + 
            len(inventory.harms_done)
        )
        
        completion_percentage = (sections_completed / 4) * 100
        
        next_section = "complete"
        if not inventory.resentments:
            next_section = "resentments"
        elif not inventory.fears:
            next_section = "fears" 
        elif not inventory.sex_conduct:
            next_section = "sex_conduct"
        elif not inventory.harms_done:
            next_section = "harms_done"
        
        return {
            "sections_completed": sections_completed,
            "total_entries": total_entries,
            "completion_percentage": completion_percentage,
            "next_recommended_section": next_section,
            "resentments_count": len(inventory.resentments),
            "fears_count": len(inventory.fears),
            "sex_conduct_count": len(inventory.sex_conduct), 
            "harms_done_count": len(inventory.harms_done)
        }

if __name__ == "__main__":
    # Test the Step 4 workbook
    workbook = Step4WorkbookGuide()
    
    print("=== STEP 4 DIGITAL WORKBOOK TEST ===")
    
    # Get introduction
    intro = workbook.get_introduction()
    print(f"\nTitle: {intro['title']}")
    print(f"Sections: {len(intro['sections'])}")
    
    # Get resentment instructions
    resentment_guide = workbook.get_resentment_instructions()
    print(f"\nResentment columns: {len(resentment_guide['columns'])}")
    
    # Create test session and add resentment
    session = workbook.data_manager.create_session()
    resentment_data = {
        'person_institution': 'Test Person',
        'the_cause': 'Test cause',
        'affects_my': ['Self-esteem'],
        'my_part': 'Test my part',
        'character_defect': ['Fear']
    }
    
    entry_id = workbook.save_resentment(session.session_id, resentment_data)
    print(f"\nSaved resentment: {entry_id}")
    
    # Get progress
    progress = workbook.get_progress_summary(session.session_id)
    print(f"Progress: {progress['completion_percentage']}% complete")
    print(f"Next section: {progress['next_recommended_section']}")