import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Admin Portal header', () => {
  render(<App />);
  const titleElement = screen.getByText(/Smart Tourist Safety System/i);
  expect(titleElement).toBeInTheDocument();
});
