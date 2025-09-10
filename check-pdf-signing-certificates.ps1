# PDF Signing Certificate Checker for Windows
# This script checks for available PDF signing certificates on your Windows machine

param(
    [string]$CertificatePath = "",
    [string]$KeyPath = "",
    [switch]$Detailed = $false,
    [switch]$ExportResults = $false
)

# Set console encoding for proper display
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "PDF Signing Certificate Checker" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
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

# Function to check certificate file
function Test-CertificateFile {
    param($FilePath, $FileType)
    
    if (-not $FilePath) {
        return $false
    }
    
    if (-not (Test-Path $FilePath)) {
        Add-Result "ERROR" "Certificate file not found" "Path: $FilePath"
        return $false
    }
    
    $fileInfo = Get-Item $FilePath
    Add-Result "SUCCESS" "$FileType file found" "Path: $FilePath, Size: $($fileInfo.Length) bytes, Modified: $($fileInfo.LastWriteTime)"
    
    # Check file extension
    $extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
    $validExtensions = @('.p12', '.pfx', '.pem', '.crt', '.cer', '.der', '.key')
    
    if ($extension -in $validExtensions) {
        Add-Result "SUCCESS" "Valid certificate file extension" "Extension: $extension"
        return $true
    } else {
        Add-Result "WARNING" "Unusual certificate file extension" "Extension: $extension (Expected: $($validExtensions -join ', '))"
        return $true  # Still valid, just unusual
    }
}

# Function to check Windows Certificate Store
function Test-WindowsCertificateStore {
    Write-Host "`nChecking Windows Certificate Store..." -ForegroundColor Yellow
    
    try {
        # Check Personal certificate store
        $personalCerts = Get-ChildItem -Path "Cert:\CurrentUser\My" -ErrorAction SilentlyContinue | Where-Object { $_.HasPrivateKey }
        
        if ($personalCerts) {
            Add-Result "SUCCESS" "Found certificates with private keys in Personal store" "Count: $($personalCerts.Count)"
            
            foreach ($cert in $personalCerts) {
                $isValid = $cert.NotAfter -gt (Get-Date)
                $status = if ($isValid) { "SUCCESS" } else { "WARNING" }
                $message = if ($isValid) { "Valid certificate found" } else { "Expired certificate found" }
                
                Add-Result $status $message "Subject: $($cert.Subject), Valid Until: $($cert.NotAfter.ToString('yyyy-MM-dd')), Thumbprint: $($cert.Thumbprint)"
            }
        } else {
            Add-Result "WARNING" "No certificates with private keys found in Personal store"
        }
        
        # Check Trusted Root Certification Authorities
        $rootCerts = Get-ChildItem -Path "Cert:\CurrentUser\Root" -ErrorAction SilentlyContinue
        Add-Result "INFO" "Root CA certificates available" "Count: $($rootCerts.Count)"
        
        # Check Intermediate Certification Authorities
        $intermediateCerts = Get-ChildItem -Path "Cert:\CurrentUser\CA" -ErrorAction SilentlyContinue
        Add-Result "INFO" "Intermediate CA certificates available" "Count: $($intermediateCerts.Count)"
        
    } catch {
        Add-Result "ERROR" "Error accessing Windows Certificate Store" $_.Exception.Message
    }
}

# Function to check for common certificate locations
function Test-CommonCertificateLocations {
    Write-Host "`nChecking common certificate locations..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "$env:USERPROFILE\Documents\Certificates",
        "$env:USERPROFILE\Desktop\Certificates",
        "$env:USERPROFILE\Downloads",
        "C:\Certificates",
        "C:\Program Files\Common Files\Certificates",
        "$env:APPDATA\Certificates"
    )
    
    $foundCerts = @()
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $certFiles = Get-ChildItem -Path $path -Recurse -Include "*.p12", "*.pfx", "*.pem", "*.crt", "*.cer", "*.der", "*.key" -ErrorAction SilentlyContinue
            
            if ($certFiles) {
                Add-Result "SUCCESS" "Found certificate files in directory" "Path: $path, Files: $($certFiles.Count)"
                $foundCerts += $certFiles
            }
        }
    }
    
    if ($foundCerts.Count -eq 0) {
        Add-Result "WARNING" "No certificate files found in common locations"
    } else {
        Add-Result "SUCCESS" "Total certificate files found" "Count: $($foundCerts.Count)"
    }
}

# Function to test certificate loading with OpenSSL (if available)
function Test-CertificateWithOpenSSL {
    Write-Host "`nTesting certificate with OpenSSL (if available)..." -ForegroundColor Yellow
    
    # Check if OpenSSL is available
    try {
        $opensslVersion = & openssl version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Add-Result "SUCCESS" "OpenSSL is available" "Version: $opensslVersion"
            
            # Test certificate files if provided
            if ($CertificatePath -and (Test-Path $CertificatePath)) {
                try {
                    $certInfo = & openssl x509 -in $CertificatePath -text -noout 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        Add-Result "SUCCESS" "Certificate file is valid" "Path: $CertificatePath"
                    } else {
                        Add-Result "WARNING" "Certificate file may be invalid or password-protected" "Path: $CertificatePath"
                    }
                } catch {
                    Add-Result "WARNING" "Could not validate certificate file" "Path: $CertificatePath, Error: $($_.Exception.Message)"
                }
            }
        } else {
            Add-Result "INFO" "OpenSSL not available" "Install OpenSSL for advanced certificate validation"
        }
    } catch {
        Add-Result "INFO" "OpenSSL not found in PATH" "Install OpenSSL for advanced certificate validation"
    }
}

# Function to check Node.js and required packages
function Test-NodeEnvironment {
    Write-Host "`nChecking Node.js environment..." -ForegroundColor Yellow
    
    try {
        $nodeVersion = & node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Add-Result "SUCCESS" "Node.js is available" "Version: $nodeVersion"
        } else {
            Add-Result "ERROR" "Node.js not found" "Install Node.js to run the email service"
            return
        }
        
        # Check if we're in the email service directory
        if (Test-Path "package.json") {
            Add-Result "SUCCESS" "Email service directory found" "Path: $(Get-Location)"
            
            # Check for required packages
            $packageJson = Get-Content "package.json" | ConvertFrom-Json
            $requiredPackages = @("pdf-lib", "node-forge", "pdf-password")
            
            foreach ($package in $requiredPackages) {
                if ($packageJson.dependencies.$package -or $packageJson.devDependencies.$package) {
                    Add-Result "SUCCESS" "Required package found" "Package: $package"
                } else {
                    Add-Result "WARNING" "Required package not found" "Package: $package"
                }
            }
        } else {
            Add-Result "WARNING" "Not in email service directory" "Run this script from the email service root directory"
        }
    } catch {
        Add-Result "ERROR" "Error checking Node.js environment" $_.Exception.Message
    }
}

# Function to generate recommendations
function Get-Recommendations {
    Write-Host "`nRecommendations:" -ForegroundColor Green
    
    $hasCertificates = $results | Where-Object { $_.Status -eq "SUCCESS" -and $_.Message -like "*certificate*" }
    $hasPrivateKeys = $results | Where-Object { $_.Message -like "*private key*" }
    
    if (-not $hasCertificates) {
        Write-Host "1. Obtain a valid PDF signing certificate from a trusted Certificate Authority" -ForegroundColor Yellow
        Write-Host "2. Common certificate formats: .p12, .pfx, .pem" -ForegroundColor Yellow
        Write-Host "3. Store the certificate in a secure location" -ForegroundColor Yellow
    }
    
    if (-not $hasPrivateKeys) {
        Write-Host "4. Ensure your certificate includes the private key" -ForegroundColor Yellow
        Write-Host "5. Private keys are required for PDF signing" -ForegroundColor Yellow
    }
    
    Write-Host "6. Update your email service configuration with certificate paths" -ForegroundColor Cyan
    Write-Host "7. Test the certificate loading in your PdfSigningService" -ForegroundColor Cyan
    Write-Host "8. Consider using Windows Certificate Store for better security" -ForegroundColor Cyan
}

# Main execution
Write-Host "Starting certificate check..." -ForegroundColor Green
Write-Host ""

# Check provided certificate files
if ($CertificatePath) {
    Write-Host "Checking provided certificate file..." -ForegroundColor Yellow
    Test-CertificateFile -FilePath $CertificatePath -FileType "Certificate"
}

if ($KeyPath) {
    Write-Host "Checking provided key file..." -ForegroundColor Yellow
    Test-CertificateFile -FilePath $KeyPath -FileType "Private Key"
}

# Run all checks
Test-WindowsCertificateStore
Test-CommonCertificateLocations
Test-CertificateWithOpenSSL
Test-NodeEnvironment

# Generate recommendations
Get-Recommendations

# Export results if requested
if ($ExportResults) {
    $exportPath = "certificate-check-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $results | ConvertTo-Json -Depth 3 | Out-File -FilePath $exportPath -Encoding UTF8
    Add-Result "SUCCESS" "Results exported" "File: $exportPath"
}

# Summary
Write-Host "`nSummary:" -ForegroundColor Cyan
$successCount = ($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$warningCount = ($results | Where-Object { $_.Status -eq "WARNING" }).Count
$errorCount = ($results | Where-Object { $_.Status -eq "ERROR" }).Count

Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Warnings: $warningCount" -ForegroundColor Yellow
Write-Host "Errors: $errorCount" -ForegroundColor Red

if ($errorCount -eq 0 -and $warningCount -eq 0) {
    Write-Host "`nAll checks passed! Your system is ready for PDF signing." -ForegroundColor Green
} elseif ($errorCount -eq 0) {
    Write-Host "`nSystem is mostly ready, but check the warnings above." -ForegroundColor Yellow
} else {
    Write-Host "`nSome issues found. Please address the errors before proceeding." -ForegroundColor Red
}

Write-Host "`nScript completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
