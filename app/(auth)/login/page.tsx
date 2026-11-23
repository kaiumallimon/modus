'use client';

import React, { useState, useEffect, useRef, useId, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RiEyeLine,
  RiEyeOffLine,
  RiErrorWarningLine,
  RiCheckLine,
  RiLoader4Line,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/components/base/toast/toast';

const REMEMBER_ME_KEY = 'modus_remember_identifier';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

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
  const [host, setHost] = useState('');

  const identifierRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    setHost(window.location.host);
    try {
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch {
      // LocalStorage access restricted
    }
  }, []);

  useEffect(() => {
    if (errorMessage) {
      identifierRef.current?.focus();
    }
  }, [errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both your identifier and password to continue.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({
        identifier: identifier.trim(),
        password: password.trim(),
      });

      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, identifier.trim());
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
      } catch {
        // Storage access blocked
      }

      toast.success('Signed in successfully');
      router.replace(decodeURIComponent(returnUrl));
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify your credentials.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = errorMessage.length > 0;

  return (
    <div className="min-h-screen flex flex-col justify-between modus-auth-bg text-[#171B18] relative select-none">
      {/* Ambient center lighting */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="h-[650px] w-[650px] rounded-full bg-[#A5D632]/8 blur-[120px]" />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[#171B18] flex items-center justify-center shadow-xs border border-white/10 p-2">
            <Image
              src="/brand/modus-symbol-lime-on-transparent.svg"
              alt="Modus"
              width={22}
              height={20}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-[#171B18]">Modus</span>
            <span className="text-[11px] font-semibold text-[#52584D] bg-[#E7EBDD]/70 border border-[#CCD3BF] px-2 py-0.5 rounded-md">
              Enterprise
            </span>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-[#E2E6DC] shadow-2xs text-xs font-medium text-[#52584D]">
          <span className="size-2 rounded-full bg-[#8DBA20] animate-pulse" />
          <span>Systems Operational</span>
        </div>
      </header>

      {/* ── Main Form Container ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px]">
          {/* Auth Card */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-[#E2E6DC] shadow-[0_4px_24px_-4px_rgba(23,27,24,0.06),0_1px_3px_rgba(23,27,24,0.03)] p-8 sm:p-9 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#A5D632] before:to-transparent">
            {/* Setup Notice */}
            {setupRequired && (
              <div
                role="note"
                className="mb-6 p-3 bg-[#EDF6D7] border border-[#CAE28C] rounded-xl text-xs text-[#35470D] flex items-center justify-between"
              >
                <span>Initial setup is pending on this instance.</span>
                <button
                  type="button"
                  onClick={() => router.push('/setup')}
                  className="font-bold underline ml-2 hover:text-[#171B18]"
                >
                  Start Setup →
                </button>
              </div>
            )}

            {/* Header Text */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-[#171B18]">Sign in</h1>
              <p className="text-sm text-[#73796E] mt-1.5">
                Use your work email or Human ID to access your workspace.
              </p>
            </div>

            {/* Error Banner */}
            {hasError && (
              <div
                id={errorId}
                role="alert"
                aria-live="assertive"
                className="mb-5 p-3 rounded-xl bg-[#FFF1F2] border border-[#FCA5A5] text-[#9F1239] text-xs font-medium flex items-start gap-2.5"
              >
                <RiErrorWarningLine className="size-4 shrink-0 text-[#E11D48] mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Identifier Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#52584D]"
                >
                  Email or Human ID
                </label>
                <input
                  ref={identifierRef}
                  id="login-identifier"
                  name="username"
                  autoComplete="username"
                  type="text"
                  inputMode="email"
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
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E6DC] bg-[#FAFBF8] hover:bg-white focus:bg-white text-sm text-[#171B18] placeholder:text-[#9EA498] hover:border-[#CCD2C2] focus:border-[#8DBA20] focus:ring-2 focus:ring-[#A5D632]/25 focus:outline-none transition-all duration-150 shadow-2xs"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#52584D]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="current-password"
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    aria-invalid={hasError ? true : undefined}
                    aria-describedby={hasError ? errorId : undefined}
                    required
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-[#E2E6DC] bg-[#FAFBF8] hover:bg-white focus:bg-white text-sm text-[#171B18] placeholder:text-[#9EA498] hover:border-[#CCD2C2] focus:border-[#8DBA20] focus:ring-2 focus:ring-[#A5D632]/25 focus:outline-none transition-all duration-150 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 rounded-lg text-[#73796E] hover:text-[#171B18] hover:bg-black/5 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#8DBA20]"
                  >
                    {showPassword ? (
                      <RiEyeOffLine className="size-4" aria-hidden />
                    ) : (
                      <RiEyeLine className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="size-4.5 rounded-md border border-[#CCD2C2] bg-white transition-all peer-checked:bg-[#A5D632] peer-checked:border-[#8DBA20] peer-focus-visible:ring-2 peer-focus-visible:ring-[#8DBA20] flex items-center justify-center shadow-2xs">
                      {rememberMe && <RiCheckLine className="size-3.5 text-[#171B18] stroke-[2]" />}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-[#52584D] hover:text-[#171B18] transition-colors">
                    Remember me
                  </span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-[#52584D] hover:text-[#171B18] hover:underline underline-offset-4 decoration-[#A5D632] transition-colors focus:outline-none focus:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                aria-disabled={isSubmitting}
                className="w-full h-11 rounded-xl font-bold text-sm text-[#171B18] bg-[#A5D632] hover:bg-[#97C72A] active:bg-[#88B522] border border-[#8DBA20]/80 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)] active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DBA20] focus-visible:ring-offset-2"
              >
                {isSubmitting ? (
                  <>
                    <RiLoader4Line className="size-4.5 animate-spin text-[#171B18]" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Under-Card Note */}
            <p className="text-center text-xs text-[#73796E] mt-6">
              Need access?{' '}
              <span className="font-medium text-[#52584D]">Contact your administrator.</span>
            </p>
          </div>
        </div>
      </main>

      {/* ── Bottom Page Chrome ── */}
      <footer className="relative z-10 py-5 flex items-center justify-center gap-3 text-xs font-mono text-[#8E9588]">
        <span className="size-1.5 rounded-full bg-[#8DBA20]" />
        <span>{host || 'localhost'}</span>
        <span className="opacity-40">·</span>
        <span>v{APP_VERSION}</span>
        <span className="opacity-40">·</span>
        <span>Self-Hosted</span>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center modus-auth-bg" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
