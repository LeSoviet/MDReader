# PowerShell script to build and package MD Reader for release
param(
    [string]$CertificateFile = "",
    [string]$CertificatePassword = ""
)

Write-Host "Building MD Reader for release..." -ForegroundColor Green

# Set environment variables for signing if provided
if ($CertificateFile -ne "" -and $CertificatePassword -ne "") {
    $env:WINDOWS_CERTIFICATE_FILE = $CertificateFile
    $env:WINDOWS_CERTIFICATE_PASSWORD = $CertificatePassword
    Write-Host "Certificate information set for signing" -ForegroundColor Yellow
}

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue | Out-Null

# Create dist directory
New-Item -ItemType Directory -Path "dist" -Force | Out-Null

# Build the application using electron-builder
Write-Host "Building application with electron-builder..." -ForegroundColor Yellow
npm run build-electron

# Check if build was successful
if (Test-Path "dist\installer\MD Reader-Setup-1.2.0.exe") {
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Create release directory
    New-Item -ItemType Directory -Path "dist\release" -Force | Out-Null
    
    # Copy installer to release directory
    Copy-Item "dist\installer\MD Reader-Setup-1.2.0.exe" "dist\release\"
    
    # Copy other important files
    Copy-Item "README.md" "dist\release\" -ErrorAction SilentlyContinue
    Copy-Item "LICENSE" "dist\release\" -ErrorAction SilentlyContinue
    
    # Create ZIP package
    Write-Host "Creating ZIP package..." -ForegroundColor Yellow
    
    # Check if 7-Zip is available
    $7zPath = "C:\Program Files\7-Zip\7z.exe"
    if (Test-Path $7zPath) {
        Write-Host "Using 7-Zip to create ZIP file..." -ForegroundColor Yellow
        & $7zPath a "dist\MDReader-1.2.0.zip" "dist\release\*"
    } else {
        # Use PowerShell's built-in compression
        Write-Host "Using PowerShell compression..." -ForegroundColor Yellow
        Compress-Archive -Path "dist\release\*" -DestinationPath "dist\MDReader-1.2.0.zip" -Force
    }
    
    Write-Host "Release package created: dist\MDReader-1.2.0.zip" -ForegroundColor Green
    Write-Host "Installer location: dist\release\MD Reader-Setup-1.2.0.exe" -ForegroundColor Cyan
    Write-Host "You can now distribute these files to users." -ForegroundColor Cyan
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Release build complete!" -ForegroundColor Green