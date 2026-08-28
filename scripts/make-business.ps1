# Rotabo — generate business.html from index.html.
#
#   powershell -ExecutionPolicy Bypass -File scripts\make-business.ps1
#
# RUN THIS AFTER EVERY EDIT TO index.html. business.html is generated, never
# edited by hand; anything typed into it is lost the next time this runs.
#
# The business side is the same site with the palette swapped, so it is the
# same file with four things changed rather than a second copy to maintain:
#
#   1. data-mode="business" on <html>, which is what the yellow palette in
#      the stylesheet keys off. One attribute, and every fill that was violet
#      is yellow with violet lettering on it.
#   2. The yellow nav box points back to the personal side instead of to
#      itself, and says so.
#   3. The <title> and the Open Graph title say which side of the site this
#      is, because a shared link that says nothing is a link nobody opens.
#   4. The canonical URL, so the two pages are not read as duplicates.

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'index.html'
$dst  = Join-Path $root 'business.html'
$utf8 = [System.Text.UTF8Encoding]::new($false)

$h = [System.IO.File]::ReadAllText($src, $utf8)
$before = $h.Length
$changes = 0

function Swap([string]$text, [string]$from, [string]$to, [string]$label) {
    if ($text -notlike "*$from*") {
        Write-Host ("  LIPSESTE: {0}" -f $label) -ForegroundColor Red
        $script:missing++
        return $text
    }
    $script:changes++
    Write-Host ("  {0}" -f $label)
    return $text.Replace($from, $to)
}
$missing = 0

# 1. the palette switch
$h = Swap $h '<html lang="en">' '<html lang="en" data-mode="business">' 'data-mode pe <html>'

# 2. the way back
$h = Swap $h '<a class="biz" href="/business.html" data-i18n="nav.business">Business</a>' `
            '<a class="biz" href="/" data-i18n="nav.personal">For people</a>' `
            'caseta din antet trimite inapoi'

# 3. what the tab and a shared link say. The em dash is built rather than
# typed: PowerShell 5.1 reads a UTF-8 script with no BOM as ANSI, so a dash
# pasted in here arrives as two bytes of nonsense and the match fails. That
# is exactly what the guard above caught the first time this ran.
$dash = [char]0x2014
$h = Swap $h "<title>Rotabo $dash Need Me? Find Me!</title>" `
            "<title>Rotabo for business $dash Need Me? Find Me!</title>" `
            'titlul paginii'

# 4. canonical, so this is not read as a duplicate of the front page
$h = Swap $h '<link rel="canonical" href="https://rotabo.app/">' `
            '<link rel="canonical" href="https://rotabo.app/business.html">' `
            'canonical'

if ($missing -gt 0) {
    Write-Host ""
    Write-Host ("OPRIT: {0} ancore nu s-au gasit in index.html." -f $missing) -ForegroundColor Red
    Write-Host "business.html NU a fost rescris. Actualizeaza ancorele din acest script."
    exit 1
}

[System.IO.File]::WriteAllText($dst, $h, $utf8)
Write-Host ""
Write-Host ("business.html scris: {0} modificari, {1} KB" -f $changes, [Math]::Round($h.Length / 1024))
