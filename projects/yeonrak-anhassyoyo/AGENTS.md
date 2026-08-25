# 연락안했어요 engineering instructions

Before substantial chat-based repository development, read `.agents/skills/luna-chat-coder/SKILL.md` when the embedded skill is present in the repository or workbench used for the task.

## Product intent
- This is a no-contact impulse replacement app: users write messages but nothing is actually delivered.
- Core loop: compose -> fake send -> immediate reward -> records/graphs -> ranking -> revisit.
- Private message bodies remain local by default. Never require address-book or messenger permissions for core use.
- Ranking backend stores only minimum non-message data such as anonymous user id, nickname, defense score, streak, level and badges.

## Visual direction
- Primary audience: women in Korea, without childish or stereotypically feminine treatment.
- Use warm ivory, muted rose, dusty mauve, deep charcoal/plum and restrained sage accents.
- No emoji as UI icons. Use consistent vector line icons.
- No gradient-heavy AI aesthetic, glassmorphism spam, neon accents, random 3D illustrations, oversized blobs, or repeated rounded-card grids.
- Prefer editorial spacing, thin dividers, typographic hierarchy and calm surfaces.
- Korean copy should sound concise and natural, not therapy-like or machine-generated.

## Monetization
- Fake-send, D-day/streak, emergency mode and basic records are never ad-gated.
- Rewarded ads may unlock deep analysis, extended history, cosmetic rewards, or optional early access to sealed items.
- Repeated ad views must not grant uncapped competitive ranking score.
- No interstitial immediately before composing or immediately after fake send.

## Engineering
- Preserve PWA functionality during prototype stage.
- Keep the prototype dependency-light and testable without network access.
- When porting to React Native/Expo, keep state/data contracts UI-independent for later Cloudflare D1/Workers and AdMob wiring.
