"""Render a silent geographic introduction from supplied stream linework."""
import json,re,math,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
W=900;H=900;FPS=20
keys=['attanagalu','kelani','kalu'];colors=['#f7b955','#40bfff','#38dbaa'];networks=[]
for key in keys:
 text=Path(f'dist/{key}-stream-lines.js').read_text();g=json.loads(text.split('=',1)[1].rstrip(';\n'))
 lines=[]
 for f in g['features']:
  geom=f['geometry'];lines.extend(geom['coordinates'] if geom['type']=='MultiLineString' else [geom['coordinates']])
 networks.append(lines)
pts=[p for lines in networks for line in lines for p in line];xmin=min(p[0] for p in pts);xmax=max(p[0] for p in pts);ymin=min(p[1] for p in pts);ymax=max(p[1] for p in pts)
scale=min(750/(xmax-xmin),750/(ymax-ymin));ox=(W-(xmax-xmin)*scale)/2;oy=(H-(ymax-ymin)*scale)/2
def xy(p):return (round(ox+(p[0]-xmin)*scale),round(oy+(ymax-p[1])*scale))
projected=[[[xy(p) for p in line] for line in lines] for lines in networks]
base=Image.new('RGB',(W,H),'#061b19');d=ImageDraw.Draw(base)
for x in range(0,W,60):d.line([(x,0),(x,H)],fill='#0a2926')
for y in range(0,H,60):d.line([(0,y),(W,y)],fill='#0a2926')
for lines in projected:
 for line in lines:d.line(line,fill='#16413c',width=1)
reports=json.loads(Path('dist/community-reports.js').read_text().split('=',1)[1].rstrip(';'))
proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart','dist/river-intro.mp4'],stdin=subprocess.PIPE)
for frame in range(12*FPS):
 t=frame/FPS;chapter=min(2,int(t//4));progress=min(1,(t%4)/1.8);im=base.copy();d=ImageDraw.Draw(im)
 for idx,lines in enumerate(projected):
  color=colors[idx] if idx==chapter else '#20514a'
  for i,line in enumerate(lines):
   if idx!=chapter or i/len(lines)<=progress:d.line(line,fill=color,width=2 if idx==chapter else 1)
 if t%4>1.8:
  for r in reports:
   if r['basinKey']!=keys[chapter]:continue
   x,y=xy((r['lng'],r['lat']));rad=3+int(2*(1+math.sin(t*3+r['id']))/2)
   d.ellipse([x-rad,y-rad,x+rad,y+rad],fill='#ff7890')
 if frame==60:im.save('dist/river-intro-poster.jpg',quality=90)
 proc.stdin.write(im.tobytes())
proc.stdin.close();assert proc.wait()==0
print('Rendered 12-second silent basin video.')
