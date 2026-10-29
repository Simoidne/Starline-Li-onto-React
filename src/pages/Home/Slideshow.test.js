import { render, screen, fireEvent } from '@testing-library/react';
import Slideshow from './Slideshow';
test('gallery wraps in both directions and supports direct slide selection', () => {
  render(<Slideshow />);
  const photo = screen.getByRole('img');
  expect(photo.getAttribute('src')).toContain('IMG_6916.jpeg');
  fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
  expect(photo.getAttribute('src')).toContain('L1001202.JPG');
  fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
  expect(photo.getAttribute('src')).toContain('IMG_6916.jpeg');
  fireEvent.click(screen.getByRole('button', { name: 'Show slide 2' }));
  expect(photo.getAttribute('src')).toContain('L1001202.JPG');
  expect(
    screen.getByRole('button', { name: 'Show slide 2' }).getAttribute('aria-current'),
  ).toBe('true');
});
