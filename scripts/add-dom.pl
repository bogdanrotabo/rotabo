# Adauga cheile lipsa intr-un bloc care exista deja intr-un fisier de limba.
#
#   perl add-dom.pl <tabel.txt> <coloana 2|3> <fisier.json> <nume-bloc>
#
# Spre deosebire de ins-dom.pl, care creeaza blocul si sare daca il gaseste,
# asta il pastreaza si pune inauntru doar slugurile care nu sunt deja acolo.
# Asa se poate creste lista fara sa se rescrie ce e tradus.
use strict;
use warnings;

my ($table, $col, $file, $block) = @ARGV;
die "lipseste numele blocului\n" unless defined $block && length $block;

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

# Blocul, de la deschidere pana la acolada lui de inchidere pe doua spatii.
unless ($body =~ /^(  "\Q$block\E": \{\n)((?:.*?\n)*?)(  \},\n)/m) {
  print "  $file: nu gasesc blocul $block\n";
  exit 1;
}
# Copiate imediat: orice alt regex de mai jos rescrie $1..$3, si prima
# versiune a folosit $2 la inlocuire dupa ce grep-ul il golise.
my ($open, $inner, $close) = ($1, $2, $3);
my $orig = $open . $inner . $close;

my @missing = grep { $inner !~ /^\s*"\Q$_->[0]\E"\s*:/m } @rows;
unless (@missing) {
  print "  $file: $block e complet\n";
  exit 0;
}

$inner =~ s/\n\z//;
$inner .= ",\n" unless $inner =~ /,\s*$/;
$inner .= join(",\n", map { qq{    "$_->[0]": "$_->[1]"} } @missing) . "\n";

my $new = $open . $inner . $close;
my $old = quotemeta($orig);
$body =~ s/$old/$new/ or die "  $file: nu pot inlocui blocul\n";

open my $out, '>:encoding(UTF-8)', $file or die "nu pot scrie $file: $!";
print $out $body;
close $out;
print "  $file: " . scalar(@missing) . " chei adaugate in $block\n";
