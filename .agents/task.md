# Safe Commit Task: Modal Stacking Test & Standards Hardening

## 1. Planning & Initialization
- [x] Analyze changes made in current session.
- [x] Align with Hybrid Retro-Modern identity.

## 2. Test Gap Analysis
- [ ] Review `DebugStackTestModal.vue` and `DebugModalsTab.vue`.
- [ ] Create unit tests for ModalStore stacking logic if missing. [SUB-TASK]
- [ ] Verify `tests/unit/debug.spec.js`.

## 3. Active Verification Cycle (Zero-Warning Audit)
- [ ] SASS Integrity Check (`check_sass_traps.py`).
- [ ] SASS Auto-Fix if needed (`fix_sass_traps.py`).
- [ ] Hybrid Guard (`detect_hybrid_patterns.py`).
- [ ] Linting (`npm run lint`).
- [ ] Type-Safety (`npx vue-tsc --noEmit`).
- [ ] Production Build (`npm run build`).
- [ ] Unit Tests (`npm run test`).
- [ ] Modularity Check (500-line rule).
- [ ] Global Compliance (Hybrid identity & Manuals).

## 4. Database Triple Parity Sync
- [ ] Verify SQL migration `20260421110000_sync_event_seeds.sql`.
- [ ] Verify `migrations_data.js` sync.
- [ ] Update schemas if needed.

## 5. Lessons Extraction
- [ ] Run `@/extract-lessons`.

## 6. Safe Commit
- [ ] `git add .`
- [ ] `git commit -m "feat(debug): add modal stacking test and harden project standards"`
- [ ] `git push`
