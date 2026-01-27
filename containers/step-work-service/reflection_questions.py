#!/usr/bin/env python3
"""
Digital Sponsor Reflection Questions
Questions for repeat step work that help users see their spiritual growth
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class ReflectionQuestion:
    """A reflection question for repeat step work"""
    step_number: int
    question_id: str
    question_text: str
    references_previous: bool  # If True, include user's previous response
    prompt_template: str  # Template with {previous_response} placeholder
    category: str  # "growth", "change", "deepening", "new_awareness"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'stepNumber': self.step_number,
            'questionId': self.question_id,
            'questionText': self.question_text,
            'referencesPrevious': self.references_previous,
            'promptTemplate': self.prompt_template,
            'category': self.category
        }

    def format_with_previous(self, previous_response: str = '') -> str:
        """Format the question with the user's previous response"""
        if self.references_previous and previous_response:
            return self.prompt_template.format(previous_response=previous_response)
        return self.question_text


# ================================
# STEP 1 - Powerlessness
# ================================
STEP_1_REFLECTIONS = [
    ReflectionQuestion(
        step_number=1,
        question_id="s1_powerless_change",
        question_text="How has your understanding of powerlessness changed since you last worked this step?",
        references_previous=True,
        prompt_template="When you last worked Step 1, you described your powerlessness as: \"{previous_response}\"\n\nHow do you see your powerlessness today? Has anything changed?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=1,
        question_id="s1_unmanageable_new",
        question_text="What new areas of unmanageability have you become aware of?",
        references_previous=False,
        prompt_template="What new areas of unmanageability have you become aware of since you last worked Step 1?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=1,
        question_id="s1_acceptance_deeper",
        question_text="How has your acceptance of being an alcoholic deepened?",
        references_previous=True,
        prompt_template="Previously, you wrote about accepting your alcoholism: \"{previous_response}\"\n\nHow has your acceptance deepened since then?",
        category="deepening"
    ),
    ReflectionQuestion(
        step_number=1,
        question_id="s1_denial_areas",
        question_text="Are there any areas where denial still shows up for you?",
        references_previous=False,
        prompt_template="Are there any areas where denial still shows up for you today?",
        category="new_awareness"
    ),
]

# ================================
# STEP 2 - Came to Believe
# ================================
STEP_2_REFLECTIONS = [
    ReflectionQuestion(
        step_number=2,
        question_id="s2_hp_concept",
        question_text="How has your concept of a Higher Power evolved?",
        references_previous=True,
        prompt_template="Last time you described your Higher Power as: \"{previous_response}\"\n\nHow has your concept of a Higher Power evolved since then?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=2,
        question_id="s2_sanity_evidence",
        question_text="What new evidence of restoration to sanity have you experienced?",
        references_previous=False,
        prompt_template="What new evidence of restoration to sanity have you experienced since you last worked Step 2?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=2,
        question_id="s2_belief_stronger",
        question_text="In what ways has your belief grown stronger or changed?",
        references_previous=True,
        prompt_template="You previously wrote about your belief: \"{previous_response}\"\n\nIn what ways has your belief grown stronger or changed?",
        category="deepening"
    ),
    ReflectionQuestion(
        step_number=2,
        question_id="s2_doubt_areas",
        question_text="Are there areas where doubt still enters your thinking?",
        references_previous=False,
        prompt_template="Are there areas where doubt still enters your thinking about a Power greater than yourself?",
        category="new_awareness"
    ),
]

# ================================
# STEP 3 - Decision
# ================================
STEP_3_REFLECTIONS = [
    ReflectionQuestion(
        step_number=3,
        question_id="s3_will_areas",
        question_text="Where have you succeeded or struggled in turning your will over?",
        references_previous=True,
        prompt_template="Previously you committed to turning your will over in these areas: \"{previous_response}\"\n\nWhere have you succeeded? Where have you struggled?",
        category="change"
    ),
    ReflectionQuestion(
        step_number=3,
        question_id="s3_new_areas",
        question_text="What new areas of life are you willing to turn over now?",
        references_previous=False,
        prompt_template="What new areas of your life are you now willing to turn over to the care of God as you understand Him?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=3,
        question_id="s3_self_will",
        question_text="How do you recognize when self-will is running the show?",
        references_previous=False,
        prompt_template="How do you now recognize when self-will is running the show? What are your warning signs?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=3,
        question_id="s3_decision_daily",
        question_text="How has making this decision become part of your daily life?",
        references_previous=False,
        prompt_template="How has making this decision become part of your daily life since you last worked Step 3?",
        category="deepening"
    ),
]

# ================================
# STEP 5 - Admission
# ================================
STEP_5_REFLECTIONS = [
    ReflectionQuestion(
        step_number=5,
        question_id="s5_inventory_insights",
        question_text="What new insights do you have about your previous resentments and fears?",
        references_previous=False,
        prompt_template="Looking back at your previous inventory, what new insights do you have about those resentments, fears, and character defects?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=5,
        question_id="s5_defects_change",
        question_text="Which character defects have lessened? Which are still present?",
        references_previous=True,
        prompt_template="In your previous Step 5, you identified these character defects: \"{previous_response}\"\n\nWhich have lessened? Which are still present?",
        category="change"
    ),
    ReflectionQuestion(
        step_number=5,
        question_id="s5_patterns_new",
        question_text="What new patterns have you discovered about yourself?",
        references_previous=False,
        prompt_template="What new patterns have you discovered about yourself that weren't clear in your last inventory?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=5,
        question_id="s5_honesty_deeper",
        question_text="How has your capacity for honesty grown?",
        references_previous=False,
        prompt_template="How has your capacity for honesty - with yourself, with God, and with another person - grown since your last Step 5?",
        category="deepening"
    ),
]

# ================================
# STEP 6 - Entirely Ready
# ================================
STEP_6_REFLECTIONS = [
    ReflectionQuestion(
        step_number=6,
        question_id="s6_willingness_change",
        question_text="Has your willingness to release defects changed?",
        references_previous=True,
        prompt_template="Last time you identified these defects you weren't fully ready to release: \"{previous_response}\"\n\nHas your willingness changed regarding these?",
        category="change"
    ),
    ReflectionQuestion(
        step_number=6,
        question_id="s6_clinging_new",
        question_text="What defects are you clinging to that you weren't aware of before?",
        references_previous=False,
        prompt_template="What defects are you clinging to now that you weren't aware of the last time you worked this step?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=6,
        question_id="s6_removed_defects",
        question_text="Which defects has God removed since your last Step 6?",
        references_previous=False,
        prompt_template="Which defects has God removed or lessened since your last Step 6 work?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=6,
        question_id="s6_readiness_meaning",
        question_text="What does 'entirely ready' mean to you now?",
        references_previous=True,
        prompt_template="Previously you described being 'entirely ready' as: \"{previous_response}\"\n\nWhat does this phrase mean to you now?",
        category="deepening"
    ),
]

# ================================
# STEP 7 - Humbly Asked
# ================================
STEP_7_REFLECTIONS = [
    ReflectionQuestion(
        step_number=7,
        question_id="s7_removed_shortcomings",
        question_text="Which shortcomings have you seen God remove?",
        references_previous=True,
        prompt_template="In your last Step 7, you asked God to remove these shortcomings: \"{previous_response}\"\n\nWhich ones have you seen God remove or lessen?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=7,
        question_id="s7_new_shortcomings",
        question_text="What new shortcomings have you become aware of?",
        references_previous=False,
        prompt_template="What new shortcomings have you become aware of since your last Step 7?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=7,
        question_id="s7_humility_understanding",
        question_text="How has your understanding of humility changed?",
        references_previous=True,
        prompt_template="Previously you wrote about humility: \"{previous_response}\"\n\nHow has your understanding of humility changed?",
        category="deepening"
    ),
    ReflectionQuestion(
        step_number=7,
        question_id="s7_asking_practice",
        question_text="How has 'humbly asking' become part of your daily practice?",
        references_previous=False,
        prompt_template="How has humbly asking God to remove shortcomings become part of your daily practice?",
        category="change"
    ),
]

# ================================
# STEP 8 - List of Persons
# ================================
STEP_8_REFLECTIONS = [
    ReflectionQuestion(
        step_number=8,
        question_id="s8_new_names",
        question_text="Are there new people to add to your list?",
        references_previous=False,
        prompt_template="Since your last Step 8, are there new people to add to your list of those you have harmed?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=8,
        question_id="s8_amends_changed",
        question_text="Have any of your previous amends situations changed?",
        references_previous=True,
        prompt_template="Your previous Step 8 list included: \"{previous_response}\"\n\nHave any of these situations changed? Any you now see differently?",
        category="change"
    ),
    ReflectionQuestion(
        step_number=8,
        question_id="s8_willingness_deeper",
        question_text="How has your willingness to make amends grown?",
        references_previous=False,
        prompt_template="How has your willingness to make amends grown since you last worked this step?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=8,
        question_id="s8_self_harm",
        question_text="How have you harmed yourself that you now recognize?",
        references_previous=False,
        prompt_template="Looking at the harm you've done to yourself - what do you now recognize that you didn't see before?",
        category="deepening"
    ),
]

# ================================
# STEP 9 - Made Direct Amends
# ================================
STEP_9_REFLECTIONS = [
    ReflectionQuestion(
        step_number=9,
        question_id="s9_amends_progress",
        question_text="How has your amends list changed since you last worked this step?",
        references_previous=True,
        prompt_template="In your previous Step 9 work, you identified these amends: \"{previous_response}\"\n\nWhich of these have you completed? Which remain?",
        category="change"
    ),
    ReflectionQuestion(
        step_number=9,
        question_id="s9_new_amends",
        question_text="Are there new amends that have come to light since your last Step 9?",
        references_previous=False,
        prompt_template="Are there new amends that have come to light since your last Step 9? New people you've harmed or new awareness of past harms?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=9,
        question_id="s9_living_amends",
        question_text="How have you practiced 'living amends' since your last Step 9?",
        references_previous=True,
        prompt_template="Previously you wrote about living amends: \"{previous_response}\"\n\nHow has your practice of living amends evolved?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=9,
        question_id="s9_freedom",
        question_text="How has the freedom from making amends grown in your life?",
        references_previous=False,
        prompt_template="The Big Book promises 'a new freedom and a new happiness.' How has making amends contributed to your freedom and happiness since your last Step 9?",
        category="deepening"
    ),
]

# ================================
# STEP 10 - Daily Inventory
# ================================
STEP_10_REFLECTIONS = [
    ReflectionQuestion(
        step_number=10,
        question_id="s10_practice_evolved",
        question_text="How has your daily practice of Step 10 evolved?",
        references_previous=True,
        prompt_template="Previously you described your Step 10 practice as: \"{previous_response}\"\n\nHow has your daily practice evolved since then?",
        category="change"
    ),
    ReflectionQuestion(
        step_number=10,
        question_id="s10_patterns_noticed",
        question_text="What patterns do you notice in your daily inventory work?",
        references_previous=False,
        prompt_template="What patterns do you notice in your daily inventory work? What keeps coming up?",
        category="new_awareness"
    ),
    ReflectionQuestion(
        step_number=10,
        question_id="s10_promptly_admit",
        question_text="How quickly can you now admit when you are wrong?",
        references_previous=False,
        prompt_template="How quickly can you now admit when you are wrong? How has this improved since you last worked Step 10?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=10,
        question_id="s10_spot_check",
        question_text="What triggers have you identified for doing spot-check inventories?",
        references_previous=False,
        prompt_template="What triggers have you identified that tell you it's time for a spot-check inventory?",
        category="deepening"
    ),
]

# ================================
# STEP 12 - Spiritual Awakening
# ================================
STEP_12_REFLECTIONS = [
    ReflectionQuestion(
        step_number=12,
        question_id="s12_awakening_describe",
        question_text="How would you describe your spiritual awakening today?",
        references_previous=True,
        prompt_template="In your previous Step 12 work, you described your spiritual awakening as: \"{previous_response}\"\n\nHow would you describe your spiritual awakening today?",
        category="growth"
    ),
    ReflectionQuestion(
        step_number=12,
        question_id="s12_message_ways",
        question_text="In what new ways are you carrying the message?",
        references_previous=False,
        prompt_template="In what new ways are you carrying the message to alcoholics who still suffer?",
        category="change"
    ),
    ReflectionQuestion(
        step_number=12,
        question_id="s12_principles_all",
        question_text="How has practicing these principles in all your affairs evolved?",
        references_previous=True,
        prompt_template="Previously you wrote about practicing principles in all your affairs: \"{previous_response}\"\n\nHow has this practice evolved?",
        category="deepening"
    ),
    ReflectionQuestion(
        step_number=12,
        question_id="s12_service_growth",
        question_text="How has your service work grown?",
        references_previous=False,
        prompt_template="How has your service work grown since you last worked Step 12? What new forms of service have you taken on?",
        category="new_awareness"
    ),
]

# ================================
# ALL REFLECTIONS BY STEP
# ================================
REFLECTION_QUESTIONS = {
    1: STEP_1_REFLECTIONS,
    2: STEP_2_REFLECTIONS,
    3: STEP_3_REFLECTIONS,
    5: STEP_5_REFLECTIONS,
    6: STEP_6_REFLECTIONS,
    7: STEP_7_REFLECTIONS,
    8: STEP_8_REFLECTIONS,
    9: STEP_9_REFLECTIONS,
    10: STEP_10_REFLECTIONS,
    12: STEP_12_REFLECTIONS,
}

# Steps that have reflection questions for repeat work
STEPS_WITH_REFLECTIONS = [1, 2, 3, 5, 6, 7, 8, 9, 10, 12]


def get_reflection_questions(step_number: int) -> List[ReflectionQuestion]:
    """Get reflection questions for a specific step"""
    return REFLECTION_QUESTIONS.get(step_number, [])


def has_reflection_questions(step_number: int) -> bool:
    """Check if a step has reflection questions"""
    return step_number in STEPS_WITH_REFLECTIONS


def get_reflection_questions_dict(step_number: int) -> List[Dict[str, Any]]:
    """Get reflection questions as dictionaries for API response"""
    questions = get_reflection_questions(step_number)
    return [q.to_dict() for q in questions]


def format_reflection_questions(step_number: int,
                                 previous_responses: Dict[str, str] = None) -> List[Dict[str, Any]]:
    """
    Format reflection questions with user's previous responses included.

    Args:
        step_number: The step number
        previous_responses: Dict mapping question_id to previous response text

    Returns:
        List of formatted questions with previous context included
    """
    questions = get_reflection_questions(step_number)
    previous_responses = previous_responses or {}

    formatted = []
    for q in questions:
        prev = previous_responses.get(q.question_id, '')
        formatted.append({
            'stepNumber': q.step_number,
            'questionId': q.question_id,
            'question': q.format_with_previous(prev),
            'category': q.category,
            'hasPreviousResponse': bool(prev),
            'previousResponse': prev if prev else None
        })

    return formatted


# Convenience function to check if user should see reflection questions
def should_show_reflections(step_number: int, version_number: int) -> bool:
    """
    Determine if reflection questions should be shown.

    Args:
        step_number: The step number
        version_number: How many times user has worked this step

    Returns:
        True if this is repeat work and step has reflection questions
    """
    return version_number > 1 and step_number in STEPS_WITH_REFLECTIONS


if __name__ == "__main__":
    # Test the reflection questions
    print("Reflection Questions for Repeat Step Work")
    print("=" * 50)

    for step in STEPS_WITH_REFLECTIONS:
        questions = get_reflection_questions(step)
        print(f"\nStep {step}: {len(questions)} questions")
        for q in questions:
            print(f"  - [{q.category}] {q.question_text[:60]}...")

    print("\n\nFormatted questions for Step 1 (with previous response):")
    formatted = format_reflection_questions(1, {
        "s1_powerless_change": "I couldn't stop drinking once I started."
    })
    for q in formatted:
        print(f"\n{q['question']}")
