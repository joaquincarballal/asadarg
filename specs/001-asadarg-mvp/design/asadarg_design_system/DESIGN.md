---
name: Asadarg Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#41474f'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#717880'
  outline-variant: '#c1c7d0'
  surface-tint: '#236391'
  primary: '#236391'
  on-primary: '#ffffff'
  primary-container: '#74acdf'
  on-primary-container: '#003f65'
  inverse-primary: '#96ccff'
  secondary: '#7b5800'
  on-secondary: '#ffffff'
  secondary-container: '#febb1b'
  on-secondary-container: '#6c4d00'
  tertiary: '#825502'
  on-tertiary: '#ffffff'
  tertiary-container: '#d59c4a'
  on-tertiary-container: '#553600'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee5ff'
  primary-fixed-dim: '#96ccff'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#004a75'
  secondary-fixed: '#ffdea6'
  secondary-fixed-dim: '#febb1b'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5d4200'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#f9bb66'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  stack-gap: 12px
---

## Brand & Style

The design system is built to evoke the warmth of a Sunday afternoon *asado*—convivial, informal, and deeply rooted in Argentine culture. It prioritizes a high-energy, mobile-first experience that feels like a conversation between friends rather than a financial tool. 

The style leans into **Modern Minimalism** with a **Playful/Tactile** twist. It uses generous white space to maintain clarity while employing oversized, rounded interactive elements to invite touch. The interface should feel light and airy, avoiding the "heavy" feel of traditional banking apps, using subtle shadows and vibrant accents to guide the user through the process of splitting costs.

## Colors

This design system utilizes a palette inspired by the Argentine national colors, optimized for digital legibility and emotional warmth.

- **Primary (Sky Blue):** Used for primary branding, headers, and active states. It represents the sky and the national identity.
- **Secondary/CTA (Golden Sun):** Reserved for high-priority actions like "Cargá Gasto" or "Liquidar." It provides a warm, energetic contrast to the blue.
- **Neutral (Dark Charcoal):** Used for body text and primary icons to ensure high contrast against the white background.
- **Surface:** Pure white is used for the base layer, with very soft gray tints (#F8FAFC) used for secondary containers to provide subtle separation.

## Typography

The typography strategy balances the bold, geometric confidence of **Montserrat** for headings with the friendly, contemporary warmth of **Be Vietnam Pro** for functional text. 

- **Headlines:** Use Montserrat to create a sense of celebration and impact. Keep titles short and impactful.
- **Body & Inputs:** Use Be Vietnam Pro for its excellent legibility on mobile screens and its approachable character. 
- **Tone of Voice:** All copy must remain informal (using "voseo" e.g., "Che, cargá el ticket").
- **Scale:** Maintain a clear hierarchy where the total amount or the "who owes whom" summary is always the most prominent element.

## Layout & Spacing

The layout follows a **Fluid Mobile-First** approach. Content is primarily organized in a single column to ensure ease of use while standing around a grill.

- **Grid:** On mobile, use a 4-column fluid grid. On tablet/desktop, center the content in a fixed-width container (max 480px) to maintain the "app-like" feel.
- **Safe Zones:** Ensure all primary actions are within the "thumb zone" (bottom 40% of the screen).
- **Rhythm:** Use a 4px baseline grid. Standard component spacing should default to 16px (md) for comfortable visual breathing room.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Ambient Shadows** to create a sense of physical cards sitting on a table.

- **Level 0 (Background):** White (#FFFFFF).
- **Level 1 (Cards/Containers):** White background with a soft, diffused shadow: `0px 4px 20px rgba(30, 41, 59, 0.08)`.
- **Level 2 (Interactive/Sticky):** For floating action buttons (FAB), use a more pronounced shadow: `0px 8px 24px rgba(116, 172, 223, 0.25)`.
- **Dividers:** Use very light strokes (1px, #F1F5F9) instead of heavy lines to maintain a clean, modern aesthetic.

## Shapes

The shape language is extremely rounded to reinforce the "friendly" and "informal" brand pillars. 

- **Cards:** Use `rounded-2xl` (1.5rem / 24px) for all main containers and expense items.
- **Buttons:** Use `rounded-full` (Pill-shaped) for all primary and secondary actions to make them feel "squishy" and tappable.
- **Inputs:** Use `rounded-xl` (1rem / 16px) for form fields to differentiate them slightly from buttons.

## Components

### Buttons
- **Primary:** Golden Sun (#F6B40E) background with Dark Charcoal text. Bold Montserrat caps.
- **Secondary:** Sky Blue (#74ACDF) background with White text.
- **Ghost:** Sky Blue text on transparent background, used for "Cancelar" or "Volver."

### Cards (Expense Items)
- White background, `rounded-2xl`. 
- Left-side icon placeholder for category (e.g., a meat cleaver for "Carnicería," a bottle for "Bebidas").
- Right-side displays the amount in bold Montserrat.

### Chips (Participants)
- Small, pill-shaped tags used to show who is included in a specific expense. Use Sky Blue with 10% opacity for the background and Primary Sky Blue for the text.

### Input Fields
- Large font sizes (18px+) for numeric inputs to prevent iOS zoom-in and ensure easy entry. 
- Active state: 2px border in Sky Blue.

### Asado-Theme Accents
- **Empty States:** Use playful illustrations of an empty grill or a lonely choripán.
- **Progress Bars:** Use a "cooking" metaphor (e.g., a bar that goes from "Crudo" to "A punto" as people pay their debts).
- **Icons:** Use thick-stroke (2px) rounded icons. Custom icons for "Achuras," "Carbón," and "Ensaladas."