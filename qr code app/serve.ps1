$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$allowed = @('index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icon.svg', 'service-worker.js', 'assets/wallet-art.png', 'assets/wallet-app-icon.png')
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'application/javascript; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg' = 'image/svg+xml'
  '.png' = 'image/png'
}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), 8765)
$listener.Start()
Write-Output 'qrly server listening on http://127.0.0.1:8765'
while ($true) {
  $client = $null
  try {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    if (-not $requestLine) { $client.Close(); continue }
    $parts = $requestLine.Split(' ')
    $method = $parts[0]
    $path = if ($parts.Length -gt 1) { $parts[1].Split('?')[0] } else { '/' }
    while ($reader.ReadLine() -ne '') { }
    $relative = [Uri]::UnescapeDataString($path).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
    $code = 200; $body = [byte[]]@(); $contentType = 'text/plain; charset=utf-8'
    if ($method -notin @('GET', 'HEAD') -or $relative -notin $allowed) {
      $code = 404; $body = [Text.Encoding]::UTF8.GetBytes('Not found')
    } else {
      $file = Join-Path $root $relative
      if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { $code = 404; $body = [Text.Encoding]::UTF8.GetBytes('Not found') }
      else { $contentType = $mime[[IO.Path]::GetExtension($file)]; $body = [IO.File]::ReadAllBytes($file) }
    }
    $reason = if ($code -eq 200) { 'OK' } else { 'Not Found' }
    $header = "HTTP/1.1 $code $reason`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store, no-cache, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($method -eq 'GET') { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
  } catch {
    Write-Output $_.Exception.Message
  } finally {
    if ($client) { $client.Close() }
  }
}
