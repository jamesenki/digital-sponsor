#!/usr/bin/env python3
"""
Step Workbook Content - Complete content for all 12 steps
Contains prayers, meditation texts, and journaling questions for each step
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class MeditationText:
    """A meditation text passage with source attribution"""
    source: str  # "Big Book", "12&12", "Daily Reflections"
    page_reference: str
    text: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'source': self.source,
            'pageReference': self.page_reference,
            'text': self.text
        }


@dataclass
class StepPrayer:
    """A step-specific prayer"""
    title: str
    text: str
    source: str  # "Big Book p.XX", "Traditional", "12&12"
    is_official: bool = True  # True if from official AA literature

    def to_dict(self) -> Dict[str, Any]:
        return {
            'title': self.title,
            'text': self.text,
            'source': self.source,
            'isOfficial': self.is_official
        }


@dataclass
class StepQuestion:
    """A journaling question for step work"""
    question_id: str
    question_text: str
    hint: Optional[str] = None
    is_required: bool = False
    order: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'questionId': self.question_id,
            'questionText': self.question_text,
            'hint': self.hint,
            'isRequired': self.is_required,
            'order': self.order
        }


@dataclass
class StepWorkbookContent:
    """Complete workbook content for a single step"""
    step_number: int
    step_name: str
    step_text: str  # The official step wording
    prayer: StepPrayer
    meditation_texts: List[MeditationText]
    questions: List[StepQuestion]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'stepNumber': self.step_number,
            'stepName': self.step_name,
            'stepText': self.step_text,
            'prayer': self.prayer.to_dict(),
            'meditationTexts': [m.to_dict() for m in self.meditation_texts],
            'questions': [q.to_dict() for q in self.questions]
        }


# ============================================================================
# STEP 1 - Powerlessness & Unmanageability
# ============================================================================
STEP_1_CONTENT = StepWorkbookContent(
    step_number=1,
    step_name="Powerlessness & Unmanageability",
    step_text="We admitted we were powerless over alcohol—that our lives had become unmanageable.",
    prayer=StepPrayer(
        title="Step 1 Prayer",
        text="""God, I admit that I am powerless over alcohol—that my life has become unmanageable. I need Your help. Help me to understand the true meaning of powerlessness and accept it in my heart. Remove any denial that blocks me from seeing the truth about my condition.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 30",
            text="We learned that we had to fully concede to our innermost selves that we were alcoholics. This is the first step in recovery. The delusion that we are like other people, or presently may be, has to be smashed."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. xxviii (Doctor's Opinion)",
            text="The body of the alcoholic is quite as abnormal as his mind. It did not satisfy us to be told that we could not control our drinking just because we were maladjusted to life, that we were in full flight from reality, or were outright mental defectives."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 1",
            text="Who cares to admit complete defeat? Practically no one, of course. Every natural instinct cries out against the idea of personal powerlessness. It is truly awful to admit that, glass in hand, we have warped our minds into such an obsession for destructive drinking that only an act of Providence can remove it from us."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 44",
            text="If, when you honestly want to, you find you cannot quit entirely, or if when drinking, you have little control over the amount you take, you are probably alcoholic."
        )
    ],
    questions=[
        StepQuestion("s1_q1", "The Big Book says 'We learned that we had to fully concede to our innermost selves that we were alcoholics' (p.30). Have you fully conceded this? What reservations remain?", "Consider the difference between knowing intellectually and accepting emotionally.", True, 1),
        StepQuestion("s1_q2", "The Doctor's Opinion describes 'the phenomenon of craving' that develops after the first drink (p.xxviii). Describe your experience with this craving - what happens once you start drinking?", "Think about the physical compulsion that follows the first drink.", True, 2),
        StepQuestion("s1_q3", "The 12&12 asks 'Who cares to admit complete defeat?' (p.21). What makes admitting defeat so difficult for you? What keeps you from fully surrendering?", "Consider pride, ego, and self-image.", True, 3),
        StepQuestion("s1_q4", "The Big Book states 'The delusion that we are like other people, or presently may be, has to be smashed' (p.30). What delusions about your drinking have you held onto?", "Times you convinced yourself you could drink normally.", False, 4),
        StepQuestion("s1_q5", "The Big Book asks: 'If, when you honestly want to, you find you cannot quit entirely, or if when drinking, you have little control over the amount you take, you are probably alcoholic' (p.44). How does this apply to your experience?", "Be specific about your attempts to quit or control.", True, 5),
        StepQuestion("s1_q6", "The 12&12 says the alcoholic's mind is 'warped into such an obsession for destructive drinking that only an act of Providence can remove it' (p.21). Describe the mental obsession - thoughts about drinking when not drinking.", "The obsession of the mind that precedes the first drink.", False, 6),
        StepQuestion("s1_q7", "List 5 specific examples of how your life has become unmanageable - not just when drinking, but in all areas affected by alcoholism.", "Consider relationships, work, finances, health, emotions, and spiritual condition.", True, 7),
        StepQuestion("s1_q8", "The Big Book describes alcoholism as a 'hopeless condition of mind and body' (p.20). Are you willing to accept this about yourself? What would accepting this mean for your future?", "This acceptance is the foundation of recovery.", True, 8)
    ]
)

# ============================================================================
# STEP 2 - Came to Believe
# ============================================================================
STEP_2_CONTENT = StepWorkbookContent(
    step_number=2,
    step_name="Came to Believe",
    step_text="Came to believe that a Power greater than ourselves could restore us to sanity.",
    prayer=StepPrayer(
        title="Step 2 Prayer",
        text="""God, I know in my heart that only You can restore me to sanity. I humbly ask that You remove the fears and prejudices that block me from finding faith. Help me to believe. Open my mind to the possibility that You exist and that You can help me.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 46-47",
            text="As soon as we admitted the possible existence of a Creative Intelligence, a Spirit of the Universe underlying the totality of things, we began to be possessed of a new sense of power and direction, provided we took other simple steps."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 55",
            text="We found that God does not make too hard terms with those who seek Him. To us, the Realm of Spirit is broad, roomy, all inclusive; never exclusive or forbidding to those who earnestly seek. It is open, we believe, to all men."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 2",
            text="The moment they read Step Two, most AA newcomers are confronted with a dilemma, sometimes a serious one. How often have we heard them cry out, 'Look what you people have done to us! You have convinced us that we are alcoholics and that our lives are unmanageable. Having reduced us to a state of absolute helplessness, you now declare that none but a Higher Power can remove our obsession. Some of us won't believe in God, others can't, and still others who do believe that God exists have no faith whatever He will perform this miracle.'"
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 47",
            text="When we became alcoholics, crushed by a self-imposed crisis we could not postpone or evade, we had to fearlessly face the proposition that either God is everything or else He is nothing. God either is, or He isn't. What was our choice to be?"
        )
    ],
    questions=[
        StepQuestion("s2_q1", "The Big Book says 'As soon as we admitted the possible existence of a Creative Intelligence, a Spirit of the Universe underlying the totality of things, we began to be possessed of a new sense of power and direction' (p.46-47). Are you willing to admit this possibility? What holds you back?", "You don't have to believe fully - just be open to the possibility.", True, 1),
        StepQuestion("s2_q2", "The 12&12 describes how alcoholics often say 'I won't believe in God' or 'I can't believe' (Step 2). Which describes you better, and why?", "There's a difference between unwillingness and inability.", True, 2),
        StepQuestion("s2_q3", "The Big Book asks 'When we became alcoholics...we had to fearlessly face the proposition that either God is everything or else He is nothing. God either is, or He isn't. What was our choice to be?' (p.47). How do you answer this question?", "This doesn't require perfect faith, just a decision about direction.", True, 3),
        StepQuestion("s2_q4", "The Big Book states 'We found that God does not make too hard terms with those who seek Him. To us, the Realm of Spirit is broad, roomy, all inclusive' (p.55). How does this affect your willingness to seek a Higher Power?", "The program doesn't require a specific religious belief.", False, 4),
        StepQuestion("s2_q5", "Describe specific examples of 'insanity' in your drinking - times you expected different results from the same behavior, or made irrational choices around alcohol.", "The insanity isn't just drinking too much - it's the thinking.", True, 5),
        StepQuestion("s2_q6", "The 12&12 mentions that many alcoholics 'had faith, but had no faith that it would perform this miracle' of removing the obsession (Step 2). Do you believe a Higher Power can restore you to sanity? Why or why not?", "Consider what 'restoration to sanity' would look like.", True, 6),
        StepQuestion("s2_q7", "What evidence have you seen in AA meetings that this program can restore people to sanity? Describe specific examples of recovery you've witnessed.", "Look at the people in the rooms with long-term sobriety.", False, 7),
        StepQuestion("s2_q8", "The Big Book says 'Lack of power, that was our dilemma. We had to find a power by which we could live, and it had to be a Power greater than ourselves' (p.45). Are you willing to seek this Power? What would that look like for you?", "This step is about willingness, not perfect belief.", True, 8)
    ]
)

# ============================================================================
# STEP 3 - Made a Decision
# ============================================================================
STEP_3_CONTENT = StepWorkbookContent(
    step_number=3,
    step_name="Made a Decision",
    step_text="Made a decision to turn our will and our lives over to the care of God as we understood Him.",
    prayer=StepPrayer(
        title="Third Step Prayer",
        text="""God, I offer myself to Thee—to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will. Take away my difficulties, that victory over them may bear witness to those I would help of Thy Power, Thy Love, and Thy Way of life. May I do Thy will always!""",
        source="Big Book p. 63",
        is_official=True
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 62-63",
            text="Selfishness—self-centeredness! That, we think, is the root of our troubles. Driven by a hundred forms of fear, self-delusion, self-seeking, and self-pity, we step on the toes of our fellows and they retaliate. Sometimes they hurt us, seemingly without provocation, but we invariably find that at some time in the past we have made decisions based on self which later placed us in a position to be hurt."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 60",
            text="Our actor tries to arrange the lights, the ballet, the scenery and the rest of the players in his own way. If his arrangements would only stay put, if only people would do as he wished, the show would be great. Everybody, including himself, would be pleased. Life would be wonderful."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 3",
            text="PRACTICING Step Three is like the opening of a door which to all appearances is still closed and locked. All we need is a key, and the decision to swing the door open. There is only one key, and it is called willingness. Once unlocked by willingness, the door opens almost of itself, and looking through it, we shall see a pathway beside which is an inscription. It reads: 'This is the way to a faith that works.'"
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 63",
            text="Next we decided that hereafter in this drama of life, God was going to be our Director. He is the Principal; we are His agents. He is the Father, and we are His children. Most good ideas are simple, and this concept was the keystone of the new and triumphant arch through which we passed to freedom."
        )
    ],
    questions=[
        StepQuestion("s3_q1", "The Big Book describes how we are like 'an actor who wants to run the whole show' (p.60-61). How have you tried to arrange life to suit yourself - directing the actors, the lights, the scenery?", "Consider how you've tried to control people, places, and things.", True, 1),
        StepQuestion("s3_q2", "The Big Book says 'Selfishness—self-centeredness! That, we think, is the root of our troubles' (p.62). How has self-centeredness been the root of YOUR troubles? Give specific examples.", "Think about times your selfishness hurt you or others.", True, 2),
        StepQuestion("s3_q3", "The 12&12 says 'PRACTICING Step Three is like the opening of a door which to all appearances is still closed and locked. All we need is a key, and the decision to swing the door open. There is only one key, and it is called willingness' (Step 3). How willing are you to open this door?", "What hesitations do you have about surrendering?", True, 3),
        StepQuestion("s3_q4", "The Big Book says 'Driven by a hundred forms of fear, self-delusion, self-seeking, and self-pity, we step on the toes of our fellows' (p.62). Which of these drive you most: fear, self-delusion, self-seeking, or self-pity? Give examples.", "Be honest about your primary character defects.", True, 4),
        StepQuestion("s3_q5", "The Big Book declares 'Next we decided that hereafter in this drama of life, God was going to be our Director. He is the Principal; we are His agents' (p.63). What would your life look like if you let God be the Director instead of you?", "Describe specific changes in how you would approach daily life.", False, 5),
        StepQuestion("s3_q6", "The Big Book states 'Neither could we reduce our self-centeredness much by wishing or trying on our own power. We had to have God's help' (p.62). Have you tried to change on your own power? What happened?", "Self-will alone is insufficient.", True, 6),
        StepQuestion("s3_q7", "Read and reflect on the Third Step Prayer (p.63). What does 'Relieve me of the bondage of self, that I may better do Thy will' mean to you? Have you said this prayer with your sponsor?", "The bondage of self is the prison we've created.", False, 7),
        StepQuestion("s3_q8", "The Big Book says this decision is 'the keystone of the new and triumphant arch through which we passed to freedom' (p.63). Step 3 is a decision - Steps 4-9 are the action. Are you ready to take this decision and follow through with action?", "A decision without action is just a wish.", True, 8)
    ]
)

# ============================================================================
# STEP 4 - Moral Inventory (handled separately in step4_workbook.py)
# ============================================================================
STEP_4_CONTENT = StepWorkbookContent(
    step_number=4,
    step_name="Moral Inventory",
    step_text="Made a searching and fearless moral inventory of ourselves.",
    prayer=StepPrayer(
        title="Step 4 Prayer",
        text="""Dear God, it is I who has made my life a mess. I have done it, but I cannot undo it. My mistakes are mine, and I will begin a searching and fearless moral inventory. I will write down my wrongs, but I will also include that which is good. I pray for the strength to complete this inventory with rigorous honesty. Amen.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 64",
            text="Resentment is the 'number one' offender. It destroys more alcoholics than anything else. From it stem all forms of spiritual disease, for we have been not only mentally and physically ill, we have been spiritually sick."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 67",
            text="This short word somehow touches about every aspect of our lives. It was an evil and corroding thread; the fabric of our existence was shot through with it. It set in motion trains of circumstances which brought us misfortune we felt we didn't deserve."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 4",
            text="Creation gave us instincts for a purpose. Without them we wouldn't be complete human beings. If men and women didn't exert themselves to be secure in their persons, made no effort to harvest food or construct shelter, there would be no survival. If they didn't reproduce, the earth wouldn't be populated. If there were no social instinct, if men cared nothing for the society of one another, there would be no society."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 69",
            text="We reviewed our own conduct over the years past. Where had we been selfish, dishonest, or inconsiderate? Whom had we hurt? Did we unjustifiably arouse jealousy, suspicion or bitterness? Where were we at fault, what should we have done instead?"
        )
    ],
    questions=[]  # Step 4 uses worksheets instead of questions
)

# ============================================================================
# STEP 5 - Admitted Our Wrongs
# ============================================================================
STEP_5_CONTENT = StepWorkbookContent(
    step_number=5,
    step_name="Admitted Our Wrongs",
    step_text="Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.",
    prayer=StepPrayer(
        title="Step 5 Prayer",
        text="""Higher Power, give me the courage to be rigorously honest as I share my inventory with another person. Help me to release the shame and guilt I have carried. May this confession bring me freedom and closer to You. Remove my fear of exposure and judgment.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 72-73",
            text="Having made our personal inventory, what shall we do about it? We have been trying to get a new attitude, a new relationship with our Creator, and to discover the obstacles in our path. We have admitted certain defects; we have ascertained in a rough way what the trouble is; we have put our finger on the weak items in our personal inventory."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 73",
            text="We pocket our pride and go to it, illuminating every twist of character, every dark cranny of the past. Once we have taken this step, withholding nothing, we are delighted. We can look the world in the eye. We can be alone at perfect peace and ease. Our fears fall from us. We begin to feel the nearness of our Creator."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 5",
            text="All of A.A.'s Twelve Steps ask us to go contrary to our natural desires... they all deflate our egos. When it comes to ego deflation, few Steps are harder to take than Five. But scarcely any Step is more necessary to longtime sobriety and peace of mind than this one."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 75",
            text="Once we have taken this step, withholding nothing, we are delighted. We can look the world in the eye. We can be alone at perfect peace and ease. Our fears fall from us. We begin to feel the nearness of our Creator. We may have had certain spiritual beliefs, but now we begin to have a spiritual experience."
        )
    ],
    questions=[
        StepQuestion("s5_q1", "The Big Book says 'We pocket our pride and go to it, illuminating every twist of character, every dark cranny of the past' (p.73). Who have you chosen to hear your Fifth Step, and are you willing to illuminate EVERY dark cranny?", "Choose someone who understands alcoholism and won't be shocked.", True, 1),
        StepQuestion("s5_q2", "The 12&12 says 'When it comes to ego deflation, few Steps are harder to take than Five. But scarcely any Step is more necessary to longtime sobriety and peace of mind' (Step 5). What fears do you have about this ego deflation?", "These fears are normal but must be faced.", True, 2),
        StepQuestion("s5_q3", "The Big Book warns 'If we skip this vital step, we may not overcome drinking' (p.72). What items in your inventory are you tempted to skip or minimize? Why are these the most important to share?", "We are only as sick as our secrets.", True, 3),
        StepQuestion("s5_q4", "The 12&12 discusses how 'All of A.A.'s Twelve Steps ask us to go contrary to our natural desires' (Step 5). How is sharing your deepest secrets contrary to your natural instincts?", "Pride and fear resist confession.", False, 4),
        StepQuestion("s5_q5", "The Big Book promises 'Once we have taken this step, withholding nothing, we are delighted. We can look the world in the eye...Our fears fall from us. We begin to feel the nearness of our Creator' (p.75). What do you hope to experience after Step 5?", "Focus on the promises, not the fears.", True, 5),
        StepQuestion("s5_q6", "The Big Book emphasizes sharing 'the exact nature of our wrongs' (Step 5). What is the difference between listing WHAT you did versus revealing the EXACT NATURE of your wrongs - the underlying patterns and motivations?", "The exact nature is about character defects, not just actions.", True, 6),
        StepQuestion("s5_q7", "The 12&12 says 'More than most people, the alcoholic leads a double life. He is very much the actor' (Step 5). How has keeping secrets and living a double life affected your sobriety and relationships?", "Secrets keep us sick.", False, 7),
        StepQuestion("s5_q8", "After completing Step 5: The Big Book says 'We begin to have a spiritual experience' (p.75). Describe your experience after sharing your Fifth Step. What shifted?", "Answer this question after completing your Fifth Step.", False, 8)
    ]
)

# ============================================================================
# STEP 6 - Were Entirely Ready
# ============================================================================
STEP_6_CONTENT = StepWorkbookContent(
    step_number=6,
    step_name="Were Entirely Ready",
    step_text="Were entirely ready to have God remove all these defects of character.",
    prayer=StepPrayer(
        title="Step 6 Prayer",
        text="""God, I am ready for Your help in removing from me the defects of character which I now realize are obstacles to my recovery. Grant me the willingness I need to be free of them. Help me to become entirely ready, even for the defects I am reluctant to release.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 76",
            text="If we can answer to our satisfaction, we then look at Step Six. We have emphasized willingness as being indispensable. Are we now ready to let God remove from us all the things which we have admitted are objectionable? Can He now take them all—every one?"
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 6",
            text="'This is the Step that separates the men from the boys.' So declares a well-loved clergyman who happens to be one of A.A.'s greatest friends... 'Any person capable of enough willingness and honesty to try repeatedly Step Six on all his faults—without any reservations whatever—has indeed come a long way spiritually, and is therefore entitled to be called a man who is sincerely trying to grow in the image and likeness of his own Creator.'"
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 6",
            text="The big question is: Are we ready to let God remove from us all the things which we have admitted are objectionable? Suppose we were afflicted by a particular defect... say, just lust. Suppose we asked for its removal and nothing seemed to happen... it's hard to keep from thinking: 'No, I guess God hasn't removed this defect... I've still got it!' Well, that may be true. But was I entirely ready to have it removed? I rather doubt it."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 76",
            text="If we still cling to something we will not let go, we ask God to help us be willing."
        )
    ],
    questions=[
        StepQuestion("s6_q1", "The Big Book asks 'Are we now ready to let God remove from us all the things which we have admitted are objectionable? Can He now take them all—every one?' (p.76). List the character defects revealed in Steps 4 and 5. Which are you NOT ready to give up?", "Be honest about defects you're attached to.", True, 1),
        StepQuestion("s6_q2", "The 12&12 says 'This is the Step that separates the men from the boys' (Step 6). A clergyman friend of AA said 'Any person capable of enough willingness and honesty to try repeatedly Step Six on all his faults—without any reservations whatever—has indeed come a long way spiritually.' What reservations do you still have?", "Complete willingness is the goal.", True, 2),
        StepQuestion("s6_q3", "The Big Book says 'If we still cling to something we will not let go, we ask God to help us be willing' (p.76). What are you clinging to? What does each defect 'give' you that makes it hard to release?", "Every defect serves a perceived purpose.", True, 3),
        StepQuestion("s6_q4", "The 12&12 discusses how our instincts - for security, sex, companionship, prestige - become defects when 'exceeded their proper function' (Step 4). Which of your instincts have exceeded their proper bounds? Are you ready to have them right-sized?", "Instincts aren't bad - just out of proportion.", False, 4),
        StepQuestion("s6_q5", "The 12&12 asks about a specific defect: 'Suppose we were afflicted by...just lust. Suppose we asked for its removal and nothing seemed to happen' then asks 'But was I entirely ready to have it removed? I rather doubt it' (Step 6). For each major defect, honestly assess: Am I ENTIRELY ready?", "Partial willingness is not enough.", True, 5),
        StepQuestion("s6_q6", "The 12&12 says perfectionism in Step 6 is a 'stumbling block' - 'This being so, the question each of us must ask is: How many of us have had a really thorough desire to become perfect? Is there any one who has completely practiced humility?' What progress, not perfection, can you make?", "Aim for progress, not perfection.", False, 6),
        StepQuestion("s6_q7", "The Big Book implies that removing defects makes us useful to God and others. How have your defects interfered with your usefulness to others? What could you contribute if they were removed?", "Defects block us from being of service.", True, 7),
        StepQuestion("s6_q8", "The 12&12 says 'The chief activator of our defects has been self-centered fear' (Step 6). What fears underlie your character defects? Fear of losing what you have or not getting what you want?", "Fear drives most defects.", True, 8)
    ]
)

# ============================================================================
# STEP 7 - Humbly Asked
# ============================================================================
STEP_7_CONTENT = StepWorkbookContent(
    step_number=7,
    step_name="Humbly Asked",
    step_text="Humbly asked Him to remove our shortcomings.",
    prayer=StepPrayer(
        title="Seventh Step Prayer",
        text="""My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows. Grant me strength, as I go out from here, to do your bidding. Amen.""",
        source="Big Book p. 76",
        is_official=True
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 76",
            text="When ready, we say something like this: 'My Creator, I am now willing that you should have all of me, good and bad...' We have then completed Step Seven."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 7",
            text="Since this Step so specifically concerns itself with humility, we should pause here to consider what humility is and what the practice of it can mean to us... Indeed, the attainment of greater humility is the foundation principle of each of A.A.'s Twelve Steps. For without some degree of humility, no alcoholic can stay sober at all."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 7",
            text="A great turning point in our lives came when we sought for humility itself as something we really wanted, rather than as something we must have. It marked the time when we could commence to see the full implication of Step Seven: 'Humbly asked Him to remove our shortcomings.'"
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 7",
            text="Humility, as a word and as an ideal, has a very bad time of it in our world. Not only is the idea misunderstood; the word itself is often intensely disliked. Many people haven't even a nodding acquaintance with humility as a way of life."
        )
    ],
    questions=[
        StepQuestion("s7_q1", "The 12&12 says 'Since this Step so specifically concerns itself with humility, we should pause here to consider what humility is...Indeed, the attainment of greater humility is the foundation principle of each of A.A.'s Twelve Steps' (Step 7). What is YOUR understanding of humility? How is it different from humiliation?", "Humility is not thinking less of yourself, but thinking of yourself less.", True, 1),
        StepQuestion("s7_q2", "The 12&12 says 'A great turning point in our lives came when we sought for humility itself as something we really wanted, rather than as something we must have' (Step 7). Do you WANT humility, or just feel you MUST have it? What's the difference?", "Wanting versus needing creates different motivations.", True, 2),
        StepQuestion("s7_q3", "The 12&12 describes how 'Humility, as a word and as an ideal, has a very bad time of it in our world...Many people haven't even a nodding acquaintance with humility as a way of life' (Step 7). What negative associations have you had with humility? How is the AA understanding different?", "Our culture often confuses humility with weakness.", False, 3),
        StepQuestion("s7_q4", "Read the Seventh Step Prayer (p.76): 'My Creator, I am now willing that you should have all of me, good and bad...' What does 'all of me, good and bad' mean? Are there parts you're holding back?", "God wants all of us, not just the parts we're ashamed of.", True, 4),
        StepQuestion("s7_q5", "The prayer asks God to 'remove from me every single defect of character which stands in the way of my usefulness to you and my fellows.' How do your defects block your usefulness to God and others? Be specific.", "Service is a key part of recovery.", True, 5),
        StepQuestion("s7_q6", "The 12&12 says 'For without some degree of humility, no alcoholic can stay sober at all' (Step 7). How has pride and lack of humility contributed to your drinking or relapses? How could humility protect your sobriety?", "Pride is the opposite of humility and blocks recovery.", True, 6),
        StepQuestion("s7_q7", "The prayer ends 'Grant me strength, as I go out from here, to do your bidding.' Step 7 asks for removal of defects AND strength to take action. What actions are you willing to take to cooperate with God in changing your character?", "God removes defects but we must take action.", True, 7),
        StepQuestion("s7_q8", "Have you said the Seventh Step Prayer on your knees with your sponsor? Describe that experience, or plan when you will do it. The Big Book says 'When ready, we say something like this...' - are you ready?", "This is typically done formally with your sponsor.", False, 8)
    ]
)

# ============================================================================
# STEP 8 - Made a List
# ============================================================================
STEP_8_CONTENT = StepWorkbookContent(
    step_number=8,
    step_name="Made a List",
    step_text="Made a list of all persons we had harmed, and became willing to make amends to them all.",
    prayer=StepPrayer(
        title="Step 8 Prayer",
        text="""Higher Power, help me to see clearly all the people I have harmed. Give me the willingness to make amends to them all. Remove any fear, pride, or resentment that blocks me from this honest accounting. Help me to focus on my wrongs, not theirs.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 76",
            text="Now we need more action, without which we find that 'Faith without works is dead.' Let's look at Steps Eight and Nine. We have a list of all persons we have harmed and to whom we are willing to make amends."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 77",
            text="We have a list of all persons we have harmed and to whom we are willing to make amends. We made it when we took inventory. We subjected ourselves to a drastic self-appraisal."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 8",
            text="Steps Eight and Nine are concerned with personal relations. First, we take a look backward and try to discover where we have been at fault; next we make a vigorous attempt to repair the damage we have done; and third, having thus cleaned away the debris of the past, we consider how, with our newfound knowledge of ourselves, we may develop the best possible relations with every human being we know."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 8",
            text="To define the word 'harm' in a practical way, we might call it the result of instincts in collision, which cause physical, mental, emotional, or spiritual damage to people."
        )
    ],
    questions=[
        StepQuestion("s8_q1", "List all people you have harmed (use your Step 4 inventory as a starting point).", "Include everyone—family, friends, employers, strangers.", True, 1),
        StepQuestion("s8_q2", "What does 'willingness to make amends' mean to you?", None, True, 2),
        StepQuestion("s8_q3", "Are there people on your list you're not yet willing to make amends to? Why?", "These often need more work.", True, 3),
        StepQuestion("s8_q4", "How have you harmed yourself? Should you be on your own list?", None, False, 4),
        StepQuestion("s8_q5", "What fears do you have about making amends?", None, True, 5),
        StepQuestion("s8_q6", "Are there people you're leaving off the list because of resentment toward them?", "They hurt you, but did you also hurt them?", False, 6),
        StepQuestion("s8_q7", "What does 'harm' mean to you? Include emotional, financial, physical harm.", None, False, 7),
        StepQuestion("s8_q8", "How do you feel looking at this list? What emotions come up?", None, False, 8)
    ]
)

# ============================================================================
# STEP 9 - Made Direct Amends
# ============================================================================
STEP_9_CONTENT = StepWorkbookContent(
    step_number=9,
    step_name="Made Direct Amends",
    step_text="Made direct amends to such people wherever possible, except when to do so would injure them or others.",
    prayer=StepPrayer(
        title="Step 9 Prayer",
        text="""God, give me the strength and courage to make my amends. Help me to approach each person with humility and sincerity. Guide my words so that I may bring healing, not further harm. If I cannot make direct amends, show me how to make living amends through changed behavior. Remove my fear and self-centeredness.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 77-78",
            text="Now we go out to our fellows and repair the damage done in the past. We attempt to sweep away the debris which has accumulated out of our effort to live on self-will and run the show ourselves. If we haven't the will to do this, we ask until it comes."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 83",
            text="The spiritual life is not a theory. We have to live it. Unless one's family expresses a desire to live upon spiritual principles we think we ought not to urge them. We should not talk incessantly to them about spiritual matters. They will change in time. Our behavior will convince them more than our words."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 9",
            text="Good judgment, a careful sense of timing, courage, and prudence—these are the qualities we shall need when we take Step Nine... Above all, we should try to be absolutely sure that we are not delaying because we are afraid."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 83-84",
            text="If we are painstaking about this phase of our development, we will be amazed before we are half way through. We are going to know a new freedom and a new happiness. We will not regret the past nor wish to shut the door on it. We will comprehend the word serenity and we will know peace."
        )
    ],
    questions=[
        StepQuestion("s9_q1", "Which amends have you completed? How did they go?", None, True, 1),
        StepQuestion("s9_q2", "Which amends are you avoiding? What's holding you back?", "Fear? Pride? Uncertainty how to approach?", True, 2),
        StepQuestion("s9_q3", "For each person on your list, what specific amends are appropriate?", "Direct amends, living amends, or letter?", True, 3),
        StepQuestion("s9_q4", "Are there amends that would injure others if made? How will you handle those?", "Consult your sponsor.", True, 4),
        StepQuestion("s9_q5", "What does 'making living amends' look like for people you can't approach directly?", None, False, 5),
        StepQuestion("s9_q6", "How have your completed amends affected your relationships?", None, False, 6),
        StepQuestion("s9_q7", "What unexpected gifts have come from making amends?", "The 'Promises' often come true.", False, 7),
        StepQuestion("s9_q8", "Are there financial amends you need to make? What's your plan?", None, False, 8)
    ]
)

# ============================================================================
# STEP 10 - Continued Personal Inventory
# ============================================================================
STEP_10_CONTENT = StepWorkbookContent(
    step_number=10,
    step_name="Continued Personal Inventory",
    step_text="Continued to take personal inventory and when we were wrong promptly admitted it.",
    prayer=StepPrayer(
        title="Step 10 Prayer",
        text="""God, help me to honestly examine my day. Show me where I have been resentful, selfish, dishonest, or afraid. Help me to promptly admit my wrongs and make amends quickly. Keep me on the path of growth and service. Remove my tendency to justify my wrongs.""",
        source="Traditional",
        is_official=False
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 84",
            text="Continue to watch for selfishness, dishonesty, resentment, and fear. When these crop up, we ask God at once to remove them. We discuss them with someone immediately and make amends quickly if we have harmed anyone. Then we resolutely turn our thoughts to someone we can help. Love and tolerance of others is our code."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 84-85",
            text="And we have ceased fighting anything or anyone—even alcohol. For by this time sanity will have returned. We will seldom be interested in liquor. If tempted, we recoil from it as from a hot flame. We react sanely and normally, and we will find that this has happened automatically."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 10",
            text="As we work the first nine Steps, we prepare ourselves for the adventure of a new life. But when we approach Step Ten we commence to put our A.A. way of living to practical use, day by day, in fair weather or foul. Then comes the acid test: can we stay sober, keep in emotional balance, and live to good purpose under all conditions?"
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 10",
            text="A continuous look at our assets and liabilities, and a real desire to learn and grow by this means, are necessities for us. We alcoholics have learned this the hard way. More experienced people, of course, in all times and places have practiced unsparing self-survey and criticism."
        )
    ],
    questions=[
        StepQuestion("s10_q1", "What is your daily practice for taking inventory?", "Morning, evening, or spot-check?", True, 1),
        StepQuestion("s10_q2", "When during the day do you do your spot-check inventory?", None, False, 2),
        StepQuestion("s10_q3", "Today, where were you resentful, selfish, dishonest, or afraid?", "Be specific.", True, 3),
        StepQuestion("s10_q4", "Did you owe anyone an apology today? Did you make it?", None, True, 4),
        StepQuestion("s10_q5", "What patterns keep showing up in your daily inventory?", "These reveal areas for growth.", False, 5),
        StepQuestion("s10_q6", "How quickly can you admit when you are wrong?", "The goal is 'promptly.'", True, 6),
        StepQuestion("s10_q7", "What growth have you noticed since you began daily inventory?", None, False, 7),
        StepQuestion("s10_q8", "Are you being kind to yourself while also being honest?", "Balance self-compassion with rigorous honesty.", False, 8)
    ]
)

# ============================================================================
# STEP 11 - Prayer and Meditation (special handling in step11_meditation.py)
# ============================================================================
STEP_11_CONTENT = StepWorkbookContent(
    step_number=11,
    step_name="Prayer and Meditation",
    step_text="Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.",
    prayer=StepPrayer(
        title="Eleventh Step Morning Prayer",
        text="""God, direct my thinking today. Let it be divorced from self-pity, dishonest, or self-seeking motives. Show me what to do for each person I encounter today. Grant me inspiration, an intuitive thought, or a decision. Help me relax and take it easy. I pray I may find Your will for me today.""",
        source="Big Book p. 86-87",
        is_official=True
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 86",
            text="On awakening let us think about the twenty-four hours ahead. We consider our plans for the day. Before we begin, we ask God to direct our thinking, especially asking that it be divorced from self-pity, dishonest or self-seeking motives."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 87",
            text="As we go through the day we pause, when agitated or doubtful, and ask for the right thought or action. We constantly remind ourselves we are no longer running the show, humbly saying to ourselves many times each day 'Thy will be done.'"
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 11",
            text="Prayer and meditation are our principal means of conscious contact with God... We have seen that the actual experience of meditation and prayer across the centuries has been so varied that no universal formula could ever be laid down."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 88",
            text="We alcoholics are undisciplined. So we let God discipline us in the simple way we have just outlined. But this is not all. There is action and more action. 'Faith without works is dead.'"
        )
    ],
    questions=[]  # Step 11 uses guided meditation instead of questions
)

# ============================================================================
# STEP 12 - Spiritual Awakening (special handling in step12_service_tracker.py)
# ============================================================================
STEP_12_CONTENT = StepWorkbookContent(
    step_number=12,
    step_name="Spiritual Awakening",
    step_text="Having had a spiritual awakening as the result of these steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs.",
    prayer=StepPrayer(
        title="AA Responsibility Declaration",
        text="""I am responsible. When anyone, anywhere, reaches out for help, I want the hand of A.A. always to be there. And for that: I am responsible.""",
        source="1965 AA International Convention",
        is_official=True
    ),
    meditation_texts=[
        MeditationText(
            source="Big Book",
            page_reference="p. 89",
            text="Practical experience shows that nothing will so much insure immunity from drinking as intensive work with other alcoholics. It works when other activities fail. This is our twelfth suggestion: Carry this message to other alcoholics! You can help when no one else can."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 14-15",
            text="We have found much of heaven and we have been rocketed into a fourth dimension of existence of which we had not even dreamed. The great fact is just this, and nothing less: That we have had deep and effective spiritual experiences which have revolutionized our whole attitude toward life, toward our fellows, and toward God's universe."
        ),
        MeditationText(
            source="12&12",
            page_reference="Step 12",
            text="The joy of living is the theme of A.A.'s Twelfth Step, and action is its key word. Here we turn outward toward our fellow alcoholics who are still in distress. Here we experience the kind of giving that asks no rewards. Here we begin to practice all Twelve Steps of the program in our daily lives so that we and those about us may find emotional sobriety."
        ),
        MeditationText(
            source="Big Book",
            page_reference="p. 89",
            text="Your job now is to be at the place where you may be of maximum helpfulness to others, so never hesitate to go anywhere if you can be helpful. You should not hesitate to visit the most sordid spot on earth on such an errand."
        )
    ],
    questions=[]  # Step 12 uses service tracker instead of questions
)


# ============================================================================
# COMPLETE WORKBOOK DICTIONARY
# ============================================================================
STEP_WORKBOOKS = {
    1: STEP_1_CONTENT,
    2: STEP_2_CONTENT,
    3: STEP_3_CONTENT,
    4: STEP_4_CONTENT,
    5: STEP_5_CONTENT,
    6: STEP_6_CONTENT,
    7: STEP_7_CONTENT,
    8: STEP_8_CONTENT,
    9: STEP_9_CONTENT,
    10: STEP_10_CONTENT,
    11: STEP_11_CONTENT,
    12: STEP_12_CONTENT,
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def get_step_workbook(step_number: int) -> Optional[StepWorkbookContent]:
    """Get the complete workbook content for a specific step"""
    return STEP_WORKBOOKS.get(step_number)


def get_step_prayer(step_number: int) -> Optional[StepPrayer]:
    """Get just the prayer for a specific step"""
    workbook = STEP_WORKBOOKS.get(step_number)
    return workbook.prayer if workbook else None


def get_step_meditations(step_number: int) -> List[MeditationText]:
    """Get meditation texts for a specific step"""
    workbook = STEP_WORKBOOKS.get(step_number)
    return workbook.meditation_texts if workbook else []


def get_step_questions(step_number: int) -> List[StepQuestion]:
    """Get journaling questions for a specific step"""
    workbook = STEP_WORKBOOKS.get(step_number)
    return workbook.questions if workbook else []


def get_all_prayers() -> Dict[int, StepPrayer]:
    """Get all step prayers"""
    return {num: wb.prayer for num, wb in STEP_WORKBOOKS.items()}


def get_step_workbook_dict(step_number: int) -> Optional[Dict[str, Any]]:
    """Get workbook content as a dictionary for API response"""
    workbook = STEP_WORKBOOKS.get(step_number)
    return workbook.to_dict() if workbook else None


# ============================================================================
# TEST
# ============================================================================
if __name__ == "__main__":
    print("Step Workbook Content Test")
    print("=" * 50)

    for step_num in range(1, 13):
        workbook = get_step_workbook(step_num)
        if workbook:
            print(f"\nStep {step_num}: {workbook.step_name}")
            print(f"  Prayer: {workbook.prayer.title}")
            print(f"  Meditations: {len(workbook.meditation_texts)}")
            print(f"  Questions: {len(workbook.questions)}")
        else:
            print(f"\nStep {step_num}: Not found")
