# Phase 11 — UI Polish + Customer Profile

**Goal:** Make the web app genuinely usable for a first demo. Tailwind styling throughout,
improved navigation, account settings, and a customer profile page where users describe
their home and pets.

**Workflow:** Claude (this plan) → Codex (implementation) → Claude (review)

---

## Codex Generation Rules (include verbatim in every Codex prompt)

- Never use `__import__()` — add imports at the top of each file.
- Never use bare `pass` for stub implementations — use `raise NotImplementedError("not yet implemented")`.
- Never leave dead code branches (`if False:`, unreachable arms, commented-out alternatives).
- SQLAlchemy 2.x only — use `Mapped`/`mapped_column` style. Never legacy `Column()`.
- All new FastAPI routes must have `response_model`, typed request body (Pydantic model, never `dict`), and correct `status_code`.
- Repository pattern: data access in service classes, never raw queries in routers.
- When a new third-party package is imported, add it to `apps/api/requirements.txt` or `apps/web/package.json`.
- No speculative abstractions — implement exactly what the plan specifies, nothing more.
- Async throughout the API: `async def` routes, async SQLAlchemy sessions.
- TypeScript strict mode — no `any` types, no `// @ts-ignore`.
- API response types come from `packages/types` — never redeclare them locally in web/mobile.
- Use TanStack Query for all server state in web — no manual `useEffect` data fetching.
- Components own UI only; data fetching via custom hooks in `hooks/`.
- In `apps/web`, always use the `@/` alias for imports (configured in tsconfig/vite).
- Do NOT use `@/` alias in `apps/mobile` — use relative imports there.

---

## Step 1 — Install Tailwind CSS + shadcn/ui in apps/web

### What to do

1. Install Tailwind v3 and its Vite plugin:
   ```
   npm install -D tailwindcss@3 postcss autoprefixer
   npx tailwindcss init -p
   ```

2. Configure `tailwind.config.js`:
   ```js
   export default {
     content: ["./index.html", "./src/**/*.{ts,tsx}"],
     theme: { extend: {} },
     plugins: [],
   }
   ```

3. Replace the contents of `apps/web/src/index.css` with:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. Install shadcn/ui prerequisites:
   ```
   npm install class-variance-authority clsx tailwind-merge lucide-react
   npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
   npm install @radix-ui/react-label @radix-ui/react-select @radix-ui/react-separator
   npm install @radix-ui/react-toast
   ```

5. Create `apps/web/src/lib/utils.ts`:
   ```ts
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```

6. Create the following shadcn-style components in `apps/web/src/components/ui/`:
   - `button.tsx` — Button with variants: default, outline, ghost, destructive
   - `input.tsx` — Input with consistent focus ring
   - `label.tsx` — Label component
   - `card.tsx` — Card, CardHeader, CardContent, CardFooter
   - `badge.tsx` — Badge with variants: default, secondary, outline
   - `toast.tsx` + `toaster.tsx` + `use-toast.ts` — simple toast notifications
   - `select.tsx` — wrapping Radix Select
   - `textarea.tsx` — Textarea with consistent styling
   - `separator.tsx` — horizontal/vertical divider
   - `avatar.tsx` — Avatar with image + fallback initials
   - `dialog.tsx` — Modal dialog wrapping Radix Dialog

   All components must follow the shadcn/ui pattern exactly — `cn()` for class merging,
   `React.forwardRef` where appropriate, no inline styles.

7. Add Toaster to `apps/web/src/main.tsx` inside the providers.

---

## Step 2 — Redesign NavBar + auth pages

### NavBar (`apps/web/src/components/NavBar.tsx`)

Rewrite using Tailwind. Requirements:
- Sticky top bar, dark background (`bg-slate-900`), full width
- Left: "MySitter" brand mark in white bold
- Center: nav links — active link has white text + subtle underline; inactive is `text-slate-400 hover:text-white`
- Right: user avatar (or initials fallback) + display name + dropdown menu (Account Settings, Sign out)
- Mobile: hamburger menu that collapses links into a drawer (use Radix Dialog or a simple `useState` toggle)
- Hide nav on `/login` and `/register` routes (existing behaviour)
- Show nav even when logged out on public routes (`/search`, `/providers/:id`) with Sign In / Register buttons on the right

### LoginPage (`apps/web/src/pages/auth/LoginPage.tsx`)

- Centered card layout using `Card` component
- MySitter logo/name above the card
- Clean form with `Label` + `Input` components
- "Sign in with passkey" as a secondary button (outline variant)
- Error shown as a red inline message below the form
- Link to RegisterPage at bottom

### RegisterPage (`apps/web/src/pages/auth/RegisterPage.tsx`)

- Same centered card layout
- Role selector as two large clickable cards ("I need a sitter" / "I am a sitter") instead of a `<select>`
- Each card has an icon, title, and short description
- Selected card has a purple border/highlight

---

## Step 3 — Backend: CustomerProfile model + API

### New model: `apps/api/app/models/customer_profile.py`

```python
class PetType(str, enum.Enum):
    DOG = "DOG"
    CAT = "CAT"
    BIRD = "BIRD"
    FISH = "FISH"
    RABBIT = "RABBIT"
    REPTILE = "REPTILE"
    OTHER = "OTHER"

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[uuid.UUID]            # PK
    user_id: Mapped[uuid.UUID]       # FK → users.id, unique, CASCADE delete
    home_description: Mapped[str | None]   # free text, max 2000 chars
    home_type: Mapped[str | None]    # "house" | "apartment" | "condo" | "other"
    has_yard: Mapped[bool]           # default False
    pet_names: Mapped[list[str]]     # JSONB array of strings
    pet_types: Mapped[list[str]]     # JSONB array of PetType values
    pet_description: Mapped[str | None]   # free text, max 2000 chars
    special_instructions: Mapped[str | None]  # free text, max 1000 chars
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

Use `sqlalchemy.dialects.postgresql.JSONB` for `pet_names` and `pet_types`.

### Update `apps/api/app/models/__init__.py`

Import `CustomerProfile` so Alembic sees it.

### Update `apps/api/app/services/auth_service.py` — registration flow

When a CUSTOMER registers, create a `CustomerProfile` row in the same transaction
(same pattern as `ProviderProfile` for PROVIDER). `home_description`, `pet_names`, etc.
all default to None/empty — the user fills them in later.

### New schemas: `apps/api/app/schemas/customer_profile.py`

```python
class CustomerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    home_description: str | None
    home_type: str | None
    has_yard: bool
    pet_names: list[str]
    pet_types: list[str]
    pet_description: str | None
    special_instructions: str | None

class CustomerProfileUpdateRequest(BaseModel):
    home_description: str | None = None   # max_length=2000
    home_type: str | None = None          # validated against allowed values
    has_yard: bool | None = None
    pet_names: list[str] | None = None
    pet_types: list[str] | None = None    # each item must be a valid PetType
    pet_description: str | None = None    # max_length=2000
    special_instructions: str | None = None  # max_length=1000
```

Use Pydantic `Field(max_length=...)` on string fields.

### New router: `apps/api/app/routers/customer_profiles.py`

```
GET  /customer-profile          → returns the current user's CustomerProfile (or 404 if none)
PUT  /customer-profile          → upsert (create if missing, update if exists); status 200
```

- Both routes require authentication (`Depends(get_current_user)`)
- Both routes check `current_user.role == UserRole.CUSTOMER`; return 403 for providers/admins
- `PUT` uses upsert pattern: try select, create if missing, then apply updates and commit

Register the router in `apps/api/app/main.py`.

### Alembic migration

New migration file: `apps/api/alembic/versions/g7h8i9j0k1_add_customer_profiles.py`

```python
op.create_table('customer_profiles',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('home_description', sa.Text(), nullable=True),
    sa.Column('home_type', sa.String(50), nullable=True),
    sa.Column('has_yard', sa.Boolean(), nullable=False, server_default='false'),
    sa.Column('pet_names', postgresql.JSONB(), nullable=False, server_default='[]'),
    sa.Column('pet_types', postgresql.JSONB(), nullable=False, server_default='[]'),
    sa.Column('pet_description', sa.Text(), nullable=True),
    sa.Column('special_instructions', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id'),
)
op.create_index('ix_customer_profiles_user_id', 'customer_profiles', ['user_id'])
```

`down_revision` must be set to `f6a7b8c9d0` (the current head).

---

## Step 4 — Frontend: Account Settings + Customer Profile page

### Redesign `apps/web/src/pages/ProfilePage.tsx`

Two-tab layout: **Account** and **My Pets & Home** (second tab only shown for CUSTOMER role).

#### Account tab (existing fields, restyled):
- Avatar upload (circle, click to change)
- Display name field
- Phone number field
- Email shown as read-only
- Save button

#### My Pets & Home tab (new, CUSTOMER only):
- **Home** section:
  - `home_type` — radio group or segmented control: House / Apartment / Condo / Other
  - `has_yard` — toggle/checkbox: "Has a yard"
  - `home_description` — `<Textarea>` labelled "Describe your home", placeholder text, max 2000 chars, character counter
- **Pets** section:
  - `pet_names` — tag-style input: type a name, press Enter to add, click × to remove
  - `pet_types` — multi-select checkboxes: Dog / Cat / Bird / Fish / Rabbit / Reptile / Other
  - `pet_description` — `<Textarea>` labelled "Tell sitters about your pets", max 2000 chars
  - `special_instructions` — `<Textarea>` labelled "Special instructions", max 1000 chars
- Save button at bottom, success/error toast on submit

### New hook: `apps/web/src/hooks/useCustomerProfile.ts`

```ts
export function useCustomerProfile(): UseQueryResult<CustomerProfile>
export function useUpdateCustomerProfile(): UseMutationResult<...>
```

- `useCustomerProfile` calls `GET /customer-profile`; query key `["customer-profile"]`
- `useUpdateCustomerProfile` calls `PUT /customer-profile`; invalidates `["customer-profile"]` on success

Since `apiClient` comes from `packages/api-client`, add the two methods there:
- `apiClient.customerProfile.get()` → `GET /customer-profile`
- `apiClient.customerProfile.update(body)` → `PUT /customer-profile`

### Add `CustomerProfile` type to `packages/types/src/index.ts`

```ts
export type PetType = "DOG" | "CAT" | "BIRD" | "FISH" | "RABBIT" | "REPTILE" | "OTHER";

export interface CustomerProfile {
  id: string;
  user_id: string;
  home_description: string | null;
  home_type: string | null;
  has_yard: boolean;
  pet_names: string[];
  pet_types: PetType[];
  pet_description: string | null;
  special_instructions: string | null;
}
```

---

## Step 5 — Dashboard page

Rewrite `apps/web/src/pages/DashboardPage.tsx` with Tailwind. 

### CUSTOMER dashboard:
- Welcome card (name + avatar)
- Quick-action cards: "Find a sitter" → `/search`, "My bookings" → `/bookings`, "Messages" → `/messages`
- If `CustomerProfile` has no pets added yet, show a soft prompt: "Add your pets to help sitters prepare" → links to `/profile`

### PROVIDER dashboard:
- Welcome card (name + avatar)
- Subscription status badge (from `useProviderSettings`)
- Quick-action cards: Calendar, Bookings, Messages, Analytics
- If profile is inactive (`is_active === false`), show a banner: "Your profile is not visible to customers"

---

## Files to create/modify (summary for Codex)

### New files
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/label.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/toast.tsx`
- `apps/web/src/components/ui/toaster.tsx`
- `apps/web/src/components/ui/use-toast.ts`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/components/ui/separator.tsx`
- `apps/web/src/components/ui/avatar.tsx`
- `apps/web/src/components/ui/dialog.tsx`
- `apps/web/src/lib/utils.ts`
- `apps/api/app/models/customer_profile.py`
- `apps/api/app/schemas/customer_profile.py`
- `apps/api/app/routers/customer_profiles.py`
- `apps/api/alembic/versions/g7h8i9j0k1_add_customer_profiles.py`
- `apps/web/src/hooks/useCustomerProfile.ts`

### Modified files
- `apps/web/tailwind.config.js` (new)
- `apps/web/postcss.config.js` (new)
- `apps/web/src/index.css` (replace with Tailwind directives)
- `apps/web/src/main.tsx` (add Toaster)
- `apps/web/src/components/NavBar.tsx` (full rewrite)
- `apps/web/src/pages/auth/LoginPage.tsx` (full rewrite)
- `apps/web/src/pages/auth/RegisterPage.tsx` (full rewrite)
- `apps/web/src/pages/ProfilePage.tsx` (full rewrite with tabs)
- `apps/web/src/pages/DashboardPage.tsx` (full rewrite)
- `apps/api/app/models/__init__.py` (add CustomerProfile import)
- `apps/api/app/services/auth_service.py` (create CustomerProfile on CUSTOMER register)
- `apps/api/app/main.py` (register customer_profiles router)
- `packages/types/src/index.ts` (add CustomerProfile + PetType)
- `packages/api-client/src/index.ts` (add customerProfile methods)
- `apps/web/package.json` (new dependencies)
- `apps/api/requirements.txt` (no new deps needed)

---

## Review checklist (for Claude after Codex runs)

- [ ] `CustomerProfile` created in same transaction as `CUSTOMER` user registration
- [ ] Migration `down_revision` correctly set to `f6a7b8c9d0`
- [ ] Migration JSONB columns have correct `server_default`
- [ ] `PUT /customer-profile` returns 403 for non-CUSTOMER roles
- [ ] `PUT /customer-profile` is a true upsert (no duplicate key error on first call)
- [ ] All new routes have `response_model` and correct `status_code`
- [ ] `packages/types` `CustomerProfile` matches the API response schema exactly
- [ ] `useCustomerProfile` query key is `["customer-profile"]` (not something Codex invented)
- [ ] Profile page tabs don't show "My Pets & Home" for PROVIDER users
- [ ] No inline `style={{}}` props in new components — Tailwind classes only
- [ ] `utils.ts` `cn()` function present and used in all UI components
- [ ] Toaster added to `main.tsx`
- [ ] No `any` types in TypeScript
- [ ] NavBar shows Sign In / Register when user is not logged in
- [ ] Tag input for `pet_names` handles Enter key and × removal correctly
