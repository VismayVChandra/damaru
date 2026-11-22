-- Frictions for the physical half of the catalogue.
--
-- Ten new mechanics were added for hardware, mechanical and electrical work,
-- but a mechanic no friction names can never be drawn - which is how
-- 'offline-sync' sat undrawable since the day it was written. This gives every
-- mechanic at least eight frictions to answer.
--
-- Two shapes of change, both deliberate:
--   1. UPDATEs that add physical mechanics to frictions that already existed,
--      so a hardware answer and a software answer compete for the same
--      problem rather than living in separate pools.
--   2. INSERTs of new frictions, each naming 2-4 mechanics. The old
--      engineering frictions named exactly one, which left the sampler no
--      choice to make at all.

begin;

update frictions set mechanics = array(select distinct unnest(mechanics || array['sensor', 'instrumentation']))
  where domain_id = 'climate' and text like '%energy bills arrive monthly%';

update frictions set mechanics = array(select distinct unnest(mechanics || array['sensor', 'capture']))
  where domain_id = 'food' and text like '%food goes off at the back of the fridge%';

update frictions set mechanics = array(select distinct unnest(mechanics || array['sensor', 'capture']))
  where domain_id = 'campus' and text like '%attendance is guessed from a group chat%';

update frictions set mechanics = array(select distinct unnest(mechanics || array['sensor', 'biomech-design']))
  where domain_id = 'health' and text like '%exercises are prescribed on a photocopied sheet%';

update frictions set mechanics = array(select distinct unnest(mechanics || array['capture', 'offline-sync']))
  where domain_id = 'pets' and text like '%vaccination and neutering records are on paper%';

update frictions set mechanics = array(select distinct unnest(mechanics || array['instrumentation', 'capture']))
  where domain_id = 'music' and text like '%the same soundcheck problems recur every week%';

update frictions set mechanics = array(select distinct unnest(mechanics || array['capture', 'enclosure', 'offline-sync']))
  where domain_id = 'science' and text like '%observations are recorded on paper in the rain%';

update frictions set mechanics = array(select distinct unnest(mechanics || array['offline-sync', 'geo']))
  where domain_id = 'campus' and text like '%volunteers repeat surveys of the same site%';

-- New frictions.
insert into frictions (domain_id, actor, text, mechanics, status) values
  ('campus', 'a hostel mess committee', 'the third-floor water cooler runs dry by mid-morning and nobody finds out until they have climbed the stairs', array['sensor', 'power-budget', 'offline-sync'], 'accepted'),
  ('campus', 'a lab technician managing shared equipment', 'the shared microscope gets booked, then left switched on overnight, and nobody can say who by', array['sensor', 'autonomy', 'capture'], 'accepted'),
  ('campus', 'a student running the department workshop', 'the 3D printer fails silently at three in the morning and wastes an entire spool before anyone sees', array['sensor', 'teleop', 'autonomy'], 'accepted'),
  ('campus', 'a hostel warden doing nightly rounds', 'the back stairwell fire door gets propped open most nights and there is no record of it', array['sensor', 'enclosure', 'offline-sync'], 'accepted'),
  ('campus', 'a society storing kit in a shared cupboard', 'equipment disappears from the shared cupboard and the sign-out sheet has been blank since March', array['capture', 'sensor', 'enclosure'], 'accepted'),
  ('campus', 'a society building a parade float', 'the float frame gets designed by eye and nobody can say whether it will hold six people standing', array['structural', 'tolerance-stack', 'mechanism'], 'accepted'),
  ('campus', 'a student society running late-night events', 'the PA gets wheeled between three venues and something is damaged or missing nearly every time', array['enclosure', 'manufacturability', 'capture'], 'accepted'),
  ('science', 'a field ecologist counting species by hand', 'counting bats at dusk means working a hand tally while holding a torch and a notebook', array['capture', 'instrumentation', 'enclosure'], 'accepted'),
  ('science', 'a lab demonstrator running the same practical weekly', 'the same practical is rebuilt from scratch sixty times a term and the alignment is different every time', array['manufacturability', 'tolerance-stack', 'mechanism'], 'accepted'),
  ('science', 'a researcher logging a long experiment', 'the rig needs a reading every twenty minutes for nine days and somebody has been sleeping in the lab', array['autonomy', 'power-budget', 'sensor'], 'accepted'),
  ('science', 'a student calibrating lab instruments', 'nobody trusts the old balance and nobody has checked it against a known mass in two years', array['instrumentation', 'manufacturability', 'sensor'], 'accepted'),
  ('science', 'a student rocketry team', 'the altimeter data only comes back after the flight, so nobody knows what happened during it', array['teleop', 'instrumentation', 'flight-dynamics'], 'accepted'),
  ('science', 'a drone mapping team surveying a field', 'the drone flies the grid perfectly in still air and drifts badly in any wind at all', array['flight-dynamics', 'control-loop', 'autonomy'], 'accepted'),
  ('science', 'a lab group sharing one fume hood', 'experiments queue for the fume hood and the schedule collapses the moment one run overruns', array['scheduling', 'process-design', 'capture'], 'accepted'),
  ('sports', 'a runner training for a first half marathon', 'training load lives in a notebook and injuries arrive with no warning anybody could read', array['sensor', 'timeseries', 'biomech-design'], 'accepted'),
  ('sports', 'a rowing club coach', 'ergometer numbers get written on a whiteboard and wiped before anyone has analysed them', array['capture', 'instrumentation', 'sensor'], 'accepted'),
  ('sports', 'a university archery club', 'arrows are scored by walking to the target after every end, which halves the practice time', array['vision', 'teleop', 'sensor'], 'accepted'),
  ('sports', 'a climbing wall setting routes', 'holds get re-set by feel and nobody records what made a route good or awful', array['capture', 'structuring', 'gameloop'], 'accepted'),
  ('climate', 'a neighbourhood tree-planting group', 'nobody knows which of last year''s saplings actually survived the summer', array['sensor', 'autonomy', 'power-budget'], 'accepted'),
  ('climate', 'a campus sustainability committee', 'the building''s energy dashboard shows one number for the whole block and hides where it goes', array['instrumentation', 'sensor', 'viz'], 'accepted'),
  ('climate', 'a group installing a rainwater harvester', 'the tank overflows in heavy rain and floods the path it was supposed to protect', array['site-systems', 'process-design', 'control-loop'], 'accepted'),
  ('climate', 'a community composting scheme', 'the compost either goes anaerobic and stinks or dries out, and nobody can tell which until too late', array['sensor', 'process-design', 'environmental-system'], 'accepted'),
  ('climate', 'a river monitoring volunteer group', 'water samples are taken monthly by hand, so every pollution spike between visits is invisible', array['autonomy', 'instrumentation', 'environmental-system'], 'accepted'),
  ('agri', 'a rooftop garden collective', 'the irrigation runs on a timer that has no idea whether it rained yesterday', array['control-loop', 'sensor', 'autonomy'], 'accepted'),
  ('agri', 'a rooftop garden collective', 'the greenhouse vents have to be opened and shut by hand twice a day, weekends included', array['actuation', 'control-loop', 'autonomy'], 'accepted'),
  ('agri', 'a small-scale mushroom grower', 'the grow tent needs humidity held in a narrow band and the cheap controller overshoots constantly', array['control-loop', 'instrumentation', 'enclosure'], 'accepted'),
  ('transit', 'a cycling advocacy group', 'the council calls the junction safe and has no data at all on near-misses', array['sensor', 'vision', 'instrumentation'], 'accepted'),
  ('transit', 'a student commuting by bike', 'the bike rack is full by nine and there is no way to know before cycling over', array['sensor', 'offline-sync', 'power-budget'], 'accepted'),
  ('transit', 'a campus shuttle driver', 'the shuttle runs to a timetable nobody has checked against how long the route actually takes', array['timeseries', 'capture', 'offline-sync'], 'accepted'),
  ('accessibility', 'a wheelchair user navigating campus', 'the step-free route map is wrong in three places and nobody has updated it in years', array['geo', 'capture', 'offline-sync'], 'accepted'),
  ('accessibility', 'an occupational therapist fitting adaptive equipment', 'every adaptive grip has to be shaped to one hand and the workshop remakes it four times over', array['biomech-design', 'tolerance-stack', 'manufacturability'], 'accepted'),
  ('accessibility', 'a student with limited hand mobility', 'the lab equipment assumes two steady hands and there is no adapted version of any of it', array['biomech-design', 'mechanism', 'manufacturability'], 'accepted'),
  ('health', 'a ward nurse checking equipment', 'every infusion pump has to be checked by hand each shift and the log is a clipboard', array['capture', 'instrumentation', 'offline-sync'], 'accepted'),
  ('music', 'the sound engineer at a 200-capacity venue', 'the same soundcheck faults recur weekly and the fixes live only in one person''s memory', array['capture', 'instrumentation', 'structuring'], 'accepted'),
  ('music', 'a student building DIY audio effects pedals', 'the circuit behaves perfectly on a breadboard and hums the moment it goes in an enclosure', array['circuit-design', 'enclosure', 'instrumentation'], 'accepted'),
  ('music', 'a rehearsal room shared by six bands', 'the room gets left with cables knotted and amps on, and the next band loses twenty minutes', array['enclosure', 'capture', 'power-budget'], 'accepted'),
  ('art', 'a ceramics studio sharing a kiln', 'the kiln schedule is a paper sheet and firings get ruined when incompatible work is loaded together', array['scheduling', 'sensor', 'offline-sync'], 'accepted'),
  ('art', 'a student running a print workshop', 'screen registration is eyeballed, so every multi-colour run wastes the first ten pulls', array['manufacturability', 'tolerance-stack', 'mechanism'], 'accepted'),
  ('art', 'a student documenting their own work', 'the camera rig gets repositioned by hand for every piece and nothing comes out consistent', array['actuation', 'mechanism', 'manufacturability'], 'accepted'),
  ('gaming', 'a student building an arcade cabinet', 'the controls feel mushy and nobody can say which part of the chain is adding the delay', array['perf', 'circuit-design', 'instrumentation'], 'accepted'),
  ('gaming', 'a tabletop group running a long campaign', 'the campaign state lives in one person''s head and the session stalls whenever they are away', array['structuring', 'offline-sync', 'gameloop'], 'accepted'),
  ('gaming', 'a student running a game jam server', 'the leaderboard takes nine seconds to load during the jam, so nobody looks at it', array['perf', 'pipeline', 'viz'], 'accepted'),
  ('gaming', 'a board game designer testing a prototype', 'every balance change means reprinting the whole deck and waiting a week to test it', array['gameloop', 'manufacturability', 'simulate'], 'accepted'),
  ('food', 'a campus cafe trying to cut waste', 'unsold food is binned at close and nobody has ever measured how much', array['sensor', 'capture', 'environmental-system'], 'accepted'),
  ('food', 'a student running a weekly supper club', 'there is one oven and six dishes that each want a different temperature', array['scheduling', 'control-loop', 'process-design'], 'accepted'),
  ('food', 'a student brewing on a small scale', 'the brew works at five litres and goes wrong every time at fifty', array['process-design', 'control-loop', 'instrumentation'], 'accepted'),
  ('work', 'a maker space managing shared tools', 'tools walk off and the sign-out whiteboard has been out of date since term started', array['sensor', 'enclosure', 'capture'], 'accepted'),
  ('work', 'a small workshop quoting custom jobs', 'every quote is a guess because nobody tracks how long a job actually took', array['capture', 'timeseries', 'manufacturability'], 'accepted'),
  ('work', 'a researcher processing field recordings', 'the analysis takes six hours and has to be rerun from scratch every time a parameter changes', array['perf', 'pipeline', 'timeseries'], 'accepted'),
  ('money', 'a student society treasurer', 'receipts arrive as photos in a group chat and reconciliation takes a weekend', array['vision', 'structuring', 'offline-sync'], 'accepted'),
  ('civic', 'a residents group documenting a damp problem', 'the landlord disputes the damp and nobody has a record that would stand up anywhere', array['sensor', 'instrumentation', 'offline-sync'], 'accepted'),
  ('civic', 'a community repair cafe', 'the same three faults come back again and again and nobody has written down the fix', array['structuring', 'manufacturability', 'capture'], 'accepted'),
  ('civic', 'a volunteer group building raised beds', 'the beds rot at the corners within two seasons and get rebuilt every single year', array['site-systems', 'structural', 'manufacturability'], 'accepted'),
  ('civic', 'a group running a community noticeboard', 'the noticeboard is outdoors, solar-powered, and dead for most of the winter', array['power-budget', 'enclosure', 'instrumentation'], 'accepted'),
  ('education', 'a school teacher with one shared computer lab', 'the lab machines are reimaged weekly and student work vanishes with them', array['offline-sync', 'structuring', 'pipeline'], 'accepted'),
  ('education', 'a robotics club mentor teaching beginners', 'every beginner''s first robot works on the bench and fails on the competition floor', array['tolerance-stack', 'control-loop', 'structural'], 'accepted'),
  ('education', 'a physics teacher demonstrating experiments', 'the demo apparatus takes twenty minutes to set up and the lesson is forty', array['manufacturability', 'mechanism', 'tolerance-stack'], 'accepted'),
  ('education', 'a workshop technician teaching machining', 'beginners scrap the same part the same way and the fix is explained one person at a time', array['manufacturability', 'tolerance-stack', 'capture'], 'accepted'),
  ('pets', 'someone fostering rescue animals', 'a sick animal needs watching overnight and the foster cannot stay awake for it', array['sensor', 'autonomy', 'teleop'], 'accepted'),
  ('pets', 'someone fostering rescue animals', 'portion-controlled feeding means being home at exact times and the schedule rules the whole day', array['actuation', 'autonomy', 'mechanism'], 'accepted'),
  ('language', 'a sign language tutor', 'practice needs a partner and students have nobody to practise with between classes', array['vision', 'gameloop', 'capture'], 'accepted'),
  ('campus', 'a student running the department workshop', 'the camera that films the workshop for remote students has to be aimed by hand at whoever is speaking', array['actuation', 'teleop', 'vision'], 'accepted'),
  ('science', 'a lab demonstrator running the same practical weekly', 'samples are positioned under the microscope by hand and no two runs line up the same way', array['actuation', 'tolerance-stack', 'mechanism'], 'accepted'),
  ('food', 'a campus cafe trying to cut waste', 'the grinder dose is set by eye, so every barista pulls a different weight', array['actuation', 'instrumentation', 'process-design'], 'accepted'),
  ('accessibility', 'a student with limited hand mobility', 'the doors on the accessible route need a hard shove and there is no powered option', array['actuation', 'structural', 'biomech-design'], 'accepted'),
  ('art', 'a ceramics studio sharing a kiln', 'the wheel speed runs through a worn foot pedal that jumps between settings', array['actuation', 'circuit-design', 'control-loop'], 'accepted'),
  ('science', 'a researcher logging a long experiment', 'the analysis notebook takes so long to run that nobody ever explores an alternative', array['perf', 'pipeline', 'timeseries'], 'accepted'),
  ('education', 'a school teacher with one shared computer lab', 'the shared machines take eleven minutes to log in and the lesson is gone by then', array['perf', 'offline-sync', 'capture'], 'accepted'),
  ('music', 'a student building DIY audio effects pedals', 'the digital effect adds just enough latency that playing through it feels wrong', array['perf', 'circuit-design', 'instrumentation'], 'accepted'),
  ('transit', 'a cycling advocacy group', 'the near-miss video archive is too big to search, so nobody ever reviews it', array['perf', 'vision', 'pipeline'], 'accepted'),
  ('campus', 'a society storing kit in a shared cupboard', 'the event battery packs are a mess of mismatched cells and chargers nobody trusts', array['circuit-design', 'power-budget', 'enclosure'], 'accepted'),
  ('science', 'a student rocketry team', 'the flight electronics reset on launch vibration and nobody knows which rail browns out', array['circuit-design', 'instrumentation', 'enclosure'], 'accepted'),
  ('agri', 'a small-scale mushroom grower', 'the sensors read fine on the bench and drift badly once the fans are running', array['circuit-design', 'instrumentation', 'control-loop'], 'accepted'),
  ('pets', 'a vet clinic running on paper files', 'the ageing monitor beeps constantly and there is no way to silence only the nuisance alarms', array['circuit-design', 'instrumentation', 'enclosure'], 'accepted'),
  ('campus', 'a hostel warden doing nightly rounds', 'the courtyard floods in heavy rain because the drain went where it was convenient to dig', array['site-systems', 'environmental-system', 'structural'], 'accepted'),
  ('agri', 'a rooftop garden collective', 'nobody ever calculated the roof garden''s loaded weight and the building manager wants proof', array['site-systems', 'structural', 'tolerance-stack'], 'accepted'),
  ('civic', 'a volunteer group building raised beds', 'the allotment path turns to mud by November and the wheelbarrow route becomes unusable', array['site-systems', 'structural', 'manufacturability'], 'accepted'),
  ('climate', 'a campus sustainability committee', 'the new bike shelter was sited where it funnels the wind, so nobody parks there', array['site-systems', 'structural', 'capture'], 'accepted'),
  ('science', 'a drone mapping team surveying a field', 'the battery estimate is wildly optimistic and the aircraft has landed short twice', array['flight-dynamics', 'power-budget', 'instrumentation'], 'accepted'),
  ('sports', 'a university archery club', 'the club wants aerial footage and every cheap drone shot is unusable in any wind', array['flight-dynamics', 'control-loop', 'teleop'], 'accepted'),
  ('science', 'a student rocketry team', 'the fins were sized by guesswork and the rocket weathercocks hard in a crosswind', array['flight-dynamics', 'structural', 'simulate'], 'accepted'),
  ('climate', 'a river monitoring volunteer group', 'surveying the river needs steady low passes and the craft cannot hold a line', array['flight-dynamics', 'autonomy', 'control-loop'], 'accepted'),
  ('science', 'a researcher logging a long experiment', 'the rig lives in a cold room and every small adjustment is a twenty-minute round trip', array['teleop', 'autonomy', 'instrumentation'], 'accepted'),
  ('campus', 'a lab technician managing shared equipment', 'the equipment room locks out of hours and nobody remote can reset a stuck machine', array['teleop', 'autonomy', 'enclosure'], 'accepted'),
  ('civic', 'a residents group documenting a damp problem', 'the sensor sits in a flat the group cannot enter and the readings have to get out somehow', array['teleop', 'offline-sync', 'power-budget'], 'accepted'),
  ('education', 'a robotics club mentor teaching beginners', 'beginners cannot drive the robot and watch it at the same time, so they crash it', array['teleop', 'control-loop', 'gameloop'], 'accepted'),
  ('sports', 'a climbing wall setting routes', 'volumes get bolted on by feel and nobody has checked the load path through the panel', array['structural', 'tolerance-stack', 'site-systems'], 'accepted'),
  ('art', 'a student running a print workshop', 'the drying rack sags under a full run because nobody sized the shelf', array['structural', 'mechanism', 'manufacturability'], 'accepted'),
  ('campus', 'a society building a parade float', 'the trailer hitch was welded by a member two years ago and nobody has verified it since', array['structural', 'manufacturability', 'tolerance-stack'], 'accepted'),
  ('food', 'a student brewing on a small scale', 'the wash water goes straight down the drain and the council has started asking questions', array['environmental-system', 'process-design', 'instrumentation'], 'accepted'),
  ('work', 'a maker space managing shared tools', 'the laser cutter extraction is inadequate and nobody has measured what is in the air', array['environmental-system', 'instrumentation', 'sensor'], 'accepted'),
  ('civic', 'a community repair cafe', 'dead batteries pile up in a box because nobody is sure how to dispose of them properly', array['environmental-system', 'structuring', 'capture'], 'accepted'),
  ('sports', 'a rowing club coach', 'the ergometer seat produces the same back complaint in half the squad', array['biomech-design', 'instrumentation', 'capture'], 'accepted'),
  ('health', 'a ward nurse checking equipment', 'patient transfers use a hoist designed around one body shape and one height', array['biomech-design', 'mechanism', 'tolerance-stack'], 'accepted'),
  ('climate', 'a neighbourhood tree-planting group', 'the soil sensors went in during spring and all died before the dry spell they were for', array['power-budget', 'enclosure', 'autonomy'], 'accepted'),
  ('transit', 'a student commuting by bike', 'the bike light claims twelve hours of runtime and manages three in the cold', array['power-budget', 'instrumentation', 'circuit-design'], 'accepted')
on conflict do nothing;

commit;
