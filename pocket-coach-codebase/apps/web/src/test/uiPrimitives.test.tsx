import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Field, Input, SegmentedControl, Tag, Toast } from '../components/ui';

describe('Field and Input', () => {
  it('links the label, hint and error to the input', () => {
    render(
      <Field label="Email" error="Enter a valid email">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'en', label: 'EN' },
    { value: 'de', label: 'DE' },
  ] as const;

  it('marks the selected option and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl ariaLabel="Language" options={options} value="en" onChange={onChange} />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'EN' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('radio', { name: 'DE' }));
    expect(onChange).toHaveBeenCalledWith('de');
  });

  it('moves with the arrow keys', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl ariaLabel="Language" options={options} value="en" onChange={onChange} />,
    );
    screen.getByRole('radio', { name: 'EN' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('de');
  });
});

describe('Button', () => {
  it('defaults to type=button and disables while loading', () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('keeps legacy variants working', () => {
    render(<Button variant="gradient">Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});

describe('Tag', () => {
  it('renders its content', () => {
    render(<Tag variant="accent">Draft</Tag>);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('runs the action and closes', async () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <Toast
        message="Removed"
        actionLabel="Undo"
        onAction={onAction}
        onClose={onClose}
        durationMs={0}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
