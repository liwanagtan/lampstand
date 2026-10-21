import { useReader } from './readerStore';

it('keeps recent chapters unique, newest first, and bounded for the Go to sheet', () => {
  const original = useReader.getState();
  try {
    useReader.setState({ recent: [] });
    for (let chapter = 1; chapter <= 8; chapter++) useReader.getState().goTo('JHN', chapter);
    useReader.getState().goTo('JHN', 5);
    const recent = useReader.getState().recent;
    expect(recent.map((p) => p.chapter)).toEqual([5, 8, 7, 6, 4, 3]);
    expect(JSON.parse(localStorage.getItem('lampstand.recentChapters')!)).toEqual(recent);
  } finally {
    useReader.setState(original);
    localStorage.removeItem('lampstand.recentChapters');
  }
});
