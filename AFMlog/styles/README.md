# AFM Dashboard CSS Architecture

This document outlines the CSS architecture for the AnyFileMonitor Dashboard application.

## Directory Structure

```
styles/
├── base/                  # Base styles and variables
│   ├── animations.css     # Animation keyframes and transitions
│   ├── reset.css          # Normalize/reset styles
│   ├── typography.css     # Typography styles
│   ├── utility.css        # Utility classes
│   └── variables.css      # CSS variables and themes
├── components/            # Component-specific styles
│   ├── buttons.css        # Button styles
│   ├── cards.css          # Card styles
│   ├── charts.css         # Chart and data visualization styles
│   ├── dropdowns.css      # Dropdown styles
│   ├── filters.css        # Filter component styles
│   ├── forms.css          # Form elements and inputs
│   ├── loaders.css        # Loading indicators and spinners
│   ├── modals.css         # Modal and dialog styles
│   ├── navigation.css     # Navigation elements
│   ├── patternBadges.css  # Pattern badge styles
│   ├── tables.css         # Table styles
│   └── tooltips.css       # Tooltip styles
├── layout/                # Layout styles
│   ├── accordion.css      # Accordion styles
│   ├── footer.css         # Footer styles
│   ├── grid.css           # Grid system and layout utilities
│   └── header.css         # Header styles
└── main.css               # Main CSS file that imports all modules
```

## Usage

To use the CSS architecture, simply import the `main.css` file in your HTML:

```html
<link rel="stylesheet" href="styles/main.css">
```

This will import all the necessary CSS files in the correct order.

## Guidelines

### 1. Follow the Component Structure

Each component should have its styles in the appropriate file based on its category. For example, button styles should go in `components/buttons.css`.

### 2. Use CSS Variables

Always use CSS variables for colors, spacing, and other design tokens. This ensures consistency across the application and makes theming easier.

```css
/* Good */
color: var(--accent-color);

/* Bad */
color: #3f51b5;
```

### 3. Mobile-First Approach

Write styles for mobile first, then use media queries to adjust for larger screens.

```css
.component {
  /* Mobile styles */
  width: 100%;
}

@media (min-width: 768px) {
  .component {
    /* Desktop styles */
    width: 50%;
  }
}
```

### 4. Prevent Scroll Bleed

For scrollable content, especially in dropdowns and modals, always include the scroll bleed prevention properties:

```css
.scrollable-content {
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}
```

### 5. Z-Index Management

Use the z-index variables defined in `variables.css` to maintain a consistent stacking order:

```css
z-index: var(--z-index-dropdown);
```

### 6. Accessibility

Ensure styles support accessibility requirements:
- Use sufficient color contrast
- Include focus states for interactive elements
- Provide styles for the `.visually-hidden` class for screen reader content

### 7. Dark Mode Support

Support dark mode by using CSS variables and the `[data-theme="dark"]` selector:

```css
[data-theme="dark"] .component {
  background-color: var(--card-bg-color);
}
```

## Adding New Styles

1. Identify the appropriate file for your styles
2. Add your styles using the existing patterns and conventions
3. If creating a new component type, create a new file in the components directory
4. Update `main.css` to import your new file

## Legacy CSS Files

The original CSS files have been backed up in the `styles_backup` directory with `.bak` extensions. These can be referenced if needed during the transition period.
