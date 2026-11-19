REVIEW_BEGIN

verdict: PASS
reviewed_revision: 6175eef48d21f093857c154a61d392052ed8b726 (PR #20, fix/issue-10, repair delta 57702d1..6175eef, whole PR 39944ce..6175eef)
findings: []

## criteria_check

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Open from ⤢ 크게 and restore its focus after Escape or ✕ | met | Both close methods restored focus to ⤢ 크게 at 1440×900 and 390×844. |
| 2 | Restore focus to the page-number input after double-clicking a page | met | Both close methods restored the input at both sizes. |
| 3 | Restore focus to another focused control after double-clicking a page | met | The TOC and Next buttons each regained focus after both close methods at both sizes. |
| 4 | Fall back to ⤢ 크게 when body had focus at open | met | Both close methods focused ⤢ 크게 at both sizes. |
| 5 | Fall back to ⤢ 크게 when the remembered control is disconnected or disabled | met | Both close methods focused ⤢ 크게 at both sizes after the test removed the remembered input or navigated to page 1 to disable Previous. |
| 6 | Preserve TOC focus, the #9 Tab trap, Escape, arrow keys, and page turning | met | At both sizes the TOC focused its first link and returned to its opener on Escape or link selection. Tab and Shift+Tab worked in the TOC and zoom with the legacy handler forced. ArrowRight was blocked during zoom and both arrow keys turned pages after close. |
| 7 | Check 1440×900 and 390×844 with only the known analytics 404 | met | Chromium completed the standard checks at both sizes. The only console error was the local-preview 404 for `/_vercel/insights/script.js`. |
| 8 | Pass npm test, npm run build, and npm run lint | met | GitHub Actions run 44502925652 passed the test and lint jobs at the reviewed head. The test job includes npm run build. The local Vitest suite, lint, and scratch Vite build also passed. |
| 9 | Fall back to ⤢ 크게 after a hash jump or in-flight turn hides the remembered link | met | At 1440×900, all four combinations passed. A hash jump to #/p/8 and an ArrowRight turn finishing at #/p/4 both produced fallback on Escape and ✕. The hash case also passed at 390×844. |
| 10 | Restore focus to a remembered page link that stays visible | met | Both close methods restored the exact link at both sizes. |

## repair questions

1. Both routes from page 3 ended on ⤢ 크게 with either close method. The desktop in-flight-turn probe confirmed that the old link stayed connected and enabled and its page had `display: none`.
2. The body check at web/src/Viewer.tsx:244 is sufficient in the rendered viewer. The zoom close button is removed and the viewer's background inert attributes are lifted before the effect runs. With the document's body mounted, loss of focus on removal of the close button falls back to `body` when no control receives focus. A focusable remembered control becomes active and skips fallback. `activeElement` can be null in other document contexts, but there is no such context in the viewer's close path. The body check also covers the case where the remembered element and the post-close active element are both `body`. I found no reachable close path where focus settles in an inert subtree.
3. All earlier criteria held. In particular, starting with `body` focused still reached ⤢ 크게 and a visible page link still regained focus for both close methods.

## checks_run

- Confirmed the worktree and GitHub PR head are 6175eef48d21f093857c154a61d392052ed8b726. Read both fixed diffs, the previous review, and the repair report.
- Checked PR #20's GitHub status rollup and the CI workflow. The test and lint jobs passed in run 44502925652, including the TypeScript check and production build in the test job. The standalone `gh pr checks` call could not reach GitHub, and `gh pr view` returned the check results and head SHA.
- Ran `npm test -- --no-cache --configLoader runner` (21 passed), `npm run lint` (passed), and the Vite production build into scratch (passed).
- Ran `check.cjs` with Chromium and the scratch Vite preview on port 4313 (exit 0). The full results are in `browser.log`. The desktop-only in-flight probe matched the work order's viewport. The preview stopped when the script exited.

REVIEW_END
