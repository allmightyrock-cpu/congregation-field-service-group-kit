# Backward-compatible entry point.
# The recommended installer is the graphical helper.

$ErrorActionPreference = "Stop"
$helper = Join-Path $PSScriptRoot "install-helper-gui.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $helper
