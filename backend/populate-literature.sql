-- Comprehensive AA Literature Database Population
-- Educational Fair Use - AA World Services Content

-- First, let's add more literature sources
INSERT INTO literature_sources (title, author, publication_date, copyright_notice, source_type, edition) VALUES
('Daily Reflections', 'A.A. World Services', '1990-01-01', '© A.A. World Services, Inc. Used for educational purposes under fair use.', 'daily_reflections', '1st Edition'),
('As Bill Sees It', 'Bill W.', '1967-01-01', '© A.A. World Services, Inc. Used for educational purposes under fair use.', 'as_bill_sees_it', '1st Edition'),
('Came to Believe', 'A.A. Members', '1973-01-01', '© A.A. World Services, Inc. Used for educational purposes under fair use.', 'came_to_believe', '1st Edition')
ON CONFLICT DO NOTHING;

-- Get source IDs for reference
-- Big Book = 1, 12x12 = 2, Living Sober = 3

-- STEP 1 Content (expand existing)
INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES
(2, 1, 21, 'Step One - Powerlessness and Unmanageability', 
'Of all the twelve steps, Step One is the most fundamental. Here we acknowledge our powerlessness over alcohol and admit that our lives have become unmanageable. This admission is not defeat—it is the foundation upon which our recovery is built. Most of us fought this step initially, but eventually came to understand that admitting powerlessness was the beginning of strength.',
'step', 
ARRAY['step 1', 'step one', 'first step', 'powerless', 'unmanageable', 'admission', 'foundation']),

-- STEP 2 Content
(1, 4, 47, 'Came to Believe', 
'Came to believe that a Power greater than ourselves could restore us to sanity. Many of us had difficulty with this step because of our previous ideas about God or religion. We found that we could start with any concept of a Higher Power that worked for us—the AA group itself, nature, or simply the power we saw working in other recovering alcoholics.',
'step', 
ARRAY['step 2', 'step two', 'second step', 'higher power', 'god', 'came to believe', 'sanity', 'power greater']),

(2, 2, 25, 'Step Two Discussion - Came to Believe', 
'Step Two: Came to believe that a Power greater than ourselves could restore us to sanity. The key word here is "came." It suggests a gradual process. We did not have to believe immediately or completely. We simply had to become willing to believe that recovery was possible through a power greater than our own will.',
'step', 
ARRAY['step 2', 'step two', 'came to believe', 'gradual process', 'willingness', 'sanity']),

-- STEP 3 Content  
(1, 5, 60, 'Made a Decision', 
'Made a decision to turn our will and our lives over to the care of God as we understood Him. This step is about making a decision—we are not asked to actually turn over our will perfectly, but simply to make the decision to do so. The phrase "God as we understood Him" allows for personal interpretation and removes religious barriers.',
'step', 
ARRAY['step 3', 'step three', 'third step', 'made a decision', 'turn over will', 'god as we understood', 'care of god']),

(2, 3, 34, 'Step Three - Decision and Surrender', 
'Step Three: Made a decision to turn our will and our lives over to the care of God as we understood Him. This is perhaps the most important step in our recovery. It is the point where we stop fighting and surrender to a power greater than ourselves. The decision precedes the action—we decide first, then learn to live this decision daily.',
'step', 
ARRAY['step 3', 'step three', 'decision', 'surrender', 'turn over', 'stop fighting']),

-- STEP 4 Content
(1, 5, 64, 'Searching and Fearless Moral Inventory', 
'Made a searching and fearless moral inventory of ourselves. We approach this step with courage and honesty. We write down our resentments, fears, and sexual conduct that has harmed others. This is not about self-condemnation, but about honest self-appraisal so we can clear away the wreckage of our past.',
'step', 
ARRAY['step 4', 'step four', 'fourth step', 'moral inventory', 'searching fearless', 'resentments', 'fears', 'honest']),

(2, 4, 42, 'Step Four - The Searching and Fearless Moral Inventory', 
'Step Four: Made a searching and fearless moral inventory of ourselves. A business takes inventory to see what it has and what it lacks. We alcoholics take a moral inventory for the same reason. We need to know exactly what we have been and what we lack, so we can properly address our character defects and build upon our assets.',
'step', 
ARRAY['step 4', 'step four', 'moral inventory', 'character defects', 'assets', 'business inventory']),

-- STEP 5 Content
(1, 6, 72, 'Admitted to God, to Ourselves, and to Another Human Being', 
'Admitted to God, to ourselves, and to another human being the exact nature of our wrongs. This step requires great courage. We share our Step 4 inventory with someone we trust—often our sponsor. This admission brings relief from the burden of secrets and connects us honestly with others.',
'step', 
ARRAY['step 5', 'step five', 'fifth step', 'admitted', 'exact nature wrongs', 'another human being', 'sponsor']),

-- STEP 6 Content
(1, 6, 76, 'Entirely Ready', 
'Were entirely ready to have God remove all these defects of character. Being entirely ready is the key. We may want to hold onto some of our character defects because they seem to serve us in some way. This step asks us to become willing to let go of all our shortcomings, even the ones we think benefit us.',
'step', 
ARRAY['step 6', 'step six', 'sixth step', 'entirely ready', 'character defects', 'remove defects', 'shortcomings']),

(2, 6, 63, 'Step Six - Entirely Ready for Character Change', 
'Step Six: Were entirely ready to have God remove all these defects of character. This step is about willingness and readiness. Few of us are entirely ready all at once. We grow into readiness. The key is becoming willing to have our character defects removed, even when we are not sure we want to give them up.',
'step', 
ARRAY['step 6', 'step six', 'entirely ready', 'character change', 'willingness', 'readiness']),

-- STEP 7 Content
(1, 6, 76, 'Humbly Asked Him to Remove Our Shortcomings', 
'Humbly asked Him to remove our shortcomings. Humility is the key attitude in this step. We do not demand that God remove our defects, but humbly ask. Humility is not self-abasement, but right-sizing—seeing ourselves as we truly are, neither more nor less than human.',
'step', 
ARRAY['step 7', 'step seven', 'seventh step', 'humbly asked', 'remove shortcomings', 'humility', 'right-sizing']),

-- STEP 8 Content
(1, 8, 76, 'Made a List of All Persons We Had Harmed', 
'Made a list of all persons we had harmed, and became willing to make amends to them all. This step is in two parts: making the list and becoming willing. We list everyone we have harmed through our drinking and behavior. Then we work on becoming willing to make amends, even to those we feel wronged us.',
'step', 
ARRAY['step 8', 'step eight', 'eighth step', 'list persons harmed', 'willing', 'make amends', 'harmed']),

-- STEP 9 Content  
(1, 9, 83, 'Made Direct Amends Wherever Possible', 
'Made direct amends to such people wherever possible, except when to do so would injure them or others. We actually make the amends called for in Step 8. We approach each person with humility and make direct amends wherever possible. However, we must be careful not to injure anyone in the process.',
'step', 
ARRAY['step 9', 'step nine', 'ninth step', 'direct amends', 'wherever possible', 'injure them others', 'make amends']),

-- STEP 10 Content
(1, 10, 84, 'Continued to Take Personal Inventory', 
'Continued to take personal inventory and when we were wrong promptly admitted it. This is a daily maintenance step. We watch for resentments, fears, dishonesty, and selfishness. When these arise, we deal with them quickly. We admit our mistakes promptly and make corrections.',
'step', 
ARRAY['step 10', 'step ten', 'tenth step', 'personal inventory', 'promptly admitted', 'daily maintenance', 'wrong']),

-- STEP 11 Content
(1, 11, 85, 'Prayer and Meditation', 
'Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out. This step is about developing our spiritual life through prayer and meditation, seeking Gods will rather than our own.',
'step', 
ARRAY['step 11', 'step eleven', 'eleventh step', 'prayer meditation', 'conscious contact', 'gods will', 'spiritual life']),

-- STEP 12 Content
(1, 11, 89, 'Spiritual Awakening and Helping Others', 
'Having had a spiritual awakening as the result of these Steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs. This step speaks to our spiritual awakening and our responsibility to help other suffering alcoholics. We carry the message through our actions and words.',
'step', 
ARRAY['step 12', 'step twelve', 'twelfth step', 'spiritual awakening', 'carry message', 'practice principles', 'help others']),

-- The Promises
(1, 9, 83, 'The Promises of AA', 
'If we are painstaking about this phase of our development, we will be amazed before we are half way through. We are going to know a new freedom and a new happiness. We will not regret the past nor wish to shut the door on it. We will comprehend the word serenity and we will know peace. Our whole attitude and outlook upon life will change.',
'promises', 
ARRAY['promises', 'new freedom', 'happiness', 'serenity', 'peace', 'attitude change', 'amazed']),

-- Resentments 
(1, 5, 64, 'Resentment - The Number One Offender', 
'Resentment is the "number one" offender. It destroys more alcoholics than anything else. From it stem all forms of spiritual disease, for we have been not only mentally and physically ill, we have been spiritually sick. When the spiritual malady is overcome, we straighten out mentally and physically.',
'resentment', 
ARRAY['resentment', 'number one offender', 'destroys alcoholics', 'spiritual disease', 'spiritual malady']),

-- Fear
(1, 5, 68, 'Fear - Our Response to Threat', 
'This short word somehow touches about every aspect of our lives. It was an evil and corroding thread; the fabric of our existence was shot through with it. Fear of people and of economic insecurity. Fear that we would lose what we had or not get what we wanted. Fear prevented us from making the right decisions.',
'fear', 
ARRAY['fear', 'evil corroding thread', 'fear of people', 'economic insecurity', 'prevented decisions']),

-- Sponsorship
(1, 15, 89, 'Working with Others', 
'Practical experience shows that nothing will so much insure immunity from drinking as intensive work with other alcoholics. It works when other activities fail. This is our twelfth step—and the action behind it. Helping others is the foundation stone of your recovery.',
'sponsorship', 
ARRAY['working with others', 'immunity from drinking', 'intensive work', 'helping others', 'foundation stone']),

-- Higher Power Concept
(1, 4, 46, 'The God of Our Understanding', 
'When we speak to you of God, we mean your own conception of God. This applies, too, to other spiritual expressions which you find in this book. Do not let any prejudice you may have against spiritual terms deter you from honestly asking yourself what they mean to you.',
'spiritual', 
ARRAY['god of understanding', 'own conception', 'spiritual expressions', 'spiritual terms', 'higher power']),

-- Daily Living
(3, 1, 1, 'Staying Sober Today', 
'Living sober is really no more complicated than not drinking today. But it is not always easy or simple. We alcoholics know that drinking for us means trouble, yet we often found it difficult to stay away from that first drink. Here are some suggestions that have helped many of us live sober, one day at a time.',
'daily_living', 
ARRAY['staying sober', 'not drinking today', 'one day at a time', 'first drink', 'live sober']),

-- Meditation and Prayer
(1, 11, 86, 'Morning Meditation', 
'On awakening let us think about the twenty-four hours ahead. We consider our plans for the day. Before we begin, we ask God to direct our thinking, especially asking that it be divorced from self-pity, dishonest or self-seeking motives. We may ask ourselves: What can I do today for the man who is still sick?',
'prayer', 
ARRAY['morning meditation', 'twenty-four hours', 'ask god direct', 'self-pity dishonest', 'man still sick']);

-- Update statistics
ANALYZE literature_sources;
ANALYZE literature_content;

-- Show final count
SELECT 
    'Literature database populated!' as status,
    (SELECT COUNT(*) FROM literature_sources) as total_sources,
    (SELECT COUNT(*) FROM literature_content) as total_content_chunks,
    (SELECT COUNT(*) FROM literature_content WHERE content_type = 'step') as step_content,
    (SELECT COUNT(*) FROM literature_content WHERE content_type = 'promises') as promises_content;