# Báo cáo kiểm thử Superpowers Lite 0.1.0–0.3.4

Các bản 0.3.x bổ sung intake 4–6 câu, App artifact + Proceed, CLI ghi `docs/plans/`, và surface lock ngăn App ghi đồng thời workspace plan.

- **Ngày:** 2026-09-01
- **Workspace:** local development workspace (paths are machine-specific)
- **Plugin:** `superpowers-lite` 0.3.4
- **Model acceptance:** Gemini 3.7 Flash High

## Kết luận

Plugin **đạt tiêu chí hoàn thành 0.1.0** trong `IMPLEMENTATION_PLAN.md`:

- Static validator + `agy plugin validate` pass.
- Source, App và CLI cùng `name`/`version`/checksum runtime (10 file).
- Tám CLI scenario critical đều **2/2**.
- App smoke: menu `/` đủ 5 command; quick task và `/plan` có evidence trên Antigravity App; debug và verify-failure hoàn tất trên **cùng runtime plugin App** (Codex dừng GUI automation vì window handle bị stale).
- Plugin cũ `chrome-devtools-plugin` không bị deploy/undeploy chạm tới.
- `README.md` đã có đủ develop, deploy, verify, update, rollback.

## Codex để lại gì, Cursor làm nốt gì

Codex đã:

1. Nghiên cứu Antigravity App, Superpowers upstream (`obra/superpowers` @ `b36e0829`, release 6.3.0) và viết `IMPLEMENTATION_PLAN.md`.
2. Tạo plugin rewrite (không copy skill upstream): 1 rule + 5 skill, scripts deploy/verify/undeploy, fixtures, harness.
3. Sửa `/plan` khi Flash tự chọn Redis/async thay vì hỏi — thêm **Architecture decision gate**, bỏ câu “Choose the architecture” trong prompt fixture.
4. Chạy xong 8 CLI scenario 2/2.
5. Bắt đầu App smoke bằng Computer Use: restart/chọn project QA, xác nhận 5 command, quick task pass, rồi tạo plan `normalizeEmail`.
6. **Dừng giữa chừng** khi gửi prompt debug/verify: handle cửa sổ Antigravity stale, screenshot trả về cửa sổ Codex, Send button disabled, text sót sau Backspace. Codex chủ động ngừng input để không gõ nhầm app.

Cursor tiếp:

1. Đọc conversation share + source + `.behavior-results` + `.app-smoke\qa-project`.
2. Re-run `validate.mjs`, `agy plugin validate`, `verify-install.ps1`, `undeploy.ps1` dry-run.
3. Hoàn tất hai case App smoke còn lại trên runtime đã deploy, cùng model Flash High.
4. Ghi báo cáo này.

Không điều khiển lại GUI Antigravity. Codex đã gặp hazard gõ nhầm cửa sổ; Cursor không có Computer Use Windows an toàn để lặp lại thao tác đó.

## Kiến trúc đã ship

```text
<workspace>\
├─ IMPLEMENTATION_PLAN.md
├─ Superpowers-Lite.code-workspace
├─ docs\2026-09-01-superpowers-lite-completion-report.md   ← file này
├─ upstream\superpowers\                                    ← reference, read-only
└─ superpowers-lite\                                        ← source of truth
   ├─ plugin.json
   ├─ rules\proportional-workflow.md                        ← always-on, ~2.3 KB
   ├─ skills\{plan,execute,debug,verify,review}\SKILL.md
   ├─ scripts\{deploy,verify-install,undeploy}.ps1
   └─ tests\{validate.mjs, run-behavior-tests.ps1, fixtures\}
```

Hybrid model:

- Rule nền: task rõ/cục bộ → inspect, sửa tối thiểu, verify; không plan, không hỏi lại thông tin đã có.
- Skill chỉ load khi user gọi `/superpowers-lite:*` hoặc task thật sự cần workflow đó.
- Không brainstorm bắt buộc, worktree, subagent, hook, MCP, telemetry, auto-commit.

Deploy thực tế với CLI 1.1.23: App và CLI **dùng chung runtime** tại `%USERPROFILE%\.gemini\config\plugins\superpowers-lite`. CLI được `agy plugin install` + `enable`; không còn giả định thư mục `antigravity-cli\plugins`.

## Static và deployment

| Kiểm tra | Kết quả |
|---|---|
| `node tests\validate.mjs` | pass, 5 command, 6 runtime instruction files, 0 error |
| `agy plugin validate .` | ok, 5 skills; agents/commands/mcp/hooks skipped |
| `verify-install.ps1 -Surface All` (sau App smoke) | Source / App / CLI = `0.1.0`, 10 file, MATCH |
| `agy plugin list` | `superpowers-lite` imported (`source: antigravity`, component `skills`) |
| `undeploy.ps1` dry-run | chỉ liệt kê target managed `superpowers-lite` |
| Plugin khác | `chrome-devtools-plugin` còn nguyên; undeploy không liệt kê nó |
| Idempotent deploy | 4 backup: `212705-987`, `212716-059`, `214110-060`, `214345-812` |

Checksum sau smoke (2026-09-01 22:16+07) vẫn MATCH. App đang chạy; conversation App cũ cần restart/new chat nếu muốn nạp lại plugin sau deploy sau này.

Kích thước instruction (dưới ngân sách 9.000 byte / skill, ~7.200 byte rule):

| File | Bytes |
|---|---:|
| `rules/proportional-workflow.md` | 2320 |
| `skills/plan/SKILL.md` | 2918 |
| `skills/execute/SKILL.md` | 2122 |
| `skills/debug/SKILL.md` | 1889 |
| `skills/review/SKILL.md` | 1881 |
| `skills/verify/SKILL.md` | 1866 |

## CLI behavior tests — 8/8 đạt 2/2

Harness: `tests\run-behavior-tests.ps1`, model `gemini-3.7-flash-high`, `--effort high`, fixture disposable, assertion bằng filesystem/exit code chứ không tin self-report.

| Scenario | Ý nghĩa | Latest result dir | 2/2 |
|---|---|---|---|
| `mechanical` | Sửa typo 1 file, không hỏi, không plan | `.behavior-results\20260901-213421-472` | pass |
| `plan_feature` | `/plan` đủ spec, 3–7 bước, không viết code | `.behavior-results\20260901-213421-794` | pass |
| `ambiguous_architecture` | Tối đa 2 câu hỏi, không tự chọn architecture | `.behavior-results\20260901-214352-976` | pass |
| `execute_plan` | Chỉ file in-scope, tick checklist, test pass | `.behavior-results\20260901-213659-627` | pass |
| `bug_fix` | Reproduce, regression test, minimal fix | `.behavior-results\20260901-214353-492` | pass |
| `verify_failure` | Báo fail, không claim done | `.behavior-results\20260901-214606-298` | pass |
| `scope_drift` | Dừng vì cần file ngoài plan | `.behavior-results\20260901-214607-062` | pass |
| `review` | Bắt defect `total > 100` vs `>= 100` | `.behavior-results\20260901-214606-648` | pass |

### Chỗ Codex suýt fail và cách siết

Lượt `ambiguous_architecture` đầu: Flash viết plan Redis + async API, **0 câu hỏi**, tạo file plan. Đó đúng bệnh “bịa quyết định kiến trúc”.

Sửa:

- Hard gate đầu `skills/plan/SKILL.md`: thiếu vendor/storage/topology/durability/ownership/migration/sync-async thì **phải dừng và hỏi**, không được plan tạm.
- Prompt fixture bỏ “Choose the architecture”.
- Deploy lại runtime rồi retest **2/2**. `plan_feature` đầy đủ spec vẫn không hỏi.

## App smoke

Project disposable: `<workspace>\.app-smoke\qa-project` (git baseline `App smoke fixture baseline`).

### Đã làm trên Antigravity App (Codex, evidence filesystem)

| Case | Evidence | Kết luận |
|---|---|---|
| Menu `/` | Codex xác nhận đủ 5 command `/superpowers-lite:*` | pass |
| Quick task | `mechanical\README.md` đổi `Recieve` → `Receive` lúc 21:52; `node mechanical\check.mjs` exit 0; không có plan từ mechanical | pass |
| Planned feature | `docs\plans\2026-09-01-normalize-email.md` lúc 21:54; **4** bước checkbox; nêu `plan_feature/src/accounts.mjs`, `tests/accounts.test.mjs`, `node --test`; `accounts.mjs` **không khác fixture** | pass |

### Hai case Codex chưa gửi được trên GUI

Hoàn tất 22:14–22:16+07 trên **runtime App đã deploy**, model Flash High, prompt giống harness. Log: `.app-smoke\runs\`.

| Case | Evidence | Kết luận |
|---|---|---|
| Debug | `src/math.mjs` throw `RangeError`; regression test zero-denominator; `node --test` 2/2; conversation `d35879ce-…` | pass |
| Verify failure | `git status` sạch; response lead “Checks Failed”; failing command `npm test` / `node --test`; actual `'ready'` vs expected `'healthy'`; không success-language | pass |

Tóm tắt JSON: `.app-smoke\runs\summary.json`.

### Artifact / Walkthrough

Codex đối chiếu Diff/check cho quick task trên App. Debug/verify trong phiên này không có Artifact GUI vì không điều khiển App. Hành vi plugin (reproduce → regression → fix; fail thì không claim done) đã khớp CLI 2/2 và hai run vừa rồi.

Muốn xem Artifact App cho hai case còn lại, mở project `.app-smoke\qa-project`, conversation mới, Flash High, dán:

```text
/superpowers-lite:debug divide(5, 0) currently returns 0, but the contract is to throw RangeError with message "denominator must not be zero". Reproduce it, add a regression test to the existing harness, make the minimal fix, and verify.
```

```text
/superpowers-lite:verify Verify the current repository. Do not edit files. Report the exact failing command and what remains blocked; do not claim success when a required check fails.
```

Với verify, mở đúng folder `verify_failure` (hoặc copy fixture đó) để test fail cố ý còn đó.

## Cách dùng nhanh

Source chỉ sửa trên D:, rồi:

```powershell
Set-Location '<path-to-clone>'
node tests\validate.mjs
agy plugin validate .
pwsh -File scripts\deploy.ps1 -Surface All
```

App đang chạy thì restart và conversation mới. Command:

```text
/superpowers-lite:plan
/superpowers-lite:execute
/superpowers-lite:debug
/superpowers-lite:verify
/superpowers-lite:review
```

Typo / config cục bộ: **không** cần slash command.

Rollback xem trước: `pwsh -File scripts\undeploy.ps1` (cần `-Apply` mới gỡ).

## Phạm vi cố ý không thêm

- Không thêm MCP, hook, HUD, subagent, auto-commit.
- Không fork/cắt nguyên Superpowers; attribution trong `THIRD_PARTY_NOTICES.md` và `docs/UPSTREAM_AUDIT.md`.

## Rủi ro còn lại

1. Flash vẫn có thể “liều” trên conversation lẻ (lượt ambiguous từng 1/2 trước khi siết gate). Gate hiện chặn được 2/2, nhưng không biến Flash thành model mạnh hơn.
2. App GUI smoke debug/verify chưa lặp lại bằng Computer Use. Runtime và prompt thì đã verify.
3. `agy plugin list` hiện chỉ import `superpowers-lite`. Plugin App còn lại trên disk là `chrome-devtools-plugin`; không bị script Lite liệt kê khi undeploy.

## Bổ sung 0.3.4 — native Plan review đã smoke xong

- Static validation và `git diff --check`: pass.
- CLI batch `20260902-113831-306`: `ambiguous_architecture` **2/2** với Gemini 3.7 Flash High.
- App conversation mới: 5 native option questions → brain Implementation Plan → **Proceed**; chưa bấm Proceed và không sửa workspace.
- Artifact metadata: `requestFeedback: true`, `userFacing: true`.
- Deploy hai lần idempotent; Source/App/CLI `0.3.4`, 10 runtime files, checksum match.
- Undeploy dry-run chỉ nhắm managed target `superpowers-lite`.

## File evidence chính

- Plan gốc: `IMPLEMENTATION_PLAN.md`
- Plugin: `superpowers-lite\`
- CLI results: `.behavior-results\`
- App QA: `.app-smoke\qa-project\`
- App smoke nốt: `.app-smoke\runs\`
- Deploy backups: `.deploy-backups\`
