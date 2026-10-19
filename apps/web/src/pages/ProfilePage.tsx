/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfile, usePresignAvatarUpload } from "@/hooks/useProfile";
import { useCustomerProfile, useUpdateCustomerProfile } from "@/hooks/useCustomerProfile";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type ProfileTab = "account" | "pets-home";

export default function ProfilePage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const presign = usePresignAvatarUpload();

  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
    setPhone(user?.phone ?? "");
    setAvatarUrl(user?.avatar_url ?? "");
  }, [user]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected after cancel
    e.target.value = "";
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    setAccountError(null);
    try {
      const { upload_url, public_url } = await presign.mutateAsync({
        fileName: "avatar.jpg",
        contentType: "image/jpeg",
      });
      const res = await fetch(upload_url, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "image/jpeg" },
      });
      if (!res.ok) throw new Error("Upload failed");
      setAvatarUrl(public_url);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    try {
      await updateProfile.mutateAsync({
        display_name: displayName || undefined,
        phone: phone || undefined,
        avatar_url: avatarUrl || undefined,
      });
      toast({ title: "Saved", description: "Account settings updated." });
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (!user) return null;

  return (
    <>
    {cropSrc ? (
      <AvatarCropDialog imageSrc={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
    ) : null}
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          className={cn("rounded-md px-4 py-2 text-sm", activeTab === "account" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
          onClick={() => setActiveTab("account")}
        >
          Account
        </button>
        {user.role === "CUSTOMER" ? (
          <button
            type="button"
            className={cn("rounded-md px-4 py-2 text-sm", activeTab === "pets-home" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
            onClick={() => setActiveTab("pets-home")}
          >
            My Pets & Home
          </button>
        ) : null}
      </div>

      {activeTab === "account" ? (
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccountSubmit} className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border border-slate-200">
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                  <AvatarFallback className="bg-indigo-100 text-2xl font-semibold text-indigo-700">
                    {(displayName || user.display_name || "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? "Uploading..." : "Change photo"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} readOnly disabled />
              </div>

              {accountError ? <p className="text-sm text-red-600">{accountError}</p> : null}

              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {user.role === "CUSTOMER" && activeTab === "pets-home" ? <CustomerPetsHomeCard /> : null}
    </div>
    </>
  );
}

const HOME_TYPES = ["house", "apartment", "condo", "other"] as const;
const PET_TYPES = ["DOG", "CAT", "BIRD", "FISH", "RABBIT", "REPTILE", "OTHER"] as const;

function CustomerPetsHomeCard() {
  const customerProfileQuery = useCustomerProfile();
  const updateCustomerProfile = useUpdateCustomerProfile();
  const customerProfile = customerProfileQuery.data;

  const [homeType, setHomeType] = useState<string | null>(null);
  const [hasYard, setHasYard] = useState(false);
  const [homeDescription, setHomeDescription] = useState("");
  const [petNameInput, setPetNameInput] = useState("");
  const [petNames, setPetNames] = useState<string[]>([]);
  const [petTypes, setPetTypes] = useState<string[]>([]);
  const [petDescription, setPetDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  useEffect(() => {
    if (!customerProfile) return;
    setHomeType(customerProfile.home_type);
    setHasYard(customerProfile.has_yard);
    setHomeDescription(customerProfile.home_description ?? "");
    setPetNames(customerProfile.pet_names ?? []);
    setPetTypes(customerProfile.pet_types ?? []);
    setPetDescription(customerProfile.pet_description ?? "");
    setSpecialInstructions(customerProfile.special_instructions ?? "");
  }, [customerProfile]);

  function addPetName() {
    const value = petNameInput.trim();
    if (!value || petNames.includes(value)) return;
    setPetNames((prev) => [...prev, value]);
    setPetNameInput("");
  }

  async function handleCustomerProfileSave() {
    try {
      await updateCustomerProfile.mutateAsync({
        home_type: homeType,
        has_yard: hasYard,
        home_description: homeDescription,
        pet_names: petNames,
        pet_types: petTypes,
        pet_description: petDescription,
        special_instructions: specialInstructions,
      });
      toast({ title: "Saved", description: "My Pets & Home updated." });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not save customer profile.",
        variant: "destructive",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Pets & Home</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Home</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            {HOME_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setHomeType(value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm capitalize",
                  homeType === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={hasYard} onChange={(e) => setHasYard(e.target.checked)} />
            Has a yard
          </label>
          <div className="space-y-2">
            <Label htmlFor="home-description">Describe your home</Label>
            <Textarea
              id="home-description"
              value={homeDescription}
              onChange={(e) => setHomeDescription(e.target.value.slice(0, 2000))}
              placeholder="Size, neighborhood, and anything sitters should know."
            />
            <p className="text-right text-xs text-slate-500">{homeDescription.length}/2000</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Pets</h2>
          <div className="space-y-2">
            <Label htmlFor="pet-name">Pet names</Label>
            <Input
              id="pet-name"
              value={petNameInput}
              onChange={(e) => setPetNameInput(e.target.value)}
              placeholder="Type a name and press Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPetName();
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              {petNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => setPetNames((prev) => prev.filter((item) => item !== name))}
                    className="text-slate-500 hover:text-slate-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pet types</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {PET_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <Checkbox
                    checked={petTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPetTypes((prev) => [...prev, type]);
                      } else {
                        setPetTypes((prev) => prev.filter((item) => item !== type));
                      }
                    }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet-description">Tell sitters about your pets</Label>
            <Textarea
              id="pet-description"
              value={petDescription}
              onChange={(e) => setPetDescription(e.target.value.slice(0, 2000))}
            />
            <p className="text-right text-xs text-slate-500">{petDescription.length}/2000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Special instructions</Label>
            <Textarea
              id="instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 1000))}
            />
            <p className="text-right text-xs text-slate-500">{specialInstructions.length}/1000</p>
          </div>
        </section>

        <Button onClick={handleCustomerProfileSave} disabled={updateCustomerProfile.isPending || customerProfileQuery.isLoading}>
          {updateCustomerProfile.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
