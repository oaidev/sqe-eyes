

## Plan: Ganti Logo PROXIS di Sidebar, LoadingScreen, dan NotFound

### Perubahan

**1. `src/components/layout/AppSidebar.tsx`** (lines 71-76)
- Ganti teks "COSMOS" dan subtitle dengan `<img src="https://i.ibb.co.com/0SsvMtL/logo-PROXIS-3x-1.png">` (tinggi ~28px)

**2. `src/components/ui/LoadingScreen.tsx`**
- Ganti `import logo from '@/assets/logo.png'` → gunakan URL PROXIS langsung

**3. `src/pages/NotFound.tsx`**
- Sama, ganti ke URL PROXIS

### Files Changed
- `src/components/layout/AppSidebar.tsx`
- `src/components/ui/LoadingScreen.tsx`
- `src/pages/NotFound.tsx`

