REVIEW_BEGIN

verdict: FAIL  
reviewed_revision: 5915643da5295427b3b955419e03ee3c50936c01

findings:

- **pre_existing** — `web/src/main.tsx:10`: The local production preview reports a 404 console error for `/_vercel/insights/script.js`. The implementer observed it on both the base and fixed builds. It is not caused by this change, but the reported run does not meet the explicit zero-console-errors criterion.

criteria_check:

1. **1440×160, all four corners, single-step mouse-out:** met. The implementer reports the hash remained `#/p/45` for all four corners after reproducing the page turn on the base build.
2. **1440×900 and 390×844, existing hover, click and drag behavior:** met relative to the base build. The report records matching click and drag results and unchanged hover behavior. It also identifies a pre-existing short left-drag turn and absent left-corner hover preview in portrait mode.
3. **1440×160 buttons and arrow keys:** met. The implementer reports both directions turning pages.
4. **No browser console errors; test, build and lint pass:** unmet. The implementer reports the preview 404 console error above, with no page or JavaScript errors. The implementer reports test, build and lint passing; this review independently ran test and lint successfully. The host can check the console on a Vercel-served deployment, where the analytics script is available.

answers:

1. `hovering` is set only for the synchronous `showCorner` call and reset in `finally`. The `stopMove` call inside `showCorner` sees it as true; drag release and `settle()` see it as false. Animation callbacks do not retain the flag.
2. Normal-size preview coordinates remain positive in the working page’s coordinate frame, including backward folds; the circle clamp preserves the sign. The new branch therefore does not run for the specified normal viewports.
3. `showCorner` finishes its animation before calling `stopMove`. `dropFold` then clears the rendered fold and shadow, sets the state to `read`, and resets the calculation. The renderer restores static pages on its next frame, matching page-flip’s normal cleanup.
4. The comment accurately explains the failure mechanism. The boundary can also include a page exactly 50px wide, depending on the calculated position.
5. The change does not alter the `flipNext`/`flipPrev` or `isPointOnCorners` wrappers. Their call paths and the implementer’s comparison provide no evidence of a regression.

checks_run:

- Verified HEAD and reviewed `aca4937..5915643`, connected page-flip source, issue and supplied reports.
- `npm test`: passed, 21 tests.
- `npm run lint`: passed.
- Build and browser checks were not independently run; results above use the implementer’s report.

REVIEW_END
