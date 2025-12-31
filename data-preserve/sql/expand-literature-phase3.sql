-- Digital Sponsor Literature Expansion - Phase 3: Essential Prayers and Spiritual Practice
-- Adding prayers, meditations, and spiritual guidance
-- Current: 134 chunks → Target: 160+ chunks

-- ============================================================================
-- ESSENTIAL AA PRAYERS AND SPIRITUAL PRACTICES
-- ============================================================================

INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES

-- SERENITY PRAYER
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 0, 0, 'The Serenity Prayer', 
'God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Living one day at a time, enjoying one moment at a time; taking this sinful world as it is, not as I would have it; trusting that You will make all things right if I surrender to Your will; that I may be reasonably happy in this life and supremely useful to God and my fellow man.', 
'prayer', 
ARRAY['serenity prayer', 'grant me serenity', 'accept things cannot change', 'courage to change', 'wisdom', 'one day at a time']),

-- THIRD STEP PRAYER  
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 63, 'Third Step Prayer', 
'God, I offer myself to Thee—to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will. Take away my difficulties, that victory over them may bear witness to those I would help of Thy Power, Thy Love, and Thy Way of life. May I do Thy will always!', 
'prayer', 
ARRAY['third step prayer', 'step 3 prayer', 'offer myself', 'bondage of self', 'thy will', 'take away difficulties', 'thy power']),

-- SEVENTH STEP PRAYER
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 76, 'Seventh Step Prayer', 
'My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows. Grant me strength, as I go out from here, to do your bidding. Amen.', 
'prayer', 
ARRAY['seventh step prayer', 'step 7 prayer', 'my creator', 'willing you have all', 'remove defect character', 'usefulness', 'grant me strength']),

-- ELEVENTH STEP PRAYER
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 11, 102, 'Eleventh Step Prayer', 
'God, direct my thinking, especially when it is confused. Help me to relax and take it easy. Free me from doubt and indecision. Guide me through this day and show me my next step. Give me what I need to take care of any problems. I ask all these things that I may be of maximum service to You and my fellow man. Thy will, not mine, be done.', 
'prayer', 
ARRAY['eleventh step prayer', 'step 11 prayer', 'direct my thinking', 'relax take easy', 'free from doubt', 'show next step', 'maximum service']),

-- SET ASIDE PRAYER
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 0, 0, 'Set Aside Prayer', 
'Dear God, please set aside everything I think I know about myself, my disease, this program, and especially You, God, so that I may have an open mind and a new experience. Please help me to see the truth.', 
'prayer', 
ARRAY['set aside prayer', 'set aside everything', 'open mind', 'new experience', 'see the truth', 'willingness']),

-- ============================================================================
-- MEDITATION AND SPIRITUAL PRACTICES
-- ============================================================================

-- MORNING MEDITATION
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 86, 'Morning Meditation Practice', 
'On awakening let us think about the twenty-four hours ahead. We consider our plans for the day. Before we begin, we ask God to direct our thinking, especially asking that it be divorced from self-pity, dishonest or self-seeking motives. Under these conditions we can employ our mental faculties with assurance, for after all God gave us brains to use.', 
'spiritual_practice', 
ARRAY['morning meditation', 'twenty four hours', 'consider plans', 'ask god direct', 'divorced from self pity', 'mental faculties']),

-- EVENING REVIEW
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 86, 'Evening Review Practice', 
'When we retire at night, we constructively review our day. Were we resentful, selfish, dishonest or afraid? Do we owe an apology? Have we kept something to ourselves which should be discussed with another person at once? Were we kind and loving toward all? What could we have done better? Where were we thinking of ourselves most of the time?', 
'spiritual_practice', 
ARRAY['evening review', 'retire at night', 'constructively review', 'owe apology', 'kind and loving', 'thinking of ourselves']),

-- PRAYER AND MEDITATION GUIDANCE
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 87, 'Prayer and Meditation Guidance', 
'In meditation, we ask God what we should do about each specific matter. The right answer will come, if we want it. We ought to be sensible, tactful, considerate and humble without being servile or scraping. As God''s people we stand on our feet; we don''t crawl. When we approach others, we should be sensible, tactful, considerate and humble without being servile or scraping.', 
'spiritual_practice', 
ARRAY['meditation guidance', 'ask god what do', 'right answer will come', 'sensible tactful', 'considerate humble', 'gods people']),

-- ============================================================================
-- SPIRITUAL CONCEPTS AND RECOVERY PRINCIPLES
-- ============================================================================

-- HIGHER POWER CONCEPT
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 4, 46, 'Higher Power for Agnostics', 
'Much to our relief, we discovered we did not need to consider another''s conception of God. Our own conception, however inadequate, was sufficient to make the approach and to effect a contact with Him. As soon as we admitted the possible existence of a Creative Intelligence, a Spirit of the Universe underlying the totality of things, we began to be possessed of a new sense of power and direction, provided we took other simple steps.', 
'spiritual_concept', 
ARRAY['higher power agnostics', 'our own conception', 'creative intelligence', 'spirit universe', 'new sense power', 'simple steps']),

-- SPIRITUAL AWAKENING
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 12, 106, 'Spiritual Awakening Description', 
'When a man or woman has a spiritual awakening, the most important meaning of it is that he has now become able to do, feel, and believe that which he could not do before on his unaided strength and resources alone. He has been set on a path which tells him he is really going somewhere, that life is not a dead end, not something to be endured or mastered.', 
'spiritual_concept', 
ARRAY['spiritual awakening', 'become able to do', 'unaided strength', 'going somewhere', 'life not dead end', 'endured mastered']),

-- SURRENDER AND ACCEPTANCE
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 4, 47, 'Surrender and Acceptance', 
'We found that God does not make too hard terms with those who seek Him. To us, the Realm of Spirit is broad, roomy, all inclusive; never exclusive or forbidding to those who earnestly seek. It is open, we believe, to all men. When, therefore, we speak to you of God, we mean your own conception of God.', 
'spiritual_concept', 
ARRAY['surrender acceptance', 'god not hard terms', 'realm of spirit', 'broad roomy inclusive', 'never exclusive', 'your own conception']),

-- FAITH AND TRUST
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 3, 34, 'Faith and Trust Development', 
'We found that the moment we caught even a glimpse of God''s will, the moment we began to see truth, justice, and love as the real and eternal things in life, we were no longer deeply disturbed by all the seeming evidence to the contrary that surrounded us in purely human affairs. We knew that God lovingly watched over us.', 
'spiritual_concept', 
ARRAY['faith trust development', 'glimpse gods will', 'truth justice love', 'real eternal things', 'not deeply disturbed', 'god lovingly watched']),

-- ============================================================================
-- RECOVERY PRINCIPLES AND SLOGANS
-- ============================================================================

-- ONE DAY AT A TIME
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 85, 'One Day at a Time Principle', 
'We are not cured of alcoholism. What we really have is a daily reprieve contingent on the maintenance of our spiritual condition. Every day is a day when we must carry the vision of God''s will into all of our activities. "How can I best serve Thee—Thy will (not mine) be done." These are thoughts which must go with us constantly.', 
'recovery_principle', 
ARRAY['one day at a time', 'not cured alcoholism', 'daily reprieve', 'spiritual condition', 'carry vision', 'thy will be done']),

-- LET GO AND LET GOD
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 3, 35, 'Let Go and Let God', 
'All of us, whatever our race, creed, or color are the children of a living Creator with whom we may form a relationship upon simple and understandable terms as soon as we are willing and honest enough to try. Those having religious affiliations will find here nothing disturbing to their beliefs or ceremonies. There is no friction among us over such matters.', 
'recovery_principle', 
ARRAY['let go let god', 'children living creator', 'form relationship', 'simple understandable terms', 'willing honest', 'no friction']),

-- POWERLESSNESS AND SURRENDER  
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 2, 30, 'Powerlessness Teaching', 
'First of all, we had to quit playing God. It didn''t work. Next, we decided that hereafter in this drama of life, God was going to be our Director. He is the Principal; we are His agents. He is the Father, and we are His children. Most good ideas are simple, and this concept was the keystone of the new and triumphant arch through which we passed to freedom.', 
'recovery_principle', 
ARRAY['powerlessness surrender', 'quit playing god', 'god our director', 'he is principal', 'we are agents', 'keystone concept']),

-- HONESTY OPEN-MINDEDNESS WILLINGNESS
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 11, 568, 'HOW Principles', 
'The principles we have set down are guides to progress. We claim spiritual progress rather than spiritual perfection. Our description of the alcoholic, the chapter to the agnostic, and our personal adventures before and after make clear three pertinent ideas: (a) That we were alcoholic and could not manage our own lives. (b) That probably no human power could have relieved our alcoholism. (c) That God could and would if He were sought.', 
'recovery_principle', 
ARRAY['honesty open minded willingness', 'how principles', 'guides to progress', 'spiritual progress', 'not perfection', 'god could would']),

-- FIRST THINGS FIRST
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 7, 89, 'First Things First Priority', 
'Your job now is to be at the place where you may be of maximum helpfulness to others, so never hesitate to go anywhere if you can be helpful. You should not hesitate to visit the most sordid spot on earth on such an errand. Keep on the firing line of life with these motives and God will keep you unharmed.', 
'recovery_principle', 
ARRAY['first things first', 'maximum helpfulness', 'never hesitate go', 'firing line life', 'god keep unharmed', 'be helpful']),

-- ============================================================================
-- STEP PRAYERS AND AFFIRMATIONS
-- ============================================================================

-- FIRST STEP AFFIRMATION
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 1, 8, 'First Step Affirmation', 
'We admitted we were powerless over alcohol—that our lives had become unmanageable. This is the first step in recovery. For most of us, this admission of powerlessness is the foundation upon which our happy and useful lives have been built. We know that little good can come to any alcoholic who joins A.A. unless he has first accepted his devastating weakness and all its consequences.', 
'step_prayer', 
ARRAY['first step affirmation', 'admitted powerless', 'lives unmanageable', 'foundation', 'devastating weakness', 'consequences']),

-- FOURTH STEP COURAGE PRAYER
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 64, 'Fourth Step Courage', 
'Next we launched out on a course of vigorous action, the first step of which is a personal housecleaning, which many of us had never attempted. Though our decision was a vital and crucial step, it could have little permanent effect unless at once followed by a strenuous effort to face, and to be rid of, the things in ourselves which had been blocking us.', 
'step_prayer', 
ARRAY['fourth step courage', 'vigorous action', 'personal housecleaning', 'vital crucial step', 'strenuous effort', 'blocking us']),

-- ELEVENTH STEP MEDITATION
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 87, 'Eleventh Step Daily Practice', 
'As we go through the day we pause, when agitated or doubtful, and ask for the right thought or action. We constantly remind ourselves we are no longer running the show, humbly saying to ourselves many times each day "Thy will be done." We are then in much less danger of excitement, fear, anger, worry, self-pity, or foolish decisions.', 
'step_prayer', 
ARRAY['eleventh step daily', 'pause when agitated', 'ask right thought', 'no longer running show', 'thy will be done', 'less danger']);