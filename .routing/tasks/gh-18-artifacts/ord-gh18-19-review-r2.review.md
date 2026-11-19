REVIEW_BEGIN

verdict: PASS
reviewed_revision: 02886df87b0d112796913f040db80493bda1cc23

## findings

[]

## criteria_check

| Acceptance criterion | Status | Evidence |
| --- | --- | --- |
| #19 tiny-window switches | met | Chromium detected `fold_corner` after the single move and 300ms wait. All three 1440×160 → 60×160 corner cases and the bottom-right reverse switch kept `#/p/45`. |
| #18 portrait backward drags and left corner click | met | At 390×844, mouse and held touch bottom-left +40px and +8px, and top-left +40px, kept `#/p/45`. Mouse +220px and +300px over 15 steps, held touch +300px, and the two left corner clicks reached `#/p/44`. |
| #15 tiny-window hover exit | met | At 1440×160, a single move to the center from each corner kept `#/p/45`. |
| #11 tiny-window navigation | met | At 1440×160, the Prev and Next buttons and the two arrow keys took `#/p/45` through `#/p/42`, `#/p/44`, `#/p/42`, and `#/p/44`. |
| Normal viewports at 1440×900 and 390×844 | met | Hover previews entered `fold_corner` and returned to `read`. Corner clicks and drags beyond the turn threshold turned. Short drags returned. At 390×844, right hover and a short right drag kept `#/p/45`, and a right click and a drag past the spine reached `#/p/46`. |
| Hash jump | met | Setting `location.hash = '#/p/80'` landed on `#/p/80` at both normal viewports. |
| Browser console | met | The only console error in the acceptance run was the pre-existing local-preview 404 on `/_vercel/insights/script.js`. |
| `npm test`, `npm run build`, and `npm run lint` | met | The exact commands passed in CI on the merged head. Locally, Vitest passed 21/21, lint passed, and Vite built the production bundle into the review directory. [Test and build](https://github.com/DomineYH/2026_databook/actions/runs/44504262895/job/135491622961), [lint](https://github.com/DomineYH/2026_databook/actions/runs/44504262895/job/135491622405). |
| ArrowLeft plus short-drag overlap | met | At 390×844 on `#/p/45`, the pointer started 8px inside the bottom-left corner. After ArrowLeft, a press, 12px drag right and immediate release reached `#/p/44` in 3/3 on the merged build and 3/3 on the `39944ce` triage build. The merged build was in `read` with no calculation or pending animation after each release. |
| Immediate follow-up fold | met | Repressing and making the first move to the right side created a FORWARD fold with no animation pending. The hash stayed `#/p/44` for the 800ms hold. |
| Isolated short backward drag | met | A separate 40px mouse drag at 390×844 started with no pending animation and returned to `read` with no calculation or pending animation. The hash stayed `#/p/45`. |

## answers

1. **Committed turn and follow-up.** The repair resolves the previous important finding. `finishAnimation()` runs while the calculation that belongs to the committed turn is still present. The completion callback turns back and runs the library's cleanup, and the renderer clears its animation reference before `dropFold()` runs. Chromium reproduced the corrected ArrowLeft outcome 3/3 and verified the same outcome with the Prev button. The follow-up gesture stayed on page 44 while held.
2. **Reachability and cleanup.** An isolated short drag updates the fold directly through `fold()` and schedules no animation. `finishAnimation()` then has no animation to complete. `settle()` already calls it before invoking `stopMove()`, so a short release through that path has no earlier callback left. A forward turn retains a FORWARD calculation when `fold()` reuses it, so it cannot satisfy the BACK guard. A prior non-turn animation keeps its original `isTurned = false` completion action. When a backward turn is already committed, `fold()` can change the state and position while the calculation retains its direction. The completion callback uses that direction, resets state and page references, and clears the shadow. The subsequent `dropFold()` repeats safe cleanup. Chromium also confirmed an in-flight ArrowLeft survived a mode switch and a recognized 70px backward swipe reached `#/p/44`. See `web/src/Viewer.tsx:55` and `:143`, `web/node_modules/page-flip/src/Flip/Flip.ts:65` and `:344`, and `web/node_modules/page-flip/src/Render/Render.ts:176`.
3. **Main merge.** The merge has parents `fcae269` and `ba15ef8`. Relative to `fcae269`, its changes are the #10 zoom opener capture and focus restoration. Relative to `ba15ef8`, the PR changes only the controller types and `stopMove` wrapper. The focus hooks operate on the zoom overlay and DOM focus, and the page-flip wrapper retains its repair. In Chromium, button-opened zoom restored button focus. A zoom session opened with a focused page-3 link, then jumped by hash to page 80, restored focus to the zoom button after the link became hidden and Escape closed the overlay.
4. **Midpoint comment.** The previous nit is resolved at `web/src/Viewer.tsx:141`. “At or past the middle” matches the inclusive turn threshold implied by the strict `>` in `shortBack`. A release at the visible midpoint reached `#/p/44` in Chromium within floating-point coordinate rounding. The old commit wording was accepted by the work order.

## checks_run

- Confirmed that local HEAD and PR #21 both point to `02886df87b0d112796913f040db80493bda1cc23` and that the PR base is `ba15ef8`. Reviewed the original range, the repair delta, both sides of the merge, the previous review, the repair report, and the installed dependency's fold and animation paths. Both review deltas passed `git diff --check`.
- `npm test -- --no-cache --configLoader runner` passed 21/21. `npm run lint` and the Vite production build passed locally. CI verified the full `npm run build` including type-checking. GitHub run `44504262895` passed test, lint, Vercel, and Vercel Preview Comments. [CI run](https://github.com/DomineYH/2026_databook/actions/runs/44504262895).
- Independent Chromium acceptance replay on the merged bundle passed 34/34. See `verify.cjs`, `browser.log`, and `results-run.json`.
- Targeted Chromium replay passed the baseline comparison, immediate next fold, isolated drag, button overlap, mode switch, fast swipe, zoom focus and midpoint checks. The baseline HTML and bundle were served from the `39944ce` triage artifact via Playwright routing. The final test waits for the focus effect and accounts for subpixel midpoint rounding. See `recheck.cjs` and `recheck-final.log`. The preview server on port 4314 was stopped.

REVIEW_END
