import { matchTopics } from './topics';

describe('verses for a topic', () => {
  it('matches feelings by their first letters', () => {
    expect(matchTopics('anxiety')[0]?.label).toBe('Anxiety');
    expect(matchTopics('I feel so worried')[0]?.label).toBe('Anxiety');
    expect(matchTopics('lonely')[0]?.label).toBe('Loneliness');
    expect(matchTopics('john 3')).toEqual([]);
  });

  it('gives passages as canonical references', () => {
    for (const ref of matchTopics('fear')[0]!.refs) expect(ref).toMatch(/^[1-3A-Z]{3}\.\d+\.\d+/);
  });
});
