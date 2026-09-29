"""Generate deterministic, unverified survey points exactly on stream polylines."""
import json
import math
import random
import re


def load_js(path, variable):
    text = open(path, encoding="utf-8").read()
    match = re.search(rf"window\.{variable}=(.*);\s*$", text, re.S)
    return json.loads(match.group(1))


def risk_weighted_points(collection, count, seed, basin_key):
    rng = random.Random(seed)
    segments = []
    all_x = []
    for feature in collection["features"]:
        geometry = feature["geometry"]
        lines = geometry["coordinates"] if geometry["type"] == "MultiLineString" else [geometry["coordinates"]]
        properties = feature.get("properties", {})
        order = float(properties.get("RIV_ORD") or properties.get("stream_order") or 1)
        discharge = max(0.0, float(properties.get("DIS_AV_CMS") or 0))
        for line in lines:
            for first, second in zip(line[:-1], line[1:]):
                length = math.hypot(second[0] - first[0], second[1] - first[1])
                if length:
                    midpoint_x = (first[0] + second[0]) / 2
                    all_x.append(midpoint_x)
                    segments.append((first, second, length, order, discharge, midpoint_x))
    # Deliberately unequal synthetic clusters; no ecological risk is inferred.
    # Choose separated stream anchors, then sample nearby channel segments.
    anchors = []
    for fraction in [.18, .38, .60, .83]:
        ordered = sorted(segments, key=lambda seg: seg[5])
        candidate = ordered[int(fraction * (len(ordered)-1))]
        anchors.append(((candidate[0][0]+candidate[1][0])/2,
                        (candidate[0][1]+candidate[1][1])/2))
    quotas = [round(count*.52), round(count*.27), round(count*.13)]
    quotas.append(count-sum(quotas))
    points = []
    for cluster, ((cx,cy), quota) in enumerate(zip(anchors, quotas)):
        sigma = [0.014, 0.022, 0.012, 0.028][cluster]
        weights = []
        for first, second, length, *_ in segments:
            mx,my=(first[0]+second[0])/2,(first[1]+second[1])/2
            distance2=((mx-cx)*math.cos(math.radians(cy)))**2+(my-cy)**2
            weights.append(length*math.exp(-distance2/(2*sigma*sigma)))
        for _ in range(quota):
            first, second, *_ = rng.choices(segments, weights=weights, k=1)[0]
            fraction=rng.random()
            lng=first[0]+fraction*(second[0]-first[0])
            lat=first[1]+fraction*(second[1]-first[1])
            points.append((lat,lng))
    if basin_key == 'attanagalu':
        # Design-only relocation away from BIA (7.18076 N, 79.88410 E).
        # Keep observations on supplied inland stream segments; no claim of risk.
        relocated=[]
        for lat,lng in points:
            distance=111320*math.hypot((lng-79.88410)*math.cos(math.radians(lat)),lat-7.18076)
            if distance < 6000:
                tx,ty=lng+0.135,lat-0.06
                best=None
                for a,b,*_ in segments:
                    if min(a[0],b[0]) < 79.98:continue
                    dx,dy=b[0]-a[0],b[1]-a[1]
                    t=max(0,min(1,((tx-a[0])*dx+(ty-a[1])*dy)/(dx*dx+dy*dy)))
                    x,y=a[0]+t*dx,a[1]+t*dy
                    candidate=((x-tx)**2+(y-ty)**2,y,x)
                    if best is None or candidate[0]<best[0]:best=candidate
                lat,lng=best[1],best[2]
            relocated.append((lat,lng))
        points=relocated
    return points


inputs = [
    ("Attanagalu Oya Basin", "attanagalu", "Attanagalu Oya", "dist/attanagalu-stream-lines.js", "ATTANAGALU_STREAM_LINES", 50),
    ("Kelani Ganga Basin", "kelani", "Kelani Ganga", "dist/kelani-stream-lines.js", "KELANI_STREAM_LINES", 70),
    ("Kalu Ganga Basin", "kalu", "Kalu Ganga", "dist/kalu-stream-lines.js", "KALU_STREAM_LINES", 40),
]
species = [
    ("Water Hyacinth", "Eichhornia crassipes"),
    ("Mile-a-minute weed", "Mikania micrantha"),
    ("Water Lettuce", "Pistia stratiotes"),
    ("Giant Salvinia", "Salvinia molesta"),
    ("Lantana", "Lantana camara"),
    ("Pink Morning Glory", "Ipomoea carnea"),
    ("Siam Weed", "Chromolaena odorata"),
    ("Alligator Weed", "Alternanthera philoxeroides"),
]

reports = []
report_id = 1
for basin, key, short_name, path, variable, count in inputs:
    collection = load_js(path, variable)
    for index, (lat, lng) in enumerate(risk_weighted_points(collection, count, 20260907 + report_id, key)):
        common, scientific = species[(index * 3 + report_id) % len(species)]
        reports.append({
            "id": report_id,
            "common": common,
            "sci": scientific,
            "basin": basin,
            "basinKey": key,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "date": "Pending survey",
            "severity": "unverified",
            "coverage": "Not assessed",
            "notes": "Dummy sample on the supplied stream network. Cluster placement and species label are synthetic; not a real community report.",
            "status": "Dummy sample",
        })
        report_id += 1

with open("dist/community-reports.js", "w", encoding="utf-8") as output:
    output.write("window.COMMUNITY_REPORTS=")
    json.dump(reports, output, separators=(",", ":"))
    output.write(";")
print(f"generated={len(reports)}; " + ", ".join(f"{item[2]}={item[5]}" for item in inputs))
