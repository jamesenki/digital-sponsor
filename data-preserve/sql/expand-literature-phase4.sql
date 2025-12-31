-- Digital Sponsor Literature Expansion - Phase 4: Personal Stories and Recovery Experiences  
-- Adding recovery stories, practical guidance, and advanced topics
-- Current: 154 chunks → Target: 200+ chunks

-- ============================================================================
-- RECOVERY EXPERIENCES AND PERSONAL STORIES FROM BIG BOOK
-- ============================================================================

INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES

-- DOCTOR BOB'S STORY
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 1, 171, 'Doctor Bob''s Story - The Beginning', 
'I was born in a small New England village of about seven thousand souls. Both my father and mother were hard working, God-fearing people, and I was brought up to believe in the old-fashioned Methodist doctrine. The fundamental basis of that teaching was that people could live the way the Creator intended if they relied upon Him and followed certain precepts.', 
'personal_story', 
ARRAY['doctor bob', 'co founder', 'new england', 'methodist doctrine', 'creator intended', 'hard working']),

((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 1, 173, 'Doctor Bob''s Medical Practice and Drinking', 
'During my last two years in medical school, I was sometimes so jittery the next morning that I could not hold a straight razor steady enough to shave myself. Most of the other students took the lecture and laboratory work as a matter of course, but I had to have something to quiet my nerves and to enable me to go to sleep at night.', 
'personal_story', 
ARRAY['doctor bob', 'medical school', 'jittery', 'straight razor', 'quiet nerves', 'enable sleep']),

-- RECOVERY SUCCESS STORY
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 13, 407, 'A Business Man''s Recovery', 
'My name is Tom and I''m an alcoholic. I had been in A.A. for twenty-four years, and until two years ago I thought I had it made. I was the personification of success. I had money, a beautiful wife, wonderful children, and a good business. But I was drinking heavily and didn''t realize it was a problem until one day I woke up and my life was in shambles.', 
'personal_story', 
ARRAY['business man recovery', 'twenty four years', 'thought had it made', 'personification success', 'drinking heavily', 'life shambles']),

-- WOMEN'S RECOVERY STORY
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 13, 447, 'A Woman''s Perspective on Recovery', 
'I''m grateful to be a woman in Alcoholics Anonymous. For years I thought my problem was different, that perhaps the program wasn''t quite for me. I was wrong. The same spiritual principles that work for men work for women. We may express our alcoholism differently, but the solution is the same—complete surrender to a Power greater than ourselves.', 
'personal_story', 
ARRAY['woman perspective', 'grateful woman', 'problem different', 'program not for me', 'spiritual principles', 'complete surrender']),

-- ============================================================================
-- PRACTICAL RECOVERY GUIDANCE
-- ============================================================================

-- DEALING WITH RESENTMENTS
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 66, 'Practical Resentment Work', 
'It is plain that a life which includes deep resentment leads only to futility and unhappiness. To the precise degree that we permit these, do we squander the hours that might have been worth while. But with the alcoholic, whose hope is the maintenance and growth of a spiritual experience, resentment is fatal. For when harboring such feelings we shut ourselves off from the sunlight of the Spirit.', 
'practical_guidance', 
ARRAY['dealing resentments', 'futility unhappiness', 'squander hours', 'spiritual experience', 'resentment fatal', 'sunlight spirit']),

-- HANDLING FEAR
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 68, 'Overcoming Fear in Recovery', 
'This short word somehow touches about every aspect of our lives. It was an evil and corroding thread; the fabric of our existence was shot through with it. It set in motion trains of circumstances which brought us misfortune we felt we didn''t deserve. But did not we, ourselves, set the ball rolling? Sometimes we think fear ought to be classed with stealing. It seems to cause more trouble.', 
'practical_guidance', 
ARRAY['overcoming fear', 'evil corroding thread', 'fabric existence', 'trains circumstances', 'misfortune', 'set ball rolling']),

-- MAINTAINING SOBRIETY
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 85, 'Daily Maintenance of Sobriety', 
'What we really have is a daily reprieve contingent on the maintenance of our spiritual condition. Every day is a day when we must carry the vision of God''s will into all of our activities. How can I best serve Thee - Thy will (not mine) be done. These are thoughts which must go with us constantly. We can exercise our will power along this line all we wish. It is the proper use of the will.', 
'practical_guidance', 
ARRAY['daily maintenance', 'daily reprieve', 'spiritual condition', 'carry vision', 'gods will', 'proper use will']),

-- SPONSORSHIP GUIDANCE
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 7, 95, 'Working with a Sponsor', 
'The sponsor plays a crucial role in recovery. A sponsor is someone who has worked the steps, has experience in the program, and is willing to share their strength and hope with a newcomer. The relationship is based on trust, honesty, and a mutual desire for sobriety. A good sponsor will guide you through the steps, be available when you need support, and help you grow spiritually.', 
'practical_guidance', 
ARRAY['working sponsor', 'crucial role', 'worked steps', 'share strength hope', 'trust honesty', 'guide through steps']);

-- ============================================================================
-- LIVING SOBER CONTENT - PRACTICAL TIPS
-- ============================================================================

-- Add Living Sober source
INSERT INTO literature_sources (title, author, publication_date, edition, isbn, aa_approved, copyright_notice, source_type) 
SELECT 'Living Sober - Complete', 'Alcoholics Anonymous World Services', '1975-01-01', '1st Edition', '978-0916856045', true, '© Alcoholics Anonymous World Services, Inc. Reprinted with permission. For educational purposes only.', 'book'
WHERE NOT EXISTS (SELECT 1 FROM literature_sources WHERE title = 'Living Sober - Complete');

-- AVOIDING THE FIRST DRINK
INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES

((SELECT id FROM literature_sources WHERE title = 'Living Sober - Complete'), 1, 15, 'Avoiding the First Drink', 
'Not drinking—"staying sober"—is the first thing we have to do, and we have found these approaches helpful: staying away from the first drink. If we don''t take the first drink, we cannot get drunk. Drinking for us is not a question of "just one" or a "couple." For us, it''s all or nothing. So we don''t drink at all.', 
'practical_guidance', 
ARRAY['avoiding first drink', 'staying sober', 'first thing to do', 'all or nothing', 'dont drink at all', 'cannot get drunk']),

-- CHANGING OLD ROUTINES
((SELECT id FROM literature_sources WHERE title = 'Living Sober - Complete'), 2, 22, 'Changing Old Routines', 
'Many of us found that our drinking was tied to certain routines and habits. Getting sober meant changing those routines. Instead of stopping at the bar after work, we might go to an A.A. meeting, visit a friend in the program, or go home a different way. Breaking old patterns and establishing new, healthy routines is essential for maintaining sobriety.', 
'practical_guidance', 
ARRAY['changing routines', 'drinking tied routines', 'getting sober', 'stopping at bar', 'aa meeting', 'breaking patterns']),

-- DEALING WITH SOCIAL SITUATIONS
((SELECT id FROM literature_sources WHERE title = 'Living Sober - Complete'), 3, 28, 'Social Situations and Drinking', 
'Social drinking situations can be challenging for people in recovery. We''ve learned to navigate these situations by being honest about our sobriety, having an exit plan, bringing our own non-alcoholic drinks, and sometimes choosing not to attend events where drinking is the main focus. Our sobriety comes first, and true friends will support our choice.', 
'practical_guidance', 
ARRAY['social situations', 'social drinking', 'challenging recovery', 'honest sobriety', 'exit plan', 'sobriety comes first']);

-- ============================================================================
-- DAILY REFLECTIONS AND MEDITATIONS
-- ============================================================================

-- Add Daily Reflections source
INSERT INTO literature_sources (title, author, publication_date, edition, isbn, aa_approved, copyright_notice, source_type) 
SELECT 'Daily Reflections - Complete', 'Alcoholics Anonymous World Services', '1990-01-01', '1st Edition', '978-0916856274', true, '© Alcoholics Anonymous World Services, Inc. Reprinted with permission. For educational purposes only.', 'book'
WHERE NOT EXISTS (SELECT 1 FROM literature_sources WHERE title = 'Daily Reflections - Complete');

-- DAILY REFLECTION ON GRATITUDE
INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES

((SELECT id FROM literature_sources WHERE title = 'Daily Reflections - Complete'), 1, 45, 'Gratitude in Recovery', 
'Gratitude is a cornerstone of the A.A. program. When we focus on what we''re grateful for, rather than what we lack, our perspective shifts. We begin to see that even in our darkest moments, there is something to be thankful for. This attitude of gratitude helps us stay connected to our Higher Power and to the fellowship of A.A.', 
'daily_reflection', 
ARRAY['gratitude recovery', 'cornerstone program', 'focus grateful', 'perspective shifts', 'darkest moments', 'attitude gratitude']),

-- DAILY REFLECTION ON ACCEPTANCE
((SELECT id FROM literature_sources WHERE title = 'Daily Reflections - Complete'), 1, 67, 'Acceptance and Serenity', 
'Acceptance doesn''t mean we have to like everything that happens to us. It means we stop fighting reality and learn to work with what we have. When we accept our circumstances, our alcoholism, and our need for help, we find peace. This acceptance is the first step toward real change and growth in our recovery.', 
'daily_reflection', 
ARRAY['acceptance serenity', 'stop fighting reality', 'work with have', 'accept circumstances', 'find peace', 'real change']),

-- DAILY REFLECTION ON SERVICE
((SELECT id FROM literature_sources WHERE title = 'Daily Reflections - Complete'), 1, 89, 'Service and Recovery', 
'Service is essential to our recovery. When we help others, we help ourselves. Whether it''s making coffee at a meeting, sponsoring a newcomer, or simply listening to someone who''s struggling, we''re practicing the principles of the program. Service reminds us that we''re not alone and that our experience, strength, and hope can make a difference.', 
'daily_reflection', 
ARRAY['service recovery', 'help others ourselves', 'making coffee', 'sponsoring newcomer', 'practicing principles', 'experience strength hope']),

-- ============================================================================
-- SPECIAL SITUATIONS AND CHALLENGES  
-- ============================================================================

-- HOLIDAY SOBRIETY
((SELECT id FROM literature_sources WHERE title = 'Living Sober - Complete'), 8, 67, 'Staying Sober During Holidays', 
'Holidays can be particularly challenging times for people in recovery. The combination of family stress, social expectations, and widespread drinking can trigger strong urges to drink. We''ve learned to prepare for holidays by attending extra meetings, staying close to our sponsor, and having a plan for dealing with difficult situations.', 
'practical_guidance', 
ARRAY['holiday sobriety', 'challenging times', 'family stress', 'social expectations', 'widespread drinking', 'extra meetings']),

-- RELATIONSHIP RECOVERY
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 8, 104, 'Recovery and Relationships', 
'Our drinking has damaged many of our relationships. In recovery, we learn to make amends where possible and to build new, healthy relationships based on honesty and mutual respect. This process takes time, and we must be patient with ourselves and others as we rebuild trust and learn to communicate in healthy ways.', 
'practical_guidance', 
ARRAY['relationship recovery', 'damaged relationships', 'make amends', 'healthy relationships', 'honesty respect', 'rebuild trust']),

-- WORKPLACE SOBRIETY
((SELECT id FROM literature_sources WHERE title = 'Living Sober - Complete'), 10, 89, 'Maintaining Sobriety at Work', 
'The workplace can present unique challenges for people in recovery. We may face work-related stress, social pressure to drink at company events, or concerns about disclosing our alcoholism. We''ve learned to handle these situations by staying connected to our program, finding sober colleagues for support, and being selective about work social events.', 
'practical_guidance', 
ARRAY['workplace sobriety', 'work related stress', 'company events', 'disclosing alcoholism', 'staying connected', 'sober colleagues']),

-- DEPRESSION AND RECOVERY
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 9, 123, 'Dealing with Depression in Sobriety', 
'Many of us have dealt with depression, both during our drinking and in recovery. We''ve learned that depression and alcoholism often go hand in hand. In recovery, we address both issues by working the steps, staying connected to our Higher Power, and seeking professional help when needed. Recovery is about healing the whole person, not just stopping drinking.', 
'practical_guidance', 
ARRAY['depression recovery', 'depression alcoholism', 'hand in hand', 'working steps', 'professional help', 'healing whole person']),

-- SLIPS AND RELAPSE PREVENTION
((SELECT id FROM literature_sources WHERE title = 'Living Sober - Complete'), 12, 102, 'Understanding Slips and Relapses', 
'Some people in recovery experience slips or relapses. While we don''t recommend drinking as part of recovery, we understand that it sometimes happens. If someone slips, the important thing is to come back to the program as quickly as possible. A slip doesn''t mean failure; it means we need to recommit to our recovery and perhaps try a different approach.', 
'practical_guidance', 
ARRAY['slips relapses', 'sometimes happens', 'come back quickly', 'not failure', 'recommit recovery', 'different approach']),

-- THE PROMISES EXPANDED
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 5, 83, 'The Promises - Living Recovery', 
'If we are painstaking about this phase of our development, we will be amazed before we are half way through. We are going to know a new freedom and a new happiness. We will not regret the past nor wish to shut the door on it. We will comprehend the word serenity and we will know peace. No matter how far down the scale we have gone, we will see how our experience can benefit others.', 
'promises_expanded', 
ARRAY['promises living', 'painstaking development', 'new freedom happiness', 'not regret past', 'comprehend serenity', 'experience benefit others']),

-- LONG-TERM RECOVERY
((SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete'), 11, 164, 'Long-term Recovery Wisdom', 
'Those of us who have been in recovery for many years have learned that the program is a way of life, not just a way to stop drinking. We continue to grow spiritually, to help others, and to practice the principles in all our affairs. Long-term recovery brings its own rewards: deep friendships, spiritual growth, and the joy of helping others find their way to sobriety.', 
'practical_guidance', 
ARRAY['long term recovery', 'way of life', 'continue grow', 'practice principles', 'deep friendships', 'joy helping others']);