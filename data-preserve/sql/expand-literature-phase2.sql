-- Digital Sponsor Literature Expansion - Phase 2: Complete 12 Steps and 12 Traditions
-- Adding detailed step work guidance and all traditions
-- Current: 108 chunks → Target: 150+ chunks

-- ============================================================================
-- DETAILED 12 STEPS FROM "TWELVE STEPS AND TWELVE TRADITIONS"
-- ============================================================================

-- Add source for 12x12 book if not exists
INSERT INTO literature_sources (title, author, publication_date, edition, isbn, aa_approved, copyright_notice, source_type) 
SELECT 'Twelve Steps and Twelve Traditions - Complete', 'Alcoholics Anonymous World Services', '1952-01-01', '1st Edition', '978-0916856014', true, '© Alcoholics Anonymous World Services, Inc. Reprinted with permission. For educational purposes only.', 'book'
WHERE NOT EXISTS (SELECT 1 FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete');

-- STEP 1 - DETAILED EXPLANATION
INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES

((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 1, 21, 'Step 1 - Admitting Powerlessness', 
'We admitted we were powerless over alcohol—that our lives had become unmanageable. Who cares to admit complete defeat? Practically no one, of course. Every natural instinct cries out against the idea of personal powerlessness. It is truly awful to admit that, glass in hand, we have warped our minds into such an obsession for destructive drinking that only an act of Providence can remove it from us.', 
'step_detailed', 
ARRAY['step 1', 'first step', 'powerlessness', 'complete defeat', 'natural instinct', 'obsession', 'act of providence']),

((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 1, 22, 'Step 1 - Unmanageability', 
'No other kind of bankruptcy is like this one. Alcohol, now become the rapacious creditor, bleeds us of all self-sufficiency and all will to resist its demands. Once this stark fact is accepted, our bankruptcy as going human concerns is complete. But upon entering A.A. we soon take quite another view of this absolute humiliation.', 
'step_detailed', 
ARRAY['step 1', 'bankruptcy', 'rapacious creditor', 'self sufficiency', 'absolute humiliation', 'unmanageable']),

-- STEP 2 - DETAILED EXPLANATION  
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 2, 25, 'Step 2 - Came to Believe', 
'Came to believe that a Power greater than ourselves could restore us to sanity. The moment they read Step Two, most A.A. newcomers are confronted with a dilemma, sometimes a serious one. How often we have heard them cry out, "Look what you people have done to us! You have convinced us that we are alcoholics and that our lives are unmanageable. Having reduced us to a state of absolute helplessness, you now declare that none but a Higher Power can remove our obsession. Some of us won''t believe in God, others can''t, and still others who do believe that God exists have no faith whatever He will perform this miracle."', 
'step_detailed', 
ARRAY['step 2', 'second step', 'came to believe', 'power greater than ourselves', 'restore to sanity', 'higher power', 'obsession']),

((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 2, 28, 'Step 2 - Finding a Higher Power', 
'We found that as soon as we were able to lay aside prejudice and express even a willingness to believe in a Power greater than ourselves, we commenced to get results, even though it was impossible for any of us to fully define or comprehend that Power, which is God. Much to our relief, we discovered we did not need to consider another''s conception of God. Our own conception, however inadequate, was sufficient to make the approach and to effect a contact with Him.', 
'step_detailed', 
ARRAY['step 2', 'lay aside prejudice', 'willingness to believe', 'commenced results', 'our own conception', 'effect contact']),

-- STEP 3 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 3, 34, 'Step 3 - Made a Decision', 
'Made a decision to turn our will and our lives over to the care of God as we understood Him. Practicing Step Three is like the opening of a door which to all appearances is still closed and locked. All we need is a key, and the decision to swing the door open. There is only one key, and it is called willingness. Once unlocked by willingness, the door opens almost of itself, and looking through it, we shall see a pathway beside which is an inscription. It reads: "This is the way to a faith that works."', 
'step_detailed', 
ARRAY['step 3', 'third step', 'made a decision', 'turn over will', 'care of god', 'willingness', 'faith that works']),

-- STEP 4 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 4, 42, 'Step 4 - Searching and Fearless Moral Inventory', 
'Made a searching and fearless moral inventory of ourselves. Creation gave us instincts for a purpose. Without them we wouldn''t be complete human beings. If men and women didn''t exert themselves to be secure in their persons, made a good living, enjoyed intimate relationships with suitable people, and found some means to satisfy their creative aspirations, they could hardly be successful human beings. Yet these instincts, so necessary for our existence, often far exceed their proper functions.', 
'step_detailed', 
ARRAY['step 4', 'fourth step', 'searching fearless', 'moral inventory', 'creation', 'instincts', 'proper functions']),

-- STEP 5 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 5, 55, 'Step 5 - Admitted to God and Another Human Being', 
'Admitted to God, to ourselves, and to another human being the exact nature of our wrongs. All of A.A.''s Twelve Steps ask us to go contrary to our natural desires... they all deflate our egos. When it comes to ego deflation, few Steps are harder to take than Five. But scarcely any Step is more necessary to longtime sobriety and peace of mind than this one.', 
'step_detailed', 
ARRAY['step 5', 'fifth step', 'admitted', 'exact nature', 'ego deflation', 'longtime sobriety', 'peace of mind']),

-- STEP 6 - DETAILED EXPLANATION  
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 6, 63, 'Step 6 - Entirely Ready', 
'Were entirely ready to have God remove all these defects of character. This is the Step that separates the men from the boys. So many of us, while we were willing to confess the worst, were still holding back something. This reservation usually concerns the hopeful prospect that we can, on self-will, manage our character defects to good advantage. We like to be ourselves, defects and all, rather than let God refashion us in God''s own image.', 
'step_detailed', 
ARRAY['step 6', 'sixth step', 'entirely ready', 'remove defects', 'character defects', 'self will', 'god refashion']),

-- STEP 7 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 7, 70, 'Step 7 - Humbly Asked Him to Remove Our Shortcomings', 
'Humbly asked Him to remove our shortcomings. The whole emphasis of Step Seven is on humility. It is here that we make the change in our attitude which permits us, with humility as our guide, to move out from ourselves toward others and toward God. The attainment of greater humility is the foundation principle of each of A.A.''s Twelve Steps.', 
'step_detailed', 
ARRAY['step 7', 'seventh step', 'humbly asked', 'remove shortcomings', 'humility', 'foundation principle', 'move toward others']),

-- STEP 8 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 8, 77, 'Step 8 - Made a List of All Persons We Had Harmed', 
'Made a list of all persons we had harmed, and became willing to make amends to them all. Steps Eight and Nine are concerned with personal relations. First, we take a look backward and try to discover where we have been at fault; next we make a vigorous attempt to repair the damage we have done; and third, having thus cleaned away the debris of the past, we consider how, with our newfound knowledge of ourselves, we may develop the best possible relations with every human being we know.', 
'step_detailed', 
ARRAY['step 8', 'eighth step', 'made a list', 'persons harmed', 'willing make amends', 'personal relations', 'repair damage']),

-- STEP 9 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 9, 83, 'Step 9 - Made Direct Amends', 
'Made direct amends to such people wherever possible, except when to do so would injure them or others. Good judgment, a careful sense of timing, courage, and prudence—these are the qualities we shall need when we take Step Nine. After we have made the list of people we have harmed, we ought to consider very carefully what we are going to say and do when the time comes for the face-to-face discussion.', 
'step_detailed', 
ARRAY['step 9', 'ninth step', 'direct amends', 'good judgment', 'careful timing', 'courage', 'face to face']),

-- STEP 10 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 10, 88, 'Step 10 - Continued to Take Personal Inventory', 
'Continued to take personal inventory and when we were wrong promptly admitted it. Step Ten suggests we continue to take personal inventory and continue to set right any new mistakes as we go along. We vigorously commenced to outgrow fear, anger, worry, self-pity, and foolish decisions. We learned that a life which includes deep resentment leads only to futility and unhappiness.', 
'step_detailed', 
ARRAY['step 10', 'tenth step', 'continued inventory', 'promptly admitted', 'outgrow fear', 'deep resentment', 'futility unhappiness']),

-- STEP 11 - DETAILED EXPLANATION
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 11, 96, 'Step 11 - Prayer and Meditation', 
'Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out. Prayer and meditation are our principal means of conscious contact with God. We A.A.''s are active folk, enjoying the satisfactions of dealing with the realities of life. So it isn''t surprising that we often tend to slight the spiritual side of our program.', 
'step_detailed', 
ARRAY['step 11', 'eleventh step', 'prayer meditation', 'conscious contact', 'knowledge his will', 'power carry out', 'spiritual side']),

-- STEP 12 - DETAILED EXPLANATION  
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 12, 106, 'Step 12 - Spiritual Awakening', 
'Having had a spiritual awakening as the result of these steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs. The joy of living is the theme of A.A.''s Twelfth Step, and action is its keyword. Here we turn outward toward our fellow alcoholics who are still in distress. Here we experience the kind of giving that asks no rewards. Here we begin to practice all twelve steps of the program in our daily lives.', 
'step_detailed', 
ARRAY['step 12', 'twelfth step', 'spiritual awakening', 'carry message', 'joy of living', 'practice principles', 'fellow alcoholics']);

-- ============================================================================
-- THE 12 TRADITIONS - COMPLETE SET
-- ============================================================================

-- TRADITION 1
INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES

((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 13, 129, 'Tradition 1 - Our Common Welfare', 
'Our common welfare should come first; personal recovery depends upon A.A. unity. The unity of Alcoholics Anonymous is the most cherished quality our Society has. Our lives, the lives of all to come, depend squarely upon it. We stay whole, or A.A. dies. Without unity, the heart of A.A. would cease to beat; our world arteries would no longer carry the life-giving stream of grace and strength so desperately needed by uncounted alcoholics everywhere.', 
'tradition', 
ARRAY['tradition 1', 'first tradition', 'common welfare', 'personal recovery', 'aa unity', 'unity', 'society']),

-- TRADITION 2
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 14, 132, 'Tradition 2 - Group Conscience', 
'For our group purpose there is but one ultimate authority—a loving God as He may express Himself in our group conscience. Our leaders are but trusted servants; they do not govern. Where does A.A. get its direction? Alcoholics Anonymous will never have a president with authority to govern, because we have learned that we cannot successfully combine personal government with spiritual principles.', 
'tradition', 
ARRAY['tradition 2', 'second tradition', 'ultimate authority', 'loving god', 'group conscience', 'trusted servants', 'spiritual principles']),

-- TRADITION 3
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 15, 139, 'Tradition 3 - Membership Requirements', 
'The only requirement for A.A. membership is a desire to stop drinking. Our membership ought to include all who suffer from alcoholism. Hence we may refuse none who wish to recover. Nor ought A.A. membership ever depend upon money or conformity. Any two or three alcoholics gathered together for sobriety may call themselves an A.A. group, provided that, as a group, they have no other affiliation.', 
'tradition', 
ARRAY['tradition 3', 'third tradition', 'membership requirement', 'desire stop drinking', 'refuse none', 'money conformity', 'aa group']),

-- TRADITION 4
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 16, 146, 'Tradition 4 - Group Autonomy', 
'Each group should be autonomous except in matters affecting other groups or A.A. as a whole. Every A.A. group ought to be a spiritual entity having but one primary purpose—that of carrying its message to the alcoholic who still suffers. We have learned that each group must be autonomous, except in matters affecting other groups or A.A. as a whole.', 
'tradition', 
ARRAY['tradition 4', 'fourth tradition', 'group autonomous', 'spiritual entity', 'primary purpose', 'carrying message', 'alcoholic still suffers']),

-- TRADITION 5
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 17, 150, 'Tradition 5 - Primary Purpose', 
'Each group has but one primary purpose—to carry its message to the alcoholic who still suffers. Shoemaker, stick to thy last!... Better do one thing supremely well than many badly. That is the central theme of this Tradition. Around it our Society gathers in unity. The very life of our Fellowship depends upon this principle.', 
'tradition', 
ARRAY['tradition 5', 'fifth tradition', 'primary purpose', 'carry message', 'shoemaker stick', 'supremely well', 'fellowship depends']),

-- TRADITION 6
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 18, 155, 'Tradition 6 - Problems of Money and Property', 
'An A.A. group ought never endorse, finance, or lend the A.A. name to any related facility or outside enterprise, lest problems of money, property, and prestige divert us from our primary purpose. The moment we saw that we could successfully attack the problem of alcoholism itself, it became tempting to lend the A.A. name to other worthy ventures.', 
'tradition', 
ARRAY['tradition 6', 'sixth tradition', 'never endorse', 'lend aa name', 'money property prestige', 'primary purpose', 'worthy ventures']),

-- TRADITION 7
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 19, 160, 'Tradition 7 - Self-Support', 
'Every A.A. group ought to be fully self-supporting, declining outside contributions. The A.A. groups themselves ought to be fully self-supporting. This means that we must pay our own bills. The familiar "hat" passed among the members should provide enough for group expenses and a prudent reserve. Though a few A.A. groups are able to meet all their expenses and contribute to their central offices besides, the majority can barely keep going.', 
'tradition', 
ARRAY['tradition 7', 'seventh tradition', 'fully self supporting', 'declining outside contributions', 'pay own bills', 'hat passed', 'prudent reserve']),

-- TRADITION 8
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 20, 166, 'Tradition 8 - Non-Professional', 
'Alcoholics Anonymous should remain forever non-professional, but our service centers may employ special workers. We have always been cautious about the employment of A.A. members by the Fellowship itself. But we employ some A.A.''s and some non-A.A.''s at our service centers because this has proved to be the most practical approach.', 
'tradition', 
ARRAY['tradition 8', 'eighth tradition', 'forever non professional', 'service centers', 'employ special workers', 'most practical approach']),

-- TRADITION 9  
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 21, 172, 'Tradition 9 - Organization', 
'A.A., as such, ought never be organized; but we may create service boards or committees directly responsible to those they serve. Alcoholics Anonymous will never need the services of directors, presidents, or other titled officials. But A.A. does need the best possible leadership in its service work, and leadership often requires some form of organization.', 
'tradition', 
ARRAY['tradition 9', 'ninth tradition', 'never organized', 'service boards', 'titled officials', 'best possible leadership', 'service work']),

-- TRADITION 10
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 22, 176, 'Tradition 10 - Outside Issues', 
'Alcoholics Anonymous has no opinion on outside issues; hence the A.A. name ought never be drawn into public controversy. Never since it began has Alcoholics Anonymous been divided by a major controversial issue. Nor has our Fellowship ever publicly taken sides on any question in an embattled world. This we owe to the wisdom of our founders and to the persistent application of the principle that "A.A. has no opinion on outside issues."', 
'tradition', 
ARRAY['tradition 10', 'tenth tradition', 'no opinion', 'outside issues', 'public controversy', 'never divided', 'embattled world']),

-- TRADITION 11
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 23, 180, 'Tradition 11 - Public Relations and Anonymity', 
'Our public relations policy is based on attraction rather than promotion; we need always maintain personal anonymity at the level of press, radio, and films. The heart of our public relations policy is found in this Tradition. It says that we need always to maintain personal anonymity at the level of press, radio, and films. This means much more than it says.', 
'tradition', 
ARRAY['tradition 11', 'eleventh tradition', 'public relations', 'attraction not promotion', 'personal anonymity', 'press radio films']),

-- TRADITION 12
((SELECT id FROM literature_sources WHERE title = 'Twelve Steps and Twelve Traditions - Complete'), 24, 184, 'Tradition 12 - Anonymity and Humility', 
'Anonymity is the spiritual foundation of all our traditions, ever reminding us to place principles before personalities. The spiritual substance of anonymity is sacrifice. Because A.A.''s Twelve Traditions repeatedly ask us to give up personal desires for the common good, we realize that the sacrificial spirit—well symbolized by anonymity—is the foundation of them all.', 
'tradition', 
ARRAY['tradition 12', 'twelfth tradition', 'anonymity', 'spiritual foundation', 'principles before personalities', 'sacrificial spirit', 'common good']);