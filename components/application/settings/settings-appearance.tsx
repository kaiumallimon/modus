"use client";

import React from "react";
import { RiComputerLine } from "@remixicon/react";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";

export function SettingsAppearance() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Interface Theme</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Theme preference"
            description="Select between system preference, light mode, or dark mode"
          >
            <ThemeToggle label={false} />
          </SettingsRow>
        </SettingsCard>
      </div>

      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Theme Details</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="System sync"
            description="Automatically adjusts theme based on your operating system preferences"
          >
            <span className="text-caption-1-medium text-text-tertiary flex items-center gap-1.5">
              <RiComputerLine className="size-4" />
              Auto-detecting
            </span>
          </SettingsRow>
          <SettingsRow
            label="High contrast palette"
            description="BoardUI semantic design tokens ensure high readability in both themes"
          >
            <span className="text-caption-1-medium text-accent-700 dark:text-accent-300 font-semibold">
              Active
            </span>
          </SettingsRow>
        </SettingsCard>
      </div>
    </div>
  );
}
