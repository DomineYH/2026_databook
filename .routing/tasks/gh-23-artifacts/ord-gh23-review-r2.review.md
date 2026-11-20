REVIEW_BEGIN
verdict: PASS
reviewed_revision: d45041bcfbb4c783325c8ad61652eb88f72eb9ca (repair diff 539b3ab..d45041b; earlier review covered 88b4492..539b3ab)

findings:
1. severity: nit
   file:line: web/src/ZoomView.tsx:68
   summary: A pinch already in progress retains its old starting zoom when resize clamps the current zoom.
   failure_scenario: At 390px wide and 821%, start a pinch and resize to 844px wide while retaining both touches. The observer clamps to 379%; moving the fingers from 100px to 60px apart still leaves the image at 3200px because the pinch calculation uses the old 821% starting value. Releasing and starting a new pinch works. Rebase or clear the active pinch when resize changes the zoom.
2. severity: nit
   file:line: web/src/ZoomView.tsx:68
   summary: A mouse drag already in progress retains its pre-resize scroll offsets.
   failure_scenario: At maximum zoom with a mouse button held down, resize from 390x844 to 844x390. The observer adjusts scrollLeft/scrollTop from 1406/1986 to 423/841; a subsequent one-pixel mouse move jumps them to 1405/1985. Rebase or cancel an active drag when resize changes the scroll offsets.
3. severity: pre_existing
   file:line: web/src/Viewer.tsx:201
   summary: Tab can leave the overlay for browser chrome on browsers with inert support.
   failure_scenario: Tab after the overlay's final focusable stop reaches BODY/browser UI before wrapping. The baseline did the same; this is out of scope under the work order.

criteria_check:
1. met — Previous independent baseline comparison measured both page widths 1440 and scrollHeight 4145. The repaired build again measured these values and plain wheel moved scrollTop from 0 to 200. Observer mount at 1x left scrollLeft and scrollTop at 0.
2. met — Repaired build enlarged with Ctrl+wheel with measured point drift under 1px, stopped at 3200px and returned to 1440px, with visualViewport.scale 1. After resizing from 390px at max, both 1440x900 and 844x390 settled at 3200px.
3. met — Repaired build double-clicked to 2880px at the tested point, dragged scrollLeft 500→600 and scrollTop 846→996, then double-clicked back to 1440px. Finding 2 concerns resize while a drag is already held.
4. met — CDP touch at 390x844 spread 390→1482px, visualViewport.scale stayed 1, bar rectangle stayed [147,8,235,36], and one-finger dragging scrolled. Finding 1 concerns resizing during a held pinch.
5. unmet, pre-existing exception — Keys and buttons changed/reset the zoom; Esc restored focus to the open button and to the previously focused TOC button after page double-click. Tab still reaches BODY/browser UI before wrapping, as on the prior baseline; the work order explicitly excludes this existing issue from failure.
6. met — Desktop and mobile test flows retained #/p/20 after zoom, movement and close.
7. met — The delta only adds an observer inside the overlay; the prior independent desktop and mobile book regressions passed. Repeated mobile tests again passed swipe, short corner drag, buttons and arrow keys.
8. met for exercised flows — The only collected console error was the known local-preview /_vercel/insights/script.js 404; no ResizeObserver loop error or page error appeared.
9. met — zoom.ts has 10 Vitest tests; npm test passed all 31 tests, npm run build passed, and npm run lint passed. PR Vercel, test and lint checks passed.

answers:
1. Fixed: at 390px maximum the image was 3200px and 821%. Resizing to 1440x900 produced 3200px and 222%; a separate 390→844x390 run produced 3200px and 379%. At 195%, shrinking from 1440px to 390px and growing back retained 195% and stayed below the limit.
2. The observer's initial notification at 1x did not move the scroll position. It disconnected on close; resizing after close produced no further callback or error. The instrumented tested run settled at two observer callbacks and showed no loop, although native scrollbar behavior outside tested Chromium was not separately exercised. Resize during active pinch or drag exposes the two low-impact gesture-state issues above. The observer uses the existing zoom function, whose unchanged zoom early-return avoids updates when no clamp is needed.
3. The delta does not affect book view or existing input handlers outside overlay resize. Desktop wheel, drag, double-click, keys, buttons, focus return and mobile pinch/scroll/hash/book tests were repeated successfully, apart from the existing Tab exception and rare resize-during-gesture issues above. Real devices were not tested, as allowed by the order.

checks_run:
- Confirmed HEAD; inspected repair diff, previous review, repair report and connected zoom/gesture code.
- npm test: 31 passed; npm run lint: passed; npm run build: passed; separate Vite build to review directory: passed.
- gh pr checks 24: Vercel deployment, preview comments, lint and test passed.
- Chromium on preview port 4341: repair resize script, desktop regression script, CDP mobile script, independent observer/pinch/close probe and independent drag-during-resize probe. Preview stopped after tests.
- Prior review's baseline comparison and desktop book regression were reused for unchanged behavior. Physical iOS/Android checks were not run.
REVIEW_END
