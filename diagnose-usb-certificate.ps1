# USB Certificate Diagnostic Script
# This script helps diagnose USB certificate access issues

param(
    [string]$SerialNumber = "489EEE98E426DACC"
)

Write-Host "USB Certificate Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Set console encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "1. Checking Windows Certificate Store..." -ForegroundColor Yellow

try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
    
    $certificates = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindBySerialNumber, $SerialNumber, $false)
    
    if ($certificates.Count -eq 0) {
        Write-Host "❌ Certificate with serial $SerialNumber not found" -ForegroundColor Red
        Write-Host "Available certificates:" -ForegroundColor Yellow
        
        $allCerts = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.HasPrivateKey }
        foreach ($cert in $allCerts) {
            Write-Host "  - Serial: $($cert.SerialNumber)" -ForegroundColor Gray
            Write-Host "    Subject: $($cert.Subject)" -ForegroundColor Gray
            Write-Host "    Valid: $($cert.NotBefore) to $($cert.NotAfter)" -ForegroundColor Gray
        }
    } else {
        $cert = $certificates[0]
        Write-Host "✅ Certificate found!" -ForegroundColor Green
        Write-Host "  Subject: $($cert.Subject)" -ForegroundColor White
        Write-Host "  Serial: $($cert.SerialNumber)" -ForegroundColor White
        Write-Host "  Valid: $($cert.NotBefore) to $($cert.NotAfter)" -ForegroundColor White
        Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor White
        
        # Check private key access
        Write-Host ""
        Write-Host "2. Checking private key access..." -ForegroundColor Yellow
        
        try {
            $privateKey = $cert.PrivateKey
            if ($privateKey) {
                $cspInfo = $privateKey.CspKeyContainerInfo
                Write-Host "✅ Private key accessible" -ForegroundColor Green
                Write-Host "  Provider: $($cspInfo.ProviderName)" -ForegroundColor White
                Write-Host "  Container: $($cspInfo.KeyContainerName)" -ForegroundColor White
                Write-Host "  Provider Type: $($cspInfo.ProviderType)" -ForegroundColor White
                
                # Check if it's a hardware token
                if ($cspInfo.ProviderName -like "*PROXKey*" -or $cspInfo.ProviderName -like "*Smart Card*" -or $cspInfo.ProviderName -like "*Token*") {
                    Write-Host "✅ Hardware token detected: $($cspInfo.ProviderName)" -ForegroundColor Green
                } else {
                    Write-Host "ℹ️ Software certificate: $($cspInfo.ProviderName)" -ForegroundColor Cyan
                }
            } else {
                Write-Host "❌ Private key not accessible" -ForegroundColor Red
                Write-Host "This might be a hardware token that requires PIN entry" -ForegroundColor Yellow
            }
        } catch ($keyError) {
            Write-Host "❌ Error accessing private key: $($keyError.Message)" -ForegroundColor Red
            Write-Host "This is common with hardware tokens" -ForegroundColor Yellow
        }
    }
    
    $store.Close()
} catch ($error) {
    Write-Host "❌ Error accessing certificate store: $($error.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Checking smart card readers..." -ForegroundColor Yellow

try {
    $smartCardReaders = Get-WmiObject -Class Win32_PnPEntity | Where-Object { 
        $_.Name -like "*smart card*" -or 
        $_.Name -like "*card reader*" -or 
        $_.Name -like "*token*" -or
        $_.Name -like "*proxkey*"
    }
    
    if ($smartCardReaders) {
        Write-Host "✅ Smart card readers detected:" -ForegroundColor Green
        foreach ($reader in $smartCardReaders) {
            Write-Host "  - $($reader.Name) (Status: $($reader.Status))" -ForegroundColor White
        }
    } else {
        Write-Host "❌ No smart card readers detected" -ForegroundColor Red
        Write-Host "Make sure your USB token is properly inserted" -ForegroundColor Yellow
    }
} catch ($error) {
    Write-Host "❌ Error checking smart card readers: $($error.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Testing certificate access with PIN..." -ForegroundColor Yellow

try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
    
    $certificates = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindBySerialNumber, $SerialNumber, $false)
    
    if ($certificates.Count -gt 0) {
        $cert = $certificates[0]
        
        # Try to access the private key with different approaches
        Write-Host "Testing private key access methods..." -ForegroundColor Cyan
        
        # Method 1: Direct access
        try {
            $privateKey = $cert.PrivateKey
            if ($privateKey) {
                Write-Host "✅ Method 1 (Direct): Private key accessible" -ForegroundColor Green
            }
        } catch {
            Write-Host "❌ Method 1 (Direct): $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Method 2: With CSP parameters
        try {
            $cspParams = New-Object System.Security.Cryptography.CspParameters
            $cspParams.KeyContainerName = $cert.PrivateKey.CspKeyContainerInfo.KeyContainerName
            $cspParams.ProviderName = $cert.PrivateKey.CspKeyContainerInfo.ProviderName
            $cspParams.ProviderType = $cert.PrivateKey.CspKeyContainerInfo.ProviderType
            
            $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider($cspParams)
            Write-Host "✅ Method 2 (CSP): Private key accessible" -ForegroundColor Green
        } catch {
            Write-Host "❌ Method 2 (CSP): $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Method 3: Try to use the certificate for signing
        try {
            $data = [System.Text.Encoding]::UTF8.GetBytes("Test data for signing")
            $cspParams = New-Object System.Security.Cryptography.CspParameters
            $cspParams.KeyContainerName = $cert.PrivateKey.CspKeyContainerInfo.KeyContainerName
            $cspParams.ProviderName = $cert.PrivateKey.CspKeyContainerInfo.ProviderName
            
            $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider($cspParams)
            $signature = $rsa.SignData($data, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
            Write-Host "✅ Method 3 (Signing): Certificate can be used for signing" -ForegroundColor Green
        } catch {
            Write-Host "❌ Method 3 (Signing): $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "This might require PIN entry or hardware token interaction" -ForegroundColor Yellow
        }
    }
    
    $store.Close()
} catch ($error) {
    Write-Host "❌ Error testing certificate access: $($error.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Recommendations:" -ForegroundColor Yellow

if ($certificates.Count -gt 0) {
    $cert = $certificates[0]
    $provider = ""
    try {
        $provider = $cert.PrivateKey.CspKeyContainerInfo.ProviderName
    } catch {
        $provider = "Unknown"
    }
    
    if ($provider -like "*PROXKey*") {
        Write-Host "✅ PROXKey token detected - this should work with our implementation" -ForegroundColor Green
        Write-Host "  - Make sure the USB token is inserted" -ForegroundColor White
        Write-Host "  - Try entering the PIN when prompted" -ForegroundColor White
        Write-Host "  - The certificate is expired but should still work for signing" -ForegroundColor White
    } else {
        Write-Host "ℹ️ Software certificate detected" -ForegroundColor Cyan
        Write-Host "  - This should work without PIN" -ForegroundColor White
    }
} else {
    Write-Host "❌ Certificate not found - check the serial number" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostic completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
