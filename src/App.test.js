import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AppSync Message Tester', () => {
  render(<App />);
  const heading = screen.getByText(/AppSync Message Tester/i);
  expect(heading).toBeInTheDocument();
});
