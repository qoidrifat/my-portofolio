// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useState } from 'react';
import ContactSection from '@/components/portofolio/ContactSection';
import { LanguageProvider } from '@/lib/LanguageContext';

const ENDPOINT = 'https://formspree.io/f/mgolwqae';

function Wrapper({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

/** Capture every fetch call so no request can escape to the real endpoint. */
function stubFetch(impl) {
  const spy = vi.fn(impl);
  globalThis.fetch = /** @type {any} */ (spy);
  return spy;
}

const ok = () => Promise.resolve({ ok: true, status: 200 });

async function fillAndSubmit({ name = 'Ada', email = 'ada@example.com', message = 'Hello', gotcha } = {}) {
  fireEvent.change(screen.getByLabelText(/full name|nama lengkap/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/email address|^email$/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/your message|pesan anda/i), { target: { value: message } });
  if (gotcha !== undefined) {
    fireEvent.change(document.querySelector('input[name="_gotcha"]'), { target: { value: gotcha } });
  }
  const button = screen.getByRole('button', { name: /transmit message|kirim pesan/i });
  await act(async () => { fireEvent.submit(button.closest('form')); });
  return button;
}

describe('ContactSection — send lifecycle', () => {
  beforeEach(() => { vi.useRealTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('resolves FORMSPREE_URL (no ReferenceError) and posts to the real endpoint', async () => {
    const spy = stubFetch(ok);
    render(<Wrapper><ContactSection /></Wrapper>);
    await fillAndSubmit();

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('name')).toBe('Ada');
    expect(init.body.get('email')).toBe('ada@example.com');
    expect(init.body.get('message')).toBe('Hello');
  });

  it('always submits the honeypot field so Formspree can filter it', async () => {
    const spy = stubFetch(ok);
    render(<Wrapper><ContactSection /></Wrapper>);
    await fillAndSubmit();

    const body = spy.mock.calls[0][1].body;
    expect(body.has('_gotcha')).toBe(true);
    expect(body.get('_gotcha')).toBe('');
  });

  it('keeps user input and shows the error state when the request fails', async () => {
    stubFetch(() => Promise.reject(new Error('network down')));
    render(<Wrapper><ContactSection /></Wrapper>);
    await fillAndSubmit({ message: 'please ignore this text' });

    await waitFor(() => {
      expect(screen.getByText(/something went wrong|terjadi kesalahan/i)).toBeInTheDocument();
    });
    // Form is NOT reset on failure — the visitor keeps their message.
    expect(screen.getByLabelText(/your message|pesan anda/i).value).toBe('please ignore this text');
  });

  it('treats a non-2xx provider response as an error, not a success', async () => {
    stubFetch(() => Promise.resolve({ ok: false, status: 422 }));
    render(<Wrapper><ContactSection /></Wrapper>);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong|terjadi kesalahan/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/message sent|pesan terkirim/i)).not.toBeInTheDocument();
  });

  it('shows success only after the provider confirms, then enforces the cooldown', async () => {
    let resolve;
    const spy = stubFetch(() => new Promise((r) => { resolve = r; }));
    render(<Wrapper><ContactSection /></Wrapper>);
    await fillAndSubmit();

    // In flight: success must not be claimed yet, submit must be locked.
    expect(screen.queryByText(/message sent|pesan terkirim/i)).not.toBeInTheDocument();
    const submit = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
    expect(submit).toBeDisabled();

    await act(async () => { resolve({ ok: true, status: 200 }); });

    await waitFor(() => {
      expect(screen.getByText(/message sent|pesan terkirim/i)).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled(); // cooldown active

    // A second submit during cooldown must not reach the network.
    await act(async () => { fireEvent.submit(submit.closest('form')); });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not double-post when submit is fired twice while pending', async () => {
    const spy = stubFetch(() => new Promise(() => {}));
    render(<Wrapper><ContactSection /></Wrapper>);
    const button = await fillAndSubmit();
    await act(async () => { fireEvent.submit(button.closest('form')); });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('lets the cooldown expire and allows a new message', async () => {
    vi.useFakeTimers();
    const spy = stubFetch(ok);
    render(<Wrapper><ContactSection /></Wrapper>);

    await act(async () => { await fillAndSubmit(); });
    expect(spy).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(61_000); });

    const button = screen.getByRole('button', { name: /transmit message|kirim pesan/i });
    expect(button).not.toBeDisabled();
    await act(async () => { fireEvent.submit(button.closest('form')); });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
describe('ContactSection — behaviour outside the provider', () => {
  it('renders with the default language context', () => {
    render(<ContactSection />);
    expect(document.querySelector('input[name="_gotcha"]')).toBeInTheDocument();
  });
});
