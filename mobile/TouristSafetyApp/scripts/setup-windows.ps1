# Windows Setup Script for RakshaSetu
# This script helps bypass the 260 character path limit and verifies the NDK on Windows.

$projectRoot = Get-Location
$driveLetter = "Z:"
$requiredNdk = "27.1.12297006"

Write-Host "--- RakshaSetu Windows Setup ---" -ForegroundColor Cyan

# 1. Enable Long Paths in Git
Write-Host "[1/4] Enabling long paths in Git..."
git config core.longpaths true
Write-Host "Done." -ForegroundColor Green

# 2. Verify NDK
Write-Host "[2/4] Verifying NDK version $requiredNdk..."
$sdkPath = [System.Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")
if (!$sdkPath) { $sdkPath = [System.Environment]::GetEnvironmentVariable("ANDROID_SDK_ROOT", "User") }
if (!$sdkPath) { $sdkPath = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" }

$ndkPath = Join-Path $sdkPath "ndk\$requiredNdk"
if (Test-Path $ndkPath) {
    Write-Host "Found correct NDK version at: $ndkPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: NDK $requiredNdk not found in $sdkPath/ndk/" -ForegroundColor Yellow
    Write-Host "You may face build failures. Please install NDK $requiredNdk via Android Studio (SDK Manager > SDK Tools > Show Package Details)." -ForegroundColor White
}

# 3. Check for Virtual Drive
Write-Host "[3/4] Checking for virtual drive $driveLetter..."
if (Test-Path $driveLetter) {
    $existing = (subst | Select-String "$driveLetter\\: => (.*)").Matches.Groups[1].Value
    if ($existing -eq $projectRoot) {
        Write-Host "Project already mapped to $driveLetter" -ForegroundColor Green
    } else {
        Write-Host "Drive $driveLetter is mapped to $existing. Unmapping..."
        subst $driveLetter /D
        subst $driveLetter $projectRoot
    }
} else {
    Write-Host "Mapping $projectRoot to $driveLetter..."
    subst $driveLetter $projectRoot
}

if (Test-Path $driveLetter) {
    Write-Host "Successfully verified mapping to $driveLetter" -ForegroundColor Green
    Write-Host "IMPORTANT: From now on, open your terminal and IDE at $driveLetter for faster and more reliable builds." -ForegroundColor Yellow
}

# 4. System Level Suggestion
Write-Host "[4/4] System suggestion:"
Write-Host "To permanently fix path issues, run this in an Admin PowerShell:" -ForegroundColor White
Write-Host "Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -Value 1" -ForegroundColor Gray

Write-Host "--- Setup Complete ---" -ForegroundColor Cyan
