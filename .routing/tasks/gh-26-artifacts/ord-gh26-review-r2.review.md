REVIEW_BEGIN
verdict: FAIL
reviewed_revision: 43155a5eb519ba02b0add6df1f2a9bf235aee722

findings:
- severity: important
  file: web/src/ZoomView.tsx:71
  summary: A held pinch jumps on its first move after a resize clamps a zoom set by another control. The resize ratio uses the applied zoom as its denominator even when the pinch is working from a different zoom. Rebase from the corrected zoom and the latest finger span when another control has changed the zoom since the last pinch event.
  failure_scenario: At 390×844 on #/p/20 in 크게 보기, start at 100% and spread two held fingers from 100px to 200px to reach 200%. Keep both fingers down, press + to reach 250%, then widen to 1600×900 and wait for the observer to clamp to 200% (3200px). Narrow the held fingers from 200px to 190px. 43155a5 jumps to 152% (2432px). 4116ea0 continues from 200% to 190% (3040px), the expected result of the 5% span reduction. The changed code multiplies the pinch's original factor by 2/2.5, so it computes 1 × 0.8 × 190/100. Reproduced on both independently built revisions with edge-cases.cjs. See keyBeforeClamp in fix.edge-cases.json and base.edge-cases.json.

criteria_check:
1. Held 100→60px pinch after resize — met. At 390×844, + ×15 reached 3200px/821%. At 844×390 it re-clamped to 3200px/379%. The next 60px span yielded 1920px/227% on 43155a5 and 3200px/379% on the baseline. The additional mixed-input case in question 1 fails as described above.
2. Held mouse drag after resize — met. Both builds re-clamped to scroll 423/841. A move from (200,300) to (201,301) gave 422/840 on 43155a5 and 1405/1985 on the baseline.
3. Ctrl+wheel during a held 2× drag at 1440×900 — met. After the wheel, the 1px move changed scroll from 118/84 to 117/83. The baseline jumped from 118/84 to 141/397.
4. Held pinch with classic scrollbars and no resize — met. With Playwright's --hide-scrollbars flag omitted, spans of 100/110/120/130px gave 100/110/120/130% on both builds. The observer fired mid-pinch as the scrollbar reduced scroller client height from 900px to 885px.
5. Listed #23 behavior — met. The regression probe produced identical output on both builds. Ctrl+wheel and double-click held the image point under the pointer to the measured precision. Drag followed pointer travel and stayed at 0/0 on a partial return from edge overshoot. The +/− keys and buttons produced 125%/100%, and both reset controls returned to 100%. At maximum zoom, resizing from 390×844 to 1440×900 gave 3200px/222%. visualViewport.scale stayed 1 and the hash stayed #/p/20.
6. Sub-pixel drag — met. At deviceScaleFactor 1, 1.25, and 2, 300 moves of −0.3/+0.7 CSS px moved scroll 700/700 to 790/490, and the reverse path returned it to 700/700. The pointer events carried fractional coordinates.
7. Book view — met. Both 390×844 builds produced the same page sequence. From 20, fast left swipe advanced to 21, short corner drag stayed at 21, next and previous went to 22 and 21, and right and left arrows went to 22 and 21.
8. Tests, build, lint — met. All 31 tests passed. The TypeScript/Vite build and oxlint passed. The GitHub test, lint, Vercel, and Vercel Preview Comments checks passed at the reviewed HEAD.

answers:
1. An observer run that leaves the applied zoom unchanged uses a ratio of 1. This preserves the pinch through scrollbar changes and unclamped resizes. After an upper clamp, the ratio preserves any existing overshoot. With a 100px starting span, spreading to 150px at the old maximum and widening the viewport kept the corrected maximum down to 100px, then produced 2880px at 90px. At the 1× lower bound both revisions stayed at 100% for the 60→80px move across a resize and reached 110% at 110px. An intervening zoom input can make the applied zoom diverge from the pinch curve. Both builds produced the pre-existing 150%→122% jump after key zoom and an unclamped resize. The clamp case in the finding shows a jump introduced by the new ratio.
2. Drag subtracts pointer travel from the live scroll and advances the stored pointer by the scroll delta actually consumed. That leaves edge overshoot and fractional rounding in the residual. It also honors unrelated changes to the live scroll. For example, plain wheel while held gave 750/698→749/697 on the next 1px move. At an edge the stored pointer stops advancing when scroll stops, so the residual grows only with pointer overshoot. Away from an edge, rounding residual is bounded by scroll precision. Ending the drag clears it. The fractional and resize probes exposed no accumulating drift or stuck drag.
3. The #23 and book checks matched baseline as listed above. A native one-finger swipe in the zoom overlay at 195% scrolled from 0 to 185px in both builds. Zoom anchoring, touch default handling, and book navigation use their existing paths.
4. The drag implementation already carries the needed residual using the two pointer coordinates. For pinch, capturing the latest span and rebasing to the corrected zoom only on a real clamp would also cover mixed input and would clear any pre-resize pinch overshoot. To preserve that overshoot, keep the existing ratio for pinch-driven zoom and use a fresh span and corrected zoom when another control changed the applied zoom.

checks_run:
- Confirmed HEAD and the PR head SHA, inspected git diff 4116ea0..43155a5 and connected ZoomView, zoom, viewer, and CSS paths, and read issue #26 with its owner brief. git diff --check passed. Git status was clean before and after the review.
- Ran npm test, npm run build and npm run lint from an archived copy with dependencies copied under write_scope, keeping generated outputs and caches there. All passed. Reviewed GitHub CI via gh pr checks 28.
- Built the exact review and baseline commits with Vite under write_scope. Ran isolated headless Chromium on previews 4351 and 4352 using the specified playwright-core and CDP. Reused the gesture, regression, and book probes with fresh output and wrote an independent mixed-input probe. Checked the resulting JSON against the reported values. Both preview servers were stopped.
- Both preview builds had the same local analytics resource 404. Real devices, Safari, and Firefox were outside this review.
REVIEW_END
