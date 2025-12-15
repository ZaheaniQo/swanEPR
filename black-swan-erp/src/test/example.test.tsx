
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple component to test
const TestComponent = ({ message }: { message: string }) => <div>{message}</div>;

describe('Simple Test', () => {
  it('renders message correctly', () => {
    render(<TestComponent message="Hello Vitest" />);
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument();
  });
});
