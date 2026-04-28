# PromptFeed Coffee Theme for phpBB 3.3

A modern, coffee-themed child style for phpBB 3.3 based on Prosilver.

## Installation

### Method 1: Direct Upload (Recommended)

1. **Upload Theme Files**
   - Copy the entire `phpbb-theme` folder to your phpBB installation
   - Rename the folder to `promptfeed`
   - Place it in `styles/` directory

   Final structure should be:
   ```
   phpbb/
   └── styles/
       └── promptfeed/
           ├── style.cfg
           ├── template/
           │   ├── overall_header.html
           │   ├── overall_footer.html
           │   └── navbar_header.html
           └── theme/
               └── css/
                   ├── promptfeed.css
                   ├── colours.css
                   └── components.css
   ```

2. **Install via ACP**
   - Go to **ACP → Customise → Install Styles**
   - Find "PromptFeed Coffee" and click **Install**
   - Optionally set as default style

3. **Purge Cache**
   - Go to **ACP → General → Purge the cache**

---

## Theme Structure

| File | Description |
|------|-------------|
| `style.cfg` | Theme configuration, defines parent (Prosilver) |
| `promptfeed.css` | CSS custom properties & base styles |
| `colours.css` | Prosilver color overrides |
| `components.css` | UI component styles |
| `overall_header.html` | Header with logo, search, notifications |
| `overall_footer.html` | Footer with links and JS |
| `navbar_header.html` | Sidebar navigation |

---

## Color Palette

| Variable | Value | Usage |
|----------|-------|-------|
| `--pf-coffee-roast` | `#4B3621` | Primary buttons, links |
| `--pf-espresso` | `#2D1E12` | Dark text, code blocks |
| `--pf-mocha` | `#A68966` | Secondary text, borders |
| `--pf-latte` | `#FDFCF0` | Header background |
| `--pf-tan` | `#F5E6D3` | Tags, hover states |
| `--pf-background-light` | `#FAF9F6` | Page background |

---

## Customization

### Changing Colors

Edit `css/colours.css` to override any color. Example:

```css
:root {
    --pf-primary: #5D4037;  /* Your custom primary */
    --pf-coffee-roast: #3E2723;  /* Darker brown */
}
```

### Adding Custom CSS

Create a new file `css/custom.css` and add to `overall_header.html`:
```twig
{% INCLUDECSS custom.css %}
```

---

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

---

## Credits

- Based on [phpBB Prosilver](https://www.phpbb.com)
- Coffee color palette inspired by material design
- Icons: [Material Symbols](https://fonts.google.com/icons)
- Fonts: [Inter](https://rsms.me/inter/), [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
