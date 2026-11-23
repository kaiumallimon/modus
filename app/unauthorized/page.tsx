import React from 'react';
import Link from 'next/link';
import { RiShieldLine, RiArrowLeftLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-full">
      <div className="w-full max-w-md bg-background-primary-default border border-border-button-default rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="size-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <RiShieldLine className="size-6" />
        </div>
        <h1 className="text-title-2-medium text-text-primary">Access Restricted</h1>
        <p className="text-body-medium text-text-secondary">
          You do not have the necessary role or permissions to access this Modus module or administrative function.
        </p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="primary" leadingIcon={RiArrowLeftLine}>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
