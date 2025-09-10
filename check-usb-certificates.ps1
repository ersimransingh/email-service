# USB Certificate Checker for C# PDF Signing Application
# This script checks for USB/Smart Card certificates and PFX files compatible with your C# application

param(
    [string]$SerialNumber = "",
    [string]$PfxPath = "",
    [string]$PfxPassword = "",
    [switch]$Detailed = $false,
    [switch]$TestSigning = $false
)

# Set console encoding for proper display
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "USB Certificate Checker for C# PDF Signing" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Initialize results array
$results = @()

# Function to add result
function Add-Result {
    param($Status, $Message, $Details = "")
    $result = @{
        Status = $Status
        Message = $Message
        Details = $Details
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    $results += $result
    
    $color = switch ($Status) {
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "[$($result.Status)] $($result.Message)" -ForegroundColor $color
    if ($Details) {
        Write-Host "    Details: $Details" -ForegroundColor Gray
    }
}

# Function to check Windows Certificate Store for USB/Smart Card certificates
function Test-USBAndSmartCardCertificates {
    Write-Host "`nChecking Windows Certificate Store for USB/Smart Card certificates..." -ForegroundColor Yellow
    
    try {
        # Check Personal certificate store for certificates with private keys
        $personalCerts = Get-ChildItem -Path "Cert:\CurrentUser\My" -ErrorAction SilentlyContinue | Where-Object { $_.HasPrivateKey }
        
        if ($personalCerts) {
            Add-Result "SUCCESS" "Found certificates with private keys in Personal store" "Count: $($personalCerts.Count)"
            
            foreach ($cert in $personalCerts) {
                $isValid = $cert.NotAfter -gt (Get-Date)
                $status = if ($isValid) { "SUCCESS" } else { "WARNING" }
                $message = if ($isValid) { "Valid certificate found" } else { "Expired certificate found" }
                
                # Check if this looks like a USB/Smart Card certificate
                $isUSBCert = $false
                $providerInfo = ""
                
                try {
                    $privateKey = $cert.PrivateKey
                    if ($privateKey) {
                        $cspInfo = $privateKey.CspKeyContainerInfo
                        $providerInfo = "Provider: $($cspInfo.ProviderName), Container: $($cspInfo.KeyContainerName)"
                        
                        # Check if it's a smart card or USB token provider
                        $smartCardProviders = @("Microsoft Base Smart Card Crypto Provider", 
                                             "Microsoft Smart Card Key Storage Provider",
                                             "Microsoft Base Smart Card Crypto Provider",
                                             "SafeNet Smart Card Key Storage Provider",
                                             "SafeNet eToken Base Provider",
                                             "SafeNet eToken Cryptographic Provider")
                        
                        if ($cspInfo.ProviderName -in $smartCardProviders) {
                            $isUSBCert = $true
                        }
                    }
                } catch {
                    # Private key might be on hardware token
                    $isUSBCert = $true
                    $providerInfo = "Hardware token (private key not accessible via software)"
                }
                
                $certType = if ($isUSBCert) { "USB/Smart Card" } else { "Software" }
                
                Add-Result $status "$message ($certType)" "Subject: $($cert.Subject), Serial: $($cert.SerialNumber), Valid Until: $($cert.NotAfter.ToString('yyyy-MM-dd')), Thumbprint: $($cert.Thumbprint), $providerInfo"
                
                # If specific serial number provided, check if it matches
                if ($SerialNumber -and $cert.SerialNumber -eq $SerialNumber.Replace(" ", "").ToUpper()) {
                    Add-Result "SUCCESS" "Found certificate with matching serial number" "Serial: $($cert.SerialNumber)"
                }
            }
        } else {
            Add-Result "WARNING" "No certificates with private keys found in Personal store"
        }
        
        # Check for smart card readers
        Write-Host "`nChecking for smart card readers..." -ForegroundColor Yellow
        try {
            $smartCardReaders = Get-WmiObject -Class Win32_PnPEntity | Where-Object { $_.Name -like "*smart card*" -or $_.Name -like "*card reader*" -or $_.Name -like "*token*" }
            
            if ($smartCardReaders) {
                Add-Result "SUCCESS" "Smart card readers detected" "Count: $($smartCardReaders.Count)"
                foreach ($reader in $smartCardReaders) {
                    Add-Result "INFO" "Smart card reader found" "Name: $($reader.Name), Status: $($reader.Status)"
                }
            } else {
                Add-Result "INFO" "No smart card readers detected" "USB tokens may still be available through software providers"
            }
        } catch {
            Add-Result "WARNING" "Could not check for smart card readers" $_.Exception.Message
        }
        
    } catch {
        Add-Result "ERROR" "Error accessing Windows Certificate Store" $_.Exception.Message
    }
}

# Function to check PFX files
function Test-PFXFiles {
    Write-Host "`nChecking PFX files..." -ForegroundColor Yellow
    
    if ($PfxPath) {
        if (Test-Path $PfxPath) {
            Add-Result "SUCCESS" "PFX file found" "Path: $PfxPath"
            
            try {
                # Try to load the PFX file
                if ($PfxPassword) {
                    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxPath, $PfxPassword)
                } else {
                    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxPath)
                }
                
                $isValid = $cert.NotAfter -gt (Get-Date)
                $status = if ($isValid) { "SUCCESS" } else { "WARNING" }
                $message = if ($isValid) { "PFX file loaded successfully" } else { "PFX file loaded but certificate is expired" }
                
                Add-Result $status $message "Subject: $($cert.Subject), Serial: $($cert.SerialNumber), Valid Until: $($cert.NotAfter.ToString('yyyy-MM-dd')), Has Private Key: $($cert.HasPrivateKey)"
                
                if ($cert.HasPrivateKey) {
                    Add-Result "SUCCESS" "PFX file contains private key" "Ready for PDF signing"
                } else {
                    Add-Result "ERROR" "PFX file does not contain private key" "Cannot be used for PDF signing"
                }
                
            } catch {
                Add-Result "ERROR" "Could not load PFX file" "Error: $($_.Exception.Message). Check password or file format."
            }
        } else {
            Add-Result "ERROR" "PFX file not found" "Path: $PfxPath"
        }
    } else {
        # Look for PFX files in common locations
        $commonPaths = @(
            "$env:USERPROFILE\Documents\Certificates",
            "$env:USERPROFILE\Desktop\Certificates",
            "$env:USERPROFILE\Downloads",
            "C:\Certificates",
            "C:\Program Files\Common Files\Certificates"
        )
        
        $foundPfxFiles = @()
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $pfxFiles = Get-ChildItem -Path $path -Recurse -Include "*.pfx", "*.p12" -ErrorAction SilentlyContinue
                if ($pfxFiles) {
                    $foundPfxFiles += $pfxFiles
                    Add-Result "SUCCESS" "Found PFX files in directory" "Path: $path, Files: $($pfxFiles.Count)"
                }
            }
        }
        
        if ($foundPfxFiles.Count -eq 0) {
            Add-Result "INFO" "No PFX files found in common locations" "Specify -PfxPath to check a specific file"
        } else {
            Add-Result "SUCCESS" "Total PFX files found" "Count: $($foundPfxFiles.Count)"
        }
    }
}

# Function to test C# application compatibility
function Test-CSharpCompatibility {
    Write-Host "`nTesting C# application compatibility..." -ForegroundColor Yellow
    
    # Check if .NET Framework is available
    try {
        $dotnetVersion = [System.Environment]::Version
        Add-Result "SUCCESS" ".NET Framework available" "Version: $dotnetVersion"
    } catch {
        Add-Result "ERROR" ".NET Framework not available" "Required for C# PDF signing application"
    }
    
    # Check for iTextSharp (if available in GAC)
    try {
        Add-Type -AssemblyName "itextsharp" -ErrorAction Stop
        Add-Result "SUCCESS" "iTextSharp assembly available" "Can load PDF signing libraries"
    } catch {
        Add-Result "WARNING" "iTextSharp not found in GAC" "May need to be installed with your C# application"
    }
    
    # Check for BouncyCastle (if available)
    try {
        Add-Type -AssemblyName "BouncyCastle.Crypto" -ErrorAction Stop
        Add-Result "SUCCESS" "BouncyCastle assembly available" "Required for certificate handling"
    } catch {
        Add-Result "WARNING" "BouncyCastle not found" "May need to be installed with your C# application"
    }
}

# Function to generate C# integration recommendations
function Get-CSharpIntegrationRecommendations {
    Write-Host "`nC# Integration Recommendations:" -ForegroundColor Green
    
    $hasCertificates = $results | Where-Object { $_.Status -eq "SUCCESS" -and $_.Message -like "*certificate*" }
    $hasPFX = $results | Where-Object { $_.Message -like "*PFX*" -and $_.Status -eq "SUCCESS" }
    
    Write-Host "1. For USB/Smart Card certificates:" -ForegroundColor Yellow
    Write-Host "   - Use the certificate's serial number in your C# application" -ForegroundColor Gray
    Write-Host "   - Set strPfxFile to the serial number (without spaces)" -ForegroundColor Gray
    Write-Host "   - Set strPfxPwd to the PIN code if required" -ForegroundColor Gray
    
    Write-Host "`n2. For PFX files:" -ForegroundColor Yellow
    Write-Host "   - Set strPfxFile to the full path to your .pfx file" -ForegroundColor Gray
    Write-Host "   - Set strPfxPwd to the PFX password" -ForegroundColor Gray
    
    Write-Host "`n3. Integration with Node.js email service:" -ForegroundColor Yellow
    Write-Host "   - Create a wrapper service that calls your C# application" -ForegroundColor Gray
    Write-Host "   - Use child_process.spawn() to execute the C# application" -ForegroundColor Gray
    Write-Host "   - Pass PDF file paths and certificate parameters as arguments" -ForegroundColor Gray
    
    Write-Host "`n4. Example C# application call:" -ForegroundColor Cyan
    Write-Host "   Global signer = new Global(sourcePdf, outputPdf, pdfPassword, pfxPath, pfxPassword, 'true');" -ForegroundColor Gray
    Write-Host "   signer.Signing();" -ForegroundColor Gray
}

# Function to test actual signing (if requested)
function Test-ActualSigning {
    if (-not $TestSigning) { return }
    
    Write-Host "`nTesting actual PDF signing..." -ForegroundColor Yellow
    
    # This would require your C# application to be compiled and available
    # For now, just show what would be tested
    Add-Result "INFO" "Signing test not implemented" "Would test actual PDF signing with available certificates"
    Add-Result "INFO" "To test signing:" -ForegroundColor Gray
    Add-Result "INFO" "1. Compile your C# application" -ForegroundColor Gray
    Add-Result "INFO" "2. Create a test PDF file" -ForegroundColor Gray
    Add-Result "INFO" "3. Run the application with test parameters" -ForegroundColor Gray
}

# Main execution
Write-Host "Starting USB certificate check..." -ForegroundColor Green
Write-Host ""

# Run all checks
Test-USBAndSmartCardCertificates
Test-PFXFiles
Test-CSharpCompatibility
Test-ActualSigning

# Generate recommendations
Get-CSharpIntegrationRecommendations

# Summary
Write-Host "`nSummary:" -ForegroundColor Cyan
$successCount = ($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$warningCount = ($results | Where-Object { $_.Status -eq "WARNING" }).Count
$errorCount = ($results | Where-Object { $_.Status -eq "ERROR" }).Count

Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Warnings: $warningCount" -ForegroundColor Yellow
Write-Host "Errors: $errorCount" -ForegroundColor Red

if ($errorCount -eq 0 -and $warningCount -eq 0) {
    Write-Host "`nAll checks passed! Your system is ready for C# PDF signing." -ForegroundColor Green
} elseif ($errorCount -eq 0) {
    Write-Host "`nSystem is mostly ready, but check the warnings above." -ForegroundColor Yellow
} else {
    Write-Host "`nSome issues found. Please address the errors before proceeding." -ForegroundColor Red
}

Write-Host "`nScript completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
