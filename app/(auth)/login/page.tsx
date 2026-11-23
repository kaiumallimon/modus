'use client';

import React, { useState, useEffect, useRef, useId, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RiEyeLine,
  RiEyeOffLine,
  RiErrorWarningLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Input } from '@/components/base/input/input';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Spinner } from '@/components/base/spinner/spinner';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { toast } from '@/components/base/toast/toast';

const REMEMBER_ME_KEY = 'modus_remember_identifier';

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

  useEffect(() => {
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
      await login(
        {
          identifier: identifier.trim(),
          password: password.trim(),
        },
        rememberMe
      );

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
    <div className="min-h-screen flex flex-col justify-center items-center modus-auth-bg text-text-primary relative p-4 sm:p-6">
      {/* Top Right Theme Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle appearance="segmented" size="small" />
      </div>

      {/* Ambient center lighting */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-[#A5D632]/8 dark:bg-[#A5D632]/4 blur-[120px]" />
      </div>

      {/* ── Main Form Container ── */}
      <main className="relative z-10 w-full max-w-[420px]">
        {/* Auth Card */}
        <div className="bg-background-primary-default dark:bg-[#1A1E1A] rounded-2xl border border-border-button-default dark:border-[#2A3027] shadow-[0_4px_24px_-4px_rgba(23,27,24,0.06),0_1px_3px_rgba(23,27,24,0.03)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] p-8 sm:p-9">
          
          {/* Centered Modus Logo without background or text */}
          <div className="flex justify-center mb-6">
            <Image
              src="/brand/modus-symbol-lime-on-transparent.svg"
              alt="Modus"
              width={38}
              height={34}
              priority
              className="w-9 h-8 object-contain"
            />
          </div>

          {/* Setup Notice */}
          {setupRequired && (
            <div
              role="note"
              className="mb-6 p-3 bg-accent-100/70 border border-accent-300 rounded-xl text-xs text-accent-950 flex items-center justify-between"
            >
              <span>Initial setup is pending on this instance.</span>
              <button
                type="button"
                onClick={() => router.push('/setup')}
                className="font-bold underline ml-2 hover:text-text-primary"
              >
                Start Setup →
              </button>
            </div>
          )}

          {/* Header Text */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sign in</h1>
            <p className="text-sm text-text-secondary mt-1.5">
              Use your work email or ID to access your workspace.
            </p>
          </div>

          {/* Error Banner */}
          {hasError && (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="mb-5 p-3 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2.5"
            >
              <RiErrorWarningLine className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* BoardUI Identifier Input */}
            <Input
              ref={identifierRef}
              label="Email or ID"
              placeholder="admin@modus.local or MOD-10001"
              value={identifier}
              onChange={(val) => {
                setIdentifier(val);
                if (errorMessage) setErrorMessage('');
              }}
              fieldClassName="!h-11 px-3.5 !rounded-xl !bg-white dark:!bg-[#1D211D] border border-[#E4E8DD] dark:border-[#2C332A] hover:border-[#CCD2C2] dark:hover:border-[#3D473A] focus-within:!border-[#8DBA20] focus-within:!ring-3 focus-within:!ring-[#A5D632]/20 !ring-0 transition-all duration-150 shadow-2xs"
              autoFocus
            />

            {/* BoardUI Password Input with Toggle */}
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(val) => {
                setPassword(val);
                if (errorMessage) setErrorMessage('');
              }}
              fieldClassName="!h-11 px-3.5 !rounded-xl !bg-white dark:!bg-[#1D211D] border border-[#E4E8DD] dark:border-[#2C332A] hover:border-[#CCD2C2] dark:hover:border-[#3D473A] focus-within:!border-[#8DBA20] focus-within:!ring-3 focus-within:!ring-[#A5D632]/20 !ring-0 transition-all duration-150 shadow-2xs"
              trailingAddon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="size-7 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8DBA20]"
                >
                  {showPassword ? (
                    <RiEyeOffLine className="size-4" aria-hidden />
                  ) : (
                    <RiEyeLine className="size-4" aria-hidden />
                  )}
                </button>
              }
            />

            {/* BoardUI Checkbox & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <Checkbox
                isSelected={rememberMe}
                onChange={(selected) => setRememberMe(selected)}
                size="sm"
              >
                Remember me
              </Checkbox>

              <Link
                href="/forgot-password"
                className="text-caption-1-medium text-text-secondary hover:text-text-primary hover:underline underline-offset-4 decoration-[#A5D632] transition-colors focus:outline-none focus:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* BoardUI Primary Button */}
            <Button
              type="submit"
              variant="primary"
              size="medium"
              disabled={isSubmitting}
              className="w-full justify-center !h-11 !rounded-xl font-bold cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" aria-hidden className="text-[#171B18]" />
                  <span>Signing in…</span>
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Under-Card Note */}
          <p className="text-center text-xs text-text-secondary mt-6">
            Need access?{' '}
            <span className="font-medium text-text-primary">Contact your administrator.</span>
          </p>
        </div>
      </main>
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
