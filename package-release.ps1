# PowerShell script to create a release package
Write-Host "Creating release package..." -ForegroundColor Green

# Check if release directory exists
if (-not (Test-Path "dist\release")) {
    Write-Host "Error: Release directory not found. Please run build-release.ps1 first." -ForegroundColor Red
    exit 1
}

# Copy release files to dist root for ZIP creation
Write-Host "Preparing files for ZIP package..." -ForegroundColor Yellow
Copy-Item "dist\release\*" "dist\" -Force -Recurse

# Check if 7-Zip is available
$7zPath = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $7zPath) {
    Write-Host "Using 7-Zip to create ZIP file..." -ForegroundColor Yellow
    & $7zPath a "dist\MDReader-1.0.0.zip" "dist\MD Reader-Setup-1.0.0.exe" "dist\README.md" "dist\LICENSE" -r
} else {
    # Use PowerShell's built-in compression
    Write-Host "Using PowerShell compression..." -ForegroundColor Yellow
    $filesToCompress = Get-ChildItem "dist" -Include "MD Reader-Setup-1.0.0.exe", "README.md", "LICENSE"
    if ($filesToCompress.Count -gt 0) {
        Compress-Archive -Path $filesToCompress -DestinationPath "dist\MDReader-1.0.0.zip" -Force
    }
}

# Clean up copied files
Remove-Item "dist\MD Reader-Setup-1.0.0.exe" -ErrorAction SilentlyContinue
Remove-Item "dist\README.md" -ErrorAction SilentlyContinue
Remove-Item "dist\LICENSE" -ErrorAction SilentlyContinue

Write-Host "Release package created: dist\MDReader-1.0.0.zip" -ForegroundColor Green
Write-Host "You can now distribute this ZIP file to users." -ForegroundColor Cyan