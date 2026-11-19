from pathlib import Path
import sys, json, hashlib, shutil
from PIL import Image, ImageDraw
from reportlab.graphics.barcode import qrencoder
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab import rl_config
rl_config.useA85 = 0

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
url = 'https://voronenock.github.io/volshebny-vestnik-ar-26-dec-2026/ticket/'
out = root / 'site/ticket'
out.mkdir(parents=True, exist_ok=True)
design = root / 'design/ticket'
design.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, design / 'generated-original.png')
image = Image.open(source).convert('RGB')
assert image.size == (1870, 841), image.size
box = (1652, 554, 1842, 744)
qr = qrencoder.QRCode(None, qrencoder.QRErrorCorrectLevel.M)
qr.addData(url)
qr.make()
n = qr.getModuleCount()
width, height = box[2]-box[0], box[3]-box[1]
cell = min(width, height) // (n+8)
assert cell >= 3
patch = Image.new('RGB', (width, height), 'white')
draw = ImageDraw.Draw(patch)
ox, oy = (width-n*cell)//2, (height-n*cell)//2
for y in range(n):
    for x in range(n):
        if qr.isDark(y,x):
            draw.rectangle((ox+x*cell,oy+y*cell,ox+(x+1)*cell-1,oy+(y+1)*cell-1), fill='black')
image.paste(patch, box[:2])
image.save(out/'bilet_yolka.png', dpi=(250,250), optimize=True)
# The centre artwork is stable while the ticket's typography animates.
marker = (752,162,1388,772)
image.crop(marker).save(design/'tracking-image.png', optimize=True)

back = None
back_marker = None
if len(sys.argv) > 2:
    back_source = Path(sys.argv[2])
    shutil.copyfile(back_source, design/'generated-back-original.png')
    back = Image.open(back_source).convert('RGB')
    assert back.size == image.size, back.size
    back.save(out/'bilet_oborot.png', dpi=(250,250), optimize=True)
    back_marker = (640,158,1334,762)
    back.crop(back_marker).save(design/'tracking-back.png', optimize=True)

image.save(design/'print-front.jpg',quality=95,subsampling=0)
if back:
    back.save(design/'print-back.jpg',quality=95,subsampling=0)

pdf_name = 'bilety_A4_dvustoronnie.pdf' if back else 'bilety_A4_3_sht.pdf'
pdf = canvas.Canvas(str(out/pdf_name), pagesize=A4)
pdf.setTitle('Билеты на новогоднюю ёлку — три билета на A4')
page_w, page_h = A4
w = 190*mm
h = w*image.height/image.width
gap = 8*mm
left = (page_w-w)/2
bottom = (page_h-3*h-2*gap)/2
for filename in (['print-front.jpg','print-back.jpg'] if back else ['print-front.jpg']):
    for row in range(3):
        y = bottom+row*(h+gap)
        pdf.drawImage(str(design/filename), left,y,w,h)
        pdf.setLineWidth(.25)
        for x in (left,left+w):
            sign = -1 if x==left else 1
            for yy in (y,y+h):
                pdf.line(x+sign*mm,yy,x+sign*3*mm,yy)
                vertical = -1 if yy==y else 1
                pdf.line(x,yy+vertical*mm,x,yy+vertical*3*mm)
    pdf.showPage()
pdf.save()
facts = {'url':url,'size':[1870,841],'qr_box':box,'marker_box':marker,
         'event':'НОВОГОДНЯЯ ЁЛКА В ШКОЛЕ ВОЛШЕБСТВА','date':'26 декабря','time':'19:00',
         'drink':'Подойди на бар со стаканчиком «Хогвартс» — тебе бесплатно нальют лимитированный напиток.',
         'marker_box_back':back_marker,
         'print':{'page':'A4','tickets':3,'pages':2 if back else 1,'duplex_flip':'long_edge','scale_percent':100,'ticket_width_mm':190,'ticket_height_mm':h/mm,'effective_ppi':250},
         'poster_sha256':hashlib.sha256(image.tobytes()).hexdigest()}
(design/'manifest.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2))
print(json.dumps({'qr_modules':n,'module_pixels':cell,**facts},ensure_ascii=False))
