import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '../components/ui/Dialog';

describe('Dialog', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Dialog isOpen={false} onClose={vi.fn()}>
        <p>Hidden content</p>
      </Dialog>,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders children when isOpen is true', () => {
    render(
      <Dialog isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Dialog>,
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('calls onClose when clicking the backdrop', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();

    render(
      <Dialog isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Dialog>,
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Escape', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();

    render(
      <Dialog isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Dialog>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders close button in header', () => {
    const onClose = vi.fn();

    render(
      <Dialog isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Dialog>,
    );

    const closeButton = screen.getByLabelText('Close modal');
    expect(closeButton).toBeInTheDocument();
  });
});
