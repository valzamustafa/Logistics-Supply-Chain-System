# start-all.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting all Logistics Services..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

function Get-PortProcessIds {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        return $connections | Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        return @()
    }
}

function Stop-PortProcesses {
    param([int]$Port)
    $pids = Get-PortProcessIds -Port $Port
    foreach ($processId in $pids) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "Stopped process $processId on port ${Port}" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not stop process $processId on port ${Port}: $_" -ForegroundColor Red
        }
    }
}

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (Get-PortProcessIds -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

$pwshExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

$services = @(
    @{Name="Auth Service"; Path="services\auth-service"; Port=5001; Command="dotnet run --urls=http://localhost:5001"},
    @{Name="Product Service"; Path="services\product-service"; Port=5005; Command="dotnet run --urls=http://localhost:5005"},
    @{Name="Order Service"; Path="services\order-service"; Port=5002; Command="dotnet run --urls=http://localhost:5002"},
    @{Name="Inventory Service"; Path="services\inventory-service"; Port=5003; Command="dotnet run --urls=http://localhost:5003"},
    @{Name="Shipment Service"; Path="services\shipment-service"; Port=5004; Command="dotnet run --urls=http://localhost:5004"},
    @{Name="Supplier Service"; Path="services\supplier-service"; Port=5007; Command="dotnet run --urls=http://localhost:5007"},
    @{Name="Warehouse Service"; Path="services\warehouse-service"; Port=5006; Command="dotnet run --urls=http://localhost:5006"},
    @{Name="Report Service"; Path="services\report-service"; Port=5008; Command="dotnet run --urls=http://localhost:5008"},
    @{Name="Notification Service"; Path="services\notification-service"; Port=5009; Command="dotnet run --urls=http://localhost:5009"},
    @{Name="Tracking Service"; Path="services\tracking-services"; Port=5010; Command="dotnet run --urls=http://localhost:5010"},
    @{Name="API Gateway"; Path="api-gateway"; Port=5000; Command="dotnet run --urls=http://localhost:5000"},
  
)

foreach ($service in $services) {
    Write-Host "Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Green
    Stop-PortProcesses -Port $service.Port

    $targetPath = Join-Path $PSScriptRoot $service.Path
    $command = "Set-Location '$targetPath'; Write-Host '$($service.Name) running on port $($service.Port)' -ForegroundColor Cyan; $($service.Command)"

    Start-Process -FilePath $pwshExe -ArgumentList "-NoExit", "-NoProfile", "-Command", $command -WorkingDirectory $targetPath

    if (Wait-ForPort -Port $service.Port -TimeoutSeconds 30) {
        Write-Host "$($service.Name) started successfully on port $($service.Port)." -ForegroundColor Cyan
    } else {
        Write-Host "Failed to detect $($service.Name) on port $($service.Port) after 30 seconds." -ForegroundColor Red
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All services launched (or attempted)." -ForegroundColor Green
Write-Host "API Gateway: http://localhost:5000" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

