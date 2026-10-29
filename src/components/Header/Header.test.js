import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
test('mobile navigation opens and closes when a destination is selected', () => {
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
  const toggle = screen.getByRole('button', { name: /menu/i });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('link', { name: 'About Us' }));
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

test('Escape closes the menu and returns focus to the menu button', () => {
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
  const toggle = screen.getByRole('button', { name: /menu/i });
  fireEvent.click(toggle);
  const aboutLink = screen.getByRole('link', { name: 'About Us' });
  aboutLink.focus();
  fireEvent.keyDown(aboutLink, { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
});
