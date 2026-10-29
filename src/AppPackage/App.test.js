import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './HeaderPackage/Header';
import Slideshow from './MainPackage/HomePagePackage/SlideshowPackage/Slideshow';

test('mobile navigation opens and closes when a destination is selected', () => {
  render(<MemoryRouter><Header /></MemoryRouter>);
  const toggle = screen.getByRole('button', { name: /menu/i });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('link', { name: 'About Us' }));
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

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
  expect(screen.getByRole('button', { name: 'Show slide 2' }).getAttribute('aria-current')).toBe('true');
});
