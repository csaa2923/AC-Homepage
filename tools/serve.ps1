$root = "C:\GitHub\AC-Homepage"
$port = 9123
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try {
  $listener.Start()
} catch {
  Write-Error "Could not start listener on port ${port}: $_"
  exit 1
}
Write-Host "Serving $root at http://127.0.0.1:$port/"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $path = [Uri]::UnescapeDataString($context.Request.Url.LocalPath.TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root ($path -replace '/', [IO.Path]::DirectorySeparatorChar)))
      if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Forbidden"
      }
      if (Test-Path $file -PathType Leaf) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
        $type = switch ($ext) {
          '.html' { 'text/html; charset=utf-8' }
          '.css'  { 'text/css; charset=utf-8' }
          '.js'   { 'application/javascript; charset=utf-8' }
          '.jpg'  { 'image/jpeg' }
          '.jpeg' { 'image/jpeg' }
          '.png'  { 'image/png' }
          '.webp' { 'image/webp' }
          '.ico'  { 'image/x-icon' }
          '.mp4'  { 'video/mp4' }
          '.xml'  { 'application/xml; charset=utf-8' }
          '.txt'  { 'text/plain; charset=utf-8' }
          default { 'application/octet-stream' }
        }
        $context.Response.StatusCode = 200
        $context.Response.ContentType = $type
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $context.Response.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes("Not Found: $path")
        $context.Response.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      $context.Response.StatusCode = 403
      $msg = [Text.Encoding]::UTF8.GetBytes('Forbidden')
      $context.Response.OutputStream.Write($msg, 0, $msg.Length)
    } finally {
      $context.Response.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
