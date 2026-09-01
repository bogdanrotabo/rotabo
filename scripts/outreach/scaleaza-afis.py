import re, zlib, sys

SRC = '/root/.claude/uploads/b5f32258-1fc8-522f-b118-8982960f2c57/df72469c-Rotabo_Afis_Primaria_Roman_A2_print_1.pdf'
data = open(SRC,'rb').read()

# ---- collect every "N 0 obj ... endobj" verbatim ----
objs = {}
for m in re.finditer(rb'(?m)^(\d+)\s+0\s+obj\b', data):
    num = int(m.group(1))
    start = m.start()
    end = data.find(b'endobj', m.end())
    assert end != -1, num
    objs[num] = data[start:end+6]
print('obiecte citite:', len(objs), 'max', max(objs))

page = objs[3].decode('latin-1')
mb = re.search(r'/MediaBox\s*\[([^\]]+)\]', page).group(1).split()
W, H = float(mb[2]), float(mb[3])
contents_ref = int(re.search(r'/Contents\s+(\d+)\s+0\s+R', page).group(1))
res = re.search(r'/Resources\s*(<<.*?>>)\s*/Rotate', page, re.S).group(1)
print(f'A2 sursa: {W:.1f}x{H:.1f} pt | continut obj {contents_ref}')

# ---- raw bytes of the content stream ----
co = objs[contents_ref]
sm = re.search(rb'stream\r?\n', co)
stream = co[sm.end(): co.rindex(b'endstream')]
hdr = co[:sm.start()].decode('latin-1')
fm = re.search(r'/Filter\s*(\[[^\]]*\]|/\w+)', hdr)
filt = ('/Filter ' + fm.group(1)) if fm else ''
print('flux continut:', len(stream), 'octeti | filtru:', filt or 'niciunul')

def build(out_path, tw, th, label):
    nxt = max(objs) + 1
    form_n, cont_n, page_n, pages_n, cat_n = nxt, nxt+1, nxt+2, nxt+3, nxt+4
    s = min(tw/W, th/H)
    ox, oy = (tw - W*s)/2, (th - H*s)/2
    new = dict(objs)
    # Form XObject: original page content, original resources
    new[form_n] = (f'{form_n} 0 obj\n<< /Type /XObject /Subtype /Form /FormType 1 '
                   f'/BBox [ 0 0 {W} {H} ] /Resources {res} {filt} /Length {len(stream)} >>\nstream\n'
                   ).encode('latin-1') + stream + b'\nendstream\nendobj'
    body = f'q {s:.6f} 0 0 {s:.6f} {ox:.4f} {oy:.4f} cm /X0 Do Q\n'.encode('latin-1')
    new[cont_n] = (f'{cont_n} 0 obj\n<< /Length {len(body)} >>\nstream\n').encode('latin-1') + body + b'\nendstream\nendobj'
    new[page_n] = (f'{page_n} 0 obj\n<< /Type /Page /Parent {pages_n} 0 R '
                   f'/MediaBox [ 0 0 {tw:.4f} {th:.4f} ] /TrimBox [ 0 0 {tw:.4f} {th:.4f} ] '
                   f'/Resources << /XObject << /X0 {form_n} 0 R >> /ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ] >> '
                   f'/Contents {cont_n} 0 R /Rotate 0 >>\nendobj').encode('latin-1')
    new[pages_n] = f'{pages_n} 0 obj\n<< /Type /Pages /Count 1 /Kids [ {page_n} 0 R ] >>\nendobj'.encode('latin-1')
    new[cat_n]   = f'{cat_n} 0 obj\n<< /Type /Catalog /Pages {pages_n} 0 R >>\nendobj'.encode('latin-1')

    out = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offs = {}
    for n in sorted(new):
        offs[n] = len(out)
        out += new[n] + b'\n'
    xref = len(out)
    top = max(new) + 1
    out += f'xref\n0 {top}\n'.encode()
    out += b'0000000000 65535 f \n'
    for n in range(1, top):
        out += (f'{offs[n]:010d} 00000 n \n'.encode() if n in offs else b'0000000000 65535 f \n')
    out += f'trailer\n<< /Size {top} /Root {cat_n} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
    open(out_path,'wb').write(out)
    print(f'{label}: {tw/72*25.4:.0f}x{th/72*25.4:.0f} mm | scara {s:.4f} | {len(out)/1024:.0f} KB -> {out_path}')

MM = 72/25.4
build('Rotabo-afis-A3.pdf', 297*MM, 420*MM, 'A3')
build('Rotabo-afis-A4.pdf', 210*MM, 297*MM, 'A4')
