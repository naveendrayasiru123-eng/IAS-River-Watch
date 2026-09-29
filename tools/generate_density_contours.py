"""Fixed geographic KDE contours for explicitly synthetic stream samples."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
rows=json.loads(Path('dist/community-reports.js').read_text().split('=',1)[1].rstrip(';'))
# Local equirectangular metric coordinates; suitable for this compact study region.
SX=111320*np.cos(np.deg2rad(7)); SY=111320
SIGMA=850.; STEP=200.
output={}
for species in ['']+sorted({r['sci'] for r in rows}):
 grids={}
 for basin in ['attanagalu','kelani','kalu']:
  pts=np.array([[r['lng']*SX,r['lat']*SY] for r in rows if r['basinKey']==basin and (not species or r['sci']==species)])
  if not len(pts):continue
  x=np.arange(pts[:,0].min()-4*SIGMA,pts[:,0].max()+4*SIGMA,STEP)
  y=np.arange(pts[:,1].min()-4*SIGMA,pts[:,1].max()+4*SIGMA,STEP)
  X,Y=np.meshgrid(x,y);Z=np.zeros_like(X)
  for px,py in pts:Z+=np.exp(-((X-px)**2+(Y-py)**2)/(2*SIGMA**2))
  grids[basin]=(X/SX,Y/SY,Z)
 peak=max(g[2].max() for g in grids.values());features=[]
 levels=[.035,.10,.22,.40,.65,1.001]
 for basin,(X,Y,Z) in grids.items():
  fig,ax=plt.subplots();cs=ax.contourf(X,Y,Z/peak,levels=levels)
  for band,path in enumerate(cs.get_paths()):
   polygons=[];current=None
   for ring in path.to_polygons():
    if len(ring)<4:continue
    area=np.sum(ring[:-1,0]*ring[1:,1]-ring[1:,0]*ring[:-1,1])/2
    coords=np.round(ring,6).tolist()
    if area>0:
     current=[coords];polygons.append(current)
    elif current is not None:current.append(coords)
   if polygons:features.append({'type':'Feature','properties':{'basin':basin,'band':band,'status':'Synthetic demonstration'},'geometry':{'type':'MultiPolygon','coordinates':polygons}})
  plt.close(fig)
 output[species]={'type':'FeatureCollection','features':features}
Path('dist/density-contours.js').write_text('window.DENSITY_CONTOURS='+json.dumps(output,separators=(',',':'))+';')
print('Generated fixed 850 m KDE contours:',len(output),'species views')
