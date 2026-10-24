/* Muktagacha Design System — UI Designer tokens
   Blending Airbnb's warmth (photography-first, generous radius, three-layer shadows)
   with Stripe's precision (blue-tinted elevation, tight spacing scale).
   Adapted for a Bangladesh local marketplace: warm terracotta/emerald instead of
   cold tech-blue, generous photography, Bengali-friendly type scale. */

:root {
  /* Primary palette — deep emerald (trust, local, growth) + warm gold (premium, festive) */
  --color-emerald-900: #0B3D2E;
  --color-emerald-700: #15543F;
  --color-emerald-600: #1B6B4F;
  --color-emerald-500: #227F5E;
  --color-emerald-50: #EDF7F2;

  --color-gold-600: #B8812C;
  --color-gold-500: #D4932C;
  --color-gold-400: #E8A94A;
  --color-gold-50: #FBF3E6;

  /* Warm neutrals — never pure white/black, always warm-toned */
  --color-cream-50: #FDFBF7;
  --color-cream-100: #F7F2EA;
  --color-ink-900: #1F1B16;
  --color-ink-700: #4A4238;
  --color-ink-500: #7A7064;
  --color-ink-300: #C7BFB3;
  --color-border: #E8E0D4;

  /* Shadows — warm-tinted (brown-black), three-layer like Airbnb */
  --shadow-card: rgba(31,27,22,0.02) 0px 0px 0px 1px, rgba(31,27,22,0.04) 0px 2px 6px, rgba(31,27,22,0.08) 0px 8px 20px;
  --shadow-hover: rgba(31,27,22,0.06) 0px 0px 0px 1px, rgba(31,27,22,0.08) 0px 4px 12px, rgba(31,27,22,0.12) 0px 16px 32px;
  --shadow-elevated: rgba(31,27,22,0.08) 0px 0px 0px 1px, rgba(31,27,22,0.10) 0px 8px 24px, rgba(31,27,22,0.16) 0px 24px 48px -12px;

  /* Radius scale — generous, Airbnb-style warmth */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;
}
