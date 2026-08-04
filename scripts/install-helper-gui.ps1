Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $Root "web"
$WorkerDir = Join-Path $Root "worker"
$TemplatesDir = Join-Path $Root "templates"
$TextPath = Join-Path $PSScriptRoot "install-helper-ko.json"
$T = Get-Content -LiteralPath $TextPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Txt($key) {
  return [string]$T.$key
}

function Write-Utf8($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Csv($value) {
  $text = [string]$value
  if ($text.Contains('"')) { $text = $text.Replace('"', '""') }
  if ($text.Contains(',') -or $text.Contains('"') -or $text.Contains("`n") -or $text.Contains("`r")) {
    return '"' + $text + '"'
  }
  return $text
}

function Update-WranglerToml($path, $workerName, $projectId) {
  $content = Get-Content -LiteralPath $path -Raw
  $content = $content -replace 'name\s*=\s*"[^"]+"', "name = `"$workerName`""
  $content = $content -replace 'FIREBASE_PROJECT_ID\s*=\s*"[^"]+"', "FIREBASE_PROJECT_ID = `"$projectId`""
  Write-Utf8 $path $content
}

function Write-InitialCsvFiles($groupNames) {
  $groupLines = @("key,name,overseerName,assistantName,active,sortOrder")
  for ($i = 0; $i -lt $groupNames.Count; $i++) {
    $key = "group$($i + 1)"
    $groupLines += "$key,$(Csv $groupNames[$i]),,,true,$($i + 1)"
  }
  Write-Utf8 (Join-Path $TemplatesDir "groups.csv") ($groupLines -join "`r`n")
  Write-Utf8 (Join-Path $TemplatesDir "members.csv") "groupKey,seq,name,displayName,gender,role,regularPioneer,active,note`r`n"
}

function Run-ProcessLog($fileName, $arguments, $workingDir, $logBox) {
  $logBox.AppendText("`r`n> $fileName $arguments`r`n")
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $fileName
  $psi.Arguments = $arguments
  $psi.WorkingDirectory = $workingDir
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($out) { $logBox.AppendText($out + "`r`n") }
  if ($err) { $logBox.AppendText($err + "`r`n") }
  if ($p.ExitCode -ne 0) { throw "$fileName failed with exit code $($p.ExitCode)." }
}

function Add-Tab($tabs, $name) {
  $tab = New-Object System.Windows.Forms.TabPage
  $tab.Text = $name
  $tab.BackColor = [System.Drawing.Color]::White
  [void]$tabs.TabPages.Add($tab)
  return $tab
}

function Add-Label($parent, $text, $x, $y, $w = 230) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.Location = New-Object System.Drawing.Point($x, $y)
  $label.Size = New-Object System.Drawing.Size($w, 24)
  $parent.Controls.Add($label)
  return $label
}

function Add-Text($parent, $x, $y, $w = 420, $default = "") {
  $tb = New-Object System.Windows.Forms.TextBox
  $tb.Location = New-Object System.Drawing.Point($x, $y)
  $tb.Size = New-Object System.Drawing.Size($w, 28)
  $tb.Text = $default
  $parent.Controls.Add($tb)
  return $tb
}

function Add-Help($parent, $text, $x, $y, $w = 760) {
  $help = New-Object System.Windows.Forms.Label
  $help.Text = $text
  $help.ForeColor = [System.Drawing.Color]::FromArgb(95, 111, 128)
  $help.Location = New-Object System.Drawing.Point($x, $y)
  $help.Size = New-Object System.Drawing.Size($w, 46)
  $parent.Controls.Add($help)
  return $help
}

$form = New-Object System.Windows.Forms.Form
$form.Text = Txt "window_title"
$form.Size = New-Object System.Drawing.Size(940, 720)
$form.StartPosition = "CenterScreen"
$form.Font = New-Object System.Drawing.Font("Malgun Gothic", 10)
$form.BackColor = [System.Drawing.Color]::FromArgb(246, 248, 251)

$title = New-Object System.Windows.Forms.Label
$title.Text = Txt "main_title"
$title.Font = New-Object System.Drawing.Font("Malgun Gothic", 18, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(28, 22)
$title.Size = New-Object System.Drawing.Size(760, 36)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = Txt "subtitle"
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(82, 96, 110)
$subtitle.Location = New-Object System.Drawing.Point(31, 60)
$subtitle.Size = New-Object System.Drawing.Size(840, 32)
$form.Controls.Add($subtitle)

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Location = New-Object System.Drawing.Point(28, 102)
$tabs.Size = New-Object System.Drawing.Size(872, 500)
$form.Controls.Add($tabs)

$tabBasic = Add-Tab $tabs (Txt "tab_basic")
Add-Help $tabBasic (Txt "basic_help") 24 22
Add-Label $tabBasic (Txt "cong_name") 30 88
$txtCong = Add-Text $tabBasic 260 86 430 (Txt "sample_cong")
Add-Label $tabBasic "Firebase Project ID" 30 134
$txtProject = Add-Text $tabBasic 260 132 430
Add-Label $tabBasic (Txt "service_json") 30 180
$txtService = Add-Text $tabBasic 260 178 430
$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = Txt "browse"
$btnBrowse.Location = New-Object System.Drawing.Point(704, 177)
$btnBrowse.Size = New-Object System.Drawing.Size(76, 30)
$tabBasic.Controls.Add($btnBrowse)
$btnBrowse.Add_Click({
  $dlg = New-Object System.Windows.Forms.OpenFileDialog
  $dlg.Filter = "JSON files (*.json)|*.json|All files (*.*)|*.*"
  if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $txtService.Text = $dlg.FileName }
})

$tabGroups = Add-Tab $tabs (Txt "tab_groups")
Add-Help $tabGroups (Txt "groups_help") 24 22
Add-Label $tabGroups (Txt "group_count") 30 88
$numGroups = New-Object System.Windows.Forms.NumericUpDown
$numGroups.Minimum = 3
$numGroups.Maximum = 30
$numGroups.Value = 5
$numGroups.Location = New-Object System.Drawing.Point(260, 86)
$numGroups.Size = New-Object System.Drawing.Size(90, 28)
$tabGroups.Controls.Add($numGroups)
$groupPanel = New-Object System.Windows.Forms.FlowLayoutPanel
$groupPanel.Location = New-Object System.Drawing.Point(30, 132)
$groupPanel.Size = New-Object System.Drawing.Size(780, 312)
$groupPanel.AutoScroll = $true
$groupPanel.FlowDirection = "TopDown"
$groupPanel.WrapContents = $false
$tabGroups.Controls.Add($groupPanel)
$groupBoxes = New-Object System.Collections.Generic.List[System.Windows.Forms.TextBox]

function Render-GroupBoxes {
  $groupPanel.Controls.Clear()
  $groupBoxes.Clear()
  for ($i = 1; $i -le [int]$numGroups.Value; $i++) {
    $row = New-Object System.Windows.Forms.Panel
    $row.Size = New-Object System.Drawing.Size(720, 38)
    $l = New-Object System.Windows.Forms.Label
    $l.Text = "$i"
    $l.Location = New-Object System.Drawing.Point(0, 7)
    $l.Size = New-Object System.Drawing.Size(50, 24)
    $row.Controls.Add($l)
    $t = New-Object System.Windows.Forms.TextBox
    $t.Location = New-Object System.Drawing.Point(70, 4)
    $t.Size = New-Object System.Drawing.Size(360, 28)
    $t.Text = "$i"
    $row.Controls.Add($t)
    $groupBoxes.Add($t)
    $groupPanel.Controls.Add($row)
  }
}
$numGroups.Add_ValueChanged({ Render-GroupBoxes })
Render-GroupBoxes

$tabFirebase = Add-Tab $tabs (Txt "tab_firebase")
Add-Help $tabFirebase (Txt "firebase_help") 24 22
Add-Label $tabFirebase "apiKey" 30 88
$txtApi = Add-Text $tabFirebase 260 86 500
Add-Label $tabFirebase "authDomain" 30 134
$txtAuth = Add-Text $tabFirebase 260 132 500
Add-Label $tabFirebase "storageBucket" 30 180
$txtBucket = Add-Text $tabFirebase 260 178 500
Add-Label $tabFirebase "messagingSenderId" 30 226
$txtSender = Add-Text $tabFirebase 260 224 500
Add-Label $tabFirebase "appId" 30 272
$txtApp = Add-Text $tabFirebase 260 270 500

$tabCloud = Add-Tab $tabs (Txt "tab_cloudflare")
Add-Help $tabCloud (Txt "cloudflare_help") 24 22
Add-Label $tabCloud (Txt "worker_name") 30 88
$txtWorker = Add-Text $tabCloud 260 86 430 "congregation-fsg-kit-api"
Add-Label $tabCloud (Txt "pages_name") 30 134
$txtPages = Add-Text $tabCloud 260 132 430 "congregation-field-service-group-kit"
Add-Label $tabCloud "Worker URL" 30 180
$txtWorkerUrl = Add-Text $tabCloud 260 178 500 "https://congregation-fsg-kit-api.YOUR_SUBDOMAIN.workers.dev"

$tabRun = Add-Tab $tabs (Txt "tab_run")
Add-Help $tabRun (Txt "run_help") 24 18
$chkDeps = New-Object System.Windows.Forms.CheckBox
$chkDeps.Text = Txt "install_deps"
$chkDeps.Checked = $true
$chkDeps.Location = New-Object System.Drawing.Point(32, 72)
$chkDeps.Size = New-Object System.Drawing.Size(220, 26)
$tabRun.Controls.Add($chkDeps)
$chkData = New-Object System.Windows.Forms.CheckBox
$chkData.Text = Txt "import_data"
$chkData.Checked = $true
$chkData.Location = New-Object System.Drawing.Point(260, 72)
$chkData.Size = New-Object System.Drawing.Size(220, 26)
$tabRun.Controls.Add($chkData)
$chkDeploy = New-Object System.Windows.Forms.CheckBox
$chkDeploy.Text = Txt "run_deploy"
$chkDeploy.Checked = $false
$chkDeploy.Location = New-Object System.Drawing.Point(488, 72)
$chkDeploy.Size = New-Object System.Drawing.Size(220, 26)
$tabRun.Controls.Add($chkDeploy)
$log = New-Object System.Windows.Forms.TextBox
$log.Multiline = $true
$log.ScrollBars = "Vertical"
$log.Location = New-Object System.Drawing.Point(32, 118)
$log.Size = New-Object System.Drawing.Size(790, 320)
$log.ReadOnly = $true
$tabRun.Controls.Add($log)

$btnBack = New-Object System.Windows.Forms.Button
$btnBack.Text = Txt "back"
$btnBack.Location = New-Object System.Drawing.Point(562, 622)
$btnBack.Size = New-Object System.Drawing.Size(94, 34)
$form.Controls.Add($btnBack)
$btnNext = New-Object System.Windows.Forms.Button
$btnNext.Text = Txt "next"
$btnNext.Location = New-Object System.Drawing.Point(666, 622)
$btnNext.Size = New-Object System.Drawing.Size(94, 34)
$form.Controls.Add($btnNext)
$btnPrepare = New-Object System.Windows.Forms.Button
$btnPrepare.Text = Txt "prepare"
$btnPrepare.Location = New-Object System.Drawing.Point(770, 622)
$btnPrepare.Size = New-Object System.Drawing.Size(130, 34)
$form.Controls.Add($btnPrepare)

$btnBack.Add_Click({ if ($tabs.SelectedIndex -gt 0) { $tabs.SelectedIndex-- } })
$btnNext.Add_Click({ if ($tabs.SelectedIndex -lt ($tabs.TabPages.Count - 1)) { $tabs.SelectedIndex++ } })

function Validate-Inputs {
  if ([string]::IsNullOrWhiteSpace($txtProject.Text)) { throw (Txt "err_project") }
  if ([string]::IsNullOrWhiteSpace($txtService.Text) -or -not (Test-Path -LiteralPath $txtService.Text)) { throw (Txt "err_service") }
  if ([string]::IsNullOrWhiteSpace($txtApi.Text)) { throw (Txt "err_api") }
  if ([string]::IsNullOrWhiteSpace($txtApp.Text)) { throw (Txt "err_app") }
}

$btnPrepare.Add_Click({
  try {
    Validate-Inputs
    $btnPrepare.Enabled = $false
    $log.AppendText("Preparing files...`r`n")
    $groupNames = New-Object System.Collections.Generic.List[string]
    foreach ($tb in $groupBoxes) { $groupNames.Add($tb.Text.Trim()) }
    Write-InitialCsvFiles $groupNames
    $envText = @"
VITE_FIREBASE_API_KEY=$($txtApi.Text.Trim())
VITE_FIREBASE_AUTH_DOMAIN=$($txtAuth.Text.Trim())
VITE_FIREBASE_PROJECT_ID=$($txtProject.Text.Trim())
VITE_FIREBASE_STORAGE_BUCKET=$($txtBucket.Text.Trim())
VITE_FIREBASE_MESSAGING_SENDER_ID=$($txtSender.Text.Trim())
VITE_FIREBASE_APP_ID=$($txtApp.Text.Trim())
VITE_WORKER_URL=$($txtWorkerUrl.Text.Trim())
"@
    Write-Utf8 (Join-Path $WebDir ".env") $envText
    Update-WranglerToml (Join-Path $WorkerDir "wrangler.toml") $txtWorker.Text.Trim() $txtProject.Text.Trim()
    $log.AppendText("Created web/.env, templates/groups.csv, templates/members.csv, and worker/wrangler.toml.`r`n")

    if ($chkDeps.Checked) {
      Run-ProcessLog "npm.cmd" "install" $WebDir $log
      Run-ProcessLog "npm.cmd" "install" $WorkerDir $log
    }
    if ($chkData.Checked) {
      $env:GOOGLE_APPLICATION_CREDENTIALS = $txtService.Text.Trim()
      $env:FIREBASE_PROJECT_ID = $txtProject.Text.Trim()
      $env:CONG_NAME = $txtCong.Text.Trim()
      Run-ProcessLog "node.exe" "scripts/setup-from-csv.mjs" $Root $log
    }
    if ($chkDeploy.Checked) {
      Run-ProcessLog "npx.cmd" "firebase-tools deploy --only firestore:rules,firestore:indexes --project $($txtProject.Text.Trim())" $Root $log
      Run-ProcessLog "npx.cmd" "wrangler deploy" $WorkerDir $log
      Run-ProcessLog "npm.cmd" "run build" $WebDir $log
      Run-ProcessLog "npx.cmd" "wrangler pages deploy dist --project-name $($txtPages.Text.Trim()) --branch main" $WebDir $log
    }
    $log.AppendText("Done.`r`n")
    [System.Windows.Forms.MessageBox]::Show((Txt "done_message"), (Txt "dialog_title"))
  } catch {
    $log.AppendText("ERROR: $($_.Exception.Message)`r`n")
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, (Txt "error_title"))
  } finally {
    $btnPrepare.Enabled = $true
  }
})

[void]$form.ShowDialog()
