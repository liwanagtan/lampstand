import {
  biblePosition,
  clearPlanResume,
  isPlanDayPath,
  planScrollPosition,
  recentPlanDay,
  rememberBiblePosition,
  rememberPlanDay,
  rememberPlanScroll,
} from './readingResume';

beforeEach(() => localStorage.clear());

it('remembers an unfinished plan day and ignores corrupt saved data', () => {
  expect(recentPlanDay()).toBeNull();
  rememberPlanDay('gospels-40', 3);
  expect(recentPlanDay()).toEqual({ planId: 'gospels-40', day: 3 });
  localStorage.setItem('lampstand.recentPlanDay.v1', '{broken');
  expect(recentPlanDay()).toBeNull();
});

it('keeps Bible chapter positions separate and bounds saved history', () => {
  rememberBiblePosition('JHN', 3, 427.6);
  rememberBiblePosition('JHN', 4, 115);
  expect(biblePosition('JHN', 3)).toBe(428);
  expect(biblePosition('JHN', 4)).toBe(115);
  for (let chapter = 1; chapter <= 90; chapter++) rememberBiblePosition('PSA', chapter, chapter);
  expect(biblePosition('JHN', 3)).toBe(0);
  expect(biblePosition('PSA', 90)).toBe(90);
});

it('restores only plan-day page positions', () => {
  expect(isPlanDayPath('/plans/gospels-40/3')).toBe(true);
  expect(isPlanDayPath('/plans/p/gospels-40')).toBe(false);
  rememberPlanScroll('/plans/gospels-40/3', 818);
  rememberPlanScroll('/', 999);
  expect(planScrollPosition('/plans/gospels-40/3')).toBe(818);
  expect(planScrollPosition('/')).toBe(0);
});

it('clears stale reading positions when a plan starts over', () => {
  rememberPlanDay('gospels-40', 3);
  rememberPlanScroll('/plans/gospels-40/3', 818);
  rememberPlanScroll('/plans/nt-90/2', 428);
  clearPlanResume('gospels-40');
  expect(recentPlanDay()).toBeNull();
  expect(planScrollPosition('/plans/gospels-40/3')).toBe(0);
  expect(planScrollPosition('/plans/nt-90/2')).toBe(428);
});
