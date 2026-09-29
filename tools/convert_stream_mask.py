"""Convert a polygonized binary stream mask into connected web-map centrelines."""
import json
import sys

import numpy as np
import shapefile
from shapely.geometry import Polygon, MultiPolygon, mapping, LineString
from skimage.draw import polygon as raster_polygon
from skimage.morphology import skeletonize


source, destination = sys.argv[1], sys.argv[2]
reader = shapefile.Reader(source)
xmin, ymin, xmax, ymax = reader.bbox
resolution = 0.00040425  # ~45 m at the study latitude; preserves minor branches
width = int(np.ceil((xmax - xmin) / resolution)) + 3
height = int(np.ceil((ymax - ymin) / resolution)) + 3
mask = np.zeros((height, width), dtype=bool)

for shape in reader.shapes():
    starts = list(shape.parts) + [len(shape.points)]
    for start, end in zip(starts[:-1], starts[1:]):
        ring = shape.points[start:end]
        cols = np.array([(x - xmin) / resolution for x, _ in ring])
        rows = np.array([(ymax - y) / resolution for _, y in ring])
        rr, cc = raster_polygon(rows, cols, mask.shape)
        mask[rr, cc] = True

skeleton = skeletonize(mask)
pixels = set(map(tuple, np.argwhere(skeleton)))
neighbours = [(-1, -1), (-1, 0), (-1, 1), (0, -1),
              (0, 1), (1, -1), (1, 0), (1, 1)]

def adjacent(pixel):
    row, col = pixel
    return [(row + dr, col + dc) for dr, dc in neighbours
            if (row + dr, col + dc) in pixels]

nodes = {p for p in pixels if len(adjacent(p)) != 2}
visited_edges = set()
segments = []

for start in nodes:
    for nxt in adjacent(start):
        edge = frozenset((start, nxt))
        if edge in visited_edges:
            continue
        path = [start, nxt]
        visited_edges.add(edge)
        previous, current = start, nxt
        while current not in nodes:
            options = [p for p in adjacent(current) if p != previous]
            if not options:
                break
            following = options[0]
            visited_edges.add(frozenset((current, following)))
            path.append(following)
            previous, current = current, following
        if len(path) >= 3:
            coords = [(xmin + (col + 0.5) * resolution,
                       ymax - (row + 0.5) * resolution) for row, col in path]
            line = LineString(coords).simplify(resolution * 0.65)
            if line.length >= resolution * 2:
                segments.append({
                    "type": "Feature",
                    "properties": {"source": "derived_centreline"},
                    "geometry": mapping(line),
                })

collection = {"type": "FeatureCollection", "features": segments}
with open(destination, "w", encoding="utf-8") as output:
    output.write("window.ATTANAGALU_STREAM_LINES=")
    json.dump(collection, output, separators=(",", ":"))
    output.write(";")

print(f"mask={width}x{height}, skeleton_pixels={len(pixels)}, segments={len(segments)}")
