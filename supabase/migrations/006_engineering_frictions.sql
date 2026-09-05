-- Seed frictions for the 8 new non-software engineering mechanics added in
-- src/lib/catalog/blocks.ts (structural, circuit-design, site-systems,
-- process-design, flight-dynamics, biomech-design, environmental-system,
-- manufacturability). Without these, a mechanical/electrical/civil/etc.
-- skill profile could select those mechanics but the generator would never
-- actually draw them, since candidateDomains() only offers domains that
-- already have accepted frictions naming a given mechanic.
--
-- Two per mechanic, deliberately spread across existing domains rather than
-- new ones - a civil-engineering friction fits "Civic & Local Government"
-- or "Transport & Cities" just as well as a software one does.

insert into frictions (domain_id, actor, text, mechanics, status, submitted_by)
values
  -- structural (mechanical)
  ('campus', 'a campus makerspace''s 3D-printing club', 'printed brackets keep snapping under load because nobody checks a stress estimate before printing, so parts get reprinted three or four times', '{"structural"}', 'accepted', null),
  ('sports', 'an intramural adaptive-sports equipment officer', 'grip attachments for adaptive sports gear are sized by eye, and about half of them bend or crack mid-game', '{"structural"}', 'accepted', null),

  -- circuit-design (electrical)
  ('music', 'a student building DIY audio effects pedals', 'the same pedal circuit works fine on a breadboard and then hums or clips once it is actually built into an enclosure', '{"circuit-design"}', 'accepted', null),
  ('accessibility', 'a volunteer building assistive switches for a disabled student', 'off-the-shelf adaptive switches cost more than the family can justify for something this simple, and nobody has designed a cheaper one that is actually reliable', '{"circuit-design"}', 'accepted', null),

  -- site-systems (civil)
  ('civic', 'a small town''s public works office', 'the same stretch of road floods every year and the drainage plan on file was never checked against how water actually moves across that specific site', '{"site-systems"}', 'accepted', null),
  ('transit', 'a campus facilities office', 'a pedestrian bridge gets closed for inspection every year because nobody has a clear record of what load it is actually rated for', '{"site-systems"}', 'accepted', null),

  -- process-design (chemical)
  ('food', 'a small-batch hot sauce maker', 'scaling a recipe from a home kitchen to a commercial batch changes the taste and shelf life in ways nobody can predict before wasting a full batch', '{"process-design"}', 'accepted', null),
  ('agri', 'a campus composting program', 'compost batches randomly turn anaerobic and start smelling, and nobody can say in advance which batches are at risk', '{"process-design"}', 'accepted', null),

  -- flight-dynamics (aerospace)
  ('science', 'a university rocketry club', 'every launch''s stability is guessed from a rule of thumb, and the club has lost more than one rocket to a spin nobody predicted', '{"flight-dynamics"}', 'accepted', null),
  ('gaming', 'a drone racing club', 'custom-built racing drones fly unpredictably after any frame change, and pilots find out mid-flight instead of before', '{"flight-dynamics"}', 'accepted', null),

  -- biomech-design (biomedical)
  ('health', 'a physical therapy clinic', 'off-the-shelf hand splints do not fit half the patients well, and nobody at the clinic has a way to size or adjust one per patient', '{"biomech-design"}', 'accepted', null),
  ('sports', 'a university athletics trainer', 'the same knee brace design gets handed to every athlete regardless of how they actually move, and nobody tracks whether it is helping or making things worse', '{"biomech-design"}', 'accepted', null),

  -- environmental-system (environmental)
  ('climate', 'a neighbourhood community garden', 'nobody knows if the runoff from the garden''s fertiliser use is within any real limit, because it has never actually been measured', '{"environmental-system"}', 'accepted', null),
  ('civic', 'a small manufacturing shop''s compliance officer', 'air quality permit renewals are guessed at from last year''s paperwork instead of an actual current measurement', '{"environmental-system"}', 'accepted', null),

  -- manufacturability (industrial)
  ('work', 'a student-run laser-cutting service', 'the same part design fails to cut cleanly about one time in five, and nobody has worked out why', '{"manufacturability"}', 'accepted', null),
  ('campus', 'a club that batch-assembles kits for younger students', 'each volunteer assembles the kit slightly differently and nobody has a repeatable process, so quality depends entirely on who is working that day', '{"manufacturability"}', 'accepted', null);
