# Build the SPA and publish it to S3 + CloudFront.
# Prerequisites: AWS CLI logged in, bucket + distribution already created (see DEPLOY.md).
#
# Usage (from stock-frontend):
#   .\scripts\deploy-cloudfront.ps1 -Bucket stock-app-spa-YOURNAME -DistributionId E123ABC
#   .\scripts\deploy-cloudfront.ps1 -Bucket ... -DistributionId ... -EnvFile .env.production

param(
    [Parameter(Mandatory = $true)]
    [string]$Bucket,

    [Parameter(Mandatory = $true)]
    [string]$DistributionId,

    [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"
$FrontendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $FrontendRoot

function Get-AwsExe {
    $paths = @(
        "C:\Program Files\Amazon\AWSCLIV2\aws.exe",
        "$env:ProgramFiles\Amazon\AWSCLIV2\aws.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    $cmd = Get-Command aws -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

$aws = Get-AwsExe
if (-not $aws) {
    throw "AWS CLI not found. Install it, then run aws configure. See DEPLOY.md."
}

$envPath = Join-Path $FrontendRoot $EnvFile
if (-not (Test-Path $envPath)) {
    throw "Missing $EnvFile. Copy .env.production.example to .env.production and fill in values."
}

$required = @(
    "VITE_COGNITO_USER_POOL_ID",
    "VITE_COGNITO_CLIENT_ID",
    "VITE_COGNITO_DOMAIN",
    "VITE_COGNITO_OAUTH_REDIRECT_URI",
    "VITE_IDENTITY_API_URL",
    "VITE_MARKET_API_URL",
    "VITE_PORTFOLIO_API_URL"
)

$envMap = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $name, $value = $_.Split("=", 2)
    $envMap[$name.Trim()] = $value.Trim().Trim('"').Trim("'")
}

foreach ($key in $required) {
    $val = $envMap[$key]
    if (-not $val -or $val -match 'XXXXXXXXX|your_|1-2-3-4|d111111abcdef8') {
        throw "$EnvFile still has a placeholder for $key. Fill real production values first."
    }
}

$skipCognito = $envMap["VITE_DEV_SKIP_COGNITO"]
if (-not $skipCognito) { $skipCognito = "false" }
if ($skipCognito.ToLower() -in @("true", "1", "yes")) {
    throw "VITE_DEV_SKIP_COGNITO must be false for the interview deploy."
}

Write-Host "==> Installing npm packages" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "==> Building production SPA" -ForegroundColor Cyan
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

$dist = Join-Path $FrontendRoot "dist"
if (-not (Test-Path $dist)) {
    throw "dist/ was not created."
}

Write-Host "==> Uploading dist/ to s3://$Bucket" -ForegroundColor Cyan
& $aws s3 sync $dist "s3://$Bucket" --delete
if ($LASTEXITCODE -ne 0) { throw "s3 sync failed" }

Write-Host "==> Invalidating CloudFront $DistributionId" -ForegroundColor Cyan
& $aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
if ($LASTEXITCODE -ne 0) { throw "CloudFront invalidation failed" }

Write-Host ""
Write-Host "Deployed. Open your CloudFront URL (wait 1-2 minutes if this is a new invalidation)." -ForegroundColor Green
