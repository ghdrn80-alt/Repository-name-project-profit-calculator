# AI Coding Guidelines for Project Profit Calculator

## Architecture Overview
This is an Electron desktop application for calculating project profits in Korean. It uses React + TypeScript for the UI, Vite for building, and Electron for the desktop wrapper. Data flows from form components to a centralized state in `App.tsx`, with calculations and Excel export handled there.

- **Main Components**: `App.tsx` manages global state; form components (`ProjectInfoForm`, `LaborCostForm`, etc.) handle input; `ProfitDashboard` displays results.
- **Data Flow**: Props drilling with `data` and `onChange` callbacks. No state management library.
- **Key Files**:
  - `src/types.ts`: Defines interfaces like `ProjectData`, `ProfitSummary`.
  - `src/utils/excelExport.ts`: Exports data to multi-sheet Excel using `xlsx` library.
  - `electron/main.ts`: Creates BrowserWindow, loads Vite dev server in development.

## Component Patterns
- **Form Components**: Receive `data` and `onChange` props. Use controlled inputs with `handleChange` for object fields or `updateItem`/`addItem`/`removeItem` for arrays.
  - Example: `LaborCostForm` uses `updateItem(id, 'days', Number(e.target.value))` to modify array items by ID.
- **ID Generation**: Use `Date.now().toString()` for new items in arrays (e.g., labor/material costs).
- **UI Conventions**: Korean labels and placeholders; numbers formatted with `toLocaleString()`; CSS classes like `form-section`, `btn btn-primary`.
- **Data Structures**: `ProjectData` combines `projectInfo` (object), `laborCosts`/`materialCosts` (arrays), `otherCosts` (object); `ProfitSummary` for calculated totals.

## Development Workflow
- **Start Development**: Run `npm run electron:dev` to launch concurrently (Vite dev server + Electron app).
- **Build for Production**: Use `npm run electron:build` (compiles TypeScript, builds with Vite, packages with electron-builder).
- **Debugging**: In dev mode, Electron opens DevTools automatically; inspect React state in browser console.
- **Scripts**: `npm run dev` (Vite only), `npm run electron` (build and run Electron), `npm run build:electron` (TS compile for Electron).

## Specific Patterns
- **Calculations**: Profit summary computed in `App.tsx`'s `calculateSummary` useCallback, reducing costs from revenue (contract amount).
- **Export**: `exportToExcel` creates workbook with sheets for summary, labor details, material details, and other costs using `XLSX.utils.aoa_to_sheet`.
- **Reset**: Confirm dialog with `window.confirm` before clearing state.
- **No Persistence**: Data is in-memory only; no database or local storage.
- **Electron Setup**: Preload script at `electron/preload.ts`; main process loads `http://localhost:5173` in dev, `dist/index.html` in prod.

## Dependencies
- Core: React 19, Electron, xlsx for Excel export.
- Build: Vite, TypeScript, electron-builder for packaging.</content>
<parameter name="filePath">c:\Users\snoop\project-profit-calculator\.github\copilot-instructions.md