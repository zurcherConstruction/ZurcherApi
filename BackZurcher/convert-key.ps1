# PowerShell script to convert DocuSign private key to .env format

Write-Host "Pega tu clave privada completa (desde BEGIN hasta END) y presiona Enter dos veces:" -ForegroundColor Cyan
Write-Host ""

$lines = @()
while ($true) {
    $line = Read-Host
    if ([string]::IsNullOrWhiteSpace($line)) {
        break
    }
    $lines += $line
}

$fullKey = $lines -join "\n"
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "Copia esta línea completa a tu archivo .env:" -ForegroundColor Yellow
Write-Host ""
Write-Host "DOCUSIGN_PRIVATE_KEY_CONTENT=`"$fullKey`"" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
