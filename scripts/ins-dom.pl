# Insereaza un bloc de traduceri pe slug intr-un fisier de limba.
#
#   perl ins-dom.pl <tabel.txt> <coloana 2|3> <fisier.json> [nume-bloc]
#
# Tabelul are slug|engleza|romana pe fiecare linie. Coloana 2 = engleza,
# 3 = romana. Numele blocului e "domains" daca nu se da altul.
#
# Nu escapeaza nimic: refuza in schimb orice text cu ghilimele sau backslash,
# fiindca un escape gresit intr-un fisier de limba se vede abia cand pagina
# ramane goala intr-o limba pe care nu o citeste nimeni.
use strict;
use warnings;

my ($table, $col, $file, $block) = @ARGV;
$block = "domains" unless defined $block && length $block;

open my $fh, '<:encoding(UTF-8)', $table or die "nu pot citi $table: $!";
my @rows;
while (my $l = <$fh>) {
  chomp $l;
  next if $l eq '';
  my @p = split /\|/, $l, 3;
  die "linie stricata: $l\n" unless @p == 3;
  push @rows, [ $p[0], $p[$col - 1] ];
}
close $fh;

for my $r (@rows) {
  die "ghilimele sau backslash in '$r->[1]'\n" if $r->[1] =~ /["\\]/;
}

open my $in, '<:encoding(UTF-8)', $file or die "nu pot citi $file: $!";
my $body = do { local $/; <$in> };
close $in;

# Nivel superior si obiect: exista si alte chei cu acelasi nume mai jos in
# fisier, si o garda lacoma pe ele ar sari peste tot fara sa spuna nimic.
if ($body =~ /^  "\Q$block\E"\s*:\s*\{/m) {
  print "  $file: are deja bloc $block -- sarit\n";
  exit 0;
}

my $json = qq{  "$block": \{\n}
  . join(",\n", map { qq{    "$_->[0]": "$_->[1]"} } @rows)
  . qq{\n  \},\n};

unless ($body =~ s/\A\{\n/\{\n$json/) {
  print "  $file: nu incepe cu acolada -- sarit\n";
  exit 1;
}

open my $out, '>:encoding(UTF-8)', $file or die "nu pot scrie $file: $!";
print $out $body;
close $out;
print "  $file: " . scalar(@rows) . " chei in $block\n";
