REVIEW_BEGIN
verdict: PASS
reviewed_revision: 43155a5eb519ba02b0add6df1f2a9bf235aee722
findings: []

criteria_check:
1. Held pinch after resize: met. Independent Chromium/CDP: 390x844 at 3200px/821%, held 100px pinch, resize to 844x390 at 3200px/379%, move to 60px gives 1920px/227%. Baseline stays 3200px/379% at 60px.
2. Held mouse drag after resize: met. Baseline scroll 423/841 -> 1405/1985 on 1px move; fixed 423/841 -> 422/840.
3. Ctrl+wheel during held 2x image drag at 1440x900: met. At deviceScaleFactor 1, after wheel 118/84 -> 117/83; at deviceScaleFactor 2, 387/218 -> 386/217. Baseline at factor 1 jumps 118/84 -> 141/397.
4. Held pinch without resize and with visible scrollbars: met. 100,110,120,130px gaps yielded 100%,110%,120%,130%; ResizeObserver fired while held and gesture continued. Same values on baseline.
5. Issue #23 behavior: met. Independent baseline and fixed reg.cjs JSON identical: Ctrl+wheel anchor fractions 0.3472/0.1707, double-click anchor 0.625/0.2198, drag 1000/598 and edge overshoot 0/0 on partial return, +/- keys and buttons 125%/100%, 0 key 100%, resize 390 max to 1440 3200px/222%, visualViewport.scale 1 and hash #/p/20. Single-finger native scroll path remains unchanged by inspection (only two touches call preventDefault); buttons and zoom logic unchanged.
6. Sub-pixel drag: met. At deviceScaleFactor 1, 1.25, and 2, 300 moves of -0.3/+0.7 CSS px moved 700/700 to 790/490 and returned to 700/700.
7. Book view: met. Independent base/fixed book.cjs outputs identical: #/p/20 -> fast left swipe 21 -> short corner drag stays 21 -> next 22 -> prev 21 -> Right 22 -> Left 21.
8. npm test, npm run build, npm run lint: met. Locally 31 tests pass, build and lint exit 0. PR checks report lint, test, Vercel and Vercel Preview Comments passing.

answers:
1. Pinch: no clamp gives ratio 1 and leaves start zoom and limit overshoot unchanged; the tested unclamped resize continues to 227%. A max clamp scales the original start zoom by new/current, preserving the relative overshoot and making the same finger-distance ratio apply to the corrected zoom. Below 1x the current zoom remains 1 and ratio remains 1, preserving the existing overshoot. Other zoom inputs during a pinch are not separately rebased by this change; subsequent touch movement still uses the original pinch start as it did before, except for any actual observer clamp. The ratio is safe for normal zoom values because clampZoom keeps zoom >= 1.
2. Drag: live scroll plus actual scrolled-distance advancement preserves movement across external scroll/zoom changes; unconsumed movement remains owed at edges and fractional rounding is carried forward. Browser evidence covers both device scale factors, edge return, and 300 fractional moves. d.x/d.y reflect initial pointer plus consumed scroll, not an accumulating per-event error; retained difference can grow with real edge overshoot and is cleared when drag ends. No new stuck case found.
3. The #23 and book checks above match baseline. One-finger native touch behavior is unchanged by code inspection; real-device Safari/Firefox rotation and touch behavior were outside the order and not tested.
4. No smaller alternative found that also preserves edge overshoot and sub-pixel remainder while honoring externally changed scroll. The requested observer ratio is a minimal way to preserve the pinch baseline without canceling ordinary scrollbar-triggered observer callbacks.

checks_run:
- Read diff 4116ea0..43155a5, ZoomView and zoom helpers/tests, issue #26 and triage, PR #28, implementation report and triage evidence; HEAD verified.
- npm test: 31/31 passed; npm run build and npm run lint passed; gh pr checks 28 passed.
- Built both revisions with Vite into review scratch directory and ran pinch.cjs, drag.cjs, reg.cjs, book.cjs against both; drift.cjs and drag-dsf2.cjs against fixed. Preview servers stopped.
- Chromium-only local preview reports the same pre-existing /_vercel/insights/script.js 404 on both revisions; excluded from findings per order. Real devices, Safari and Firefox were not checked.
REVIEW_END
