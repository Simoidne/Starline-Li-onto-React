# Starline Li

A React website for Starline Li's retail and wholesale seafood selection. The site currently includes placeholder About Us content, sample products, and a contact page awaiting business details.

## Local development

```sh
npm install
npm start
```

Open http://localhost:3000. Changes to source files reload automatically. Product and some About Us photos load from Unsplash and require an internet connection.

## Project structure

```text
src/
  App.js                 Routes and the shared page shell
  index.js               React entry point and global style imports
  components/Header/     Header, mobile navigation, and its tests
  pages/
    Home/                Home content and slideshow
    AboutUs/             Shared section template and section data
    Products/            Product cards and sample product data
    ContactUs/           Contact page
  styles/
    global.css           Resets, typography, and shared layout utilities
    theme.css            Colors and page spacing
public/
  media/                 Local logos and photos
```

Keep page-specific components beside their page. Components used across pages belong in `components`. Use PascalCase for component filenames, lowercase names for data files, and kebab-case for CSS classes.

## Editing content and appearance

- Edit About Us copy and images in `src/pages/AboutUs/sections.js`. Sections alternate image sides automatically, and the navigation uses the same data.
- Edit sample products in `src/pages/Products/productData.js`. Give each product a unique, stable `id`.
- Edit slideshow photos in the `slides` array in `src/pages/Home/Slideshow.js`; navigation derives its count from that array.
- Edit shared colors and horizontal page spacing in `src/styles/theme.css`.
- Edit component and page styles in their colocated CSS files.

Product descriptions appear on hover or focus. Clicking or tapping pins or closes a description; Escape dismisses it. Hidden descriptions reserve space so longer copy can expand a card without being clipped. Reduced-motion preferences disable transitions.

## Formatting and validation

```sh
npm run format
npm run format:check
npm test -- --watchAll=false --runInBand
npm run build
```

Prettier uses two-space indentation, single quotes in JavaScript, and a 90-character print width. If your editor has a Prettier extension, enable format-on-save; it will use the repository configuration. Tests sit beside the component they cover.

The production build is written to `build/`. Configure your host to serve `index.html` for app routes such as `/products` and `/about-us`.

The project uses Create React App's existing build setup. Toolchain migration can be handled separately from UI and component changes.
