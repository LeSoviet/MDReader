# Enhanced build script with code signing support
param(
    [string]$CertificateFile = "",
    [string]$CertificatePassword = "",
    [string]$TimestampUrl = "http://timestamp.sectigo.com",
    [switch]$SkipSigning = $false
)

Write-Host "MD Reader - Enhanced Build Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if certificate parameters are provided
$shouldSign = $false
if (-not $SkipSigning) {
    if ($CertificateFile -and $CertificatePassword) {
        if (Test-Path $CertificateFile) {
            $shouldSign = $true
            Write-Host "Code signing enabled with certificate: $CertificateFile" -ForegroundColor Yellow
        } else {
            Write-Host "Certificate file not found: $CertificateFile" -ForegroundColor Red
            Write-Host "Building without code signing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "No certificate provided. Building without code signing..." -ForegroundColor Yellow
        Write-Host "To enable code signing, use: .\build-release.ps1 -CertificateFile 'path\to\cert.pfx' -CertificatePassword 'password'" -ForegroundColor Cyan
    }
}

# Clean previous builds
Write-Host "`nCleaning previous builds..." -ForegroundColor Cyan
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
npm install

# Build the application
Write-Host "`nBuilding application..." -ForegroundColor Cyan
npx electron-packager . MDReader --platform=win32 --arch=x64 --out=dist --overwrite

# Sign the executable if certificate is provided
if ($shouldSign) {
    Write-Host "`nSigning executable..." -ForegroundColor Cyan
    $exePath = "dist\MDReader-win32-x64\MDReader.exe"
    
    if (Test-Path $exePath) {
        try {
            # Use signtool to sign the executable
            $signParams = @(
                "sign"
                "/f", $CertificateFile
                "/p", $CertificatePassword
                "/t", $TimestampUrl
                "/fd", "SHA256"
                "/v"
                $exePath
            )
            
            & signtool.exe @signParams
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Executable signed successfully!" -ForegroundColor Green
            } else {
                Write-Host "Failed to sign executable. Error code: $LASTEXITCODE" -ForegroundColor Red
            }
        } catch {
            Write-Host "Error signing executable: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "Executable not found at: $exePath" -ForegroundColor Red
    }
}

# Set environment variables for installer signing
if ($shouldSign) {
    $env:WINDOWS_CERTIFICATE_FILE = $CertificateFile
    $env:WINDOWS_CERTIFICATE_PASSWORD = $CertificatePassword
    $env:SIGNTOOL_PARAMS = "/f `"$CertificateFile`" /p `"$CertificatePassword`" /t `"$TimestampUrl`" /fd SHA256"
}

# Create installer
Write-Host "`nCreating installer..." -ForegroundColor Cyan
node build-windows-installer.js

Write-Host "`nBuild completed!" -ForegroundColor Green

if ($shouldSign) {
    Write-Host "Application and installer have been signed with the provided certificate." -ForegroundColor Green
} else {
    Write-Host "Application built without code signing." -ForegroundColor Yellow
    Write-Host "Users may see Windows Defender warnings when installing." -ForegroundColor Yellow
    Write-Host "To avoid warnings, obtain a code signing certificate and rebuild with signing enabled." -ForegroundColor Cyan
}