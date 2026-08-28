# Citeste biz-texts.txt (##cod urmat de 11 linii) si insereaza blocul
# "business" in fisierele de limba primite pe linia de comanda.
#
# Nu escapeaza nimic: refuza in schimb orice text care contine ghilimele sau
# backslash, fiindca un escape gresit intr-un fisier de limba se vede abia
# cand pagina ramane goala intr-o limba pe care nu o citeste nimeni.
use strict;
use warnings;

my ($txt, @codes) = @ARGV;
open my $fh, '<:encoding(UTF-8)', $txt or die "nu pot citi $txt: $!";
my (%T, $cur);
while (my $l = <$fh>) {
  chomp $l;
  if ($l =~ /^##(\w+)$/) { $cur = $1; $T{$cur} = []; next; }
  next unless defined $cur;
  next if $l eq '';
  push @{ $T{$cur} }, $l;
}
close $fh;

for my $c (@codes) {
  my $f = "$c.json";
  unless (exists $T{$c})      { print "  $c: LIPSA din tabel\n"; next; }
  my @v = @{ $T{$c} };
  unless (@v == 11)           { print "  $c: " . scalar(@v) . " linii, astept 11 -- sarit\n"; next; }
  if (grep { /["\\]/ } @v)    { print "  $c: text cu ghilimele sau backslash -- sarit\n"; next; }

  open my $in, '<:encoding(UTF-8)', $f or do { print "  $c: nu pot citi\n"; next; };
  my $body = do { local $/; <$in> };
  close $in;
  # Nivel superior si obiect, nu orice cheie care se cheama la fel: exista
  # deja un nav.business, si o gardă lacoma pe el a sarit peste toate
  # fisierele fara sa spuna nimic gresit.
  if ($body =~ /^  "business"\s*:\s*\{/m) { print "  $c: are deja bloc business -- sarit\n"; next; }

  my $block =
      qq{  "business": \{\n}
    . qq{    "hero": \{ "free_line": "$v[0]" \},\n}
    . qq{    "categories": \{\n}
    . qq{      "section_eyebrow": "$v[1]",\n}
    . qq{      "section_lead": "$v[2]",\n}
    . qq{      "need_btn": "$v[3]",\n}
    . qq{      "offer_btn": "$v[4]"\n}
    . qq{    \},\n}
    . qq{    "choose": \{\n}
    . qq{      "need_title": "$v[5]",\n}
    . qq{      "need_text": "$v[6]",\n}
    . qq{      "need_btn": "$v[7]",\n}
    . qq{      "offer_title": "$v[8]",\n}
    . qq{      "offer_text": "$v[9]",\n}
    . qq{      "offer_btn": "$v[10]"\n}
    . qq{    \}\n}
    . qq{  \},\n};

  unless ($body =~ s/\A\{\n/\{\n$block/) { print "  $c: nu incepe cu acolada -- sarit\n"; next; }

  open my $out, '>:encoding(UTF-8)', $f or do { print "  $c: nu pot scrie\n"; next; };
  print $out $body;
  close $out;
  print "  $c: inserat\n";
}
