# Rotabo — generate the PNG icons and the Open Graph image from the mark.
#
#   powershell -ExecutionPolicy Bypass -File scripts\make-icons.ps1
#
# Uses System.Drawing from the Windows runtime, so it needs no Node, no Python
# and no image tooling. Re-run it whenever the mark changes.
#
# The mark is two rounded rhombi side by side: the violet one and, since the
# yellow was chosen off a fish's tail, its gold twin. Both are drawn from the
# same path and the same three-stop radial gradient the pages use, so the
# favicon and the header logo cannot drift apart.

Add-Type -AssemblyName System.Drawing

$root  = Split-Path -Parent $PSScriptRoot
$icons = Join-Path $root 'icons'
if (-not (Test-Path $icons)) { New-Item -ItemType Directory -Path $icons | Out-Null }

# The path from the pages, in its own 200x260 box.
$VW = 200.0
$VH = 260.0

# The two gradients, centre first. Same values as #diamondGrad and #diamondGold.
$VIOLET = @('#c264e0', '#a239c9', '#7c2596')
$GOLD   = @('#ffe873', '#ffd41a', '#e0a005')

function C([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

# A quadratic segment in cubic terms, which is all GraphicsPath speaks.
function Add-Quad($path, $x0, $y0, $qx, $qy, $x2, $y2) {
    $c1x = $x0 + 2.0 / 3.0 * ($qx - $x0); $c1y = $y0 + 2.0 / 3.0 * ($qy - $y0)
    $c2x = $x2 + 2.0 / 3.0 * ($qx - $x2); $c2y = $y2 + 2.0 / 3.0 * ($qy - $y2)
    $path.AddBezier([single]$x0, [single]$y0, [single]$c1x, [single]$c1y,
                    [single]$c2x, [single]$c2y, [single]$x2, [single]$y2)
}

# M118.15,28.88 Q100,5 81.85,28.88 L23.15,106.12 Q5,130 23.15,153.88
# L81.85,231.12 Q100,255 118.15,231.12 L176.85,153.88 Q195,130 176.85,106.12 Z
function New-DiamondPath([double]$ox, [double]$oy, [double]$w, [double]$h) {
    $sx = $w / $VW; $sy = $h / $VH
    function P($x, $y) { return @(($ox + $x * $sx), ($oy + $y * $sy)) }
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath

    $a = P 118.15 28.88 ; $b = P 100 5      ; $c = P 81.85 28.88
    Add-Quad $p $a[0] $a[1] $b[0] $b[1] $c[0] $c[1]
    $d = P 23.15 106.12
    $p.AddLine([single]$c[0], [single]$c[1], [single]$d[0], [single]$d[1])
    $e = P 5 130 ; $f = P 23.15 153.88
    Add-Quad $p $d[0] $d[1] $e[0] $e[1] $f[0] $f[1]
    $g = P 81.85 231.12
    $p.AddLine([single]$f[0], [single]$f[1], [single]$g[0], [single]$g[1])
    $h2 = P 100 255 ; $i = P 118.15 231.12
    Add-Quad $p $g[0] $g[1] $h2[0] $h2[1] $i[0] $i[1]
    $j = P 176.85 153.88
    $p.AddLine([single]$i[0], [single]$i[1], [single]$j[0], [single]$j[1])
    $k = P 195 130 ; $l = P 176.85 106.12
    Add-Quad $p $j[0] $j[1] $k[0] $k[1] $l[0] $l[1]
    $p.CloseFigure()
    return $p
}

# The SVG gradient is cx/cy 50%, r 75% in objectBoundingBox units, so in a
# 200x260 box it is an ellipse of 150x195, not a circle. Drawing it on that
# ellipse and clipping to the diamond is what keeps the icon the same colour
# as the page; a brush built on the diamond itself would end the gradient at
# the rim and wash the corners out.
function Fill-Diamond($g, $path, [string[]]$stops, [double]$ox, [double]$oy, [double]$w, [double]$h) {
    $cx = $ox + $w / 2.0; $cy = $oy + $h / 2.0
    $rx = $w * 0.75; $ry = $h * 0.75

    $ell = New-Object System.Drawing.Drawing2D.GraphicsPath
    $ell.AddEllipse([single]($cx - $rx), [single]($cy - $ry), [single]($rx * 2), [single]($ry * 2))

    $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush($ell)
    $brush.CenterPoint = New-Object System.Drawing.PointF([single]$cx, [single]$cy)
    # PathGradientBrush runs 0 at the rim and 1 at the centre, the opposite
    # way round from an SVG stop offset, so the stops go in backwards.
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend(3)
    $blend.Colors    = @((C $stops[2]), (C $stops[1]), (C $stops[0]))
    $blend.Positions = @([single]0.0, [single]0.55, [single]1.0)
    $brush.InterpolationColors = $blend

    $old = $g.Clip
    $g.SetClip($path)
    $g.FillPath($brush, $ell)
    $g.Clip = $old

    $brush.Dispose(); $ell.Dispose()
}

function New-Canvas([int]$w, [int]$h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    return @{ Bitmap = $bmp; Graphics = $g }
}

# The pair, centred in a box, as large as it can be while both fit.
function Draw-Pair($g, [double]$boxX, [double]$boxY, [double]$boxW, [double]$boxH) {
    # width of one = dw, gap = 0.07*dw, so the pair spans 2.07*dw and stands 1.3*dw.
    $dw = [Math]::Min($boxW / 2.07, $boxH / ($VH / $VW))
    $dh = $dw * $VH / $VW
    $gap = $dw * 0.07
    $totW = $dw * 2 + $gap
    $x0 = $boxX + ($boxW - $totW) / 2.0
    $y0 = $boxY + ($boxH - $dh) / 2.0

    $p1 = New-DiamondPath $x0 $y0 $dw $dh
    Fill-Diamond $g $p1 $VIOLET $x0 $y0 $dw $dh
    $x1 = $x0 + $dw + $gap
    $p2 = New-DiamondPath $x1 $y0 $dw $dh
    Fill-Diamond $g $p2 $GOLD $x1 $y0 $dw $dh
    $p1.Dispose(); $p2.Dispose()
}

function Save-Icon([int]$size, [double]$pad, [string]$name, [string]$bg) {
    $c = New-Canvas $size $size
    if ($bg) {
        $b = New-Object System.Drawing.SolidBrush((C $bg))
        $c.Graphics.FillRectangle($b, 0, 0, $size, $size)
        $b.Dispose()
    }
    $inset = $size * $pad
    Draw-Pair $c.Graphics $inset $inset ($size - $inset * 2) ($size - $inset * 2)
    $out = Join-Path $icons $name
    $c.Bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $c.Graphics.Dispose(); $c.Bitmap.Dispose()
    "  {0,-28} {1}x{1}" -f $name, $size
}

Save-Icon  32 0.02 'favicon-32.png'          $null
Save-Icon 180 0.04 'apple-touch-icon-180.png' $null
Save-Icon 192 0.04 'icon-192.png'             $null
Save-Icon 512 0.04 'icon-512.png'             $null
# Maskable icons get cropped to a circle by the launcher, so everything has to
# sit inside the middle 80% and the corners cannot be transparent.
Save-Icon 512 0.22 'icon-512-maskable.png'    '#faf2fd'

# ---------------------------------------------------------------- og-image

$W = 1200; $H = 630
$c = New-Canvas $W $H
$g = $c.Graphics

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(0, $H)),
    (C '#fdf5ff'), (C '#f4e6f9'))
$g.FillRectangle($bgBrush, 0, 0, $W, $H)
$bgBrush.Dispose()

Draw-Pair $g 60 150 460 330

$dark   = New-Object System.Drawing.SolidBrush((C '#2b0f36'))
$violet = New-Object System.Drawing.SolidBrush((C '#a239c9'))
$grey   = New-Object System.Drawing.SolidBrush((C '#6b5470'))
# The tail colour itself, the same one the pages use for .me-gold and the
# same one in the diamond above it. Faint on this pale ground -- that is a
# known cost of using the mark's own yellow for words, and it is the colour
# that was asked for.
$gold   = New-Object System.Drawing.SolidBrush((C '#ffd41a'))

$fBig  = New-Object System.Drawing.Font('Segoe UI', 62, [System.Drawing.FontStyle]::Bold)
$fSub  = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Regular)
$fLink = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Bold)

# GenericTypographic drops a trailing space when it measures, which ran
# "Need" straight into "me?". MeasureTrailingSpaces is what puts the gap back.
$fmt = [System.Drawing.StringFormat]::GenericTypographic.Clone()
$fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces

# "Need" and "Find" violet, both "me" gold -- the same split the headline on
# the site makes, so the card and the page read as one thing. The second half
# is measured rather than guessed: the width of the first depends on the font
# that actually resolved.
function Draw-TwoTone($g, [string]$a, [string]$b, $font, $brushA, $brushB, [double]$x, [double]$y, $fmt) {
    $g.DrawString($a, $font, $brushA, [single]$x, [single]$y, $fmt)
    $w = $g.MeasureString($a, $font, 2000, $fmt).Width
    $g.DrawString($b, $font, $brushB, [single]($x + $w), [single]$y, $fmt)
}

Draw-TwoTone $g 'Need ' 'me?' $fBig $violet $gold 566 168 $fmt
Draw-TwoTone $g 'Find ' 'me.' $fBig $violet $gold 566 258 $fmt
$g.DrawString('Translators, drivers, movers,', $fSub, $grey, [single]566, [single]372)
$g.DrawString('tutors, handymen - worldwide.', $fSub, $grey, [single]566, [single]414)
# "rotabo." violet, "app" gold: the wordmark says the same thing the pair of
# diamonds above it does. Measured rather than guessed, because the width of
# "rotabo." depends on the font that actually resolved.
$head = 'rotabo.'
$wHead = $g.MeasureString($head, $fLink, 1000, $fmt).Width
$g.DrawString($head, $fLink, $violet, [single]566, [single]474, $fmt)
$g.DrawString('app', $fLink, $gold, [single](566 + $wHead), [single]474, $fmt)

$c.Bitmap.Save((Join-Path $root 'og-image.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $c.Bitmap.Dispose()
'  {0,-28} {1}x{2}' -f 'og-image.png', $W, $H

''
'Gata. Marca: rombul violet plus geamanul lui auriu.'
