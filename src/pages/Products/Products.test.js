import { render, screen, fireEvent } from '@testing-library/react';
import Products from './Products';
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
test('renders the published catalog with approved image and optional price', async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            id: '1',
            name: 'Salmon',
            description: 'Fresh',
            category: 'Fish',
            unit: 'kg',
            public_price_cad: '12.50',
            images: [
              {
                url: '/api/index.php?action=product-image&file=approved.jpg',
                alt_text: 'Salmon fillet',
              },
            ],
          },
        ],
      }),
    });
  render(<Products />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading products');
  await screen.findByRole('heading', { name: 'Salmon' });
  expect(screen.getByText('$12.50 / kg')).toBeInTheDocument();
  expect(screen.getByAltText('Salmon fillet')).toHaveAttribute(
    'src',
    '/api/index.php?action=product-image&file=approved.jpg',
  );
});
test('reports catalog failure, allows retry, and handles an empty catalog', async () => {
  global.fetch = jest
    .fn()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue({ ok: true, json: async () => ({ products: [] }) });
  render(<Products />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText(/Our selection is being updated/);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
