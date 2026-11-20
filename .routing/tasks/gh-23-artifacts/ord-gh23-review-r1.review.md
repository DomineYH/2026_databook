REVIEW_BEGIN
verdict: FAIL
reviewed_revision: 539b3ab154c9c3678460df67e9096dbe69ad9d41 (diff 88b4492..539b3ab)

What this change does: It adds zoom, pan and touch gestures to the full-size page overlay, with fixed controls and keyboard shortcuts. The book remains separate from the overlay.

findings:
1. severity: important
   file:line: web/src/ZoomView.tsx:14
   summary: The 3200px maximum is not enforced when the viewport grows while zoomed.
   failure_scenario: At 390px wide, zoom to the 3200px maximum (821%), then widen the viewport to 1440px. Chromium renders the image at 11815px wide and still displays 821%. A phone rotation or desktop window resize can therefore exceed the specified maximum substantially until another zoom action. Re-clamp the current factor when the fit width changes and update the displayed percentage.
2. severity: pre_existing
   file:line: web/src/Viewer.tsx:201
   summary: Tab can leave the modal for browser chrome on browsers with inert support.
   failure_scenario: In Chromium, Tab from the last overlay stop eventually reaches BODY/browser UI before returning to the first button. The baseline build also alternates between its close button and BODY, so this is not caused by this change. The non-inert fallback explicitly traps Tab; the inert path has no wraparound.

criteria_check:
1. met — At 1440x900 and #/p/20, the baseline build supplied with the implementer scripts and the new build both measured image widths [1440, 1440] and scrollHeight 4145. Plain wheel changed scrollTop 0 to 200 without changing width.
2. met at the specified fixed viewport — Ctrl+wheel enlarged 1440 to 3200px and back to 1440px, with tracked point drift below 1px and visualViewport.scale 1. The maximum is nevertheless violated after resize as described in finding 1.
3. met — Double-click at 1x produced 2880px and preserved the tested point; drag changed scrollLeft 500 to 600 and scrollTop 846 to 996; double-click reset to 1440px.
4. met — At 390x844 with CDP touch emulation, a two-finger spread changed width 390 to 1482px with visualViewport.scale 1 and bar rectangle [147,8,235,36] unchanged. One-finger drag moved scrollTop 684 to 1217.
5. unmet (pre-existing Tab escape) — +, =, -, 0 and all three buttons produced expected percentage changes; Esc closed and restored focus both to the open button and to the previously focused TOC button after page double-click. Tab reaches BODY/browser chrome before wrapping, in both baseline and new build. The new scroll area is itself focusable in Chromium.
6. met — #/p/20 remained unchanged through desktop wheel/drag/close and mobile pinch/drag/close.
7. met — At 390x844, left swipe 20→21, short corner drag stayed at 21, next/prev and arrow keys moved as expected. At 1440x900, corner hover and exit stayed on 20 and right corner click moved to 22.
8. met for exercised flows — Only the known /_vercel/insights/script.js 404 appeared in collected console errors.
9. unverifiable in full — zoom.ts has 10 Vitest tests; npm test passed 31 tests and npm run lint passed. The permitted Vite build to the review directory passed, and PR Vercel deployment, test and lint checks passed. Exact npm run build was not run because it writes build artifacts into the read-only repository and was not among the order's allowed commands; its prior implementer result is a claim, not independent proof.

answers:
1. Anchoring: the measured interior point stayed within 1px over three zoom steps; the 3200px clamp was reached but its final-step anchor was not measured. Across an 8px gap the nearest image is used and the image coordinate is extrapolated. At scroll edges the browser clamps scroll offsets, so exact preservation is geometrically impossible where the required offset lies outside the scroll range; these edge cases were inspected, not separately measured.
2. Listeners are registered on mount and removed on unmount, with matching callbacks. The empty-dependency closure reads current dimensions and zoom from refs and does not itself go stale. Window keydown accepts Shift+plus, ignores Ctrl/Meta/Alt, and exists only while ZoomView is mounted; the background controls are inert during zoom. Simultaneous TOC/zoom state is not reachable via normal controls. Resize is not handled, causing finding 1.
3. Two-touch start/move use non-passive listeners and cancel only when cancelable; touch-action blocks browser pinch in tested Chromium. CDP pinch did not change visualViewport.scale or page hash. Page-flip still has window touch listeners, but its touchPoint is normally unset when gestures start on the overlay. Real iOS/Android behavior was not checked, as specified.
4. Close autofocus, both focus-return routes and accessible reset percentage were verified. The scroll area is keyboard focusable in tested Chromium. Non-inert fallback cycles overlay links/buttons but skips the scroll area; the inert path has the pre-existing escape described above. Esc closes directly.
5. 1x measurements match the supplied baseline at 1440x900; at 375x667 the control bar fits within the viewport and image width is 375px. Resize while zoomed violates the maximum (finding 1).
6. No additional actionable simplification found. The zoom math is small and separately tested; no new dependency was introduced.

checks_run:
- git rev-parse HEAD; reviewed full named diff, connected Viewer, stylesheet, page-flip listeners, issue comments, PR and implementer report.
- gh pr checks 24: Vercel, preview comments, lint and test passed.
- cd web && npm test: 31 passed; npm run lint: passed.
- npx vite build to the permitted review directory: passed; preview on 4341 and baseline supplied build on 4342. Servers stopped after testing.
- Chromium desktop, CDP mobile touch, regression scripts and independent baseline, focus, resize and 375px probes: results above. Initial sandboxed Chromium/server attempts failed due to sandbox restrictions; repeated successfully outside the sandbox.
- Exact npm run build and real-device checks not run for the reasons above.
REVIEW_END
