import { plansGreeting, readingGreeting } from './greetings';

describe('personal lines', () => {
  it('names the reading for the time of day', () => {
    expect(readingGreeting('Ana Cruz', new Date('2026-10-18T07:00'))).toBe('Morning reading, Ana');
    expect(readingGreeting('Ana', new Date('2026-10-18T13:00'))).toBe('Afternoon reading, Ana');
    expect(readingGreeting('Ana', new Date('2026-10-18T19:00'))).toBe('Evening reading, Ana');
    expect(readingGreeting('Ana', new Date('2026-10-18T23:30'))).toBe('Quiet reading, Ana');
    expect(readingGreeting('', new Date('2026-10-18T07:00'))).toBe('Morning reading');
  });

  it('encourages with plans going and invites without', () => {
    expect(plansGreeting('Ana', 2)).toEqual({ title: 'Keep going, Ana', line: '2 plans going' });
    expect(plansGreeting('Ana', 1).line).toBe('1 plan going');
    expect(plansGreeting('Ana', 0)).toEqual({
      title: 'A plan for you, Ana',
      line: 'Find one for where you are',
    });
    expect(plansGreeting('', 0).title).toBe('A plan for you');
  });
});
