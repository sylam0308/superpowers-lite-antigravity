# Superpowers Lite for Antigravity

Lightweight, evidence-driven coding workflows for medium projects and Gemini 3.7 Flash High. The plugin keeps a short always-on rule and loads a specialized skill only when requested or clearly useful.

Gemini 3.8 Flash High is the current release-candidate acceptance target. Its CLI matrix and Lite App intake/Proceed smoke have passed; the full release gate is tracked in [the verification report](docs/reports/2026-09-03-command-separation-gemini-3.8.md). This is not yet a new stable-model recommendation.

## Tiếng Việt

### Lite khác gì bản đầy đủ?

Yêu cầu rõ và cục bộ được làm theo luồng nhanh: đọc đúng file, sửa tối thiểu, chạy kiểm tra nhắm mục tiêu. Plugin không bắt brainstorm, viết design, tạo worktree, gọi subagent, dùng TDD, hay commit cho mọi việc. Khi task cần kỷ luật cao hơn, gọi một command riêng:

```text
/spl-plan     Luôn hỏi 4–6 option trước; sinh Plan Contract v2 + Proceed
/spl-execute  Bấm Proceed (App) hoặc gọi lệnh này: bám bước, verify, mới báo done
/spl-debug    Reproduce và tìm root cause trước khi sửa
/spl-verify   Chạy kiểm tra mới và báo phần chưa verify
/spl-review   Review diff theo acceptance criteria
```

Trên Antigravity App:

Lệnh `/plan` thuộc Antigravity và không bị plugin thay thế. Lệnh Lite là **`/spl-plan`**; năm skill dùng prefix `spl-` để không trùng command hệ thống.

1. Gõ `/spl-plan` kèm yêu cầu. Agent inspect repo trước rồi luôn hỏi một vòng **4–6 câu option**, kể cả task nhỏ hoặc đã mô tả đầy đủ.
2. Câu hỏi khóa behavior, scope, invariants và verification; task kiến trúc có thêm tối đa hai câu. Nếu answers còn mâu thuẫn, agent chỉ hỏi tiếp 1–2 blocker questions.
3. App: sau native question card, chỉ ghi brain artifact `implementation_plan.md` với `RequestFeedback: true`; tuyệt đối không ghi `docs/plans/` ở lượt plan. Host sẽ hiện **Proceed** trên artifact hoặc trong chat.
4. CLI không có nút Proceed: sau khi duyệt file `docs/plans/`, gọi `/spl-execute <path>`. Không tạo plan copy thứ hai.

Plan mới có phần Markdown dễ review và một `superpowers-lite-contract` JSON comment. Contract ánh xạ `AC-*` → `S-*` → `V-*`, khóa allow/deny scope và lệnh verify. Plan cũ vẫn execute theo legacy mode nhưng không có scope enforcement máy đọc.

Project có thể tự khai báo required checks và protected paths bằng `.agents/superpowers-lite.json`; plugin không tự tạo file này.

Ví dụ:

```text
/spl-plan Thêm đăng nhập Google. Chỉ dùng auth stack hiện có,
không đổi schema database. Plan phải có File map, mỗi bước Files/Behavior/Check,
và lệnh test exact. Chưa viết code.
```

```text
/spl-execute Thực thi docs/plans/2026-09-01-google-login.md.
Làm đúng thứ tự bước, chỉ tick khi check của bước đó pass.
Dừng nếu cần sửa file ngoài Scope > In. Không báo done khi còn checkbox mở
hoặc verification fail.
```

Quick task không cần command:

```text
Sửa typo "Recieve" thành "Receive" trong trang settings và chạy test liên quan.
```

### Phát triển bằng Cursor

Yêu cầu: Windows, PowerShell 7, Node.js 20+, Antigravity App và `agy` CLI. Clone repo rồi mở chính thư mục repo bằng Cursor:

Kiểm tra source:

```powershell
git clone https://github.com/sylam0308/superpowers-lite-antigravity.git
Set-Location '.\superpowers-lite-antigravity'
node tests\validate.mjs
agy plugin validate .
pwsh -File scripts\verify-install.ps1 -Surface Source
```

Thư mục clone là source of truth. Script tự xác định source theo vị trí của chính nó, không phụ thuộc ký tự ổ đĩa hay username. Không sửa bản đã cài trong `%USERPROFILE%\.gemini\config\plugins` trực tiếp.

### Deploy và cập nhật

App và CLI giữ session/state riêng. Vì vị trí runtime có thể đổi theo phiên bản `agy`, script không hard-code shared profile: nó ghi CLI version, đọc registration source từ `agy plugin list`, rồi checksum đúng runtime App hoặc CLI thực tế. Không sửa bản cài trực tiếp; deploy source đã validate:

```powershell
pwsh -File scripts\deploy.ps1 -Surface All
```

Mặc định là profile `Lite`, không hook. Với task rủi ro cao có thể bật Strict; cần restart App và conversation mới sau khi đổi profile:

```powershell
pwsh -File scripts\deploy.ps1 -Surface All -Profile Strict
pwsh -File scripts\verify-install.ps1 -Surface All -Profile Strict
```

Strict **deny** write ngoài Contract v2, force-ask protected path / dependency / destructive / commit / push, và ép verification mới sau lần sửa cuối. Xem `docs/STRICT_PROFILE.md`.

Có thể dùng `-Surface App` hoặc `-Surface Cli`. Script tạo checksum, backup target chính xác, staged-copy cho App, cài/enable CLI, rồi so sánh build. Nếu App đang chạy, hãy restart App và mở conversation mới trước khi smoke test.

Sau khi sửa plugin, chạy lại cùng lệnh deploy. Không dùng junction/live link.

### Verify bản cài

```powershell
pwsh -File scripts\verify-install.ps1 -Surface All
agy plugin list
```

`verify-install.ps1` so sánh plugin ID, version, file runtime, SHA-256, CLI import registration, và trạng thái enable. Bản runtime chung có managed marker; file checksum sinh ra không được tính vào checksum của chính nó.

### Behavior tests

Harness dùng `agy --output-format stream-json` để chấm cả tool trajectory, filesystem diff, structured outcome và test output. Mặc định tạo fixture disposable và chạy hai vòng critical scenarios bằng Gemini 3.8 Flash High:

```powershell
pwsh -File tests\run-behavior-tests.ps1
pwsh -File tests\run-behavior-tests.ps1 -Suite All -Runs 2
```

Dùng `-DryRun` để chỉ dựng case/prompt và kiểm tra harness, hoặc `-Runs 1` cho vòng thử nhanh. Kết quả được ghi ngoài source fixture trong thư mục tạm và tóm tắt thành JSON/Markdown.

### Rollback / gỡ

Xem trước, không thay đổi gì:

```powershell
pwsh -File scripts\undeploy.ps1
```

Áp dụng:

```powershell
pwsh -File scripts\undeploy.ps1 -Apply
```

Script chỉ thao tác target có marker đúng `superpowers-lite`. CLI được uninstall bằng `agy`; App được khôi phục từ backup gần nhất nếu có, nếu không chỉ xóa bản Lite do script quản lý. Các plugin khác không nằm trong target và không bị chạm tới.

### App smoke test

1. Deploy `All`, restart Antigravity App, và tạo conversation mới.
2. Mở một bản copy disposable của `tests\fixtures\qa-project`.
3. Chọn Gemini 3.8 Flash High và gõ `/`; xác nhận đủ năm command.
4. Chạy quick task, `/spl-plan` (luôn 4–6 option), **Proceed** hoặc `/spl-execute`, debug, và failed-verification theo `tests\fixtures\SCENARIOS.md`.
5. Kiểm tra Diff/Artifact/Walkthrough, sau đó chạy lại `verify-install.ps1 -Surface All`.

## English

### Operating model

A clear, localized request takes the quick path: inspect, make the smallest edit, and run a targeted check. Planning is reserved for meaningful sequencing or risk. Debugging starts from a reproduction. Completion claims require fresh evidence.

The five public commands are `/spl-plan`, `/spl-execute`, `/spl-debug`, `/spl-verify`, and `/spl-review`. Native `/plan` remains host-owned. Lite planning inspects first and always asks one 4–6 option round before writing a 3–7-step Plan Contract v2: the brain `implementation_plan.md` with requested feedback on App, or one workspace `docs/plans` file on CLI, never both. Click **Proceed** (App) or run `/spl-execute` (CLI). Completion requires fresh evidence after the final mutation.

### Development and release

Clone this repository anywhere on Windows and use that clone as the sole editable source. The scripts resolve the source from their own location and do not depend on a drive letter or username. Run the custom Node validator and `agy plugin validate`, then deploy with `scripts\deploy.ps1`. Installed App and CLI copies are build outputs. See the Vietnamese sections above for exact commands; the PowerShell interfaces and output are English.

### Safety

Deployment backs up only the exact target and uses a deterministic staged build. Undeployment is dry-run by default and requires a matching managed marker. Lite never installs hooks. The opt-in Strict profile packages documented Antigravity hooks to enforce write/scope/evidence boundaries; it remains disabled unless explicitly deployed. Neither profile requests automatic commits, pushes, telemetry, MCP, or agent orchestration.

## Provenance

Superpowers Lite is an independent MIT-licensed rewrite informed by Jesse Vincent's MIT-licensed [obra/superpowers](https://github.com/obra/superpowers). See `docs/UPSTREAM_AUDIT.md` and `THIRD_PARTY_NOTICES.md`.
