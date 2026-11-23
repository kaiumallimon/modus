import React from 'react';
import Link from 'next/link';
import { RiErrorWarningLine, RiArrowLeftLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-full">
      <div className="w-full max-w-md bg-background-primary-default border border-border-button-default rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="size-12 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center mx-auto">
          <RiErrorWarningLine className="size-6" />
        </div>
        <h1 className="text-title-2-medium text-text-primary">Page Not Found</h1>
        <p className="text-body-medium text-text-secondary">
          The requested Modus page or resource does not exist or has been relocated.
        </p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="primary" leadingIcon={RiArrowLeftLine}>
              Back to Safety
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
