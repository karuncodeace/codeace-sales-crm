# PowerShell script to test Cal.com webhook
$body = @{
    triggerEvent = "BOOKING_CREATED"
    createdAt = "2025-12-05T10:00:00Z"
    payload = @{
        id = "cal-test-123"
        startTime = "2025-12-06T10:00:00Z"
        endTime = "2025-12-06T10:15:00Z"
        status = "ACCEPTED"
        metadata = @{
            videoCallUrl = "https://example.com/meet/abc"
        }
        responses = @{
            lead_id = @{
                value = "LD-103"
            }
            salesperson_id = @{
                value = "2cf547d6-ccd0-4bcd-8222-86f075e5c110"
            }
            email = @{
                value = "test@example.com"
            }
            name = @{
                value = "Test User"
            }
        }
    }
} | ConvertTo-Json -Depth 10

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/cal-webhook" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

