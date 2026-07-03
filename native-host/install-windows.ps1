# Registers the Orbit Lite native messaging host with Chrome (current user).
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File install-windows.ps1
#
# Chrome reads the host manifest path from this registry key. The manifest's
# "path" (host.bat) is relative to the manifest file, so both must sit together.

$ErrorActionPreference = "Stop"

$hostName    = "com.orbitlite.host"
$manifestPath = Join-Path $PSScriptRoot "$hostName.json"

if (-not (Test-Path $manifestPath)) {
    throw "Manifest not found at $manifestPath"
}

$key = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(default)" -Value $manifestPath

Write-Host "Registered $hostName ->" $manifestPath
Write-Host "Reminder: put your extension ID into allowed_origins in $hostName.json"
