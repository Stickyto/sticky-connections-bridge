# Sticky Connections Bridge One-Click Installer

Write-Host ""
Write-Host "====================================="
Write-Host " Sticky Connections Bridge Installer "
Write-Host "====================================="
Write-Host ""

# Ensure running as Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Right-click install.ps1 and choose 'Run as Administrator'"
    pause
    exit 1
}

# Move into script directory
Set-Location $PSScriptRoot

# Install service
Write-Host "Installing Sticky Connections Bridge service..."
.\StickyConnectionsBridge.exe install

Start-Sleep -Seconds 2

# Set service to automatic startup
Write-Host "Setting service to Automatic startup..."
sc.exe config StickyConnectionsBridge start= auto

Start-Sleep -Seconds 1

# Start service
Write-Host "Starting service..."
.\StickyConnectionsBridge.exe start

Start-Sleep -Seconds 2

# Check status
$status = Get-Service -Name "StickyConnectionsBridge" -ErrorAction SilentlyContinue

if ($status -and $status.Status -eq "Running") {
    Write-Host ""
    Write-Host "✅ Sticky Connections Bridge successfully installed and running." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Sticky Connections Bridge failed to start. Check logs in this folder." -ForegroundColor Red
}

Write-Host ""
pause