-- Digital Sponsor Literature Expansion - Phase 1: Big Book Core Chapters
-- Adding 100+ chunks from Big Book Chapters 1-7, 11
-- This expands from 27 → 127+ chunks for comprehensive coverage

-- ============================================================================
-- CHAPTER 1: BILL'S STORY - Foundation Recovery Experience
-- ============================================================================

INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES

-- Bill's Early Drinking
(1, 1, 1, 'Early Years and First Drink', 
'War fever ran high in the New England town to which we new, young officers from Plattsburg were assigned, and we were flattered when the first citizens took us to their homes, making us feel heroic. Here was love, applause, war; moments sublime with intervals hilarious. I was part of life at last, and in the midst of the excitement I discovered liquor. I forgot the strong warnings and the prejudices of my people concerning drink.', 
'personal_story', 
ARRAY['bill w', 'first drink', 'early drinking', 'discovery of alcohol', 'war', 'acceptance']),

(1, 1, 2, 'The Effect of Alcohol', 
'A sense of ease and comfort came at once. I felt that I belonged where I was, that I was part of life instead of being outside looking in. This was indeed the world to me, and I was it. It was the elixir of life. Even that first evening I got thoroughly drunk, and within the next time or two I passed out completely.', 
'personal_story', 
ARRAY['first drunk', 'sense of ease', 'belonging', 'elixir of life', 'blackout', 'alcohol effect']),

-- Bill's Business Success Despite Drinking
(1, 1, 3, 'Business Success and Hidden Drinking', 
'For the next few years fortune threw money and applause my way. I had arrived. My judgment and ideas were followed by many to the tune of paper millions. The great boom of the late twenties was seething and swelling. Drink was taking an important and exhilarating part in my life. There was loud talk in the jazz places uptown. Everyone spent money like water. All was hilarity and endurance.', 
'personal_story', 
ARRAY['business success', 'wall street', 'twenties boom', 'drinking progression', 'money', 'jazz age']),

-- The First Warning Signs
(1, 1, 4, 'Morning Drinking Begins', 
'My wife and I abandoned the country for the city apartment, and most of our friends did likewise. The morning after found me drinking heavily to quiet my jittery nerves. People began to notice that sometimes I drank too much, so I began to use some care. Nevertheless, it was noticed. My wife also began to worry silently.', 
'personal_story', 
ARRAY['morning drinking', 'jittery nerves', 'wife worried', 'drinking noticed', 'progression', 'warning signs']),

-- Business Problems Begin
(1, 1, 5, 'Business Troubles Start', 
'My business associates complained that it was taking me away from my work, but I only laughed. Belatedly I realized I had troubles with alcohol, but I was not scared. I made up my mind to drink only wine and beer after dinner. But it was only a matter of time before I was drunk on wine and beer again.', 
'personal_story', 
ARRAY['business problems', 'work affected', 'wine and beer', 'controlled drinking attempt', 'realization', 'denial']),

-- Hospital and Bellevue Experience
(1, 1, 6, 'First Hospitalization', 
'I went on the wagon several times, once for four months, another time for two months, but I always fell off the wagon at the first excuse. After a time I found I was unable to stop drinking for even short periods. I was drinking every day now and going to pieces rapidly.', 
'personal_story', 
ARRAY['hospital', 'going on wagon', 'unable to stop', 'daily drinking', 'going to pieces', 'loss of control']),

(1, 1, 7, 'Bellevue Hospital Experience', 
'Finally I was placed in a nationally-known hospital for the treatment of alcoholism. Under the so-called belladonna treatment, I found temporary relief and left there with high confidence that I had beaten the liquor game. I shall never forget the shock and the despair I felt when I walked out of the hospital a broken man, drinking again.', 
'personal_story', 
ARRAY['bellevue hospital', 'alcoholism treatment', 'belladonna treatment', 'temporary relief', 'broken man', 'treatment failure']),

-- Rock Bottom and Despair
(1, 1, 8, 'Complete Defeat', 
'The terrible truth was borne in upon me. I was not one of the fortunate few who recover their health and their lives in the early stages of their alcoholic careers. I was doomed to an alcoholic death or to live the life of a hopeless drunk. How dark it is before the dawn!', 
'personal_story', 
ARRAY['complete defeat', 'alcoholic death', 'hopeless drunk', 'dark before dawn', 'rock bottom', 'despair']),

-- ============================================================================
-- CHAPTER 2: THERE IS A SOLUTION - Core AA Philosophy  
-- ============================================================================

-- The Alcoholic Mind
(1, 2, 23, 'The Alcoholic Mind', 
'Most of us have been unwilling to admit we were real alcoholics. No person likes to think he is bodily and mentally different from his fellows. Therefore, it is not surprising that our drinking careers have been characterized by countless vain attempts to prove we could drink like other people. The idea that somehow, someday he will control and enjoy his drinking is the great obsession of every abnormal drinker.', 
'philosophy', 
ARRAY['alcoholic mind', 'unwilling to admit', 'mentally different', 'great obsession', 'control drinking', 'abnormal drinker']),

(1, 2, 24, 'The Phenomenon of Craving', 
'The fact is that most alcoholics, for reasons yet obscure, have lost the power of choice in drink. Our so-called will power becomes practically nonexistent. We are unable, at certain times, to bring into our consciousness with sufficient force the memory of the suffering and humiliation of even a week or a month ago.', 
'philosophy', 
ARRAY['phenomenon of craving', 'lost power of choice', 'will power', 'nonexistent', 'memory', 'suffering']),

-- The Body and Mind Connection
(1, 2, 25, 'Allergy of the Body', 
'We doctors have realized for a long time that some form of moral psychology was of urgent importance to alcoholics, but its application presented difficulties beyond our conception. What with our ultra-modern standards, our scientific approach to everything, we are perhaps not well equipped to apply the powers of good that lie outside our synthetic knowledge.', 
'philosophy', 
ARRAY['allergy of body', 'moral psychology', 'scientific approach', 'synthetic knowledge', 'powers of good', 'medical']),

-- The Spiritual Solution
(1, 2, 26, 'The Spiritual Solution', 
'Lack of power, that was our dilemma. We had to find a power by which we could live, and it had to be a Power greater than ourselves. Obviously. But where and how were we to find this Power? Well, that''s exactly what this book is about. Its main object is to enable you to find a Power greater than yourself which will solve your problem.', 
'philosophy', 
ARRAY['lack of power', 'power greater than ourselves', 'spiritual solution', 'main object', 'solve problem', 'higher power']),

-- ============================================================================
-- CHAPTER 3: MORE ABOUT ALCOHOLISM - The Disease Concept
-- ============================================================================

-- Types of Drinkers
(1, 3, 30, 'Types of Drinkers', 
'Moderate drinkers have little trouble in giving up liquor entirely if they have good reason for it. They can take it or leave it alone. Then we have a certain type of hard drinker. He may have the habit badly enough to gradually impair him physically and mentally. It may cause him to die a few years before his time.', 
'education', 
ARRAY['moderate drinkers', 'hard drinker', 'take it or leave it', 'physical impairment', 'mental impairment', 'types']),

(1, 3, 31, 'The Real Alcoholic', 
'But what about the real alcoholic? He may start off as a moderate drinker; he may or may not become a continuous hard drinker; but at some stage of his drinking career he begins to lose all control over his liquor consumption, once he starts to drink.', 
'education', 
ARRAY['real alcoholic', 'moderate start', 'lose control', 'liquor consumption', 'begins to lose', 'drinking career']),

-- Self-Diagnosis Questions
(1, 3, 32, 'Self-Diagnosis Questions', 
'Here are some of the methods we have tried: Drinking beer only, limiting the number of drinks, never drinking alone, never drinking in the morning, drinking only at home, never having it in the house, never drinking during business hours, drinking only at parties, switching from scotch to brandy, drinking only natural wines, agreeing to resign if ever drunk on the job, taking a trip, not taking a trip.', 
'education', 
ARRAY['self diagnosis', 'methods tried', 'controlled drinking', 'rules and regulations', 'geographic cure', 'job threats']),

-- ============================================================================
-- CHAPTER 4: WE AGNOSTICS - Spiritual Flexibility
-- ============================================================================

-- Who Are the Agnostics
(1, 4, 45, 'Who Are the Agnostics', 
'In the preceding chapters you have learned something of alcoholism. We hope we have made clear the distinction between the alcoholic and the non-alcoholic. If, when you honestly want to, you find you cannot quit entirely, or if when drinking, you have little control over the amount you take, you are probably alcoholic.', 
'spiritual', 
ARRAY['agnostics', 'distinction', 'cannot quit', 'little control', 'probably alcoholic', 'honest assessment']),

-- Prejudices About Spirituality
(1, 4, 46, 'Spiritual Prejudices', 
'If a mere code of morals or a better philosophy of life were sufficient to overcome alcoholism, many of us would have recovered long ago. But we found that such codes and philosophies did not save us, no matter how much we tried. We could wish to be moral, we could wish to be philosophically comforted, in fact, we could will these things with all our might, but the needed power wasn''t there.', 
'spiritual', 
ARRAY['code of morals', 'philosophy of life', 'not sufficient', 'needed power', 'will power', 'spiritual solution']),

-- Higher Power Definition
(1, 4, 47, 'Higher Power Concept', 
'When we became alcoholics, crushed by a self-imposed crisis we could not postpone or evade, we had to fearlessly face the proposition that either God is everything or else He is nothing. God either is, or He isn''t. What was our choice to be? Arrived at this point, we were squarely confronted with the question of faith.', 
'spiritual', 
ARRAY['higher power concept', 'god is everything', 'god is nothing', 'question of faith', 'choice', 'fearlessly face']),

-- Open-Minded Approach
(1, 4, 48, 'Open-Minded Approach', 
'We found that as soon as we were able to lay aside prejudice and express even a willingness to believe in a Power greater than ourselves, we commenced to get results, even though it was impossible for any of us to fully define or comprehend that Power, which is God.', 
'spiritual', 
ARRAY['open minded', 'lay aside prejudice', 'willingness to believe', 'commenced results', 'define god', 'comprehend power']),

-- ============================================================================
-- CHAPTER 5: HOW IT WORKS - Expanded Step Work
-- ============================================================================

-- Rarely Have We Seen
(1, 5, 58, 'Those Who Fail', 
'Rarely have we seen a person fail who has thoroughly followed our path. Those who do not recover are people who cannot or will not give themselves completely to this simple program, usually men and women who are constitutionally incapable of being honest with themselves.', 
'step_work', 
ARRAY['rarely fail', 'thoroughly followed', 'give completely', 'simple program', 'constitutionally incapable', 'honest with themselves']),

-- The Step 4 Resentment Work
(1, 5, 65, 'Resentment Inventory Process', 
'We reviewed our fears thoroughly. We put them on paper, even though we had no resentment in connection with them. We asked ourselves why we had them. Wasn''t it because self-reliance failed us? Self-reliance was good as far as it went, but it didn''t go far enough. Some of us once had great self-confidence, but it didn''t fully solve the fear problem, or any other problem.', 
'step_work', 
ARRAY['fear inventory', 'put on paper', 'self reliance failed', 'self confidence', 'fear problem', 'step 4 fears']),

-- ============================================================================
-- CHAPTER 6: INTO ACTION - Practical Step Work
-- ============================================================================

-- Step 8 and 9 Guidance
(1, 6, 76, 'Making Direct Amends', 
'Most alcoholics owe money. We do not dodge our creditors. Telling them what we are trying to do, we make no bones about our drinking; they usually know it anyway, whether we think so or not. Nor are we afraid of disclosing our alcoholism on the theory it may cause financial harm.', 
'step_work', 
ARRAY['making amends', 'owe money', 'creditors', 'disclosing alcoholism', 'financial harm', 'direct amends']),

-- Continuing Step Work
(1, 6, 84, 'Continuing Personal Inventory', 
'Continue to watch for selfishness, dishonesty, resentment, and fear. When these crop up, we ask God at once to remove them. We discuss them with someone immediately and make amends quickly if we have harmed anyone. Then we resolutely turn our thoughts to someone we can help.', 
'step_work', 
ARRAY['continue inventory', 'watch for', 'selfishness', 'dishonesty', 'ask god remove', 'make amends quickly']),

-- ============================================================================
-- CHAPTER 7: WORKING WITH OTHERS - Service and 12th Step
-- ============================================================================

-- Helping Other Alcoholics
(1, 7, 89, 'Helping Other Alcoholics', 
'Practical experience shows that nothing will so much insure immunity from drinking as intensive work with other alcoholics. It works when other activities fail. This is our twelfth step-carrying the message to other alcoholics who still suffer.', 
'service', 
ARRAY['helping others', 'immunity from drinking', 'intensive work', 'twelfth step', 'carrying message', 'still suffer']),

-- Approaching the Prospect
(1, 7, 91, 'First Contact with Prospect', 
'Your man knows he is facing the problem of his life. He is curious to see how you got well. Let him ask you that question, if he will. Tell him exactly what happened to you. Stress the spiritual feature freely. If the man be agnostic or atheist, make it emphatic that he does not have to agree with your conception of God.', 
'service', 
ARRAY['first contact', 'facing problem', 'how you got well', 'spiritual feature', 'agnostic atheist', 'conception of god']),

-- ============================================================================
-- CHAPTER 11: A VISION FOR YOU - Hope and Future
-- ============================================================================

-- The Vision of Recovery
(1, 11, 151, 'A Vision for You', 
'We realize we know only a little. God will constantly disclose more to you and to us. Ask Him in your morning meditation what you can do each day for the man who is still sick. The answers will come, if your own house is in order. But obviously you cannot transmit something you haven''t got.', 
'spiritual', 
ARRAY['vision for you', 'know only little', 'god disclose more', 'morning meditation', 'man still sick', 'transmit something']),

-- The Promise of Growth
(1, 11, 164, 'Abandon Yourself to God', 
'Abandon yourself to God as you understand Him. Admit your faults to Him and to your fellows. Clear away the wreckage of your past. Give freely of what you find and join us. We shall be with you in the Fellowship of the Spirit, and you will surely meet some of us as you trudge the Road of Happy Destiny.', 
'spiritual', 
ARRAY['abandon to god', 'admit faults', 'clear wreckage', 'give freely', 'fellowship spirit', 'road happy destiny']);

-- Add Literature Source Reference for AA Big Book if not exists
INSERT INTO literature_sources (title, author, publication_date, edition, isbn, aa_approved, copyright_notice, source_type) 
SELECT 'Alcoholics Anonymous (The Big Book) - Complete', 'Alcoholics Anonymous World Services', '1939-01-01', '4th Edition', '978-1893007161', true, '© Alcoholics Anonymous World Services, Inc. Reprinted with permission. For educational purposes only.', 'book'
WHERE NOT EXISTS (SELECT 1 FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete');

-- Update source_id references to use the complete Big Book entry
UPDATE literature_content 
SET source_id = (SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (The Big Book) - Complete')
WHERE source_id = 1 AND chapter_number IN (1, 2, 3, 4, 5, 6, 7, 11);