import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test.each([
  ['/', 'Starline Li seafood'],
  ['/about-us', 'About Us'],
  ['/products', 'Products'],
  ['/contact-us', 'Contact Us'],
  ['/missing-page', 'Page not found'],
])('renders the page at %s', (path, heading) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
});
