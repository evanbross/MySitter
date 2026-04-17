# Jargon Concern — Project_Summary1.md

## The worry

The review methodology paragraph contains phrases like "enabled guard," "shared vs inline types,"
and "Celery notification task." The concern is that someone might ask you what those mean and
you'd have to admit Claude handles that layer, not you.

That concern is valid. Here's an honest breakdown of each phrase.

---

## "enabled guard"

What it means: when you ask for data from the server, you can tell the app "only actually make
that request if X is true." For example, only fetch the provider's profile if the logged-in user
is actually a provider. Without that guard, the app fires the request for everyone, which causes
errors or wasted API calls.

Can you explain this if asked? Yes, easily. It's just "only fetch when the condition is met." The
word "guard" is the jargon part — the concept is straightforward.

---

## "shared vs inline types"

What it means: the project has a central package (`packages/types`) that defines what all the
data looks like — what fields a User has, what a Booking looks like, etc. "Shared types" means
using that central definition. "Inline types" means one of the AI models got lazy and redefined
the shape of a User right there in the middle of some other file, separately. When the central
definition changes, the inline one doesn't, and things break.

Can you explain this if asked? Yes — "we keep data definitions in one place so they don't get
out of sync." The jargon is "types," the concept is just don't define the same thing twice.

---

## "Celery notification task"

What it means: Celery is the system that runs background jobs — things that happen outside the
normal request/response cycle. "Send an email 5 minutes after a message is received if the
recipient hasn't read it yet" is a Celery task. You don't want the user waiting for that to
happen while they're using the app.

Can you explain this if asked? Probably. "Background job system for delayed or async work" covers
it. You don't need to know Celery specifically to explain why it exists.

---

## "QueryClientProvider"

This one is more obscure. It's the React component that makes the data-fetching system available
to the rest of the app — every component that fetches data has to live inside it. One of
Gemini's recurring bugs was putting a data-fetching call in the same component that sets up that
container, which crashes because the container doesn't exist yet when the call runs.

Can you explain this if asked? Probably not without stumbling. This is the most inside-baseball
reference in the post.

---

## Recommendation

You have two options:

**Option 1 — Keep the jargon, own the meta-point.**
The post is actually about AI development methodology, not about you personally knowing these
things. You could add a line like "I didn't know what half of these patterns were before Claude
started flagging them." That's honest and makes the point stronger, not weaker.

**Option 2 — Generalize the review paragraph.**
Replace the specific examples with something vaguer:

> "Not 'does this look okay' review — actual systematic review for correctness, type safety, and
> common React pitfalls. I track recurring failure patterns as explicit rules and feed them back
> into the next Gemini prompt."

You lose the specificity but you don't have to defend details you don't own.

Option 2 is probably the safer LinkedIn choice. Option 1 is more interesting.
