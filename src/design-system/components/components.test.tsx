import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, CharCount, IconButton, Input, Toggle, toast, useToasts } from './index';
import { Toaster } from './Toaster';

describe('Button', () => {
  it('disables itself and reports busy while loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('fires clicks and shows its shortcut', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} shortcut="Enter">
        Go live
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: /go live/i }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });

  it('gives icon buttons an accessible name', () => {
    render(<IconButton label="Delete" icon={<span />} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});

describe('CharCount', () => {
  it('stays hidden until 80% of the limit', () => {
    const { rerender, container } = render(<CharCount count={10} max={60} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CharCount count={50} max={60} />);
    expect(screen.getByText('50/60')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('links label, error and invalid state', () => {
    render(<Input label="Reference" defaultValue="Jhn" error="Not recognized" />);
    const input = screen.getByLabelText('Reference');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Not recognized');
  });
});

describe('Toggle', () => {
  it('toggles by label click', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Reduce motion" />);
    await userEvent.click(screen.getByText('Reduce motion'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('toast', () => {
  beforeEach(() => useToasts.setState({ toasts: [] }));

  it('shows and auto-dismisses after 3 s, undo toasts last 8 s', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Switched to WEB' });
      toast({ title: 'Deleted', action: { label: 'Undo', onClick: () => {} } });
    });
    expect(useToasts.getState().toasts).toHaveLength(2);
    act(() => vi.advanceTimersByTime(3000));
    expect(useToasts.getState().toasts.map((t) => t.title)).toEqual(['Deleted']);
    act(() => vi.advanceTimersByTime(5000));
    expect(useToasts.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it('runs the action and dismisses', async () => {
    const undo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Deleted', action: { label: 'Undo', onClick: undo } });
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalled();
    expect(useToasts.getState().toasts).toHaveLength(0);
  });
});
