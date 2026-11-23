'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiLockPasswordLine, RiMailLine, RiEyeLine, RiEyeOffLine, RiArrowRightLine } from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { toast } from '@/components/base/toast/toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const { login, setupRequired } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both identifier/email and password.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({
        identifier: identifier.trim(),
        password: password.trim(),
      });
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-full">
      <div className="w-full max-w-md bg-background-primary-default border border-border-button-default rounded-2xl shadow-lg p-8 space-y-6">
        {/* Modus Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-14 rounded-2xl bg-[#171B18] flex items-center justify-center shadow-sm p-3 border border-border-button-default">
            <Image
              src="/logo.svg"
              alt="Modus Logo"
              width={40}
              height={35}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-title-2-medium text-text-primary">Sign in to Modus</h1>
          <p className="text-body-medium text-text-secondary">
            Self-hosted modular business management system
          </p>
        </div>

        {setupRequired && (
          <div className="p-3 bg-accent-100/60 border border-accent-300 rounded-xl text-caption-1-medium text-accent-900 flex items-center justify-between">
            <span>Initial setup is pending on this instance.</span>
            <button
              onClick={() => router.push('/setup')}
              className="font-bold underline ml-2"
            >
              Start Setup
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-caption-1-medium rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email or Human ID"
            placeholder="admin@modus.local or MOD-10001"
            value={identifier}
            onChange={(val) => setIdentifier(val)}
            leadingIcon={RiMailLine}
            isRequired
            autoFocus
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(val) => setPassword(val)}
              leadingIcon={RiLockPasswordLine}
              isRequired
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="medium"
            className="w-full justify-center font-bold"
            disabled={isSubmitting}
            trailingIcon={RiArrowRightLine}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <div className="pt-2 text-center border-t border-separator-border text-caption-2-medium text-text-tertiary">
          Secured with Argon2 password hashing & rotating JWT sessions
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background-full" />}>
      <LoginForm />
    </Suspense>
  );
}

