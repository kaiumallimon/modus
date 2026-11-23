"use client";

import { useState } from "react";
import {
  RiMailLine,
  RiShieldUserLine,
  RiUserLine,
  RiLockPasswordLine,
  RiKeyLine,
  RiCheckLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import { toast } from "@/components/base/toast/toast";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getRoleDisplayName } from "@/lib/permissions";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
  SettingsValueField,
} from "./settings-rows";

export function SettingsProfile({ onSaved }: { onSaved?: () => void } = {}) {
  const { user, refreshProfile } = useAuth();

  // Profile editable fields
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateNames = async () => {
    if (!user) return;
    const userId = user._id || user.id;
    if (!userId) return;

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    setSavingProfile(true);
    try {
      await apiClient(API_ENDPOINTS.USER_BY_ID(userId), {
        method: "PATCH",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      await refreshProfile();
      toast.success("Profile information updated");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Identity & Account */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Personal Identity</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="First name" description="Your given name">
            <div className="flex items-center gap-2">
              <Input
                aria-label="First name"
                size="small"
                value={firstName}
                onChange={setFirstName}
                className="w-48"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Last name" description="Your family name">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Last name"
                size="small"
                value={lastName}
                onChange={setLastName}
                className="w-48"
              />
              <Button
                variant="secondary"
                size="small"
                disabled={
                  savingProfile ||
                  (firstName === (user?.firstName || "") && lastName === (user?.lastName || ""))
                }
                onClick={handleUpdateNames}
                leadingIcon={RiCheckLine}
              >
                {savingProfile ? "Saving..." : "Save"}
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow label="Registered email" description="Primary address used for system sign in">
            <SettingsValueField icon={RiMailLine}>
              {user?.email || "admin@modus.local"}
            </SettingsValueField>
          </SettingsRow>

          <SettingsRow label="Human User ID" description="Unique human-readable identifier assigned to your account">
            <SettingsValueField icon={RiUserLine}>
              {user?.humanId || "MOD-10001"}
            </SettingsValueField>
          </SettingsRow>

          <SettingsRow label="Assigned Role" description="Your security role and access control level">
            <div className="flex items-center gap-2">
              <Chip color="blue" variant="caption" className="flex items-center gap-1 font-mono">
                <RiShieldUserLine className="size-3" />
                {user?.role || "SUPER_ADMIN"}
              </Chip>
              <span className="text-body-2-regular text-text-secondary">
                {getRoleDisplayName(String(user?.role || "SUPER_ADMIN"))}
              </span>
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Security & Password */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Security & Credentials</SettingsSectionLabel>
        <form onSubmit={handleChangePassword}>
          <SettingsCard>
            <SettingsRow
              label="Current password"
              description="Enter your existing account password to confirm identity"
            >
              <div className="w-52">
                <Input
                  aria-label="Current password"
                  type="password"
                  size="small"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  leadingIcon={RiLockPasswordLine}
                />
              </div>
            </SettingsRow>

            <SettingsRow
              label="New password"
              description="Must be at least 8 characters with strong entropy"
            >
              <div className="w-52">
                <Input
                  aria-label="New password"
                  type="password"
                  size="small"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={setNewPassword}
                  leadingIcon={RiKeyLine}
                />
              </div>
            </SettingsRow>

            <SettingsRow
              label="Confirm new password"
              description="Re-type your new password to verify accuracy"
            >
              <div className="flex items-center gap-2">
                <div className="w-52">
                  <Input
                    aria-label="Confirm new password"
                    type="password"
                    size="small"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    leadingIcon={RiKeyLine}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </SettingsRow>
          </SettingsCard>
        </form>
      </div>
    </div>
  );
}
