REVIEW_BEGIN

verdict: FAIL
reviewed_revision: 57702d18c4a215da24a82ef3c12591e96e8f1969 (PR #20, fix/issue-10, diff 39944ce..57702d1)

## findings

- **Severity** important
  **File** web/src/Viewer.tsx:242
  **Summary** Zoom close loses keyboard focus when the remembered page link becomes hidden. Page-flip keeps offscreen pages connected and assigns their containers `display: none`. The link passes the return-target checks, its `focus()` call has no effect, and the zoom-button fallback is skipped. Check whether focus landed on the remembered element and use the zoom button if it did not.
  **Failure scenario** At 1440×900, go to page 3 and focus a link in the book's table of contents. Press ArrowRight and immediately double-click the page image while the turn is in flight. Wait for the turn to reach page 4, then press Escape or click ✕ 닫기. In both cases the original link is still connected and enabled with no rendered rectangles, and focus ends on `body`. Changing the hash from page 3 to page 8 with zoom already open reproduces the same result. The base revision always moved focus to ⤢ 크게 on close.

## criteria_check

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Open with ⤢ 크게 and restore its focus after Escape or ✕ | met | Both close methods returned focus to the opener in Chromium at both sizes. |
| 2 | Focus the page-number input, double-click a page, then close with Escape or ✕ | met | Both close methods returned focus to the page-number input at both sizes. |
| 3 | Focus another control, double-click a page, then close | met | Both close methods restored focus to the TOC and Next buttons at both sizes. A page link that stayed visible also regained focus on desktop. The finding covers a link that becomes hidden. |
| 4 | Start with body focused, double-click a page, then close | met | Both close methods focused ⤢ 크게 at both sizes. |
| 5 | Fall back when the remembered control has been removed or disabled | met | Both close methods focused ⤢ 크게 at both sizes after removal of the remembered input in the test DOM or after a hash change to page 1 disabled the remembered Previous button. |
| 6 | Preserve TOC focus, the #9 Tab trap, Escape, arrow keys, and page turning | met | Both sizes passed TOC initial-link focus and return to its opener after Escape and link selection. Tab and Shift+Tab cycled in the TOC and stayed on the zoom close button with the legacy branch forced. ArrowRight was blocked in zoom and turned the page after close. ArrowLeft turned back. The trap, inert attributes, and page-turn handlers are unchanged in the diff. |
| 7 | Check 1440×900 and 390×844 with only the known analytics 404 | met | Both sizes ran the standard scenarios and keyboard checks. The only console error was the 404 for `/_vercel/insights/script.js`. |
| 8 | Pass npm test, npm run build, and npm run lint | met | GitHub Actions run 44500772450 passed both jobs at the PR head. The test job runs npm test and npm run build. Local Vitest passed 21 tests, local lint passed, and Vite built the production bundle into the scratch directory. CI covered the build's TypeScript step. |

## answers

1. **Memoized pages.** The first-render double-click handler is safe. `openZoom` reads the active element when invoked, writes through a stable ref, and calls a stable state setter. The button handler supplies the current `visible` array on each render. On normal page images, page-flip prevents the default mousedown behavior so the existing control can hold focus until the double-click handler captures it.
2. **Open and close paths.** The two open paths call `openZoom`. Escape and the ✕ button clear `zoomed`, and the effect runs after React removes the dialog and lifts the background's inert state. The hash handler closes only the TOC and can move the page beneath an open zoom. Actual unmount removes the viewer and its controls, so the close effect does not run in that case.
3. **Interactions.** The Tab trap owns focus only while an overlay is open. The TOC effect retains its separate focus behavior. Normal pointer and keyboard use opens one overlay at a time. Page-flip accepts a focus return to a visible link. A turn that completes under zoom can make the same link unavailable as described in the finding.
4. **Fallback.** The guard handles body, disconnected elements, and disabled controls. A connected enabled link under a page with `display: none` passes the guard and rejects focus. An inert ancestor would also prevent focus. The viewer normally lifts its own inert state before this effect runs.
5. **Comment and commit message.** The autofocus timing comment is accurate. The commit message accurately describes capture and the body, removed, and disabled fallback cases. Its general promise of returning focus on close misses the hidden-link case.

## checks_run

- Read issue #10, PR #20, the implementer report, the pinned diff, and page-flip's input and rendering code. Confirmed the worktree and PR head were the same revision.
- `gh pr checks 20 --repo DomineYH/2026_databook` passed test and lint in run 44500772450. Checked the commands in `.github/workflows/ci.yml`.
- `npm test -- --no-cache --configLoader runner` passed all 21 tests. `npm run lint` passed. The scratch Vite build passed.
- `check.cjs` against scratch Vite preview on port 4313 verified the standard cases and reproduced the hidden-link defect on desktop for both close methods and both navigation paths. The mobile in-flight-turn probe timed out waiting for zoom to open, after the mobile standard and keyboard checks had passed. The resulting nonzero script exit and browser observations are in `browser.log`. The preview process was stopped at script exit.

REVIEW_END
