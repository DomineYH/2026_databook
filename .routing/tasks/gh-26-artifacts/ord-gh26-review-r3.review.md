REVIEW_BEGIN
verdict: PASS
reviewed_revision: a5e096c5f47e74219cd47b737225b762f8bbbb0b
findings: []

criteria_check:
1. R2 finding, external zoom during a held pinch before a clamping resize — met. At 390×844 on #/p/20, a 100→200px pinch reached 200%. The + key raised it to 250%, and resizing to 1600×900 clamped it to 200%/3200px. With both fingers still held, narrowing to 190px yielded 190%/3040px. The previous independent run of the same probe on 43155a5 yielded 152%/2432px.
2. Held pinch at maximum after resize — met. At 390×844, + ×15 reached 821%/3200px. Holding fingers 100px apart through the resize to 844×390 gave 379%/3200px. Moving to 60px yielded 227%/1920px. The 4116ea0 baseline stayed at 379%/3200px.
3. Held mouse drag after resize — met. After the resize, scroll was 423/841 on both builds. Moving from (200,300) to (201,301) gave 422/840 on a5e096c and 1405/1985 on 4116ea0.
4. Ctrl+wheel while dragging at 2× on 1440×900 — met. After Ctrl+wheel, scroll was 118/84. The next 1px movement gave 117/83. The baseline jumped to 141/397.
5. Held pinch with classic scrollbars and no viewport resize — met. With --hide-scrollbars removed, gaps 100/110/120/130px produced 100/110/120/130%. The observer fired mid-pinch as scroller client height dropped from 900px to 885px.
6. Issue #23 regression checks — met. Both builds produced identical anchor positions for Ctrl+wheel and double-click to the measured precision. Drag followed pointer travel, and a partial return from edge overshoot held scroll at 0/0. The +/− keys and buttons produced 125%/100%, and both reset controls returned to 100%. Resizing from the 390px maximum to 1440×900 gave 222%/3200px. visualViewport.scale stayed 1 and the hash stayed #/p/20.
7. Sub-pixel drag — met. At deviceScaleFactor 1, 1.25, and 2, 300 moves of −0.3/+0.7 CSS pixels took scroll from 700/700 to 790/490. Reversing the path returned to 700/700. The pointer events carried fractional coordinates, and both builds produced identical output.
8. Book view — met. In both 390×844 builds, fast left swipe turned page 20 to 21, short corner drag stayed at 21, next and previous went to 22 and 21, and right and left arrows went to 22 and 21.
9. Test, build, lint — met. npm test passed all 31 tests, npm run build passed TypeScript and Vite, and npm run lint passed oxlint. PR #28 reported test, lint, Vercel, and Vercel Preview Comments passing at a5e096c.

answers:
1. The repair stores the latest span and sets the pinch baseline to that span and the applied zoom when the observer changes the zoom. This keeps the gesture continuous even when a key set the zoom before the clamp. Observer callbacks that leave zoom unchanged preserve the pinch curve. In the upper-limit overshoot probe, a held span of 150px at the clamp rebased to 379%. Shrinking to 140px immediately yielded 354%/2986.66px, the accepted removal of the dead zone after a clamp. Below 1×, a 60→80px move across an unclamped resize stayed at 100% and 110px reached 110% on both builds. The jump after key zoom without a clamping resize is pre-existing. Both builds reached 150% with the key and returned to 122% on the next pinch move.
2. The drag uses the live scroll and advances its pointer reference by the amount actually consumed. This carries rounding remainder and the travel refused at an edge. At an edge the reference stops advancing as scroll stops, so the residual reflects actual overshoot. With ordinary rounding it stays within scroll precision away from an edge. Ending the drag discards it. Results at deviceScaleFactor 1 and 2 matched expectations, and the plain-wheel and content-shrink probes also gave a 1px scroll change on the next 1px move.
3. The listed #23 and book behaviors matched the baseline. A one-finger swipe in the overlay at 195% scrolled from 0 to 185px on both builds.
4. The pinch needs the latest span as well as the baseline span and zoom to rebase on a real clamp while preserving ordinary pinch behavior. The drag needs its two effective pointer coordinates to carry unapplied movement. Updating the reference to every raw pointer sample would lose fractional travel and edge overshoot.

checks_run:
- Verified the worktree HEAD and PR #28 head SHA. Inspected repair diff 43155a5..a5e096c, full diff 4116ea0..a5e096c, connected zoom and drag code, and issue #26 with its owner brief. git diff --check passed on both ranges and the worktree was clean.
- Ran npm test, npm run build, and npm run lint in the archived review source tree under write_scope with a scoped copy of dependencies. All passed. gh pr checks 28 passed.
- Built a5e096c and 4116ea0 with Vite. Ran edge-cases, pinch, drag, reg, drift, book, and extra probes against both on ports 4351 and 4352 using isolated headless Chromium and CDP. Verified the captured JSON, including comparison to the r2 evidence for 43155a5. Stopped both preview servers.
- Both local builds showed the same pre-existing analytics resource 404. Real devices, Safari, and Firefox were outside this review.
REVIEW_END
