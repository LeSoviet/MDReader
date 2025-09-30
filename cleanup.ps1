# Cleanup script for MD Reader project
Write-Host "Cleaning up MD Reader project..." -ForegroundColor Green

# Remove build artifacts
Write-Host "Removing build artifacts..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue

# Create clean dist directory
Write-Host "Creating clean dist directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "dist" -Force | Out-Null

# Copy release files to dist
Write-Host "Copying release files..." -ForegroundColor Yellow
Copy-Item "RELEASE-NOTES.md" "dist\" -Force -ErrorAction SilentlyContinue

Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host "Ready for next session." -ForegroundColor Cyan