"""Clip embedded stream-mask polygons to a basin and create natural centrelines."""
import json
import sys

import numpy as np
from shapely.geometry import shape, Polygon, MultiPolygon, GeometryCollection, LineString, mapping
from skimage.draw import polygon as raster_polygon
from skimage.morphology import skeletonize


streams_path, basins_path, basin_name, destination = sys.argv[1:]
streams = json.load(open(streams_path, encoding="utf-8"))
basins = json.load(open(basins_path, encoding="utf-8"))
basin = shape(basins[basin_name]["boundary"])
xmin, ymin, xmax, ymax = basin.bounds
resolution = 0.00040425
width = int(np.ceil((xmax - xmin) / resolution)) + 3
height = int(np.ceil((ymax - ymin) / resolution)) + 3
neighbour_steps = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
features = []

def polygons(geometry):
    if isinstance(geometry, Polygon):
        yield geometry
    elif isinstance(geometry, (MultiPolygon, GeometryCollection)):
        for part in geometry.geoms:
            yield from polygons(part)

for order, geometries in streams.items():
    mask = np.zeros((height, width), dtype=bool)
    for raw in geometries:
        clipped = shape(raw).intersection(basin)
        for poly in polygons(clipped):
            if poly.is_empty or len(poly.exterior.coords) < 3:
                continue
            coords = np.asarray(poly.exterior.coords)
            cols = (coords[:,0] - xmin) / resolution
            rows = (ymax - coords[:,1]) / resolution
            rr, cc = raster_polygon(rows, cols, mask.shape)
            mask[rr, cc] = True

    skeleton = skeletonize(mask)
    pixels = set(map(tuple, np.argwhere(skeleton)))
    def adjacent(pixel):
        row, col = pixel
        return [(row+dr,col+dc) for dr,dc in neighbour_steps if (row+dr,col+dc) in pixels]
    nodes = {p for p in pixels if len(adjacent(p)) != 2}
    visited = set()
    for start in nodes:
        for nxt in adjacent(start):
            edge = frozenset((start,nxt))
            if edge in visited:
                continue
            path = [start,nxt]
            visited.add(edge)
            previous,current = start,nxt
            while current not in nodes:
                options = [p for p in adjacent(current) if p != previous]
                if not options:
                    break
                following = options[0]
                visited.add(frozenset((current,following)))
                path.append(following)
                previous,current = current,following
            if len(path) >= 3:
                coords = [(xmin+(col+.5)*resolution,ymax-(row+.5)*resolution) for row,col in path]
                line = LineString(coords).simplify(resolution*.65)
                if line.length >= resolution*2:
                    features.append({"type":"Feature","properties":{"stream_order":int(order),"source":"HydroSHEDS-derived embedded mask"},"geometry":mapping(line)})

with open(destination,"w",encoding="utf-8") as output:
    output.write("window.KELANI_STREAM_LINES=")
    json.dump({"type":"FeatureCollection","features":features},output,separators=(",",":"))
    output.write(";")
print(f"grid={width}x{height}, segments={len(features)}")
