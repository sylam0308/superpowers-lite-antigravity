# Superpowers Lite for Antigravity

Lightweight, evidence-driven coding workflows for medium projects and Gemini 3.7 Flash High. The plugin keeps a short always-on rule and loads a specialized skill only when requested or clearly useful.

## Tiếng Việt

### Lite khác gì bản đầy đủ?

Yêu cầu rõ và cục bộ được làm theo luồng nhanh: đọc đúng file, sửa tối thiểu, chạy kiểm tra nhắm mục tiêu. Plugin không bắt brainstorm, viết design, tạo worktree, gọi subagent, dùng TDD, hay commit cho mọi việc. Khi task cần kỷ luật cao hơn, gọi một command riêng:

```text
/superpowers-lite:plan     Hỏi option khi còn quyết định quan trọng; sinh Plan Contract v2 + Proceed
/superpowers-lite:execute  Bấm Proceed (App) hoặc gọi lệnh này: bám bước, verify, mới báo done
/superpowers-lite:debug    Reproduce và tìm root cause trước khi sửa
/superpowers-lite:verify   Chạy kiểm tra mới và báo phần chưa verify
/superpowers-lite:review   Review diff theo acceptance criteria
```

Trên Antigravity App:

Lệnh có sẵn của App là `/plan` (artifact + Proceed, **không** hỏi option). Lệnh Lite là **`/superpowers-lite:plan`** — chọn đúng dòng này trong menu `/`.

1. Gõ `/superpowers-lite:plan` kèm yêu cầu. Agent inspect repo trước, rồi chỉ hỏi khi còn quyết định ảnh hưởng behavior/interface, data, vendor/dependency, security, compatibility hoặc scope.
2. Thay đổi kiến trúc thường có một vòng **4–6 câu option** (`ask_question` nếu App có). Không hỏi lại facts đã có và không tạo câu hỏi cho đủ số lượng. Spec thật sự đầy đủ thì ghi plan ngay.
3. App: sau native question card, chỉ ghi brain artifact `implementation_plan.md` với `RequestFeedback: true`; tuyệt đối không ghi `docs/plans/` ở lượt plan. Host sẽ hiện **Proceed** trên artifact hoặc trong chat.
4. CLI không có nút Proceed: sau khi duyệt file `docs/plans/`, gọi `/superpowers-lite:execute <path>`. Không tạo plan copy thứ hai.

Plan mới có phần Markdown dễ review và một `superpowers-lite-contract` JSON comment. Contract ánh xạ `AC-*` → `S-*` → `V-*`, khóa allow/deny scope và lệnh verify. Plan cũ vẫn execute theo legacy mode nhưng không có scope enforcement máy đọc.

Project có thể tự khai báo required checks và protected paths bằng `.agents/superpowers-lite.json`; plugin không tự tạo file này.

Ví dụ:

```text
/superpowers-lite:plan Thêm đăng nhập Google. Chỉ dùng auth stack hiện có,
không đổi schema database. Plan phải có File map, mỗi bước Files/Behavior/Check,
và lệnh test exact. Chưa viết code.
```

```text
/superpowers-lite:execute Thực thi docs/plans/2026-09-01-google-login.md.
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

Harness dùng `agy --output-format stream-json` để chấm cả tool trajectory, filesystem diff, structured outcome và test output. Mặc định tạo fixture disposable và chạy hai vòng critical scenarios bằng Gemini 3.7 Flash High:

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
3. Chọn Gemini 3.7 Flash High và gõ `/`; xác nhận đủ năm command.
4. Chạy quick task, `/superpowers-lite:plan` (4–6 option nếu thiếu spec), **Proceed** hoặc `/execute`, debug, và failed-verification theo `tests\fixtures\SCENARIOS.md`.
5. Kiểm tra Diff/Artifact/Walkthrough, sau đó chạy lại `verify-install.ps1 -Surface All`.

## English

### Operating model

A clear, localized request takes the quick path: inspect, make the smallest edit, and run a targeted check. Planning is reserved for meaningful sequencing or risk. Debugging starts from a reproduction. Completion claims require fresh evidence.

The five public commands are `/superpowers-lite:plan`, `execute`, `debug`, `verify`, and `review`. Planning inspects first and asks one option round only for unresolved material decisions. It then writes one 3–7-step Plan Contract v2: the brain `implementation_plan.md` with requested feedback on App, or one workspace `docs/plans` file on CLI, never both. Contract v2 maps acceptance, steps, scope, and verification. Click **Proceed** (App) or run `/execute` (CLI). Completion requires fresh evidence after the final mutation.

### Development and release

Clone this repository anywhere on Windows and use that clone as the sole editable source. The scripts resolve the source from their own location and do not depend on a drive letter or username. Run the custom Node validator and `agy plugin validate`, then deploy with `scripts\deploy.ps1`. Installed App and CLI copies are build outputs. See the Vietnamese sections above for exact commands; the PowerShell interfaces and output are English.

### Safety

Deployment backs up only the exact target and uses a deterministic staged build. Undeployment is dry-run by default and requires a matching managed marker. Lite never installs hooks. The opt-in Strict profile packages documented Antigravity hooks to enforce write/scope/evidence boundaries; it remains disabled unless explicitly deployed. Neither profile requests automatic commits, pushes, telemetry, MCP, or agent orchestration.

## Provenance

Superpowers Lite is an independent MIT-licensed rewrite informed by Jesse Vincent's MIT-licensed [obra/superpowers](https://github.com/obra/superpowers). See `docs/UPSTREAM_AUDIT.md` and `THIRD_PARTY_NOTICES.md`.
