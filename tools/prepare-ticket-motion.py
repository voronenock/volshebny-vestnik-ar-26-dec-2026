from pathlib import Path
from PIL import Image
import numpy as np

root=Path(__file__).resolve().parent.parent
front=np.array(Image.open(root/'site/ticket/bilet_yolka.png').convert('RGB'))
back=np.array(Image.open(root/'site/ticket/bilet_oborot.png').convert('RGB'))
x0,y0,x1,y1=34,161,751,258
original=front[y0:y1,x0:x1].copy()
sample=back[433:483,180:580].copy()
tile=np.pad(sample,((0,80),(0,400),(0,0)),mode='reflect')[:y1-y0,:x1-x0]
paper=original[np.max(original,axis=2)>200]
offset=np.median(paper,axis=0)-np.median(sample.reshape(-1,3),axis=0)
tile=np.clip(tile.astype(float)+offset,0,255).astype('uint8')
front[y0:y1,x0:x1]=tile
Image.fromarray(front).save(root/'design/ticket/motion-clean.png',optimize=True)
print('Prepared matching paper under moving admission typography')
