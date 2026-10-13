# ============================================================================
# generate-icons.ps1 — Generator ikon PWA Bayt Mustaqbal DARI LOGO KAKANG.
#
#   npm run icons            (Windows PowerShell, tanpa dependensi Node)
#
# Sumber tunggal: assets/logo.png
#   - Konten dipotong (trim) mengikuti kotak transparan → logo selalu pas tengah.
#   - Ikon PWA (any/maskable/apple/favicon) = latar NAVY #0A192F.
#       Alasan: artwork mayoritas terang (putih/abu/cyan) → butuh latar gelap
#       agar kontras; navy juga = warna tema app + manifest background_color.
#       maskable diberi ruang aman (konten ~68%) supaya tidak terpotong mask bulat.
#   - Aset dalam-app: public/brand/logo.png (transparan, hasil trim) untuk
#       mark di header & layar gerbang.
#
# Kalau Kakang mau latar transparan/putih untuk ikon, ubah nilainya di
# bagian KONFIGURASI di bawah lalu jalankan ulang `npm run icons`.
# ============================================================================

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# ------------------------------- KONFIGURASI -------------------------------
$root     = Split-Path -Parent $PSScriptRoot
$srcPath  = Join-Path $root 'assets\logo.png'
$outIcons = Join-Path $root 'public\icons'
$outBrand = Join-Path $root 'public\brand'

# Latar ikon PWA. Pakai alpha 0 untuk transparan, mis. [System.Drawing.Color]::Transparent
$IconBg   = [System.Drawing.Color]::FromArgb(255, 0x0A, 0x19, 0x2F)  # #0A192F navy

# Rasio ukuran konten terhadap sisi ikon (0..1)
$RatioAny      = 0.86   # icon-<n>.png  (purpose "any")
$RatioMaskable = 0.68   # maskable-<n>.png (safe zone)
$RatioApple    = 0.86   # apple-touch-icon.png
$RatioFavicon  = 0.92   # favicon.ico (kecil → isi lebih penuh)
$BrandMaxPx    = 256    # public/brand/logo.png (sisi terpanjang, transparan; cukup utk 3x dari 64px)
# ---------------------------------------------------------------------------

if (-not (Test-Path $srcPath)) { throw "Logo tidak ditemukan: $srcPath" }
New-Item -ItemType Directory -Force -Path $outIcons, $outBrand | Out-Null

# --- utils C#: bounding box konten (alpha > 16) ----------------------------
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public class LogoBox {
  public static int[] Bbox(string path) {
    using (var bmp = new Bitmap(path)) {
      int w = bmp.Width, h = bmp.Height;
      var d = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      int st = d.Stride;
      byte[] buf = new byte[st * h];
      Marshal.Copy(d.Scan0, buf, 0, buf.Length);
      bmp.UnlockBits(d);
      int minX = w, minY = h, maxX = -1, maxY = -1;
      for (int y = 0; y < h; y++) {
        int row = y * st;
        for (int x = 0; x < w; x++) {
          if (buf[row + x * 4 + 3] > 16) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) throw new Exception("Logo tidak punya piksel yang terlihat (semua transparan).");
      return new int[] { minX, minY, maxX - minX + 1, maxY - minY + 1 };
    }
  }
}
'@ -ReferencedAssemblies System.Drawing

$src  = New-Object System.Drawing.Bitmap($srcPath)
$box  = [LogoBox]::Bbox($srcPath)
$rect = New-Object System.Drawing.Rectangle($box[0], $box[1], $box[2], $box[3])
# Konten ter-trim (buang pinggiran transparan) — inilah yang dipakai semua ikon.
$content = $src.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

function New-IconBitmap([int]$size, [double]$ratio, [System.Drawing.Color]$bg) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear($bg)
    $target = [double]$size * $ratio
    $scale  = [Math]::Min($target / $content.Width, $target / $content.Height)
    $dw = [int][Math]::Round($content.Width  * $scale)
    $dh = [int][Math]::Round($content.Height * $scale)
    $dx = [int][Math]::Round(($size - $dw) / 2.0)
    $dy = [int][Math]::Round(($size - $dh) / 2.0)
    $g.DrawImage($content, $dx, $dy, $dw, $dh)
  } finally {
    $g.Dispose()
  }
  return $bmp
}

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Get-PngBytes([System.Drawing.Bitmap]$bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $ms.ToArray()
  $ms.Dispose()
  return ,$bytes
}

# --- ICO multi-ukuran (PNG di dalam ICO) -----------------------------------
function Write-Ico([int[]]$sizes, [double]$ratio, [System.Drawing.Color]$bg, [string]$path) {
  $entries = @()
  foreach ($s in $sizes) {
    $b = New-IconBitmap $s $ratio $bg
    $entries += [pscustomobject]@{ size = $s; bytes = (Get-PngBytes $b) }
    $b.Dispose()
  }
  $fs = [System.IO.File]::Create($path)
  $bw = New-Object System.IO.BinaryWriter($fs)
  try {
    $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$entries.Count)
    $offset = 6 + 16 * $entries.Count
    foreach ($e in $entries) {
      $dim = if ($e.size -ge 256) { [byte]0 } else { [byte]$e.size }
      $bw.Write($dim); $bw.Write($dim); $bw.Write([byte]0); $bw.Write([byte]0)
      $bw.Write([UInt16]1); $bw.Write([UInt16]32)
      $bw.Write([UInt32]$e.bytes.Length); $bw.Write([UInt32]$offset)
      $offset += $e.bytes.Length
    }
    foreach ($e in $entries) { $bw.Write($e.bytes) }
  } finally {
    $bw.Flush(); $bw.Dispose(); $fs.Dispose()
  }
}

$written = @()

foreach ($s in 72, 96, 128, 144, 152, 192, 384, 512) {
  $b = New-IconBitmap $s $RatioAny $IconBg
  $p = Join-Path $outIcons "icon-$s.png"
  Save-Png $b $p; $b.Dispose()
  $written += [pscustomobject]@{ name = "icon-$s.png"; bytes = (Get-Item $p).Length }
}

foreach ($s in 192, 512) {
  $b = New-IconBitmap $s $RatioMaskable $IconBg
  $p = Join-Path $outIcons "maskable-$s.png"
  Save-Png $b $p; $b.Dispose()
  $written += [pscustomobject]@{ name = "maskable-$s.png"; bytes = (Get-Item $p).Length }
}

$b = New-IconBitmap 180 $RatioApple $IconBg
$p = Join-Path $outIcons 'apple-touch-icon.png'
Save-Png $b $p; $b.Dispose()
$written += [pscustomobject]@{ name = 'apple-touch-icon.png'; bytes = (Get-Item $p).Length }

$p = Join-Path $outIcons 'favicon.ico'
Write-Ico @(16, 32, 48) $RatioFavicon $IconBg $p
$written += [pscustomobject]@{ name = 'favicon.ico'; bytes = (Get-Item $p).Length }

# --- Aset dalam-app (transparan, hasil trim) -------------------------------
$scale = [Math]::Min($BrandMaxPx / $content.Width, $BrandMaxPx / $content.Height)
$bw2 = [int][Math]::Round($content.Width * $scale)
$bh2 = [int][Math]::Round($content.Height * $scale)
$brand = New-Object System.Drawing.Bitmap($bw2, $bh2, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($brand)
try {
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($content, 0, 0, $bw2, $bh2)
} finally { $g.Dispose() }
$p = Join-Path $outBrand 'logo.png'
Save-Png $brand $p; $brand.Dispose()
$written += [pscustomobject]@{ name = 'brand/logo.png'; bytes = (Get-Item $p).Length }

$content.Dispose(); $src.Dispose()

Write-Output "Ikon dibuat di $outIcons (dari assets/logo.png)"
Write-Output ("  sumber konten ter-trim: {0}x{1} px" -f $box[2], $box[3])
foreach ($f in $written) {
  Write-Output ("  {0,-24} {1,7:N1} kB" -f $f.name, ($f.bytes / 1024))
}
