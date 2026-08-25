# 연락안했어요 engineering instructions

Before substantial chat-based repository development, read `.agents/skills/luna-chat-coder/SKILL.md` when that embedded skill is present in the repository or workbench used for the task.

## Product intent
- This is a no-contact impulse replacement app: users write messages but nothing is actually delivered.
- The core loop is compose -> fake send -> immediate reward -> records/graphs -> ranking -> revisit.
- Private message bodies must remain local by default. Never require address-book or messenger permissions for the core product.
- Server-side ranking should store only minimum non-message data such as anonymous user id, nickname, defense score, streak, level and earned badges.

## Visual direction
- Primary audience: women in Korea, but avoid childish or stereotypically feminine treatment.
- Use warm ivory, muted rose, dusty mauve, deep charcoal/plum and restrained sage accents.
- No emoji as UI icons. Use consistent vector line icons.
- No gradient-heavy AI aesthetic, glassmorphism spam, neon accents, random 3D illustrations, oversized floating blobs, or repeated rounded-card grids.
- Prefer editorial spacing, thin dividers, typographic hierarchy and calm surfaces.
- Korean copy should sound natural and concise, not therapy-like, patronizing, or machine-generated.

## Monetization rules
- Core fake-send, D-day/streak, emergency mode and basic records must not be blocked by ads.
- Rewarded ads can unlock deep analysis, extended history, cosmetic rewards or optional early access to sealed items.
- Do not award competitive ranking score for repeated ad views. Keep ad rewards cosmetic or capped and separate from fair ranking.
- No interstitial immediately before composing or immediately after a fake send.

## Engineering
- Preserve the PWA as a reference prototype, but `mobile/` is the release app source of truth.
- Keep message bodies local. Do not add them to Worker payloads, D1 schemas, logs or analytics.
- `worker/` owns competitive score calculation; clients submit event identity/type only, never arbitrary score values.
- Keep mobile domain/state contracts independent of view code so storage and API changes remain testable.
- AdMob integration is deferred to the final native-release phase; do not block core UX on ads.
