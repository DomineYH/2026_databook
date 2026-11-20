REVIEW_BEGIN
verdict: PASS
reviewed_revision: 4d263ca3b89b756e8398b6b64319afa25cff7a8f (base 4116ea0)
findings: []

criteria_check:
1. 크게 보기 Tab x12 and Shift+Tab x12 at 1440x900, including baseline red: met. Real Chromium key presses on button-opened overlay stayed inside with document.hasFocus() true, cycling scroll, 축소, 100%, 확대, 닫기 and reverse. On baseline, each direction left the document twice with BODY and hasFocus false. Evidence: tabs-after.json and tabs-base.json.
2. 목차 Tab x17 and Shift+Tab x17 including baseline red: met. Real keys stayed inside, including 제13장 → 표지 and 표지 → 제13장; baseline left document once in each direction. Same evidence files.
3. Both cycles after delete HTMLElement.prototype.inert: met. All four outCount values are zero and sequences match on changed build; tabs-after.json.
4. Five focus returns and TOC Enter navigation: met. Button/Esc → 크게 보기; TOC focused/double-click/Tab/Esc → 목차 열기; page input/double-click/close → input; TOC/Esc → TOC button; Tab/Enter on 제3장 changed #/p/20 to #/p/45, closed TOC, focused its button. rest-after.json.
5. Scroll-area and button zoom keys, PageDown, mouse pan/double-click without visible ring: met. + = - 0 yielded 125/156/125/100% on both; PageDown 0→787; double-click 200%, drag [720,398]→[870,518]. Fresh mouse-only run has no :focus-visible after double-click/drag. rest-after.json and mouse-no-ring-4348.png. Chromium may retain focus-visible if mouse follows prior keyboard focus, a native modality behavior observed in the mixed input run.
6. Focus indicator screenshot: met. scroll-focus.png visually shows the red outline at viewport edges; computed solid 2px rgb(192,20,28), offset -2px, :focus-visible true.
7. Ctrl+Tab synthetic cancelable keydown: met. defaultPrevented false and focus unchanged; same for Meta+Tab; Alt+Tab trapped. rest-after.json.
8. After close arrow keys and native Tab: met. ArrowRight then ArrowLeft changed #/p/20 → #/p/22 → #/p/20; synthetic Tab not prevented, real Tab from TOC button went 이전 쪽 → 이동할 쪽 번호 → 다음 쪽. rest-after.json and mouse.js output.
9. npm test, build, lint: met. 31 tests across two files passed; build and lint exited 0. PR CI lint, test, Vercel and Vercel Preview Comments passed.

answers:
1. Both cycles wrap in either direction; from BODY, Tab/Shift+Tab enters first/last respectively: zoom 축소/scroll and TOC 표지/제13장 (edge.json). An element outside the list has index -1 and follows the same helper branch (book.ts:45-46).
2. Viewer.tsx:209-225 registers the handler with current zoomed/tocOpen dependencies and cleans up the old listener. When both are closed the Tab branch does not execute; confirmed after close. No stale trap found.
3. All five focus-return paths and TOC Enter navigation passed; relevant focus effects and hash handler are unchanged.
4. Pointer drag and double-click passed in Chromium; keyboard zoom works on both stops. Mobile emulation: tapping scroll area caused no visible focus ring and no scroll-position jump; touch handler remains native for non-mouse pointers. A swipe at 100% on the fitted mobile page had no scrollable distance, so this did not establish actual phone touch scrolling. Physical phone, Safari/iPadOS and Firefox are not tested, as designated human follow-up.
5. Keyboard focus outline is visible inside viewport (screenshot and computed style). Fresh mouse-only interaction shows no ring; after keyboard focus Chromium can retain :focus-visible on a subsequent click.
6. Change reuses existing nextTrapIndex, with one focusable scroll stop and one CSS offset; no simpler alternative identified that also meets the specified keyboard scrolling and browser behavior.

checks_run:
- git diff 4116ea0..4d263ca; reviewed affected files, helper and surrounding focus/gesture logic; HEAD confirmed 4d263ca and git status clean.
- gh issue view 27 --comments; gh pr view 29 and gh pr checks 29.
- cd web && npm test && npm run build; cd web && npm run lint: pass.
- Built current and archived baseline using Vite to review scratch; preview ports 4348/4349; tabs.js on both, rest.js, mouse.js, edge.js against current using headless Chromium. Saved evidence and screenshot in review scratch. Preview servers stopped.
- Initial sandboxed Chromium and preview attempts were denied by sandbox; reran with approved escalation successfully. The first escalated browser run preceded server startup and got connection refused; subsequent runs succeeded.
- Not run: real Safari, iPadOS, Firefox or physical touch hardware; touch swipe under actual overflow was not established in emulation.
REVIEW_END
