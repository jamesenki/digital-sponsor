#!/usr/bin/env python3
"""
Step 11 Meditation Module
Provides meditation timer, tracking, prayers, and journaling for Step 11 practice
Note: Evening Review has been moved to Step 10 Daily Inventory
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from enum import Enum
import uuid


class MeditationType(Enum):
    """Types of meditation sessions"""
    MORNING = "morning"
    EVENING = "evening"
    SPOT_CHECK = "spot_check"
    GUIDED = "guided"
    CUSTOM = "custom"


@dataclass
class Step11Prayer:
    """A Step 11 specific prayer"""
    prayer_id: str
    title: str
    text: str
    prayer_type: str  # "morning", "evening", "on_awakening", "retiring"
    source: str
    page_reference: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'prayerId': self.prayer_id,
            'title': self.title,
            'text': self.text,
            'prayerType': self.prayer_type,
            'source': self.source,
            'pageReference': self.page_reference
        }


@dataclass
class MeditationPrompt:
    """A daily meditation prompt or reading"""
    prompt_id: str
    title: str
    text: str
    source: str
    page_reference: Optional[str] = None
    date_suggested: Optional[date] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'promptId': self.prompt_id,
            'title': self.title,
            'text': self.text,
            'source': self.source,
            'pageReference': self.page_reference,
            'dateSuggested': self.date_suggested.isoformat() if self.date_suggested else None
        }


@dataclass
class MeditationSession:
    """A completed meditation session"""
    session_id: str
    user_id: str
    meditation_type: MeditationType
    duration_minutes: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    prompt_used: Optional[str] = None
    notes: Optional[str] = None
    intuitive_thoughts: Optional[str] = None
    guidance_received: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'sessionId': self.session_id,
            'userId': self.user_id,
            'meditationType': self.meditation_type.value,
            'durationMinutes': self.duration_minutes,
            'startedAt': self.started_at.isoformat(),
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'promptUsed': self.prompt_used,
            'notes': self.notes,
            'intuitiveThoughts': self.intuitive_thoughts,
            'guidanceReceived': self.guidance_received
        }


@dataclass
class MorningIntention:
    """Morning intention setting"""
    intention_id: str
    user_id: str
    date: date
    intention_text: str
    areas_to_turn_over: List[str] = field(default_factory=list)
    people_to_pray_for: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'intentionId': self.intention_id,
            'userId': self.user_id,
            'date': self.date.isoformat(),
            'intentionText': self.intention_text,
            'areasToTurnOver': self.areas_to_turn_over,
            'peopleToPrayFor': self.people_to_pray_for,
            'createdAt': self.created_at.isoformat()
        }


@dataclass
class EveningReview:
    """Evening inventory/review"""
    review_id: str
    user_id: str
    date: date
    was_resentful: bool = False
    resentful_details: Optional[str] = None
    was_selfish: bool = False
    selfish_details: Optional[str] = None
    was_dishonest: bool = False
    dishonest_details: Optional[str] = None
    was_afraid: bool = False
    afraid_details: Optional[str] = None
    owe_apology: bool = False
    apology_details: Optional[str] = None
    was_kind_and_loving: bool = True
    could_have_done_better: Optional[str] = None
    thinking_of_self_or_others: str = "others"  # "self" or "others"
    gratitude_list: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'reviewId': self.review_id,
            'userId': self.user_id,
            'date': self.date.isoformat(),
            'wasResentful': self.was_resentful,
            'resentfulDetails': self.resentful_details,
            'wasSelfish': self.was_selfish,
            'selfishDetails': self.selfish_details,
            'wasDishonest': self.was_dishonest,
            'dishonestDetails': self.dishonest_details,
            'wasAfraid': self.was_afraid,
            'afraidDetails': self.afraid_details,
            'oweApology': self.owe_apology,
            'apologyDetails': self.apology_details,
            'wasKindAndLoving': self.was_kind_and_loving,
            'couldHaveDoneBetter': self.could_have_done_better,
            'thinkingOfSelfOrOthers': self.thinking_of_self_or_others,
            'gratitudeList': self.gratitude_list,
            'createdAt': self.created_at.isoformat()
        }


# ============================================================================
# STEP 11 PRAYERS
# ============================================================================
STEP_11_PRAYERS = [
    Step11Prayer(
        prayer_id="s11_morning",
        title="Morning Prayer (On Awakening)",
        text="""God, direct my thinking today. Let it be divorced from self-pity, dishonest, or self-seeking motives. Show me what to do for each person I encounter today. Grant me inspiration, an intuitive thought, or a decision. Help me relax and take it easy. I pray I may find Your will for me today.""",
        prayer_type="morning",
        source="Big Book",
        page_reference="p. 86-87"
    ),
    Step11Prayer(
        prayer_id="s11_evening",
        title="Evening Prayer (On Retiring)",
        text="""God, was I resentful, selfish, dishonest, or afraid today? Do I owe an apology? Have I kept something to myself which should be discussed with another person at once? Was I kind and loving toward all? What could I have done better? Was I thinking of myself most of the time, or was I thinking of what I could do for others?""",
        prayer_type="evening",
        source="Big Book",
        page_reference="p. 86"
    ),
    Step11Prayer(
        prayer_id="s11_during_day",
        title="Prayer Throughout the Day",
        text="""God, grant me the right thought or action. Thy will, not mine, be done.""",
        prayer_type="spot_check",
        source="Big Book",
        page_reference="p. 87"
    ),
    Step11Prayer(
        prayer_id="s11_when_agitated",
        title="When Agitated or Doubtful",
        text="""We pause, when agitated or doubtful, and ask for the right thought or action. We constantly remind ourselves we are no longer running the show, humbly saying to ourselves many times each day 'Thy will be done.'""",
        prayer_type="spot_check",
        source="Big Book",
        page_reference="p. 87-88"
    ),
    Step11Prayer(
        prayer_id="s11_serenity",
        title="Serenity Prayer",
        text="""God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference.""",
        prayer_type="general",
        source="Traditional (Reinhold Niebuhr)",
        page_reference=None
    ),
    Step11Prayer(
        prayer_id="s11_st_francis",
        title="St. Francis Prayer",
        text="""Lord, make me a channel of thy peace;
that where there is hatred, I may bring love;
that where there is wrong, I may bring the spirit of forgiveness;
that where there is discord, I may bring harmony;
that where there is error, I may bring truth;
that where there is doubt, I may bring faith;
that where there is despair, I may bring hope;
that where there are shadows, I may bring light;
that where there is sadness, I may bring joy.
Lord, grant that I may seek rather to comfort than to be comforted;
to understand, than to be understood;
to love, than to be loved.
For it is by self-forgetting that one finds.
It is by forgiving that one is forgiven.
It is by dying that one awakens to Eternal Life.""",
        prayer_type="general",
        source="12&12",
        page_reference="Step 11"
    )
]


# ============================================================================
# MEDITATION PROMPTS (Rotating Daily)
# ============================================================================
MEDITATION_PROMPTS = [
    MeditationPrompt(
        prompt_id="mp_1",
        title="Conscious Contact",
        text="'We find that our thinking will, as time passes, be more and more on the plane of inspiration. We come to rely upon it.' Consider: How has your conscious contact with your Higher Power changed since beginning your recovery?",
        source="Big Book",
        page_reference="p. 87"
    ),
    MeditationPrompt(
        prompt_id="mp_2",
        title="Thy Will Be Done",
        text="'We constantly remind ourselves we are no longer running the show, humbly saying to ourselves many times each day, \"Thy will be done.\"' Meditate on what it means to truly let go of running the show.",
        source="Big Book",
        page_reference="p. 87-88"
    ),
    MeditationPrompt(
        prompt_id="mp_3",
        title="Intuitive Thought",
        text="'We usually conclude the period of meditation with a prayer that we be shown all through the day what our next step is to be, that we be given whatever we need to take care of such problems.' What intuitive thoughts have come to you in meditation?",
        source="Big Book",
        page_reference="p. 86"
    ),
    MeditationPrompt(
        prompt_id="mp_4",
        title="Relax and Take It Easy",
        text="'In thinking about our day we may face indecision. We may not be able to determine which course to take. Here we ask God for inspiration, an intuitive thought or a decision. We relax and take it easy.'",
        source="Big Book",
        page_reference="p. 86"
    ),
    MeditationPrompt(
        prompt_id="mp_5",
        title="The Realm of Spirit",
        text="'Much has already been said about receiving strength, inspiration, and direction from Him who has all knowledge and power. If we have carefully followed directions, we have begun to sense the flow of His Spirit into us. To some extent we have become God-conscious.'",
        source="Big Book",
        page_reference="p. 85"
    ),
    MeditationPrompt(
        prompt_id="mp_6",
        title="Spiritual Experience",
        text="'What we really have is a daily reprieve contingent on the maintenance of our spiritual condition. Every day is a day when we must carry the vision of God's will into all of our activities.'",
        source="Big Book",
        page_reference="p. 85"
    ),
    MeditationPrompt(
        prompt_id="mp_7",
        title="Being Helpful",
        text="'Our real purpose is to fit ourselves to be of maximum service to God and the people about us.' How can you be of maximum service today?",
        source="Big Book",
        page_reference="p. 77"
    )
]


class Step11MeditationGuide:
    """Guide for Step 11 meditation practice"""

    def __init__(self):
        self.sessions: Dict[str, List[MeditationSession]] = {}  # user_id -> sessions
        self.morning_intentions: Dict[str, Dict[str, MorningIntention]] = {}  # user_id -> date -> intention
        self.evening_reviews: Dict[str, Dict[str, EveningReview]] = {}  # user_id -> date -> review

    def get_prayers(self, prayer_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get Step 11 prayers, optionally filtered by type"""
        if prayer_type:
            prayers = [p for p in STEP_11_PRAYERS if p.prayer_type == prayer_type]
        else:
            prayers = STEP_11_PRAYERS
        return [p.to_dict() for p in prayers]

    def get_morning_prayer(self) -> Dict[str, Any]:
        """Get the morning prayer"""
        prayer = next((p for p in STEP_11_PRAYERS if p.prayer_id == "s11_morning"), None)
        return prayer.to_dict() if prayer else {}

    def get_evening_prayer(self) -> Dict[str, Any]:
        """Get the evening prayer"""
        prayer = next((p for p in STEP_11_PRAYERS if p.prayer_id == "s11_evening"), None)
        return prayer.to_dict() if prayer else {}

    def get_daily_prompt(self, day_of_year: Optional[int] = None) -> Dict[str, Any]:
        """Get a meditation prompt for the day (rotating)"""
        if day_of_year is None:
            day_of_year = datetime.now().timetuple().tm_yday
        index = day_of_year % len(MEDITATION_PROMPTS)
        return MEDITATION_PROMPTS[index].to_dict()

    def start_meditation(
        self,
        user_id: str,
        meditation_type: str,
        duration_minutes: int,
        prompt_id: Optional[str] = None
    ) -> MeditationSession:
        """Start a new meditation session"""
        session = MeditationSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            meditation_type=MeditationType(meditation_type),
            duration_minutes=duration_minutes,
            started_at=datetime.utcnow(),
            prompt_used=prompt_id
        )

        if user_id not in self.sessions:
            self.sessions[user_id] = []
        self.sessions[user_id].append(session)

        return session

    def complete_meditation(
        self,
        session_id: str,
        notes: Optional[str] = None,
        intuitive_thoughts: Optional[str] = None,
        guidance_received: Optional[str] = None
    ) -> Optional[MeditationSession]:
        """Complete a meditation session"""
        for user_sessions in self.sessions.values():
            for session in user_sessions:
                if session.session_id == session_id:
                    session.completed_at = datetime.utcnow()
                    session.notes = notes
                    session.intuitive_thoughts = intuitive_thoughts
                    session.guidance_received = guidance_received
                    return session
        return None

    def save_morning_intention(
        self,
        user_id: str,
        intention_text: str,
        areas_to_turn_over: List[str] = None,
        people_to_pray_for: List[str] = None
    ) -> MorningIntention:
        """Save morning intention for today"""
        today = date.today()
        intention = MorningIntention(
            intention_id=str(uuid.uuid4()),
            user_id=user_id,
            date=today,
            intention_text=intention_text,
            areas_to_turn_over=areas_to_turn_over or [],
            people_to_pray_for=people_to_pray_for or []
        )

        if user_id not in self.morning_intentions:
            self.morning_intentions[user_id] = {}
        self.morning_intentions[user_id][today.isoformat()] = intention

        return intention

    def save_evening_review(
        self,
        user_id: str,
        was_resentful: bool = False,
        resentful_details: Optional[str] = None,
        was_selfish: bool = False,
        selfish_details: Optional[str] = None,
        was_dishonest: bool = False,
        dishonest_details: Optional[str] = None,
        was_afraid: bool = False,
        afraid_details: Optional[str] = None,
        owe_apology: bool = False,
        apology_details: Optional[str] = None,
        was_kind_and_loving: bool = True,
        could_have_done_better: Optional[str] = None,
        thinking_of_self_or_others: str = "others",
        gratitude_list: List[str] = None
    ) -> EveningReview:
        """Save evening review for today"""
        today = date.today()
        review = EveningReview(
            review_id=str(uuid.uuid4()),
            user_id=user_id,
            date=today,
            was_resentful=was_resentful,
            resentful_details=resentful_details,
            was_selfish=was_selfish,
            selfish_details=selfish_details,
            was_dishonest=was_dishonest,
            dishonest_details=dishonest_details,
            was_afraid=was_afraid,
            afraid_details=afraid_details,
            owe_apology=owe_apology,
            apology_details=apology_details,
            was_kind_and_loving=was_kind_and_loving,
            could_have_done_better=could_have_done_better,
            thinking_of_self_or_others=thinking_of_self_or_others,
            gratitude_list=gratitude_list or []
        )

        if user_id not in self.evening_reviews:
            self.evening_reviews[user_id] = {}
        self.evening_reviews[user_id][today.isoformat()] = review

        return review

    def get_meditation_history(
        self,
        user_id: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get meditation history for user"""
        user_sessions = self.sessions.get(user_id, [])
        cutoff = datetime.utcnow() - timedelta(days=days)

        recent = [s for s in user_sessions if s.started_at >= cutoff]
        return [s.to_dict() for s in sorted(recent, key=lambda x: x.started_at, reverse=True)]

    def get_meditation_streak(self, user_id: str) -> int:
        """Calculate current meditation streak (consecutive days)"""
        user_sessions = self.sessions.get(user_id, [])
        if not user_sessions:
            return 0

        # Get unique dates with completed sessions
        completed_dates = set()
        for session in user_sessions:
            if session.completed_at:
                completed_dates.add(session.completed_at.date())

        if not completed_dates:
            return 0

        # Calculate streak
        streak = 0
        check_date = date.today()

        # If no meditation today, start from yesterday
        if check_date not in completed_dates:
            check_date -= timedelta(days=1)

        while check_date in completed_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return streak

    def get_meditation_stats(self, user_id: str) -> Dict[str, Any]:
        """Get meditation statistics for user"""
        user_sessions = self.sessions.get(user_id, [])
        completed = [s for s in user_sessions if s.completed_at]

        total_sessions = len(completed)
        total_minutes = sum(s.duration_minutes for s in completed)

        # Sessions by type
        by_type = {}
        for session in completed:
            t = session.meditation_type.value
            by_type[t] = by_type.get(t, 0) + 1

        # Last 30 days
        cutoff = datetime.utcnow() - timedelta(days=30)
        last_30 = [s for s in completed if s.started_at >= cutoff]

        return {
            'totalSessions': total_sessions,
            'totalMinutes': total_minutes,
            'currentStreak': self.get_meditation_streak(user_id),
            'sessionsByType': by_type,
            'last30Days': {
                'sessions': len(last_30),
                'minutes': sum(s.duration_minutes for s in last_30)
            }
        }

    def get_step11_guide(self) -> Dict[str, Any]:
        """Get complete Step 11 guide content"""
        return {
            'stepNumber': 11,
            'stepText': "Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.",
            'morningPrayer': self.get_morning_prayer(),
            'eveningPrayer': self.get_evening_prayer(),
            'allPrayers': self.get_prayers(),
            'dailyPrompt': self.get_daily_prompt(),
            'meditationDurations': [5, 10, 15, 20, 30],
            'meditationTypes': [t.value for t in MeditationType],
            'instructions': {
                'morning': [
                    "On awakening, think about the 24 hours ahead",
                    "Consider your plans for the day",
                    "Ask God to direct your thinking",
                    "Ask to be divorced from self-pity, dishonest or self-seeking motives",
                    "Ask for inspiration, an intuitive thought, or a decision",
                    "Relax and take it easy"
                ],
                'evening': [
                    "Constructively review your day",
                    "Were you resentful, selfish, dishonest, or afraid?",
                    "Do you owe an apology?",
                    "Have you kept something to yourself that should be discussed?",
                    "Were you kind and loving toward all?",
                    "What could you have done better?",
                    "Were you thinking of yourself most of the time, or what you could do for others?"
                ],
                'during_day': [
                    "Pause when agitated or doubtful",
                    "Ask for the right thought or action",
                    "Remind yourself you are no longer running the show",
                    "Say 'Thy will be done' many times throughout the day"
                ]
            }
        }


# ============================================================================
# TEST
# ============================================================================
if __name__ == "__main__":
    print("Step 11 Meditation Guide Test")
    print("=" * 50)

    guide = Step11MeditationGuide()

    # Get prayers
    print("\nPrayers:")
    for prayer in guide.get_prayers():
        print(f"  - {prayer['title']}")

    # Get daily prompt
    print(f"\nToday's Meditation Prompt:")
    prompt = guide.get_daily_prompt()
    print(f"  {prompt['title']}")

    # Start a meditation
    print("\nStarting meditation session...")
    session = guide.start_meditation("test_user", "morning", 15)
    print(f"  Session ID: {session.session_id}")

    # Complete meditation
    guide.complete_meditation(
        session.session_id,
        notes="Felt peaceful",
        intuitive_thoughts="Be patient with myself today"
    )
    print("  Session completed")

    # Get stats
    stats = guide.get_meditation_stats("test_user")
    print(f"\nStats: {stats['totalSessions']} sessions, {stats['totalMinutes']} minutes")
    print(f"Current streak: {stats['currentStreak']} days")
