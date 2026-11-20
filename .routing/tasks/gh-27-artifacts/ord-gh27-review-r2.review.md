REVIEW_BEGIN
verdict: PASS
reviewed_revision: 4d263ca3b89b756e8398b6b64319afa25cff7a8f (PR #29, base 4116ea0)
findings: []

criteria_check:

1. **Met. Zoom Tab cycle and baseline reproduction.** At 1440×900 on #/p/20, opening 크게 보기 by button and pressing Tab 12 times and Shift+Tab 12 times kept all 24 stops inside .overlay with document.hasFocus() true. The forward cycle was 축소 → 원래 크기 (지금 100%) → 확대 → ✕ 닫기 → .zoom-scroll, and Shift+Tab followed its reverse. Baseline focus reached BODY with document.hasFocus() false twice in each direction.
2. **Met. TOC Tab cycle and baseline reproduction.** Tab and Shift+Tab, 17 real presses each, visited the 15 links in order with no focus escape. The endpoints wrapped 제13장 → 표지 and 표지 → 제13장. Baseline focus reached BODY with document.hasFocus() false once in each direction.
3. **Met. Both cycles after deleting HTMLElement.prototype.inert.** All 58 presses matched the same overlay orders with document.hasFocus() true. A separate run also removed the rendered inert attributes and had the same result.
4. **Met. Five focus-return paths.** Zoom button and Escape returned to 크게 보기. With 목차 열기 focused, double-clicking the book, pressing Tab three times, and pressing Escape returned to 목차 열기. With the page-number input focused, double-clicking the book and clicking ✕ 닫기 returned to the input. TOC Escape returned to 목차 열기. Tab twice and Enter on 제3장 changed #/p/20 to #/p/45, closed the TOC, and returned focus to 목차 열기.
5. **Met. Zoom keys, PageDown, and mouse gestures.** The +, =, -, and 0 sequence gave 125%, 156%, 125%, 100% with the scroll area focused and again with the close button focused. PageDown advanced scrollTop from 0 to 171 px by the first sample above 100 px. A fresh mouse-only run double-clicked to 200%, dragged from scroll position [720, 398] to [870, 508], and showed no focus ring.
6. **Met. Visible keyboard focus indicator.** Tab from ✕ 닫기 focused .zoom-scroll. The saved screenshot shows a red outline inside the viewport. Computed style was a solid 2 px outline in rgb(192, 20, 28) with offset −2 px and :focus-visible matched. [scroll-focus.png](scroll-focus.png)
7. **Met. Browser shortcut modifiers.** On both overlays, a cancelable Ctrl+Tab keydown left defaultPrevented false and focus unchanged. Meta+Tab did the same. Alt+Tab was handled and moved focus within the overlay.
8. **Met. Post-close book navigation.** ArrowRight and ArrowLeft changed #/p/20 → #/p/22 → #/p/20. A cancelable Tab keydown was unprevented. Real Tab from 목차 열기 went to 이전 쪽 → 이동할 쪽 번호 → 다음 쪽.
9. **Met. Repository checks.** npm test passed 31 tests across two files. npm run build and npm run lint exited 0 on a scratch copy of the exact reviewed tree.

answers:

1. Both directions wrap in both overlays. From BODY and, with the underlying inert attributes removed, from a focused background input, Tab entered at 축소 or 표지 and Shift+Tab entered at .zoom-scroll or 제13장. The TOC BODY case used a real click into the list padding. The zoom BODY case used blur. Viewer.tsx:213–216 and book.ts:45–46 choose those same endpoints for any active element outside the listed candidates.
2. Viewer.tsx:209–226 replaces the keydown listener when zoomed or tocOpen changes and removes the previous one. The post-close test exercised native Tab and both arrow keys. The five close paths showed no stale trap.
3. The Escape, close button, and TOC Enter paths passed as listed in criterion 4. The hash handler and focus-return effects are unchanged at Viewer.tsx:191–207 and Viewer.tsx:237–258.
4. The mouse handlers and zoom key logic in ZoomView.tsx:56–60 and ZoomView.tsx:80–94 retain their behavior in the browser checks. In Chromium mobile emulation at 390×844 with zoomed content taller than the viewport, a tap kept scroll at [0, 0] with no focus ring. A one-finger CDP swipe moved it to [0, 179].
5. The outline is visibly inset during keyboard focus and absent in the fresh mouse-only run. The CSS at index.css:45 and index.css:98 uses the browser's :focus-visible heuristic. The PR documents a Chromium case where clicking the already keyboard-focused area keeps the outline. [Mouse-only screenshot](mouse-no-ring.png)
6. The change uses the existing, unit-tested nextTrapIndex and adds the scroll area as a focusable candidate with an inset outline. Removing any of those pieces would give up an explicit behavior in the acceptance criteria.

checks_run:

- The worktree and remote PR head both resolved to 4d263ca3b89b756e8398b6b64319afa25cff7a8f. Reviewed the full 4116ea0..4d263ca diff and the related focus, hash, pointer, CSS, and helper paths. git diff --check passed and git status remained clean.
- Read the issue body, owner triage comment and brief, and PR. GitHub lint, test, Vercel, and Vercel Preview Comments passed. [Issue #27](https://github.com/DomineYH/2026_databook/issues/27) [PR #29](https://github.com/DomineYH/2026_databook/pull/29)
- Ran npm test, npm run build, and npm run lint in an archived copy of the reviewed revision. Built the archived 4116ea0 baseline using Vite. All generated files stayed under the order's write scope.
- Drove the two Vite previews using local headless Chromium 158.0.8127.18. All 16 final browser assertions passed, including both expected baseline reproductions. Stopped both previews and verified ports 4353 and 4354 had no listener. The only browser request error was the known local-preview analytics 404. [Browser results](browser-results.json) [Review harness](review-browser.cjs)
- The sandbox denied the loopback binds, so the preview run used approved escalation. The first review harness had incorrect expectations for reverse index wrapping and the full TOC label. Its mobile fixture also had no scrollable overflow. The final run corrected these harness issues and rechecked both builds.
- Real Safari, Firefox, iPadOS, and physical touch hardware remain human checks under the work order.
REVIEW_END
