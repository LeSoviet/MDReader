# PowerShell script to help with code signing setup
Write-Host "Code Signing Setup Helper" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

Write-Host "`nThis script provides information about setting up code signing for MD Reader." -ForegroundColor Cyan
Write-Host "Code signing helps avoid Windows Defender warnings and establishes trust with users." -ForegroundColor Cyan

Write-Host "`nOptions for Code Signing:" -ForegroundColor Yellow
Write-Host "1. Purchase a code signing certificate from a trusted Certificate Authority (CA)" -ForegroundColor White
Write-Host "   Examples: DigiCert, Sectigo, GlobalSign, SSL.com" -ForegroundColor Gray
Write-Host "   Cost: Typically $100-$500 per year" -ForegroundColor Gray

Write-Host "`n2. Use a self-signed certificate (for testing only)" -ForegroundColor White
Write-Host "   Note: This will still show warnings but helps with testing the process" -ForegroundColor Gray
Write-Host "   To create a self-signed certificate:" -ForegroundColor Gray
Write-Host "   New-SelfSignedCertificate -Type CodeSigningCert -Subject `"CN=MD Reader Test Cert`" -KeyUsage DigitalSignature -FriendlyName `"MD Reader Test Cert`" -CertStoreLocation `"Cert:\CurrentUser\My`"" -ForegroundColor Gray

Write-Host "`n3. Use Azure Key Vault for certificate management (for organizations)" -ForegroundColor White
Write-Host "   More secure but requires Azure subscription" -ForegroundColor Gray

Write-Host "`nTo use your certificate with the build process:" -ForegroundColor Yellow
Write-Host "1. Export your certificate as a .pfx file" -ForegroundColor White
Write-Host "2. Run the build script with your certificate:" -ForegroundColor White
Write-Host "   .\build-release.ps1 -CertificateFile `"C:\path\to\certificate.pfx`" -CertificatePassword `"your_password`"" -ForegroundColor Gray

Write-Host "`nFor more information about code signing, visit:" -ForegroundColor Yellow
Write-Host "https://docs.microsoft.com/en-us/windows/win32/seccrypto/code-signing" -ForegroundColor Blue

Write-Host "`nNote: If you don't have a certificate, you can still build and distribute your application," -ForegroundColor Cyan
Write-Host "but users may see Windows Defender warnings. This is normal for unsigned applications." -ForegroundColor Cyan