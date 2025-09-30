# PowerShell script to create a release package
Write-Host "Creating release package..." -ForegroundColor Green

# Check if 7-Zip is available
$7zPath = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $7zPath) {
    Write-Host "Using 7-Zip to create ZIP file..." -ForegroundColor Yellow
    & $7zPath a "dist\MDReader-1.0.0.zip" "dist\release\*"
} else {
    # Use PowerShell's built-in compression
    Write-Host "Using PowerShell compression..." -ForegroundColor Yellow
    Compress-Archive -Path "dist\release\*" -DestinationPath "dist\MDReader-1.0.0.zip" -Force
}

Write-Host "Release package created: dist\MDReader-1.0.0.zip" -ForegroundColor Green
Write-Host "You can now distribute this ZIP file to users." -ForegroundColor Cyan