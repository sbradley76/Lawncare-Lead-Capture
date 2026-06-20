import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : null;

const SERVICES = [
  { value: 'mow_weedeat_edge_blow', label: 'Mow, weedeat, edge & blow' },
  { value: 'one_time_cut', label: 'One-time cut' },
  { value: 'weekly_service', label: 'Weekly route service' },
  { value: 'biweekly_service', label: 'Bi-weekly route service' },
  { value: 'monthly_service', label: 'Monthly lawn maintenance' },
  { value: 'overgrown_cleanup', label: 'Overgrown cleanup' },
  { value: 'mulch', label: 'Mulch' },
  { value: 'planting', label: 'Planting' },
  { value: 'sod', label: 'Sod' },
  { value: 'other', label: 'Other' }
];

const VALID_SERVICES = new Set(SERVICES.map((service) => service.value));

const VALID_SOURCES = new Set([
  'qr_flyer',
  'door_knock',
  'nextdoor',
  'facebook',
  'referral',
  'website',
  'other'
]);

const VALID_PROPERTY_TYPES = new Set([
  'small_yard_townhome',
  'medium_residence',
  'larger_residence',
  'not_sure',
  'other'
]);

const VALID_YARD_CONDITIONS = new Set([
  'maintained',
  'a_little_tall',
  'overgrown',
  'very_overgrown',
  'not_sure'
]);

const VALID_FREQUENCIES = new Set([
  'not_sure',
  'one_time',
  'weekly',
  'biweekly',
  'monthly'
]);

const VALID_CONTACT_METHODS = new Set(['text', 'call', 'email', 'any']);

const MAX_LENGTHS = {
  name: 40,
  phone: 24,
  email: 254,
  street: 120,
  city: 60,
  zip: 10,
  shortText: 80,
  notes: 500
};

const initialForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  street_address: '',
  city: '',
  zip_code: '',
  property_type: 'not_sure',
  yard_condition: 'not_sure',
  services_requested: ['mow_weedeat_edge_blow'],
  requested_frequency: 'not_sure',
  preferred_contact: 'text',
  best_time_to_contact: '',
  gate_or_pet_notes: '',
  additional_notes: '',
  sms_consent: false,
  website: ''
};

function normalizeString(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
}

function cleanSingleLine(value, maxLength = MAX_LENGTHS.shortText) {
  return normalizeString(value)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function cleanMultiLine(value, maxLength = MAX_LENGTHS.notes) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function cleanPhone(value) {
  return normalizeString(value).replace(/[^0-9+().\-\s]/g, '').slice(0, MAX_LENGTHS.phone);
}

function cleanZip(value) {
  return normalizeString(value).replace(/[^0-9-]/g, '').slice(0, MAX_LENGTHS.zip);
}

function cleanEmail(value) {
  return cleanSingleLine(value, MAX_LENGTHS.email).toLowerCase();
}

function cleanParam(value, fallback = null) {
  const cleaned = cleanSingleLine(value, MAX_LENGTHS.shortText);
  return cleaned || fallback;
}

function countPhoneDigits(phone) {
  return phone.replace(/\D/g, '').length;
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) && email.length <= MAX_LENGTHS.email;
}

function getSafeEnum(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback;
}

function getSafeServices(services) {
  const safeServices = Array.isArray(services)
    ? [...new Set(services.filter((service) => VALID_SERVICES.has(service)))]
    : [];

  return safeServices.length ? safeServices : ['mow_weedeat_edge_blow'];
}

function getCampaignParams() {
  const params = new URLSearchParams(window.location.search);
  const requestedSource = cleanParam(params.get('source'), 'qr_flyer');
  const source = getSafeEnum(requestedSource, VALID_SOURCES, 'qr_flyer');

  return {
    source,
    campaign: cleanParam(params.get('campaign')),
    flyer_route: cleanParam(params.get('route') || params.get('flyer_route')),
    neighborhood: cleanParam(params.get('neighborhood'))
  };
}

function buildSafePayload(form) {
  return {
    status: 'new',
    first_name: cleanSingleLine(form.first_name, MAX_LENGTHS.name),
    last_name: cleanSingleLine(form.last_name, MAX_LENGTHS.name) || null,
    phone: cleanPhone(form.phone).trim(),
    email: cleanEmail(form.email) || null,
    street_address: cleanSingleLine(form.street_address, MAX_LENGTHS.street),
    city: cleanSingleLine(form.city, MAX_LENGTHS.city),
    zip_code: cleanZip(form.zip_code) || null,
    property_type: getSafeEnum(form.property_type, VALID_PROPERTY_TYPES, 'not_sure'),
    yard_condition: getSafeEnum(form.yard_condition, VALID_YARD_CONDITIONS, 'not_sure'),
    services_requested: getSafeServices(form.services_requested),
    requested_frequency: getSafeEnum(form.requested_frequency, VALID_FREQUENCIES, 'not_sure'),
    preferred_contact: getSafeEnum(form.preferred_contact, VALID_CONTACT_METHODS, 'text'),
    best_time_to_contact: cleanSingleLine(form.best_time_to_contact, MAX_LENGTHS.shortText) || null,
    gate_or_pet_notes: cleanMultiLine(form.gate_or_pet_notes, MAX_LENGTHS.notes) || null,
    additional_notes: cleanMultiLine(form.additional_notes, MAX_LENGTHS.notes) || null,
    sms_consent: Boolean(form.sms_consent),
    ...getCampaignParams()
  };
}

function validatePayload(payload) {
  const errors = [];

  if (!payload.first_name) errors.push('Please enter your first name.');
  if (!payload.phone || countPhoneDigits(payload.phone) < 10) errors.push('Please enter a valid phone number.');
  if (payload.email && !isValidEmail(payload.email)) errors.push('Please enter a valid email address or leave it blank.');
  if (!payload.street_address) errors.push('Please enter the street address for the quote.');
  if (!payload.city) errors.push('Please enter the city.');
  if (payload.zip_code && !/^\d{5}(-\d{4})?$/.test(payload.zip_code)) errors.push('Please enter a valid ZIP code or leave it blank.');
  if (!payload.sms_consent) errors.push('Please check the contact permission box so I can reach out about your quote.');
  if (!payload.services_requested.length) errors.push('Please select at least one service.');

  return errors;
}

function getFriendlySupabaseError(insertError) {
  const message = insertError?.message || 'Unknown Supabase error';
  const details = insertError?.details || insertError?.hint || insertError?.code || '';
  const combined = `${message} ${details}`.toLowerCase();

  if (combined.includes('row-level security') || combined.includes('rls')) {
    return {
      publicMessage: 'The form is connected, but Supabase is blocking public quote submissions. Check the INSERT RLS policy for anon users.',
      detail: message
    };
  }

  if (combined.includes('permission denied')) {
    return {
      publicMessage: 'The form reached Supabase, but the anon role does not have permission to insert leads.',
      detail: message
    };
  }

  if (combined.includes('invalid input value for enum') || combined.includes('violates check constraint')) {
    return {
      publicMessage: 'The form reached Supabase, but one of the submitted values does not match the database security rules.',
      detail: message
    };
  }

  if (combined.includes('failed to fetch') || combined.includes('network')) {
    return {
      publicMessage: 'The browser could not reach Supabase. Check the Supabase URL, anon key, and internet connection.',
      detail: message
    };
  }

  return {
    publicMessage: 'Something went wrong while sending your request. Please call or text me directly at (336) 552-1877.',
    detail: message
  };
}

function App() {
  const [form, setForm] = React.useState(initialForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');
  const [errorDetail, setErrorDetail] = React.useState('');
  const formLoadedAt = React.useRef(Date.now());

  const selectedServices = form.services_requested;

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleService(value) {
    if (!VALID_SERVICES.has(value)) return;

    setForm((current) => {
      const exists = current.services_requested.includes(value);
      const services = exists
        ? current.services_requested.filter((item) => item !== value)
        : [...current.services_requested, value];

      return {
        ...current,
        services_requested: services.length ? services : ['mow_weedeat_edge_blow']
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setErrorDetail('');

    // Honeypot field: real customers never see this. Bots often fill it.
    if (form.website) return;

    // Soft bot-speed check. This is not a replacement for server-side rate limits.
    if (Date.now() - formLoadedAt.current < 1200) {
      setError('Please wait one second and try again.');
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured yet. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values, then restart the dev server or redeploy.');
      setErrorDetail('Expected variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. In Vite, variables must start with VITE_.');
      return;
    }

    const payload = buildSafePayload(form);
    const validationErrors = validatePayload(payload);

    if (validationErrors.length) {
      setError(validationErrors[0]);
      setErrorDetail(validationErrors.join('\n'));
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('lawncare_leads')
        .insert([payload], { returning: 'minimal' });

      if (insertError) {
        console.error('Supabase insert failed:', insertError);
        const parsedError = getFriendlySupabaseError(insertError);
        setError(parsedError.publicMessage);
        setErrorDetail(parsedError.detail);
        return;
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      console.error('Quote request failed:', requestError);
      const parsedError = getFriendlySupabaseError(requestError);
      setError(parsedError.publicMessage);
      setErrorDetail(parsedError.detail);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <ThankYou />;
  }

  return (
    <main className="page-shell">
      <section className="hero-card" aria-labelledby="page-title">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-content">
          <div className="brand-row">
            <div className="brand-mark" aria-hidden="true">☘</div>
            <div>
              <p className="eyebrow">Affordable Residential Lawn Care</p>
              <h1 id="page-title">Request a Quick Lawn Quote</h1>
            </div>
          </div>

          <p className="hero-copy">
            Mowing, weedeating, edging, and blowing for average homes, townhomes, and neighborhood properties.
          </p>

          <div className="trust-grid" aria-label="Service highlights">
            <span>Starting at $65</span>
            <span>Route service available</span>
            <span>Call or text friendly</span>
          </div>
        </div>
      </section>

      <section className="area-card">
        <strong>Serving:</strong> Fort Walton Beach, Shalimar, Cinco Bayou, Mary Esther, and Destin
      </section>

      <form className="quote-form" onSubmit={handleSubmit} noValidate>
        <input
          className="hidden-field"
          type="text"
          name="website"
          tabIndex="-1"
          autoComplete="off"
          value={form.website}
          onChange={(event) => updateField('website', event.target.value)}
          aria-hidden="true"
        />

        <FormSection number="1" title="Your contact info">
          <div className="two-column">
            <Field label="First name" required>
              <input
                required
                maxLength={MAX_LENGTHS.name}
                autoComplete="given-name"
                value={form.first_name}
                onChange={(event) => updateField('first_name', event.target.value)}
                placeholder="First name"
              />
            </Field>

            <Field label="Last name">
              <input
                maxLength={MAX_LENGTHS.name}
                autoComplete="family-name"
                value={form.last_name}
                onChange={(event) => updateField('last_name', event.target.value)}
                placeholder="Last name"
              />
            </Field>
          </div>

          <Field label="Phone number" required hint="I’ll use this to call or text about your quote.">
            <input
              required
              maxLength={MAX_LENGTHS.phone}
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', cleanPhone(event.target.value))}
              placeholder="(336) 552-1877"
            />
          </Field>

          <Field label="Email address" hint="Optional">
            <input
              type="email"
              maxLength={MAX_LENGTHS.email}
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@example.com"
            />
          </Field>
        </FormSection>

        <FormSection number="2" title="Property details">
          <Field label="Street address" required>
            <input
              required
              maxLength={MAX_LENGTHS.street}
              autoComplete="street-address"
              value={form.street_address}
              onChange={(event) => updateField('street_address', event.target.value)}
              placeholder="123 Example Street"
            />
          </Field>

          <div className="two-column city-row">
            <Field label="City" required>
              <input
                required
                maxLength={MAX_LENGTHS.city}
                autoComplete="address-level2"
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                placeholder="Fort Walton Beach"
              />
            </Field>

            <Field label="ZIP code">
              <input
                maxLength={MAX_LENGTHS.zip}
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.zip_code}
                onChange={(event) => updateField('zip_code', cleanZip(event.target.value))}
                placeholder="32547"
              />
            </Field>
          </div>

          <Field label="Property type">
            <select value={form.property_type} onChange={(event) => updateField('property_type', event.target.value)}>
              <option value="small_yard_townhome">Small yard / townhome</option>
              <option value="medium_residence">Medium residence</option>
              <option value="larger_residence">Larger residence</option>
              <option value="not_sure">Not sure</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </FormSection>

        <FormSection number="3" title="What do you need?">
          <div className="service-grid">
            {SERVICES.map((service) => (
              <label className={`check-card ${selectedServices.includes(service.value) ? 'selected' : ''}`} key={service.value}>
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.value)}
                  onChange={() => toggleService(service.value)}
                />
                <span>{service.label}</span>
              </label>
            ))}
          </div>

          <Field label="How often do you want service?" required>
            <select
              required
              value={form.requested_frequency}
              onChange={(event) => updateField('requested_frequency', event.target.value)}
            >
              <option value="not_sure">Not sure yet</option>
              <option value="one_time">One-time cut</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
        </FormSection>

        <FormSection number="4" title="Yard condition">
          <div className="radio-grid">
            {[
              ['maintained', 'Maintained'],
              ['a_little_tall', 'A little tall'],
              ['overgrown', 'Overgrown'],
              ['very_overgrown', 'Very overgrown'],
              ['not_sure', 'Not sure']
            ].map(([value, label]) => (
              <label className={`radio-card ${form.yard_condition === value ? 'selected' : ''}`} key={value}>
                <input
                  type="radio"
                  name="yard_condition"
                  value={value}
                  checked={form.yard_condition === value}
                  onChange={(event) => updateField('yard_condition', event.target.value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <Field label="Gate, pet, or access notes" hint="Optional">
            <textarea
              maxLength={MAX_LENGTHS.notes}
              value={form.gate_or_pet_notes}
              onChange={(event) => updateField('gate_or_pet_notes', event.target.value)}
              placeholder="Example: gate on left side, dog in backyard, knock first..."
              rows="3"
            />
          </Field>

          <Field label="Anything else I should know?" hint="Optional">
            <textarea
              maxLength={MAX_LENGTHS.notes}
              value={form.additional_notes}
              onChange={(event) => updateField('additional_notes', event.target.value)}
              placeholder="Tell me about the yard, timing, or any extra work needed."
              rows="4"
            />
          </Field>
        </FormSection>

        <FormSection number="5" title="Best way to reach you">
          <Field label="Preferred contact method">
            <select value={form.preferred_contact} onChange={(event) => updateField('preferred_contact', event.target.value)}>
              <option value="text">Text me</option>
              <option value="call">Call me</option>
              <option value="email">Email me</option>
              <option value="any">Any is fine</option>
            </select>
          </Field>

          <Field label="Best time to contact" hint="Optional">
            <input
              maxLength={MAX_LENGTHS.shortText}
              value={form.best_time_to_contact}
              onChange={(event) => updateField('best_time_to_contact', event.target.value)}
              placeholder="Example: after 5 PM, anytime today, mornings..."
            />
          </Field>

          <label className="consent-card">
            <input
              required
              type="checkbox"
              checked={form.sms_consent}
              onChange={(event) => updateField('sms_consent', event.target.checked)}
            />
            <span>
              By submitting, I agree to be contacted by call or text about my lawn care quote.
            </span>
          </label>
        </FormSection>

        {error ? (
          <div className="error-box" role="alert">
            <p>{error}</p>
            {errorDetail ? (
              <details>
                <summary>Technical details</summary>
                <code>{errorDetail}</code>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="submit-card">
          <p className="pricing-note">
            Starting at <strong>$65 minimum</strong>. Overgrown yards may require an upcharge for extra gas, time, edging, and cleanup.
          </p>
          <button className="submit-button" type="submit" disabled={submitting}>
            {submitting ? 'Sending request...' : 'Request My Quote'}
          </button>
          <a className="call-link" href="tel:+13365521877">Prefer to talk? Call or text (336) 552-1877</a>
        </div>
      </form>
    </main>
  );
}

function FormSection({ number, title, children }) {
  return (
    <section className="form-section">
      <div className="section-title-row">
        <span className="section-number">{number}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label} {required ? <em>*</em> : null}
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

function ThankYou() {
  return (
    <main className="page-shell thank-you-shell">
      <section className="thank-you-card">
        <div className="success-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">Quote request received</p>
        <h1>Thanks! I’ll review your lawn details and reach out soon.</h1>
        <p>
          I’ll contact you by call or text to confirm the details, quote the yard, and get you on the route if it’s a good fit.
        </p>
        <a className="submit-button secondary-action" href="tel:+13365521877">Call or text now</a>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
