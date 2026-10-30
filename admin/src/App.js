import React, { useState } from 'react';
import { calculate, convert, currencies } from './calculator';
import AuthGate from './auth/AuthGate';
import UserManagement from './auth/UserManagement';

const initialRates = { CAD: 1, USD: 1.37, EUR: 1.49, CNY: 0.19, JPY: 0.0091 };
const initialCosts = [
  { id: 1, label: 'Transportation', amount: 1200, currency: 'CAD' },
  { id: 2, label: 'Materials', amount: 180, currency: 'USD' },
  { id: 3, label: 'Packing', amount: 350, currency: 'CAD' },
  { id: 4, label: 'Duties / brokerage', amount: 0, currency: 'CAD' },
  { id: 5, label: 'Cold storage / insurance', amount: 0, currency: 'CAD' },
];
const money = (value, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value);
const number = (value) => (value === '' ? NaN : Number(value));

function Currency({ value, onChange, label }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {currencies.map((currency) => (
        <option key={currency}>{currency}</option>
      ))}
    </select>
  );
}
function Field({ label, value, onChange, suffix, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...props}
        />
        {suffix && <span>{suffix}</span>}
      </div>
    </label>
  );
}

export default function App() {
  return (
    <AuthGate>
      {({ user, signOut, signingOut, changePassword }) => (
        <Dashboard
          key={user.id}
          user={user}
          signOut={signOut}
          signingOut={signingOut}
          changePassword={changePassword}
        />
      )}
    </AuthGate>
  );
}

function Dashboard({ user, signOut, signingOut, changePassword }) {
  const role = user.role;
  const [weight, setWeight] = useState('1000');
  const [yieldPercent, setYield] = useState('95');
  const [purchasePrice, setPurchasePrice] = useState('6.50');
  const [purchaseCurrency, setPurchaseCurrency] = useState('USD');
  const [sellingPrice, setSellingPrice] = useState('14');
  const [costs, setCosts] = useState(initialCosts);
  const [rates, setRates] = useState(initialRates);
  const [fxAmount, setFxAmount] = useState('100');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('CAD');
  let result, error, converted, fxError;
  try {
    result = calculate({
      weight: number(weight),
      yieldPercent: number(yieldPercent),
      purchasePrice: number(purchasePrice),
      purchaseCurrency,
      sellingPrice: number(sellingPrice),
      costs: costs.map((cost) => ({ ...cost, amount: number(cost.amount) })),
      rates,
    });
  } catch (cause) {
    error = cause.message;
  }
  try {
    converted = convert(number(fxAmount), from, to, rates);
  } catch (cause) {
    fxError = cause.message;
  }
  const updateCost = (id, key, value) =>
    setCosts(costs.map((cost) => (cost.id === id ? { ...cost, [key]: value } : cost)));

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand">
          STARLINE<span>OPERATIONS</span>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <a className="nav-item active" href="#overview">
          ◫ <span>Overview & costs</span>
        </a>
        <a className="nav-item" href="#exchange">
          ⇄ <span>Currency exchange</span>
        </a>
        {role === 'Owner' && (
          <a className="nav-item" href="#team">
            Team access
          </a>
        )}
        <button className="account-password" onClick={changePassword}>
          Set or change password
        </button>
        <div className="sidebar-bottom">
          <span className="avatar">{role[0]}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{role}</small>
          </div>
          <button onClick={signOut} disabled={signingOut} aria-label="Sign out">
            ↗
          </button>
        </div>
      </aside>
      <main className="main" id="overview">
        <header>
          <div>
            <p className="eyebrow">OPERATIONS / DASHBOARD</p>
            <h1>Every cost. In perspective.</h1>
            <p>Build a landed-cost estimate for your next seafood shipment.</p>
          </div>
          <span className="badge">{role} view</span>
        </header>
        <div className="notice">
          <strong>Planning preview</strong> · Sample shipment and illustrative exchange
          rates. Update rates before quoting. Estimates stay in this session.
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <section className="stats" aria-label="Shipment statistics">
          <Stat
            label="Total landed cost"
            value={result ? money(result.total) : '—'}
            detail="All shipment expenses · CAD"
          />
          <Stat
            label="Cost / saleable kg"
            value={result ? money(result.costPerKg) : '—'}
            detail="Adjusted for saleable yield"
          />
          {role === 'Operations' ? (
            <Stat
              label="Saleable weight"
              value={result ? `${result.saleableWeight.toLocaleString()} kg` : '—'}
              detail="After expected loss"
            />
          ) : (
            <Stat
              label="Estimated gross profit"
              value={result ? money(result.profit) : '—'}
              detail="Before overhead and taxes"
            />
          )}
          {role === 'Sales' ? (
            <Stat
              label="Planned selling price"
              value={
                Number.isFinite(number(sellingPrice)) ? money(number(sellingPrice)) : '—'
              }
              detail="CAD per saleable kg"
            />
          ) : (
            <Stat
              label="Estimated gross margin"
              value={
                result && result.margin !== null ? `${result.margin.toFixed(1)}%` : '—'
              }
              detail="Profit divided by revenue"
            />
          )}
        </section>
        <div className="content-grid">
          <section className="panel calculator">
            <div className="panel-title">
              <div>
                <p className="eyebrow">01 / SHIPMENT PLANNING</p>
                <h2>Cost calculator</h2>
              </div>
              <span className="pill">CAD reporting</span>
            </div>
            <div className="fields">
              <Field
                label="Purchased weight"
                value={weight}
                onChange={setWeight}
                suffix="kg"
              />
              <Field
                label="Saleable yield"
                value={yieldPercent}
                onChange={setYield}
                suffix="%"
                max="100"
              />
              <Field
                label="Purchase price / kg"
                value={purchasePrice}
                onChange={setPurchasePrice}
              />
              <label className="field">
                Purchase currency
                <Currency
                  label="Purchase currency"
                  value={purchaseCurrency}
                  onChange={setPurchaseCurrency}
                />
              </label>
              <Field
                label="Selling price / saleable kg"
                value={sellingPrice}
                onChange={setSellingPrice}
                suffix="CAD"
              />
            </div>
            <div className="section-heading">
              <h3>Additional shipment costs</h3>
              <span>Total per shipment</span>
            </div>
            <div className="cost-rows">
              {costs.map((cost) => (
                <div className="cost-row" key={cost.id}>
                  <label className="field">
                    <span>Category</span>
                    <input
                      aria-label={`Cost category ${cost.id}`}
                      value={cost.label}
                      onChange={(event) =>
                        updateCost(cost.id, 'label', event.target.value)
                      }
                    />
                  </label>
                  <Field
                    label={`${cost.label || 'Cost'} amount`}
                    value={cost.amount}
                    onChange={(value) => updateCost(cost.id, 'amount', value)}
                  />
                  <Currency
                    label={`${cost.label || 'Cost'} currency`}
                    value={cost.currency}
                    onChange={(value) => updateCost(cost.id, 'currency', value)}
                  />
                  <button
                    className="remove"
                    aria-label={`Remove ${cost.label}`}
                    onClick={() => setCosts(costs.filter((item) => item.id !== cost.id))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              className="text-button"
              onClick={() =>
                setCosts([
                  ...costs,
                  {
                    id: Math.max(0, ...costs.map((cost) => cost.id)) + 1,
                    label: 'Other cost',
                    amount: 0,
                    currency: 'CAD',
                  },
                ])
              }
            >
              + Add cost category
            </button>
            <p className="footnote">
              Enter transportation, materials, and packing as shipment totals. Add duties,
              storage, insurance, or other expenses as needed. Recoverable taxes and
              overhead are not automatically included.
            </p>
          </section>
          <div className="right-column">
            <section className="panel summary">
              <p className="eyebrow">02 / COST BREAKDOWN</p>
              <h2>The shipment at a glance</h2>
              {result ? (
                <>
                  <div className="summary-row">
                    <span>Seafood purchase</span>
                    <strong>{money(result.purchase)}</strong>
                  </div>
                  {result.breakdown.map((cost) => (
                    <div className="summary-row" key={cost.id}>
                      <span>{cost.label || 'Other cost'}</span>
                      <strong>{money(cost.total)}</strong>
                    </div>
                  ))}
                  <div className="summary-total">
                    <span>Total landed cost</span>
                    <strong>{money(result.total)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Planned revenue</span>
                    <strong>{money(result.revenue)}</strong>
                  </div>
                </>
              ) : (
                <p>Complete valid inputs to see the breakdown.</p>
              )}
            </section>
            <section className="panel" id="exchange">
              <p className="eyebrow">03 / CURRENCY DESK</p>
              <h2>Currency converter</h2>
              <Field label="Amount to convert" value={fxAmount} onChange={setFxAmount} />
              <div className="exchange-pair">
                <Currency label="Convert from" value={from} onChange={setFrom} />
                <span>→</span>
                <Currency label="Convert to" value={to} onChange={setTo} />
              </div>
              <output className="converted" aria-live="polite">
                {fxError || money(converted, to)}
              </output>
              <details>
                <summary>Edit exchange rates</summary>
                <p className="footnote">
                  Illustrative rates, not live quotes. Enter CAD received for 1 unit of
                  each currency. CAD is fixed at 1. Use your supplier or bank quote,
                  including any applicable FX spread.
                </p>
                {currencies
                  .filter((currency) => currency !== 'CAD')
                  .map((currency) => (
                    <Field
                      key={currency}
                      label={`1 ${currency} = CAD`}
                      value={Number.isNaN(rates[currency]) ? '' : rates[currency]}
                      onChange={(value) =>
                        setRates({ ...rates, [currency]: number(value) })
                      }
                    />
                  ))}
              </details>
            </section>
          </div>
        </div>
        {role === 'Owner' && <UserManagement currentUser={user} />}
        <footer>
          STARLINE OPERATIONS <span>Planning tools for a changing market.</span>
        </footer>
      </main>
    </div>
  );
}
function Stat({ label, value, detail }) {
  return (
    <article className="stat">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
