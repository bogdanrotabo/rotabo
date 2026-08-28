# Insereaza blocul "domains" intr-un fisier de limba, din domain-labels.txt.
#   perl ins-dom.pl <labels.txt> <coloana 2|3> <fisier.json>
# Coloana 2 = engleza, 3 = romana.
use strict;
use warnings;

my ($labels, $col, $file) = @ARGV;
open my $fh, '<:encoding(UTF-8)', $labels or die "nu pot citi $labels: $!";
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

if ($body =~ /^  "domains"\s*:\s*\{/m) {
  print "  $file: are deja bloc domains -- sarit\n";
  exit 0;
}

my $block = qq{  "domains": \{\n}
  . join(",\n", map { qq{    "$_->[0]": "$_->[1]"} } @rows)
  . qq{\n  \},\n};

unless ($body =~ s/\A\{\n/\{\n$block/) {
  print "  $file: nu incepe cu acolada -- sarit\n";
  exit 1;
}

open my $out, '>:encoding(UTF-8)', $file or die "nu pot scrie $file: $!";
print $out $body;
close $out;
print "  $file: " . scalar(@rows) . " domenii inserate\n";
