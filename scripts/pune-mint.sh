#!/usr/bin/env bash
#
# The contract address, put everywhere it belongs.
#
#   bash scripts/pune-mint.sh <mint>            verifies, then edits
#   VERIFICA_DOAR=1 bash scripts/pune-mint.sh <mint>   verifies only
#
# Two places are edited here: TOKEN.MINT at the head of the script in
# crypto.html, and `var MINT` in the band script at the foot of index.html.
# Editing one and forgetting the other is the failure this script exists to
# prevent -- the page would link to the coin while the band on the home page
# still said the address was coming.
#
# Everything else that carries the address -- the markup of the box, the three
# descriptions a link preview reads, the JSON-LD -- is derived from TOKEN.MINT
# by scripts/build-crypto.mjs, which runs in step 4.
#
# Nothing is written until pump.fun has been asked two questions: does
# /coin/<mint> answer 200, and is the coin there ours -- name Rotabo, ticker
# Rotabo. A squatter can mint a coin called Rotabo the minute the launch is
# announced, so a name that matches is checked, not assumed, and everything the
# API returns about the creator is printed for a human to look at.
set -euo pipefail

MINT="${1:-}"
if [ -z "$MINT" ]; then
  echo "folosire: bash scripts/pune-mint.sh <adresa-mint>" >&2
  exit 2
fi
cd "$(dirname "$0")/.."

echo "== 1. https://pump.fun/coin/$MINT"
cod=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 \
      -H 'user-agent: Mozilla/5.0' "https://pump.fun/coin/$MINT")
echo "   HTTP $cod"
if [ "$cod" != "200" ]; then
  echo "   nu raspunde 200 -- nu scriu nimic in pagini" >&2
  exit 1
fi

echo "== 2. ce spune pump.fun despre moneda"
curl -s --max-time 30 -H 'accept: application/json' -H 'user-agent: Mozilla/5.0' \
     "https://frontend-api-v3.pump.fun/coins/$MINT" > /tmp/moneda.json
node -e '
const c = JSON.parse(require("fs").readFileSync("/tmp/moneda.json", "utf8"));
if (c.error || !c.mint) { console.error("   " + (c.message || "moneda nu exista")); process.exit(1); }
const camp = ["name","symbol","creator","image_uri","twitter","website","created_timestamp","description"];
for (const k of camp) if (c[k] !== undefined && c[k] !== "") {
  const v = k === "created_timestamp" ? new Date(c[k]).toISOString() : String(c[k]).slice(0, 120);
  console.log("   " + k.padEnd(18) + v);
}
const nume = (c.name || "").trim().toLowerCase();
const tic  = (c.symbol || "").trim().toLowerCase();
if (nume !== "rotabo" || tic !== "rotabo") {
  console.error("\n   NU se potriveste: astept nume Rotabo si ticker Rotabo, am gasit \"" +
                c.name + "\" / \"" + c.symbol + "\".");
  process.exit(1);
}
console.log("\n   nume si ticker se potrivesc.");
'

if [ -n "${VERIFICA_DOAR:-}" ]; then
  echo "== verificare doar; nu am scris nimic."
  exit 0
fi

echo "== 3. crypto.html si index.html"
pune () {   # fisier, linia goala, linia plina
  local f="$1" gol="$2" plin="$3"
  local n; n=$(grep -Fc -- "$gol" "$f" || true)
  if [ "$n" != "1" ]; then
    echo "   $f: astept 1 linie \"$gol\", am gasit $n -- nu ating fisierul" >&2
    exit 1
  fi
  python3 - "$f" "$gol" "$plin" <<'PY'
import sys, pathlib
f, gol, plin = sys.argv[1], sys.argv[2], sys.argv[3]
p = pathlib.Path(f); s = p.read_text(encoding="utf-8")
assert s.count(gol) == 1, f
p.write_text(s.replace(gol, plin), encoding="utf-8")
PY
  echo "   $f  <- $plin"
}

pune crypto.html "  MINT:     ''," "  MINT:     '$MINT',"
pune index.html  "  var MINT = '';" "  var MINT = '$MINT';"

echo "== 4. fisierele derivate"
node scripts/build-crypto.mjs
node scripts/build-business.mjs
node scripts/build-sw.mjs

echo "== 5. ce s-a schimbat"
git diff --stat
echo
echo "gata local. mai ramane: git add -A && git commit && git push -u origin main"
