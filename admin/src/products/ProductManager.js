import React, { useEffect, useRef, useState } from 'react';
import { request } from '../auth/client';
import './products.css';

const blank = {
  sku: '',
  name: '',
  description: '',
  category: '',
  unit: 'kg',
  public_price_cad: '',
  status: 'draft',
  sort_order: '0',
  images: [],
};
const initialCosts = {
  purchase_currency: 'CAD',
  purchase_price_per_kg: '0',
  purchased_kg: '1',
  yield_percent: '100',
  cad_per_purchase_currency: '1',
  freight_cad: '0',
  handling_cad: '0',
  duties_cad: '0',
  other_cad: '0',
  target_price_cad: '0',
};
const costFields = {
  purchase_price_per_kg: ['Purchase price / kg', '0.0001'],
  purchased_kg: ['Purchased weight (kg)', '0.001'],
  yield_percent: ['Saleable yield (%)', '0.0001'],
  cad_per_purchase_currency: ['CAD per purchase currency', '0.00000001'],
  freight_cad: ['Freight (CAD)', '0.01'],
  handling_cad: ['Handling (CAD)', '0.01'],
  duties_cad: ['Duties (CAD)', '0.01'],
  other_cad: ['Other costs (CAD)', '0.01'],
  target_price_cad: ['Target price / kg (CAD)', '0.01'],
};
const money = (value) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(
    Number(value),
  );

export default function ProductManager() {
  const [items, setItems] = useState([]);
  const [product, setProduct] = useState(null);
  const [costs, setCosts] = useState(initialCosts);
  const [totals, setTotals] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const fileInput = useRef(null);
  const [alt, setAlt] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    request('products')
      .then((data) => {
        if (active) setItems(data.products);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function refresh() {
    const data = await request('products');
    setItems(data.products);
  }
  function show(p) {
    setProduct(p ? { ...p, sort_order: String(p.sort_order) } : null);
    setCosts(p?.costs || initialCosts);
    setTotals(p?.costs || null);
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
    setAlt('');
  }
  async function open(id) {
    const data = await request('product', undefined, true, { id: String(id) });
    show(data.product);
  }
  async function run(fn, success) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const update = (key, value) => setProduct((p) => ({ ...p, [key]: value }));
  return (
    <section className="panel product-manager" id="products">
      <p className="eyebrow">CATALOG / PRODUCTS & PRICING</p>
      <h2>Manage seafood products</h2>
      <p>
        Draft products stay private. Publish when the product is ready for the website.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="auth-message">
          {message}
        </p>
      )}
      <div className="product-actions">
        <button
          disabled={busy}
          onClick={() => {
            show({ ...blank });
            setError('');
            setMessage('');
          }}
        >
          New product
        </button>
        <button disabled={busy} onClick={() => run(refresh, 'Product list refreshed.')}>
          Refresh products
        </button>
        <label className="field">
          Search products
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      {loading ? (
        <p role="status">Loading products…</p>
      ) : (
        <div className="catalog-list">
          {!items.length && <p>No products yet. Create your first product.</p>}
          {items
            .filter((p) =>
              `${p.name} ${p.sku} ${p.category}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => run(() => open(p.id), '')}
              >
                <strong>{p.name}</strong>{' '}
                <span>
                  {p.sku} · {p.status}
                </span>
              </button>
            ))}
        </div>
      )}
      {product && (
        <div className="product-editor" key={product.id || 'new'}>
          <h3>{product.id ? 'Edit product' : 'New product'}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const result = await request('product-save', {
                  ...product,
                  id: product.id ? String(product.id) : undefined,
                });
                await open(result.id);
                await refresh();
              }, 'Product saved.');
            }}
          >
            <fieldset disabled={busy}>
              <div className="fields">
                {[
                  ['sku', 'SKU', 80],
                  ['name', 'Product name', 180],
                  ['category', 'Category', 100],
                  ['unit', 'Selling unit', 32],
                ].map(([key, label, max]) => (
                  <label key={key} className="field">
                    {label}
                    <input
                      required={key !== 'category'}
                      maxLength={max}
                      value={product[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </label>
                ))}
                <label className="field">
                  Public price (CAD per selling unit)
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    value={product.public_price_cad ?? ''}
                    onChange={(e) => update('public_price_cad', e.target.value)}
                  />
                </label>
                <label className="field">
                  Status
                  <select
                    value={product.status}
                    onChange={(e) => update('status', e.target.value)}
                  >
                    {['draft', 'published', 'archived'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Display order
                  <input
                    type="number"
                    min="-999999"
                    max="999999"
                    step="1"
                    value={product.sort_order}
                    onChange={(e) => update('sort_order', e.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                Description
                <textarea
                  maxLength={10000}
                  value={product.description || ''}
                  onChange={(e) => update('description', e.target.value)}
                />
              </label>
              <p className="footnote">
                Leave the public price empty to show “Contact us for pricing”. Public
                prices are independent of private costing.
              </p>
              <button className="primary">Save product</button>
            </fieldset>
          </form>
          {product.id && (
            <>
              <section aria-label="Product photos">
                <h3>Product photos</h3>
                <p>
                  JPEG, PNG or WebP. Up to 5 MB, 5000 pixels per side, 16 megapixels, and
                  12 images per product.
                </p>
                <div className="image-manager">
                  {product.images.map((img) => (
                    <ImageEditor
                      key={img.id}
                      image={img}
                      busy={busy}
                      onSave={(values) =>
                        run(async () => {
                          await request('product-image-edit', {
                            id: String(product.id),
                            image_id: String(img.id),
                            ...values,
                          });
                          await open(String(product.id));
                        }, 'Photo updated.')
                      }
                      onDelete={() =>
                        run(async () => {
                          await request('product-image-delete', {
                            id: String(product.id),
                            image_id: String(img.id),
                          });
                          await open(String(product.id));
                        }, 'Photo removed.')
                      }
                    />
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      const data = new FormData();
                      data.append('id', String(product.id));
                      data.append('alt_text', alt);
                      data.append('image', file);
                      await request('product-upload', data);
                      await open(String(product.id));
                    }, 'Photo uploaded.');
                  }}
                >
                  <fieldset disabled={busy}>
                    <label className="field">
                      Image file
                      <input
                        ref={fileInput}
                        type="file"
                        required
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setFile(e.target.files[0])}
                      />
                    </label>
                    <label className="field">
                      Photo description
                      <input
                        required
                        maxLength={255}
                        value={alt}
                        onChange={(e) => setAlt(e.target.value)}
                      />
                    </label>
                    <button disabled={!file}>Upload photo</button>
                  </fieldset>
                </form>
              </section>
              <section className="private-costs" aria-label="Private product costs">
                <h3>Private landed costs</h3>
                <p>
                  Visible to authorized staff only. Costs are calculated and rounded by
                  the server when saved.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      const data = await request('product-costs', {
                        id: String(product.id),
                        ...costs,
                      });
                      setCosts(data.costs);
                      setTotals(data.costs);
                    }, 'Private costs saved.');
                  }}
                >
                  <fieldset disabled={busy}>
                    <div className="fields">
                      <label className="field">
                        Purchase currency
                        <select
                          value={costs.purchase_currency}
                          onChange={(e) => {
                            setCosts({
                              ...costs,
                              purchase_currency: e.target.value,
                              ...(e.target.value === 'CAD'
                                ? { cad_per_purchase_currency: '1' }
                                : {}),
                            });
                            setTotals(null);
                          }}
                        >
                          {['CAD', 'USD', 'EUR', 'CNY', 'JPY'].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      {Object.entries(costFields).map(([key, [label, step]]) => (
                        <label key={key} className="field">
                          {label}
                          <input
                            type="number"
                            required
                            min={
                              [
                                'purchased_kg',
                                'yield_percent',
                                'cad_per_purchase_currency',
                              ].includes(key)
                                ? step
                                : '0'
                            }
                            max={key === 'yield_percent' ? '100' : undefined}
                            step={step}
                            value={costs[key]}
                            onChange={(e) => {
                              setCosts({ ...costs, [key]: e.target.value });
                              setTotals(null);
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <button>Save private costs</button>
                  </fieldset>
                </form>
                {totals && (
                  <dl className="cost-totals">
                    {[
                      ['landed_cost_cad', 'Total landed cost'],
                      ['cost_per_saleable_kg_cad', 'Cost / saleable kg'],
                      ['profit_cad', 'Estimated gross profit'],
                    ].map(([k, l]) => (
                      <div key={k}>
                        <dt>{l}</dt>
                        <dd>{money(totals[k])}</dd>
                      </div>
                    ))}
                    <div>
                      <dt>Estimated gross margin</dt>
                      <dd>
                        {totals.margin_percent === null
                          ? '—'
                          : `${totals.margin_percent}%`}
                      </dd>
                    </div>
                  </dl>
                )}
              </section>
              {product.status === 'archived' && (
                <button
                  disabled={busy}
                  className="remove"
                  onClick={() => {
                    if (window.confirm('Permanently delete this archived product?'))
                      run(async () => {
                        await request('product-delete', { id: String(product.id) });
                        show(null);
                        await refresh();
                      }, 'Product deleted.');
                  }}
                >
                  Delete archived product
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
function ImageEditor({ image, busy, onSave, onDelete }) {
  const [alt, setAlt] = useState(image.alt_text);
  const [order, setOrder] = useState(String(image.sort_order));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ alt_text: alt, sort_order: order, is_primary: true });
      }}
    >
      <fieldset disabled={busy}>
        <img src={image.url} alt={image.alt_text} />
        <label className="field">
          Image description
          <input
            required
            maxLength={255}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
        </label>
        <label className="field">
          Image order
          <input
            type="number"
            min="0"
            max="999999"
            step="1"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </label>
        <button>Save & use as primary</button>
        <button type="button" onClick={onDelete}>
          Remove photo
        </button>
      </fieldset>
    </form>
  );
}
