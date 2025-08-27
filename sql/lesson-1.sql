-- Vocab item: puella
insert into public.items (lesson_id, kind, latin, accepted_english, lemmas, morph, parent_tip, media)
select l.id, 'vocab',
  'puella',
  '["girl"]'::jsonb,
  '["puella"]'::jsonb,
  '[{"form":"puella","pos":"N","case":"Nom","num":"S","decl":"1"}]'::jsonb,
  'First declension nominative ending -a.',
  '{"image":"https://YOURURL/media/puella.png"}'::jsonb
from public.lessons l
where l.title = 'Lesson 1 - Carrying Water';

-- Vocab item: puer
insert into public.items (lesson_id, kind, latin, accepted_english, lemmas, morph, parent_tip)
select l.id, 'vocab',
  'puer',
  '["boy"]'::jsonb,
  '["puer"]'::jsonb,
  '[{"form":"puer","pos":"N","case":"Nom","num":"S","decl":"2"}]'::jsonb,
  'Second declension nominative ending often -us, but puer is irregular.'
from public.lessons l where l.title = 'Lesson 1 - Carrying Water';

-- Sentence: Puella aquam portat ad casam.
insert into public.items (lesson_id, kind, latin, accepted_english, lemmas, morph, parent_tip, media)
select l.id, 'sentence',
  'Puella aquam portat ad casam.',
  '["The girl carries water to the house.","The girl is carrying water to the house."]'::jsonb,
  '["puella","aqua","porto","ad","casa"]'::jsonb,
  '[
    {"form":"Puella","pos":"N","case":"Nom","num":"S"},
    {"form":"aquam","pos":"N","case":"Acc","num":"S"},
    {"form":"portat","pos":"V","tense":"Pres","person":"3","num":"S"},
    {"form":"ad","pos":"PREP","req_case":"Acc"},
    {"form":"casam","pos":"N","case":"Acc","num":"S"}
  ]'::jsonb,
  'ad + accusative shows motion toward a place.',
  '{"audio_classical":"https://YOURURL/media/puella-portat.mp3"}'::jsonb
from public.lessons l where l.title = 'Lesson 1 - Carrying Water';

-- Sentence: Puer cibum amat.
insert into public.items (lesson_id, kind, latin, accepted_english, lemmas, morph, parent_tip)
select l.id, 'sentence',
  'Puer cibum amat.',
  '["The boy likes food.","The boy loves food."]'::jsonb,
  '["puer","cibus","amo"]'::jsonb,
  '[
    {"form":"Puer","pos":"N","case":"Nom","num":"S"},
    {"form":"cibum","pos":"N","case":"Acc","num":"S"},
    {"form":"amat","pos":"V","tense":"Pres","person":"3","num":"S"}
  ]'::jsonb,
  'Verb endings -t = 3rd person singular.'
from public.lessons l where l.title = 'Lesson 1 - Carrying Water';

-- Sentence: Puella est in casā.
insert into public.items (lesson_id, kind, latin, accepted_english, lemmas, morph, parent_tip)
select l.id, 'sentence',
  'Puella est in casā.',
  '["The girl is in the house."]'::jsonb,
  '["puella","sum","in","casa"]'::jsonb,
  '[
    {"form":"Puella","pos":"N","case":"Nom","num":"S"},
    {"form":"est","pos":"V","tense":"Pres","person":"3","num":"S"},
    {"form":"in","pos":"PREP","req_case":"Abl"},
    {"form":"casā","pos":"N","case":"Abl","num":"S"}
  ]'::jsonb,
  'in + ablative = location (in/at).'
from public.lessons l where l.title = 'Lesson 1 - Carrying Water';

-- Sentence: Amicus in viam ambulat.
insert into public.items (lesson_id, kind, latin, accepted_english, lemmas, morph, parent_tip)
select l.id, 'sentence',
  'Amicus in viam ambulat.',
  '["A friend walks into the road.","A friend is walking into the road."]'::jsonb,
  '["amicus","in","via","ambulo"]'::jsonb,
  '[
    {"form":"Amicus","pos":"N","case":"Nom","num":"S"},
    {"form":"in","pos":"PREP","req_case":"Acc"},
    {"form":"viam","pos":"N","case":"Acc","num":"S"},
    {"form":"ambulat","pos":"V","tense":"Pres","person":"3","num":"S"}
  ]'::jsonb,
  'in + accusative = motion into/onto.'
from public.lessons l where l.title = 'Lesson 1 - Carrying Water';

-- Picture-match stub (you’ll wire in RN later)
insert into public.items (lesson_id, kind, latin, accepted_english, lemmas, morph, parent_tip, media)
select l.id, 'picture-match',
  'Select: Puella portat aquam.',
  '["The girl carries water."]'::jsonb,
  '["puella","porto","aqua"]'::jsonb,
  '[]'::jsonb,
  'Match the Latin sentence to the correct picture.',
  '{"image":"https://YOURURL/media/choices.png"}'::jsonb
from public.lessons l where l.title = 'Lesson 1 - Carrying Water';
