import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductManager from './ProductManager';
import { request } from '../auth/client';

jest.mock('../auth/client', () => ({ request: jest.fn() }));
const product = {
  id: '1',
  sku: 'SALMON',
  name: 'Salmon',
  category: 'Fish',
  description: 'Fresh seafood',
  unit: 'kg',
  public_price_cad: '12.50',
  status: 'draft',
  sort_order: 0,
  images: [],
  costs: null,
};
beforeEach(() => {
  request.mockReset();
  request.mockImplementation(async (action) =>
    action === 'products'
      ? { products: [product] }
      : action === 'product'
        ? { product }
        : { id: '1' },
  );
});
test('loads and edits a product without exposing private costs as public price', async () => {
  render(<ProductManager />);
  fireEvent.click(await screen.findByRole('button', { name: /Salmon SALMON/ }));
  await screen.findByRole('heading', { name: 'Edit product' });
  fireEvent.change(screen.getByLabelText('Product name'), {
    target: { value: 'Fresh Salmon' },
  });
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'published' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save product' }));
  await screen.findByText('Product saved.');
  expect(request).toHaveBeenCalledWith(
    'product-save',
    expect.objectContaining({
      name: 'Fresh Salmon',
      status: 'published',
      public_price_cad: '12.50',
    }),
  );
  expect(screen.getByRole('region', { name: 'Private product costs' })).toBeTruthy();
});
test('shows API failures and keeps the editor for correction', async () => {
  render(<ProductManager />);
  fireEvent.click(await screen.findByRole('button', { name: /Salmon SALMON/ }));
  await screen.findByLabelText('Product name');
  request.mockRejectedValueOnce(new Error('This SKU is already in use.'));
  fireEvent.click(screen.getByRole('button', { name: 'Save product' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This SKU is already in use.',
  );
  expect(screen.getByLabelText('Product name')).toHaveValue('Salmon');
});
test('saves costing separately and renders the authoritative response', async () => {
  render(<ProductManager />);
  fireEvent.click(await screen.findByRole('button', { name: /Salmon SALMON/ }));
  await screen.findByLabelText('Purchased weight (kg)');
  request.mockResolvedValueOnce({
    costs: {
      ...product.costs,
      landed_cost_cad: '125.00',
      cost_per_saleable_kg_cad: '12.50',
      profit_cad: '20.00',
      margin_percent: '13.79',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save private costs' }));
  await screen.findByText('$125.00');
  expect(request).toHaveBeenCalledWith(
    'product-costs',
    expect.objectContaining({ id: '1', purchase_currency: 'CAD' }),
  );
  fireEvent.change(screen.getByLabelText('Purchased weight (kg)'), {
    target: { value: '10' },
  });
  await waitFor(() => expect(screen.queryByText('$125.00')).toBeNull());
});

test('uploads the selected file with its description as multipart data', async () => {
  render(<ProductManager />);
  fireEvent.click(await screen.findByRole('button', { name: /Salmon SALMON/ }));
  const input = await screen.findByLabelText('Image file');
  const file = new File(['image bytes'], 'salmon.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText('Photo description'), {
    target: { value: 'Salmon fillet' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }));
  await screen.findByText('Photo uploaded.');
  const upload = request.mock.calls.find(([action]) => action === 'product-upload')[1];
  expect(upload).toBeInstanceOf(FormData);
  expect(upload.get('image')).toBe(file);
  expect(upload.get('alt_text')).toBe('Salmon fillet');
  expect(upload.get('id')).toBe('1');
});
