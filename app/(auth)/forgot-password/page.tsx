'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RiMailLine,
  RiKeyLine,
  RiLockPasswordLine,
  RiEyeLine,
  RiEyeOffLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiCheckboxCircleLine,
  RiMailSendLine,
  RiInformationLine,
  RiCheckLine,
  RiCloseLine,
} from '@remixicon/react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { toast } from '@/components/base/toast/toast';

type ResetStep = 'REQUEST_TOKEN' | 'RESET_PASSWORD' | 'SUCCESS';

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
      setErrorMessage('Please enter your registered email address or User ID.');
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

          {step === 'REQUEST_TOKEN' && (
            <>
              <h1 className="text-title-2-medium text-text-primary">Forgot Password</h1>
              <p className="text-body-medium text-text-secondary">
                Enter your registered email or User ID to receive a one-time verification token.
              </p>
            </>
          )}

          {step === 'RESET_PASSWORD' && (
            <>
              <h1 className="text-title-2-medium text-text-primary">Reset Your Password</h1>
              <p className="text-body-medium text-text-secondary">
                Paste the verification token from your email to set a new password.
              </p>
            </>
          )}

          {step === 'SUCCESS' && (
            <>
              <div className="size-12 rounded-full bg-[#EDF6D7] flex items-center justify-center text-[#252923] mt-2 mb-1">
                <RiCheckboxCircleLine className="size-8 text-[#8DBA20]" />
              </div>
              <h1 className="text-title-2-medium text-text-primary">Password Reset Complete</h1>
              <p className="text-body-medium text-text-secondary">
                Your password has been securely updated. You can now log in with your new credentials.
              </p>
            </>
          )}
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-caption-1-medium rounded-xl flex items-start gap-2">
            <RiCloseLine className="size-5 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: REQUEST TOKEN */}
        {step === 'REQUEST_TOKEN' && (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <Input
              label="Email or Human ID"
              placeholder="admin@modus.local or MOD-10001"
              value={identifier}
              onChange={(val) => setIdentifier(val)}
              leadingIcon={RiMailLine}
              isRequired
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              size="medium"
              className="w-full justify-center font-bold"
              disabled={isSubmitting}
              trailingIcon={RiArrowRightLine}
            >
              {isSubmitting ? 'Sending Token...' : 'Send Reset Token'}
            </Button>

            <div className="flex items-center justify-between pt-2 border-t border-separator-border">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-secondary hover:text-text-primary hover:underline transition-colors"
              >
                <RiArrowLeftLine className="size-4" />
                Back to Sign In
              </Link>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setStep('RESET_PASSWORD');
                }}
                className="text-caption-1-medium text-[#73796E] hover:text-text-primary hover:underline transition-colors"
              >
                Already have a token?
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: ENTER TOKEN & NEW PASSWORD */}
        {step === 'RESET_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {infoMessage && (
              <div className="p-3 bg-[#EDF6D7] border border-[#A5D632]/50 text-[#252923] text-caption-1-medium rounded-xl flex items-start gap-2">
                <RiInformationLine className="size-5 shrink-0 text-[#8DBA20] mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-text-primary">Token Dispatched</p>
                  <p className="text-text-secondary text-[12px] leading-relaxed">
                    {infoMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Token Input */}
            <div className="space-y-1">
              <Input
                label="Reset Token"
                placeholder="Paste the 64-character token from your email"
                value={token}
                onChange={(val) => {
                  setToken(val);
                  if (errorMessage) setErrorMessage('');
                }}
                leadingIcon={RiKeyLine}
                isRequired
                autoFocus={!urlToken}
              />
              <p className="text-caption-2-medium text-text-tertiary">
                The single-use token expires in 15 minutes.
              </p>
            </div>

            {/* New Password Options appear once token is provided */}
            {hasEnteredToken ? (
              <div className="space-y-4 pt-2 border-t border-separator-border animate-in fade-in duration-200">
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(val) => setNewPassword(val)}
                    leadingIcon={RiLockPasswordLine}
                    isRequired
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary p-1"
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(val) => setConfirmPassword(val)}
                    leadingIcon={RiLockPasswordLine}
                    isRequired
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary p-1"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                  </button>
                </div>

                {/* Validation status cues */}
                <div className="space-y-1.5 p-3 bg-background-secondary rounded-xl text-caption-2-medium">
                  <div className="flex items-center gap-1.5">
                    {isPasswordValidLength ? (
                      <RiCheckLine className="size-4 text-green-600" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-text-tertiary ml-1 mr-1.5" />
                    )}
                    <span className={isPasswordValidLength ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                      At least 8 characters
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {doPasswordsMatch ? (
                      <RiCheckLine className="size-4 text-green-600" />
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
                  className="w-full justify-center font-bold"
                  disabled={isSubmitting || !isPasswordValidLength || !doPasswordsMatch}
                  trailingIcon={RiArrowRightLine}
                >
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-background-secondary/60 border border-dashed border-border-button-default rounded-xl text-center text-caption-1-medium text-text-tertiary">
                Paste your reset token above to reveal password entry.
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-separator-border">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setStep('REQUEST_TOKEN');
                }}
                className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-secondary hover:text-text-primary hover:underline transition-colors"
              >
                <RiMailSendLine className="size-4" />
                Resend or change email
              </button>

              <Link
                href="/login"
                className="text-caption-1-medium text-text-secondary hover:text-text-primary hover:underline transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'SUCCESS' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#EDF6D7] border border-[#A5D632]/60 rounded-xl text-caption-1-medium text-[#252923] space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <RiCheckLine className="size-5 text-[#8DBA20]" />
                <span>Account Ready</span>
              </div>
              <p className="text-text-secondary text-[13px] leading-relaxed">
                Your new password is now active. All previous login sessions have been revoked for your security.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="medium"
              className="w-full justify-center font-bold"
              onClick={() => router.replace('/login')}
              trailingIcon={RiArrowRightLine}
            >
              Proceed to Sign In
            </Button>
          </div>
        )}

        <div className="pt-2 text-center border-t border-separator-border text-caption-2-medium text-text-tertiary">
          Secured with Argon2 password hashing & rotating JWT sessions
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background-full" />
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
