import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Demo Realtime Message with AWS AppSync', () => {
  render(<App />);
  const heading = screen.getByText(/Demo Realtime Message with AWS AppSync/i);
  expect(heading).toBeInTheDocument();
});
