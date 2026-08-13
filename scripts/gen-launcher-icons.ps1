Add-Type -AssemblyName System.Drawing

$src = "C:\Users\#234\MULTI\public\logo\multi_logo_512x512.png"
$resRoot = "C:\Users\#234\MULTI\android\app\src\main\res"

$sizes = @{
  "mdpi"   = @{ legacy = 48;  fg = 108 }
  "hdpi"   = @{ legacy = 72;  fg = 162 }
  "xhdpi"  = @{ legacy = 96;  fg = 216 }
  "xxhdpi" = @{ legacy = 144; fg = 324 }
  "xxxhdpi"= @{ legacy = 192; fg = 432 }
}

$source = [System.Drawing.Image]::FromFile($src)

function New-CanvasBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return @{ bmp = $bmp; g = $g }
}

function Draw-CenteredLogo($g, [int]$canvasSize, [double]$coverage) {
  $logoSize = [int]($canvasSize * $coverage)
  $offset = [int](($canvasSize - $logoSize) / 2)
  $g.DrawImage($source, $offset, $offset, $logoSize, $logoSize)
}

foreach ($density in $sizes.Keys) {
  $legacySize = $sizes[$density].legacy
  $fgSize = $sizes[$density].fg
  $dir = Join-Path $resRoot "mipmap-$density"

  # ── ic_launcher_foreground.png (adaptive icon layer) — transparente,
  # logo a 72% do canvas (o PNG fonte já tem margem interna, então a tinta
  # real fica bem dentro da safe zone de 66% que os launchers usam pra
  # cortar em círculo/squircle).
  $c = New-CanvasBitmap $fgSize
  Draw-CenteredLogo $c.g $fgSize 0.72
  $c.g.Dispose()
  $c.bmp.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $c.bmp.Dispose()

  # ── ic_launcher.png (ícone legado, pré-Android 8 / fallback) — fundo
  # branco sólido (mesma cor do background do ícone adaptativo), logo a 80%.
  $c = New-CanvasBitmap $legacySize
  $c.g.Clear([System.Drawing.Color]::White)
  Draw-CenteredLogo $c.g $legacySize 0.80
  $c.g.Dispose()
  $c.bmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $c.bmp.Dispose()

  # ── ic_launcher_round.png — igual ao legado, mas recortado num círculo
  # (fora do círculo fica transparente, como o Android espera pra esse
  # recurso).
  $c = New-CanvasBitmap $legacySize
  $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clipPath.AddEllipse(0, 0, $legacySize, $legacySize)
  $c.g.SetClip($clipPath)
  $c.g.Clear([System.Drawing.Color]::White)
  Draw-CenteredLogo $c.g $legacySize 0.80
  $c.g.Dispose()
  $c.bmp.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $c.bmp.Dispose()

  Write-Host "OK $density (legacy ${legacySize}px, foreground ${fgSize}px)"
}

$source.Dispose()
Write-Host "Done."
