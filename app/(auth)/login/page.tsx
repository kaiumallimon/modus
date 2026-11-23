'use client';

import React, { useState, useEffect, useRef, useId, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';

const REMEMBER_ME_KEY = 'modus_remember_identifier';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

/* -------------------------------------------------------------------------- */
/*  Instance footer — reads window.location.host client-side                  */
/* -------------------------------------------------------------------------- */
function InstanceFooter() {
  const [host, setHost] = useState<string>('');
  useEffect(() => {
    setHost(window.location.host);
  }, []);

  return (
    <footer className="login-footer">
      <span className="login-footer__dot" aria-hidden="true" />
      <span>{host || 'localhost'}</span>
      <span className="login-footer__sep" aria-hidden="true">·</span>
      <span>v{APP_VERSION}</span>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Login form                                                                 */
/* -------------------------------------------------------------------------- */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const { login, setupRequired } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const identifierRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  /* Restore remembered identifier */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch { /* private browsing */ }
  }, []);

  /* Move focus to first field when an error appears */
  useEffect(() => {
    if (errorMessage) {
      identifierRef.current?.focus();
    }
  }, [errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Enter your identifier and password to continue.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({ identifier: identifier.trim(), password: password.trim() });

      try {
        if (rememberMe) localStorage.setItem(REMEMBER_ME_KEY, identifier.trim());
        else localStorage.removeItem(REMEMBER_ME_KEY);
      } catch { /* ignore */ }

      toast.success('Signed in');
      router.replace(decodeURIComponent(returnUrl));
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Check your credentials and try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = errorMessage.length > 0;

  return (
    <div className="login-page">
      {/* ── Top-left brand chrome ── */}
      <div className="login-brand" aria-label="Modus">
        <Image
          src="/brand/modus-symbol-lime-on-transparent.svg"
          alt=""
          width={20}
          height={18}
          priority
          aria-hidden
        />
        <span className="login-brand__wordmark">Modus</span>
      </div>

      {/* ── Centered form panel ── */}
      <main className="login-center">
        <div className="login-card">
          {/* Setup-required notice */}
          {setupRequired && (
            <div className="login-notice" role="note">
              Setup is required.{' '}
              <button
                type="button"
                onClick={() => router.push('/setup')}
                className="login-notice__link"
              >
                Start setup →
              </button>
            </div>
          )}

          {/* Heading */}
          <div className="login-heading-block">
            <h1 className="login-heading">Sign in</h1>
            <p className="login-subheading">Use your work email or Human ID.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="login-form">
            {/* Identifier */}
            <div className="login-field">
              <label htmlFor="login-identifier" className="login-label">
                Email or Human ID
              </label>
              <input
                ref={identifierRef}
                id="login-identifier"
                name="username"
                autoComplete="username"
                type="text"
                inputMode="email"
                className="login-input login-input--mono"
                placeholder="admin@modus.local or MOD-10001"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                aria-invalid={hasError ? true : undefined}
                aria-describedby={hasError ? errorId : undefined}
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  name="current-password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  aria-invalid={hasError ? true : undefined}
                  aria-describedby={hasError ? errorId : undefined}
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? (
                    <RiEyeOffLine className="login-eye__icon" aria-hidden />
                  ) : (
                    <RiEyeLine className="login-eye__icon" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="login-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  className="login-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password" className="login-forgot">
                Forgot password?
              </Link>
            </div>

            {/* Error — inline, reserved height so layout doesn't shift */}
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className={`login-error${hasError ? ' login-error--visible' : ''}`}
            >
              {errorMessage}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-btn"
              disabled={isSubmitting}
              aria-disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" aria-hidden className="text-[#252923]" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Under-form note */}
          <p className="login-access-note">
            Need access?{' '}
            <span className="login-access-note__em">Contact your administrator.</span>
          </p>
        </div>
      </main>

      {/* ── Bottom instance info ── */}
      <InstanceFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="login-page"
          aria-busy="true"
          aria-label="Loading sign-in page"
        />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
