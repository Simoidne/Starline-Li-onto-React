import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from './ProductCard';
import { products } from './productData';

function renderCard() {
  render(<ProductCard product={products[0]} />);
  return screen.getByRole('button', { name: 'About Atlantic Salmon' });
}

test('keyboard focus reveals the description and Escape dismisses it while keeping focus', () => {
  const card = renderCard();
  expect(card).toHaveAttribute('aria-expanded', 'false');
  act(() => userEvent.tab());
  expect(card).toHaveAttribute('aria-expanded', 'true');
  expect(card).toHaveAccessibleDescription(products[0].description);
  fireEvent.keyDown(card, { key: 'Escape' });
  expect(card).toHaveAttribute('aria-expanded', 'false');
  expect(card).toHaveFocus();
  act(() => userEvent.tab());
  act(() => userEvent.tab({ shift: true }));
  expect(card).toHaveAttribute('aria-expanded', 'true');
});

test('clicking toggles the description even when the button retains focus', () => {
  const card = renderCard();
  act(() => userEvent.click(card));
  expect(card).toHaveAttribute('aria-expanded', 'true');
  act(() => userEvent.click(card));
  expect(card).toHaveAttribute('aria-expanded', 'false');
  act(() => userEvent.click(card));
  expect(card).toHaveAttribute('aria-expanded', 'true');
});
