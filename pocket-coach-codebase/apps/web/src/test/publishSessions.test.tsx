import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublishSessionsModal } from '../features/sessions/components/PublishSessionsModal';
import { SessionCard } from '../features/sessions/components/SessionCard';
import { createMockSession } from './fixtures/sessionFixtures';
import type { EnrichedSession } from '../features/sessions/hooks/useSessions';

const draft = (id: string, date: string): EnrichedSession =>
  createMockSession({ id, session_date: date, published_at: null });
const published = (id: string, date: string): EnrichedSession =>
  createMockSession({ id, session_date: date, published_at: '2026-10-01T00:00:00Z' });

describe('PublishSessionsModal', () => {
  const sessions = [
    draft('d1', '2026-11-03'),
    draft('d2', '2026-11-05'),
    published('p1', '2026-11-10'),
  ];
  const onPublish = vi.fn();
  const onUnpublish = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onPublish.mockResolvedValue(2);
    onUnpublish.mockResolvedValue({ unpublished: 1, skipped: 0 });
  });

  it('defaults to the first draft date and previews drafts and published sessions', () => {
    render(
      <PublishSessionsModal
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />,
    );

    expect(screen.getByLabelText('From')).toHaveValue('2026-11-03');
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-30');
    expect(screen.getByTestId('publish-preview')).toHaveTextContent('2 drafts, 1 published');
  });

  it('publishes the range and reports how many sessions became visible', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <PublishSessionsModal
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />,
    );

    await user.click(screen.getByRole('button', { name: /publish 2 drafts/i }));

    expect(onPublish).toHaveBeenCalledWith('2026-11-03', '2026-11-30');
    expect(await screen.findByRole('status')).toHaveTextContent(
      '2 sessions are now visible to trainers.',
    );
  });

  it('reports skipped sessions when unpublishing', async () => {
    const user = userEvent.setup({ delay: null });
    onUnpublish.mockResolvedValue({ unpublished: 1, skipped: 2 });
    render(
      <PublishSessionsModal
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^unpublish$/i }));

    expect(onUnpublish).toHaveBeenCalledWith('2026-11-03', '2026-11-30');
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('1 session is back to draft.');
    expect(status).toHaveTextContent('2 sessions were skipped');
  });

  it('disables actions for an invalid range and shows server errors', async () => {
    const user = userEvent.setup({ delay: null });
    onPublish.mockRejectedValue(new Error('You do not have permission to do this.'));
    render(
      <PublishSessionsModal
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />,
    );

    await user.click(screen.getByRole('button', { name: /publish 2 drafts/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');

    await user.clear(screen.getByLabelText('To'));
    await user.type(screen.getByLabelText('To'), '2026-10-01');
    await waitFor(() => {
      expect(screen.getByText(/end date is before the start date/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /publish.*draft/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^unpublish$/i })).toBeDisabled();
  });
});

describe('SessionCard draft marker', () => {
  it('shows a Draft badge for unpublished sessions only', () => {
    const { rerender } = render(<SessionCard session={draft('d1', '2026-11-03')} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<SessionCard session={published('p1', '2026-11-03')} />);
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });
});
