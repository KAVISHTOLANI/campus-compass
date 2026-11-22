import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

afterEach(() => vi.useRealTimers());

describe('Campus Compass workflow', () => {
  it('searches and filters the demo directory', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 3, 10, 0), shouldAdvanceTime: true }); // Tuesday 10:00
    window.location.hash = '/directory';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('result-count')).toHaveTextContent('16 results');
    await user.type(screen.getByLabelText('Search'), 'printing');
    expect(screen.getByTestId('result-count')).toHaveTextContent('1 result');
    await user.clear(screen.getByLabelText('Search'));
    await user.click(screen.getByLabelText(/^Food/));
    expect(screen.getByTestId('result-count')).toHaveTextContent('2 results');
    await user.click(screen.getByLabelText('Open now only'));
    // Friday market is closed on Tuesday
    expect(screen.getByTestId('result-count')).toHaveTextContent('1 result');
  });

  it('shows the no-match state and favourites', async () => {
    window.location.hash = '/directory';
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.type(screen.getByLabelText('Search'), 'zzzz');
    expect(screen.getByText('No places match')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search'));
    await user.click(screen.getByRole('button', { name: 'Add Careers & Employability Hub to favourites' }));
    unmount();
    window.location.hash = '/favorites';
    render(<App />);
    expect(screen.getByText('Careers & Employability Hub')).toBeInTheDocument();
    expect(screen.getByTestId('result-count')).toHaveTextContent('3 results');
  });

  it('validates and adds a resource that closes after midnight', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 3, 23, 30), shouldAdvanceTime: true });
    window.location.hash = '/add';
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Email (optional)'), 'bad');
    await user.click(screen.getByRole('button', { name: 'Add to directory' }));
    expect(screen.getByText('Enter the resource name.')).toBeInTheDocument();
    expect(screen.getByText(/help@example.edu/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name'), 'Late study room');
    await user.type(screen.getByLabelText('Building'), 'Faraday Wing');
    await user.clear(screen.getByLabelText('Email (optional)'));
    await user.clear(screen.getByLabelText('Opens'));
    await user.type(screen.getByLabelText('Opens'), '18:00');
    await user.clear(screen.getByLabelText('Closes'));
    await user.type(screen.getByLabelText('Closes'), '02:00');
    await user.click(screen.getByRole('button', { name: 'Add to directory' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Late study room' })).toBeInTheDocument();
    expect(screen.getAllByText('Open until 02:00').length).toBeGreaterThan(0);
  });
});
