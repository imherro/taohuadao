# Immersive Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the visitor-facing navigation site as an animated "Peach Blossom Island" portal while retaining every existing destination from `data/db.json`.

**Architecture:** Keep the existing Angular and GitHub Pages build pipeline so deployment behavior stays stable. Replace the visible root application with a single data-driven experience that flattens the existing navigation tree for filtering and search, while drawing lightweight ambient effects on a canvas behind the content.

**Tech Stack:** Angular 16, TypeScript, SCSS/CSS animations, Canvas 2D, existing JSON navigation data.

---

### Task 1: Replace the visible application shell

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.scss`

**Steps:**
1. Read `data/db.json` without mutating it and flatten nested sections into searchable destination cards.
2. Provide section/channel filters, keyword search, result limiting, random launch, and remote icon fallbacks.
3. Add an ambient canvas animation with reduced-motion handling and cleanup on destroy.
4. Render the hero, navigation controls, destination cards, alternate links, and footer in the new template.

### Task 2: Establish the visual system

**Files:**
- Modify: `src/styles.scss`
- Modify: `src/index.html`
- Modify: `nav.config.ts`

**Steps:**
1. Replace generic global styling with a dark, luminous peach-blossom-island palette and responsive glass panels.
2. Add entrance, hover, floating, glow, scanline, and petal-friendly background effects.
3. Update visible document metadata and repository configuration for this site.

### Task 3: Verify the deployed experience

**Files:**
- Modify: `src/app/app.component.spec.ts`

**Steps:**
1. Replace stale starter tests with checks for the new application shell and retained data rendering.
2. Build the production bundle to catch Angular template and type errors.
3. Preview the built or development site at desktop and mobile widths, checking search/filter interaction and reduced-motion behavior.
