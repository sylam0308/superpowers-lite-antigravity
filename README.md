# Superpowers Lite for Antigravity

Lightweight, evidence-driven coding workflows for medium projects and Gemini 3.7 Flash High. The plugin keeps a short always-on rule and loads a specialized skill only when requested or clearly useful.

## Tiếng Việt

### Lite khác gì bản đầy đủ?

Yêu cầu rõ và cục bộ được làm theo luồng nhanh: đọc đúng file, sửa tối thiểu, chạy kiểm tra nhắm mục tiêu. Plugin không bắt brainstorm, viết design, tạo worktree, gọi subagent, dùng TDD, hay commit cho mọi việc. Khi task cần kỷ luật cao hơn, gọi một command riêng:

```text
/superpowers-lite:plan     Lập plan sau khi đọc repo, không viết code
/superpowers-lite:execute  Thực thi plan đã duyệt theo batch nhỏ
/superpowers-lite:debug    Reproduce và tìm root cause trước khi sửa
/superpowers-lite:verify   Chạy kiểm tra mới và báo phần chưa verify
/superpowers-lite:review   Review diff theo acceptance criteria
```

Ví dụ:

```text
/superpowers-lite:plan Thêm đăng nhập Google. Chỉ dùng auth stack hiện có,
không đổi schema database. Plan phải nêu file và lệnh test, chưa viết code.
```

```text
/superpowers-lite:execute Thực thi docs/plans/2026-09-01-google-login.md.
Dừng nếu cần sửa file ngoài Scope > In.
```

Quick task không cần command:

```text
Sửa typo "Recieve" thành "Receive" trong trang settings và chạy test liên quan.
```

### Phát triển bằng Cursor

Mở `D:\Antigravity Plugin\Superpowers-Lite.code-workspace`. Chỉ sửa root `superpowers-lite (source of truth)`. Root upstream là tham khảo; không deploy và không chỉnh sửa nó.

Kiểm tra source:

```powershell
Set-Location 'D:\Antigravity Plugin\superpowers-lite'
node tests\validate.mjs
agy plugin validate .
pwsh -File scripts\verify-install.ps1 -Surface Source
```

### Deploy và cập nhật

App và CLI giữ session/state riêng, nhưng với CLI 1.1.23, plugin runtime được import từ kho App tại `%USERPROFILE%\.gemini\config\plugins`. Script vẫn thực hiện hai bước riêng: staged-copy runtime và đăng ký/enable bằng `agy`. Không sửa bản cài trực tiếp; deploy source đã validate:

```powershell
pwsh -File scripts\deploy.ps1 -Surface All
```

Có thể dùng `-Surface App` hoặc `-Surface Cli`. Script tạo checksum, backup target chính xác, staged-copy cho App, cài/enable CLI, rồi so sánh build. Nếu App đang chạy, hãy restart App và mở conversation mới trước khi smoke test.

Sau khi sửa plugin, chạy lại cùng lệnh deploy. Không dùng junction/live link.

### Verify bản cài

```powershell
pwsh -File scripts\verify-install.ps1 -Surface All
agy plugin list
```

`verify-install.ps1` so sánh plugin ID, version, file runtime, SHA-256, CLI import registration, và trạng thái enable. Bản runtime chung có managed marker; file checksum sinh ra không được tính vào checksum của chính nó.

### Behavior tests

Mặc định script tạo bản sao disposable của fixtures và chạy hai vòng cho tám scenario bằng Gemini 3.7 Flash High:

```powershell
pwsh -File tests\run-behavior-tests.ps1
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
4. Chạy quick task, plan, debug, và failed-verification case theo `tests\fixtures\SCENARIOS.md`.
5. Kiểm tra Diff/Artifact/Walkthrough, sau đó chạy lại `verify-install.ps1 -Surface All`.

## English

### Operating model

A clear, localized request takes the quick path: inspect, make the smallest edit, and run a targeted check. Planning is reserved for meaningful sequencing or risk. Debugging starts from a reproduction. Completion claims require fresh evidence.

The five public commands are `/superpowers-lite:plan`, `execute`, `debug`, `verify`, and `review`. Skills do not automatically chain into one another and do not load the entire library.

### Development and release

Use `D:\Antigravity Plugin\superpowers-lite` as the sole editable source. Run the custom Node validator and `agy plugin validate`, then deploy with `scripts\deploy.ps1`. Installed App and CLI copies are build outputs. See the Vietnamese sections above for exact commands; the PowerShell interfaces and output are English.

### Safety

Deployment backs up only the exact Lite target and uses a staged App copy. Undeployment is dry-run by default and requires a matching managed marker. The plugin never requests automatic commits, pushes, dependency installation, destructive operations, hooks, telemetry, or agent orchestration.

## Provenance

Superpowers Lite is an independent MIT-licensed rewrite informed by Jesse Vincent's MIT-licensed [obra/superpowers](https://github.com/obra/superpowers). See `docs/UPSTREAM_AUDIT.md` and `THIRD_PARTY_NOTICES.md`.
