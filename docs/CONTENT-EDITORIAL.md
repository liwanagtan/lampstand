# Lampstand content standard

Lampstand helps people grow in faith through reading Scripture, thoughtful guidance,
and daily encouragement. Its language welcomes people from every background without denominational labels
in reader-facing content. This guide records the owner's editorial direction.

## Salvation: the non-negotiable foundation

People have sinned and cannot save themselves by good behaviour, church attendance,
family background, baptism, Bible reading, or religious achievement. Jesus Christ
died for our sins, was buried, and rose again. Salvation is God's gift by grace
through faith. Invite repentance toward God and accepting Jesus Christ as Lord
and Saviour through personal faith. Explain that this is a response to God's
grace, not a formula or a good work that earns salvation. Good works are fruit
of salvation, never its purchase price.

Use Romans 3:9–26; Romans 5:6–11; Acts 20:17–21; Romans 10:8–13;
1 Corinthians 15:1–8; Ephesians 2:1–10; and 1 John 5:9–13 as foundational readings.
Explain the texts in context. Do not turn an isolated passage into a slogan.

A suggested prayer can express repentance and faith; reciting words does not save.
Do not declare a reader saved because they finished a reading or plan, clicked a button,
repeated a prayer, or grew up in a Christian home. For explorers, prayers should
allow questions rather than assume conversion. Explain assurance in relation to
Christ and God's promises, not a feeling or app activity.

Teach believer's baptism as obedience following personal faith. It identifies a
believer with Christ and pictures His death, burial, and resurrection; water does
not earn salvation. Encourage involvement in a Bible-teaching local church.

The foundational Salvation reading lives in `src/features/salvation/reading.json`,
outside the plan catalog. Its sections are one continuous resource at `/salvation`,
introduced from New to faith and Today for people exploring or new to faith.
Add future salvation material as reviewed sections there, with Scripture passages,
clear explanation, questions, and optional prayer. Do not add plan progress,
completion rewards, or a conversion button to this resource.

## Scope and tone

- Prioritize knowing God, understanding Scripture, prayer, Christian character,
  practical love, fellowship, and steady reading habits.
- Avoid plans organized around denominational disputes, speculation about end-time
  schedules, attacks on other traditions, or arguments about disputed secondary issues.
- Explain salvation and believer’s baptism clearly from Scripture without naming
  denominations or describing the content as a denomination’s teaching.
- Do not impose marriage, parenthood, wealth, health, or leadership as marks of
  maturity. Men's and women's plans should cover broad Christian growth.
- Invite a realistic next step. Missed days call for a welcome back, never shame.
- Do not promise health, wealth, success, or the removal of suffering for obedience.
  Distinguish promises to a particular biblical person from promises to every reader.

## Audiences

Faith stages: exploring, new believer, returning, growing, and deeper study.
Age guidance: 6–9 with an adult; 10–12 with a trusted adult available; 13–17;
18–25; adults; older adults roughly 60+. These are reading and example guidelines,
not rigid eligibility rules. Plans can serve overlapping groups.

Life-stage collections include men, women, couples, parents and caregivers,
families, and groups. Do not assume all readers in one category have the same life.
State a plan's intended audience in its description and level. Use existing
catalog categories for discovery, and keep personal/group as the use-setting field.

For minors, use age-appropriate examples and voluntary questions. Never ask for
public confessions, private disclosures, or a pressured conversion response.
Children should seek a trusted adult for danger, harm, or questions they cannot
resolve. Adult guidance should invite understanding rather than scripted answers.

## A complete guided reading

Each day has a distinct title, one or more Scripture references, a short contextual
note, two short devotional paragraphs, two open questions, a concrete practice
within the devotional, and a brief prayer. Pure reading schedules may remain
lighter; group lessons should include leader guidance.

Keep Scripture text out of plan files. The app supplies it from the selected
translation. Write original commentary and prayers; preserve attribution for
historical or licensed sources. Use full Bible book names in references.

Short devotional readings are intentional: Scripture, commentary, questions, and
prayer together make a manageable sitting. The app's verse-count time estimate
does not include discussion or reflection time; do not advertise it as total time.

## Sensitive topics

Make room for lament and uncertainty. Grief has no app-defined deadline. Do not
describe distress as proof of weak faith or promise an immediate emotional cure.
Prayer and pastoral care can accompany appropriate medical or professional care.

Forgiveness must never be used to excuse abuse, conceal wrongdoing, bypass
accountability, or pressure a person to remain unsafe. Couple and family exercises
must be voluntary and suitable for safe relationships. Mention appropriate help
when the content raises a concrete concern rather than adding warnings everywhere.

## Review and maintenance

1. Define audience, purpose, passage sequence, and distinct contribution.
2. Draft the complete plan in Lampstand v2 JSON.
3. Check the theology, context, tone, age suitability, and application manually.
4. Validate schema, stable unique IDs, catalog membership, covers, and references
   against the bundled translation files. Translation-specific omitted verses may
   remain empty; require complete chapter bounds and actual text in each reading.
5. Preview the plan in the app and run relevant automated checks.
6. Obtain the owner's theological review before treating a draft as pastor-approved.

The initial expansion is AI-authored original content, implemented as bundled
plans for review. Automated validation cannot certify theology. The owner should
prioritize the salvation pathway, children's material, and sensitive topics in
review. Existing content is inventoried separately; inclusion is not a claim that
every older devotional has received a fresh theological review.

Preserve existing IDs and day order when making small editorial corrections so
stored progress stays meaningful. For a substantially different sequence, use a
new ID. Keep the runtime catalog, authoring catalog, and generated schema aligned.

Gamification remains a separate UI/UX workstream. Reading activity must never be
represented as a salvation status, measure of faith, or competitive spiritual rank.
