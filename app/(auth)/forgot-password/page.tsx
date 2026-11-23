'use client';

import React, { useState, useEffect, useRef, useId, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RiEyeLine,
  RiEyeOffLine,
  RiArrowLeftLine,
  RiCheckboxCircleLine,
  RiMailSendLine,
  RiInformationLine,
  RiCheckLine,
  RiErrorWarningLine,
} from '@remixicon/react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Spinner } from '@/components/base/spinner/spinner';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { toast } from '@/components/base/toast/toast';

type ResetStep = 'REQUEST_TOKEN' | 'RESET_PASSWORD' | 'SUCCESS';

const inputFieldStyles =
  '!h-11 px-3.5 !rounded-xl !bg-white dark:!bg-[#1D211D] border border-[#E4E8DD] dark:border-[#2C332A] hover:border-[#CCD2C2] dark:hover:border-[#3D473A] focus-within:!border-[#8DBA20] focus-within:!ring-3 focus-within:!ring-[#A5D632]/20 !ring-0 transition-all duration-150 shadow-2xs';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlToken = searchParams.get('token') || '';
  const urlEmail = searchParams.get('email') || searchParams.get('identifier') || '';

  const [step, setStep] = useState<ResetStep>(urlToken ? 'RESET_PASSWORD' : 'REQUEST_TOKEN');
  const [identifier, setIdentifier] = useState(urlEmail);
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const identifierRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  // If URL changes with token dynamically, jump directly to token step
  useEffect(() => {
    if (urlToken && !token) {
      setToken(urlToken);
      setStep('RESET_PASSWORD');
    }
    if (urlEmail && !identifier) {
      setIdentifier(urlEmail);
    }
  }, [urlToken, urlEmail, token, identifier]);

  // Step 1: Request token
  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMessage('Please enter your registered email address or ID.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await apiClient<ForgotPasswordResponse>(
        API_ENDPOINTS.AUTH_FORGOT_PASSWORD,
        {
          method: 'POST',
          body: JSON.stringify({ identifier: cleanId }),
          skipAuth: true,
        }
      );

      setInfoMessage(
        res.message ||
          'If an active account with that identifier exists, a password reset token has been sent to the registered email address.'
      );
      toast.success('Reset token dispatched');
      setStep('RESET_PASSWORD');
    } catch (err: any) {
      const msg = err.message || 'Unable to request password reset. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Reset password with token
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();

    if (!cleanToken) {
      setErrorMessage('Please enter the reset token received in your email.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await apiClient<ResetPasswordResponse>(
        API_ENDPOINTS.AUTH_RESET_PASSWORD,
        {
          method: 'POST',
          body: JSON.stringify({
            token: cleanToken,
            newPassword,
          }),
          skipAuth: true,
        }
      );

      toast.success('Password successfully reset');
      setStep('SUCCESS');
    } catch (err: any) {
      const msg = err.message || 'Invalid or expired password reset token.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasEnteredToken = token.trim().length > 0;
  const isPasswordValidLength = newPassword.length >= 8;
  const doPasswordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const hasError = errorMessage.length > 0;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center modus-auth-bg text-text-primary relative p-4 sm:p-6 select-none">
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

      {/* ── Main Container ── */}
      <main className="relative z-10 w-full max-w-[420px]">
        {/* Auth Card */}
        <div className="bg-background-primary-default dark:bg-[#1A1E1A] rounded-2xl border border-border-button-default dark:border-[#2A3027] shadow-[0_4px_24px_-4px_rgba(23,27,24,0.06),0_1px_3px_rgba(23,27,24,0.03)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] p-8 sm:p-9">
          {/* Centered Modus Logo */}
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

          {/* Header Text */}
          <div className="mb-6">
            {step === 'REQUEST_TOKEN' && (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Forgot password</h1>
                <p className="text-sm text-text-secondary mt-1.5">
                  Enter your email or ID to receive a verification token.
                </p>
              </>
            )}

            {step === 'RESET_PASSWORD' && (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Reset your password</h1>
                <p className="text-sm text-text-secondary mt-1.5">
                  Enter the reset token sent to your email and set a new password.
                </p>
              </>
            )}

            {step === 'SUCCESS' && (
              <div className="text-center">
                <div className="size-12 rounded-full bg-accent-100 dark:bg-accent-950/60 flex items-center justify-center mx-auto mb-4 border border-accent-300 dark:border-accent-800">
                  <RiCheckboxCircleLine className="size-7 text-[#8DBA20]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Password reset complete</h1>
                <p className="text-sm text-text-secondary mt-1.5">
                  Your password has been securely updated. You can now sign in with your new credentials.
                </p>
              </div>
            )}
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

          {/* STEP 1: REQUEST TOKEN */}
          {step === 'REQUEST_TOKEN' && (
            <form onSubmit={handleRequestToken} noValidate className="space-y-5">
              <Input
                ref={identifierRef}
                label="Email or ID"
                placeholder="admin@modus.local or MOD-10001"
                value={identifier}
                onChange={(val) => {
                  setIdentifier(val);
                  if (errorMessage) setErrorMessage('');
                }}
                fieldClassName={inputFieldStyles}
                autoFocus
              />

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
                    <span>Sending token…</span>
                  </span>
                ) : (
                  'Send reset token'
                )}
              </Button>

              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:underline"
                >
                  <RiArrowLeftLine className="size-4" />
                  Back to sign in
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setStep('RESET_PASSWORD');
                  }}
                  className="text-caption-1-medium text-text-secondary hover:text-text-primary hover:underline transition-colors focus:outline-none"
                >
                  Already have a token?
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER TOKEN & NEW PASSWORD */}
          {step === 'RESET_PASSWORD' && (
            <form onSubmit={handleResetPassword} noValidate className="space-y-5">
              {infoMessage && (
                <div className="p-3 bg-accent-100/70 dark:bg-accent-950/40 border border-accent-300 dark:border-accent-800/60 text-accent-950 dark:text-accent-200 text-xs font-medium rounded-xl flex items-start gap-2.5">
                  <RiInformationLine className="size-4 shrink-0 text-[#8DBA20] mt-0.5" />
                  <span className="leading-relaxed">{infoMessage}</span>
                </div>
              )}

              {/* Reset Token Input */}
              <Input
                ref={tokenRef}
                label="Reset Token"
                placeholder="Paste the 64-character token"
                value={token}
                onChange={(val) => {
                  setToken(val);
                  if (errorMessage) setErrorMessage('');
                }}
                fieldClassName={inputFieldStyles}
                autoFocus={!urlToken}
              />

              {/* New Password fields reveal smoothly when token is entered */}
              {hasEnteredToken ? (
                <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(val) => {
                      setNewPassword(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                    fieldClassName={inputFieldStyles}
                    trailingAddon={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showNewPassword}
                        className="size-7 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8DBA20]"
                      >
                        {showNewPassword ? (
                          <RiEyeOffLine className="size-4" aria-hidden />
                        ) : (
                          <RiEyeLine className="size-4" aria-hidden />
                        )}
                      </button>
                    }
                  />

                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(val) => {
                      setConfirmPassword(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                    fieldClassName={inputFieldStyles}
                    trailingAddon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showConfirmPassword}
                        className="size-7 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8DBA20]"
                      >
                        {showConfirmPassword ? (
                          <RiEyeOffLine className="size-4" aria-hidden />
                        ) : (
                          <RiEyeLine className="size-4" aria-hidden />
                        )}
                      </button>
                    }
                  />

                  {/* Validation status cues */}
                  <div className="space-y-1.5 p-3 bg-background-secondary-default dark:bg-[#151915] rounded-xl text-caption-2-medium">
                    <div className="flex items-center gap-2">
                      {isPasswordValidLength ? (
                        <RiCheckLine className="size-4 text-[#8DBA20]" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-text-tertiary ml-1 mr-1.5" />
                      )}
                      <span className={isPasswordValidLength ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {doPasswordsMatch ? (
                        <RiCheckLine className="size-4 text-[#8DBA20]" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-text-tertiary ml-1 mr-1.5" />
                      )}
                      <span className={doPasswordsMatch ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                        Passwords match
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={isSubmitting || !isPasswordValidLength || !doPasswordsMatch}
                    className="w-full justify-center !h-11 !rounded-xl font-bold cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" aria-hidden className="text-[#171B18]" />
                        <span>Resetting password…</span>
                      </span>
                    ) : (
                      'Reset password'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-background-secondary-default dark:bg-[#151915] border border-dashed border-border-button-default dark:border-[#2C332A] rounded-xl text-center text-xs text-text-secondary">
                  Paste your reset token above to enter a new password.
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setStep('REQUEST_TOKEN');
                  }}
                  className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-secondary hover:text-text-primary hover:underline transition-colors focus:outline-none"
                >
                  <RiMailSendLine className="size-4" />
                  Change email
                </button>

                <Link
                  href="/login"
                  className="text-caption-1-medium text-text-secondary hover:text-text-primary hover:underline transition-colors focus:outline-none"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="space-y-4">
              <Button
                type="button"
                variant="primary"
                size="medium"
                onClick={() => router.replace('/login')}
                className="w-full justify-center !h-11 !rounded-xl font-bold cursor-pointer"
              >
                Proceed to sign in
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center modus-auth-bg" />
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
