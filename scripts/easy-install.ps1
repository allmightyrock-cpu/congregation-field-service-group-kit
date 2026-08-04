param(
  [switch]$SkipDependencyInstall,
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $Root "web"
$WorkerDir = Join-Path $Root "worker"

function Write-Step($text) {
  Write-Host ""
  Write-Host "== $text ==" -ForegroundColor Cyan
}

function Ask($label, $default = "", [bool]$required = $true) {
  if ($default) {
    $value = Read-Host "$label [$default]"
    if ([string]::IsNullOrWhiteSpace($value)) { $value = $default }
  } else {
    $value = Read-Host $label
  }
  if ($required -and [string]::IsNullOrWhiteSpace($value)) {
    throw "A value is required for '$label'."
  }
  return $value.Trim()
}

function Ask-YesNo($label, [bool]$defaultYes = $true) {
  $default = if ($defaultYes) { "Y" } else { "N" }
  $answer = Read-Host "$label (Y/N) [$default]"
  if ([string]::IsNullOrWhiteSpace($answer)) { return $defaultYes }
  return $answer.Trim().ToLower().StartsWith("y")
}

function Need-Command($name, $installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name was not found. $installHint"
  }
}

function Write-TextFile($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Update-WranglerToml($path, $workerName, $projectId) {
  $content = Get-Content -LiteralPath $path -Raw
  $content = $content -replace 'name\s*=\s*"[^"]+"', "name = `"$workerName`""
  $content = $content -replace 'FIREBASE_PROJECT_ID\s*=\s*"[^"]+"', "FIREBASE_PROJECT_ID = `"$projectId`""
  Write-TextFile $path $content
}

function Run-Step($label, $scriptBlock) {
  Write-Step $label
  & $scriptBlock
}

Write-Host "Congregation Field Service Group Kit - Easy Install Wizard" -ForegroundColor Green
Write-Host "You may need to approve Firebase and Cloudflare login screens during setup."

Run-Step "Checking required tools" {
  Need-Command "node" "Install Node.js 20 or newer from https://nodejs.org."
  Need-Command "npm" "Install Node.js first."
  Need-Command "npx" "Install Node.js first."
}

Write-Step "Congregation and project settings"
$congName = Ask "Congregation name" "Sample Congregation"
$firebaseProjectId = Ask "Firebase Project ID"
$serviceAccountPath = Ask "Full path to Firebase service account JSON"
if (-not (Test-Path -LiteralPath $serviceAccountPath)) {
  throw "Service account JSON file was not found: $serviceAccountPath"
}
$workerName = Ask "Cloudflare Worker name" "congregation-fsg-kit-api"
$pagesProjectName = Ask "Cloudflare Pages project name" "congregation-field-service-group-kit"

Write-Step "Firebase web app settings"
$apiKey = Ask "VITE_FIREBASE_API_KEY"
$authDomain = Ask "VITE_FIREBASE_AUTH_DOMAIN" "$firebaseProjectId.firebaseapp.com"
$storageBucket = Ask "VITE_FIREBASE_STORAGE_BUCKET" "$firebaseProjectId.appspot.com"
$messagingSenderId = Ask "VITE_FIREBASE_MESSAGING_SENDER_ID"
$appId = Ask "VITE_FIREBASE_APP_ID"
$workerUrl = Ask "VITE_WORKER_URL" "https://$workerName.YOUR_SUBDOMAIN.workers.dev"

Run-Step "Creating web/.env" {
  $envContent = @"
VITE_FIREBASE_API_KEY=$apiKey
VITE_FIREBASE_AUTH_DOMAIN=$authDomain
VITE_FIREBASE_PROJECT_ID=$firebaseProjectId
VITE_FIREBASE_STORAGE_BUCKET=$storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=$messagingSenderId
VITE_FIREBASE_APP_ID=$appId
VITE_WORKER_URL=$workerUrl
"@
  Write-TextFile (Join-Path $WebDir ".env") $envContent
}

Run-Step "Updating worker/wrangler.toml" {
  Update-WranglerToml (Join-Path $WorkerDir "wrangler.toml") $workerName $firebaseProjectId
}

Write-Step "Initial CSV check"
Write-Host "Before continuing, edit these files with the real congregation data:"
Write-Host "- templates/groups.csv"
Write-Host "- templates/members.csv"
Write-Host "- templates/roles.csv"
Write-Host "- templates/notices.csv"
if (Ask-YesNo "Do you want to pause now and edit CSV files?" $true) {
  Write-Host "Edit the CSV files, then return to this window and press Enter."
  Read-Host "Continue"
}

if (-not $SkipDependencyInstall) {
  Run-Step "Installing web dependencies" {
    Push-Location $WebDir
    try { npm install } finally { Pop-Location }
  }
  Run-Step "Installing Worker dependencies" {
    Push-Location $WorkerDir
    try { npm install } finally { Pop-Location }
  }
}

Run-Step "Importing initial data to Firestore" {
  $env:GOOGLE_APPLICATION_CREDENTIALS = $serviceAccountPath
  $env:FIREBASE_PROJECT_ID = $firebaseProjectId
  $env:CONG_NAME = $congName
  Push-Location $Root
  try { node scripts/setup-from-csv.mjs } finally { Pop-Location }
}

if (-not $SkipDeploy) {
  if (Ask-YesNo "Deploy Firebase Firestore rules and indexes?" $true) {
    Run-Step "Deploying Firebase rules and indexes" {
      Push-Location $Root
      try { npx firebase-tools deploy --only firestore:rules,firestore:indexes --project $firebaseProjectId } finally { Pop-Location }
    }
  }

  if (Ask-YesNo "Register Cloudflare Worker secret FIREBASE_SERVICE_ACCOUNT?" $true) {
    Run-Step "Registering Worker secret" {
      Push-Location $WorkerDir
      try {
        Get-Content -LiteralPath $serviceAccountPath -Raw | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
      } finally {
        Pop-Location
      }
    }
  }

  if (Ask-YesNo "Deploy Cloudflare Worker?" $true) {
    Run-Step "Deploying Worker" {
      Push-Location $WorkerDir
      try { npx wrangler deploy } finally { Pop-Location }
    }
    $newWorkerUrl = Ask "Enter the deployed Worker URL to save in web/.env" $workerUrl
    if ($newWorkerUrl -ne $workerUrl) {
      $envPath = Join-Path $WebDir ".env"
      $content = Get-Content -LiteralPath $envPath -Raw
      $content = $content -replace 'VITE_WORKER_URL=.*', "VITE_WORKER_URL=$newWorkerUrl"
      Write-TextFile $envPath $content
      $workerUrl = $newWorkerUrl
    }
  }

  if (Ask-YesNo "Build and deploy the web app to Cloudflare Pages?" $true) {
    Run-Step "Building web app" {
      Push-Location $WebDir
      try { npm run build } finally { Pop-Location }
    }
    Run-Step "Deploying Cloudflare Pages" {
      Push-Location $WebDir
      try { npx wrangler pages deploy dist --project-name $pagesProjectName --branch main } finally { Pop-Location }
    }
  }
}

Write-Step "Done"
Write-Host "The easy install wizard has finished." -ForegroundColor Green
Write-Host "Home: https://YOUR_PAGES_DOMAIN/"
Write-Host "Group 1: https://YOUR_PAGES_DOMAIN/?g=group1"
Write-Host "Admin: https://YOUR_PAGES_DOMAIN/admin.html"
Write-Host "Replace YOUR_PAGES_DOMAIN with the real Cloudflare Pages URL."
