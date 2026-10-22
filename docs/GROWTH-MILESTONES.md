# Lampstand growth milestones

Status: proposed roadmap, 2026-10-22. This extends the historical milestones in
`PRD-ADDENDUM-GROW.md`; it does not reopen completed work. Work on
`design/responsive-redesign`, review each milestone with the owner, and merge to
`main` only when requested. Each milestone ends with a working preview, relevant
automated checks, phone and desktop review, and a short account of what changed.

## Product guardrails

- Help people read Scripture regularly and grow in faith. Keep one clear next step
  on Today and encourage one plan, or at most two, at a time.
- Faith Foundations remains a standalone starting point. Its explanation of
  salvation by repentance and accepting Jesus Christ as Lord and Saviour is a
  content gate for owner review. Never make salvation a plan completion, badge,
  score, or reward.
- Reflection is optional and private. Do not grade answers or imply that reading
  frequency measures faith, spiritual maturity, or God's favour.
- Preserve existing reading choices and progress. New content needs editorial
  review and licence checks. No paid service or licensed audio purchase is assumed.
- The app currently stores personal data on the device. Until sync is shipped,
  never describe it as safely backed up across devices.

## Milestone 31 — One clear return to reading

**Outcome:** Today consistently offers the most useful next reading, and returning
to it restores the reader's place. Give plan readers one primary reading action;
when no plan is active, offer a compact return to the Bible.

**Scope:** Decide between an unfinished plan reading and the last Bible chapter;
show the plan/day or book/chapter clearly; retain scroll position and selected
verse when returning from a linked page; keep completed plans out of the resume
queue. If two plans are active, show one primary action and a quiet way to reach
the other.

**Done when:** Closing and reopening the PWA, navigating away and back, and
switching between Today and a plan all resume the intended location on phone and
desktop. A first-time reader and a reader with no active plan have clear states.
No reading is marked complete merely because its page was opened.

**Owner review:** Today, a plan day, and the Bible reader in new, active, and
completed-reading states.

## Milestone 32 — Flexible plan pacing

**Outcome:** Missing days never creates an intimidating backlog. Extend the
existing catch-up behavior with an explicit, understandable schedule choice.

**Scope:** Offer Continue from next unread, Adjust pace, and Pause/Resume on
active plans. Preserve completed days and journal entries. Keep the one-or-two-plan
guidance near plan-start decisions; do not prevent a user from choosing otherwise.
Explain how changing pace affects upcoming dates before saving it.

**Done when:** A reader returning after a week can resume in one action; changing
pace or pausing survives reload and backup/restore; finished plans stay finished;
no previously completed day is silently reset. Test local-date boundaries and
offline use.

**Owner review:** One missed day, a missed week, two active plans, and a paused plan.

## Milestone 33 — Guided reflection after reading

**Outcome:** A reader can respond to Scripture without encountering a long form
or being required to write. Connect the existing plan questions, prayer, and
Journal to a short post-reading moment.

**Scope:** Show one contextual question after reading, with Write a reflection,
Pray, and Finish for now. Use approved plan prompts where present; use reviewed
generic prompts for ordinary Bible reading. Save the passage and plan reference
with a reflection. Never auto-generate an interpretation of Scripture from private
journal text.

**Done when:** A user can finish with no entry, save and edit a private entry, or
return to the passage. The flow works on mobile, with a keyboard open, and offline.
Completion state and journal state remain independent. Content and theological
wording pass editorial review.

**Owner review:** First reflection, skipped reflection, and editing a saved one.

## Milestone 34 — Faith Foundations learning path

**Outcome:** After reading about salvation, a person can find an appropriate next
step without being pushed through a gamified checklist.

**Scope:** Keep Salvation as its own reading. Add a small, optional path to topics
such as prayer, how to read the Bible, following Jesus, and life in the church.
Link into existing or newly reviewed content. Offer age-appropriate wording where
useful without assuming faith stage, gender, or denomination from a profile.

**Done when:** A new reader can move from Faith Foundations into one clear next
reading, return later, and change direction. Each topic has Scripture references,
editorial review, and non-debate-focused copy. Salvation has no completion score.

**Owner review:** The whole path and its theological wording before release.

## Milestone 35 — Backup and cross-device sync

**Outcome:** Personal notes, marks, plan progress, and profile can survive a lost
or changed device. First make the existing manual backup/restore path unmistakable
and verify its coverage; then add optional account-based sync.

**Design decisions before implementation:** Choose a free-tier backend and account
method; document recurring cost limits, privacy policy changes, deletion/export,
encryption and access rules, offline queueing, and conflict handling. Do not add a
paid dependency without the owner's separate approval. Anonymous local use remains
available. Do not upload NLT text or licensed content as personal sync data.

**Done when:** A user can move to a second device and recover private content;
offline edits reconcile without silent loss; deletion propagates; sign-out does
not erase local data unexpectedly. Automated migration, access-control, conflict,
and restore tests pass. A clear privacy explanation is available in the app.

**Owner review:** Account and privacy design before backend work, then a two-device
demo with conflicting edits and a restore drill.

## Milestone 36 — Gamification UI/UX design gate

**Outcome:** Agree on an encouragement system before writing reward code. Use
`GAMIFICATION-UX-BRIEF.md` as the design brief.

**Scope:** Design Today, completion, Journey, return-after-absence, preferences,
and reduced-motion states for phone and desktop. Define what counts as a reading,
optional weekly goals, milestone rules, corrections, and privacy. Test wording with
new and established readers, including younger readers.

**Done when:** The owner approves screen designs and interaction rules. The design
does not use public leaderboards, faith scores, lost-streak threats, or salvation
achievements. An absence receives a welcoming return message.

**Owner review:** Required before milestone 37 begins.

## Milestone 37 — Gentle progress and encouragement

**Outcome:** Implement only the approved milestone 36 design, using existing
reading-completion data. Keep goals and celebration optional.

**Scope:** Private weekly rhythm, meaningful plan milestones, a warm completion
moment, and a gentle return message. Provide controls for reminders, animation,
and encouragement. Make no changes to salvation status or reflection content.

**Done when:** Accidental completion can be corrected; repeat reading behaves as
designed; offline progress persists and later syncs if milestone 35 is enabled;
reduced motion is respected. A missed week never wipes earned history or shames
the reader.

**Owner review:** New reader, frequent reader, missed week, completed plan, and
opt-out states.

## Milestone 38 — Scripture audio, subject to rights

**Outcome:** Offer listening as another way to follow a reading, if a legal and
sustainable audio source exists.

**Gate before development:** Confirm translation-specific streaming, caching,
attribution, and commercial-use terms. Do not assume the NLT text licence includes
audio rights. Prefer a no-payment option that fits Lampstand's noncommercial use;
if none does, record the finding and defer this milestone.

**Done when, if licensed:** Play/pause, verse or chapter position, background and
interruption behavior, data-use copy, and accessible controls work on installed
mobile PWAs and desktop. Reading position remains coherent when switching between
text and audio. Test slow and lost connections; avoid claiming audio is offline
unless the licence permits caching.

**Owner review:** Source and licence first, then a listening walkthrough.

## Release cadence

Ship milestones 31–34 as small, independently reviewable reading improvements.
Milestone 35 is a separate privacy and infrastructure release. Milestones 36–37
form one design-then-build workstream. Milestone 38 starts only after its rights
gate. At each review, the owner can change the next milestone's priority without
invalidating completed work.
