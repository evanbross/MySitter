# Phase 12 — Mobile: Pets & Home Screen

**Goal:** Add a Pets & Home screen to the mobile app for CUSTOMER users, matching the
web ProfilePage "My Pets & Home" tab.

**Workflow:** Claude (this plan) → Codex (implementation) → Claude (review)

---

## Codex Generation Rules (include verbatim in every Codex prompt)

- Never use `__import__()` — add imports at the top of each file.
- Never use bare `pass` for stub implementations — use `raise NotImplementedError("not yet implemented")`.
- Never leave dead code branches (`if False:`, unreachable arms, commented-out alternatives).
- All new FastAPI routes must have `response_model`, typed request body (Pydantic model, never `dict`), and correct `status_code`.
- When a new third-party package is imported, add it to `apps/api/requirements.txt` or `apps/web/package.json` or `apps/mobile/package.json` as appropriate.
- No speculative abstractions — implement exactly what the plan specifies, nothing more.
- TypeScript strict mode — no `any` types, no `// @ts-ignore`.
- API response types come from `packages/types` — never redeclare them locally.
- Use TanStack Query for all server state — no manual `useEffect` data fetching.
- Components own UI only; data fetching via custom hooks.
- Do NOT use `@/` alias in `apps/mobile` — use relative imports only (e.g. `../../hooks/useCustomerProfile`).
- Mobile uses React Native `StyleSheet` — no Tailwind or inline style objects except for one-off layout adjustments.

---

## Step 1 — New hook: `apps/mobile/hooks/useCustomerProfile.ts`

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomerProfile, CustomerProfileUpdate } from "@mysitter/types";
import { apiClient } from "../lib/apiClient";

export function useCustomerProfile() {
  return useQuery<CustomerProfile>({
    queryKey: ["customer-profile"],
    queryFn: () => apiClient.customerProfile.get(),
  });
}

export function useUpdateCustomerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerProfileUpdate) => apiClient.customerProfile.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-profile"] }),
  });
}
```

`apiClient.customerProfile.get()` calls `GET /customer-profile`.
`apiClient.customerProfile.update(body)` calls `PUT /customer-profile`.
Both already exist in `packages/api-client/src/client.ts` — do not modify that file.

---

## Step 2 — New screen: `apps/mobile/app/customer-profile.tsx`

A scrollable form screen. Use `ScrollView` with `KeyboardAvoidingView`. Back navigation
via expo-router's default stack back button.

**Header:** title "Pets & Home" (expo-router default stack behavior).

**Home section** (heading "Home"):

- `home_type` — row of four pill buttons: House / Apartment / Condo / Other. Selected pill:
  dark background (`#1a1a2e`), white text. Unselected: white background, `#6b7280` text,
  border `#e5e7eb`.
- `has_yard` — a `Switch` component (React Native core) labelled "Has a yard".
- `home_description` — `TextInput` multiline, labelled "Describe your home", maxLength 2000,
  character counter below (`{n}/2000`).

**Pets section** (heading "Pets"):

- `pet_names` — tag input: a `TextInput` with an "Add" button next to it. On press Add (or
  `onSubmitEditing`), trim the value and append to `pet_names` if non-empty and not a
  duplicate. Render existing names as pill tags with an × `TouchableOpacity` to remove.
  `returnKeyType="done"`.
- `pet_types` — checkboxes for: DOG / CAT / BIRD / FISH / RABBIT / REPTILE / OTHER. Each is
  a `TouchableOpacity` row with a checkbox-style square (filled `#1a1a2e` when selected,
  bordered when not) and the label.
- `pet_description` — `TextInput` multiline, labelled "Tell sitters about your pets",
  maxLength 2000, character counter.
- `special_instructions` — `TextInput` multiline, labelled "Special instructions",
  maxLength 1000, character counter.

**Save button** at bottom. On press, call `updateCustomerProfile.mutate(...)` with all
fields. On success: `Alert.alert("Saved", "Pets & Home updated.")`. On error:
`Alert.alert("Error", err.message)`.

**Loading state:** while `useCustomerProfile` is loading, show `ActivityIndicator` centered.

**Initialization:** `useEffect` on `customerProfile` data — set all local state from the
loaded profile (same pattern as the web `ProfilePage`).

Style to match the existing profile tab: background `#f9fafb`, white section cards,
`#1a1a2e` for primary actions, `#6b7280` for secondary text, border color `#e5e7eb`.

---

## Step 3 — Modify `apps/mobile/app/(tabs)/profile.tsx`

For `user.role === "CUSTOMER"` only, add a `TouchableOpacity` row that navigates to
`/customer-profile`. Place it after the existing phone/account type/member since rows,
before the sign-out button:

```tsx
{user.role === "CUSTOMER" && (
  <TouchableOpacity style={styles.infoRow} onPress={() => router.push("/customer-profile")}>
    <Text style={styles.infoLabel}>My Pets & Home</Text>
    <Text style={[styles.infoValue, { color: "#6366f1" }]}>Edit →</Text>
  </TouchableOpacity>
)}
```

---

## Files to create/modify

### New files
- `apps/mobile/hooks/useCustomerProfile.ts`
- `apps/mobile/app/customer-profile.tsx`

### Modified files
- `apps/mobile/app/(tabs)/profile.tsx` — add "My Pets & Home" row for CUSTOMER users

---

## What NOT to do
- Do not modify `packages/api-client/src/client.ts` — `customerProfile` methods already exist.
- Do not modify `packages/types/src/index.ts` — `CustomerProfile` and `CustomerProfileUpdate` already exist.
- Do not add a new tab to `_layout.tsx` — this is a stack screen pushed from the profile tab.
- Do not use Tailwind or web-only APIs.
- No new npm packages needed.

---

## Review checklist (for Claude after Codex runs)

- [ ] Relative imports used throughout — no `@/` alias
- [ ] `useEffect` initializes all fields from loaded `customerProfile`
- [ ] `pet_names` tag input rejects empty strings and duplicates
- [ ] `pet_types` checkboxes correctly toggle items in/out of the array
- [ ] All three `TextInput` multiline fields have correct `maxLength` and character counters
- [ ] Save calls `update` with all seven fields (not a partial object)
- [ ] Loading state shown while query is pending
- [ ] "My Pets & Home" row only renders for `user.role === "CUSTOMER"`
- [ ] No `any` types in TypeScript
- [ ] No new packages added to `package.json`
