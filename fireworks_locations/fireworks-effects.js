(function () {
  const METERS_PER_DEGREE_LAT = 111320;
  const DEFAULT_LAUNCH = {
    latitude: 38.88965,
    longitude: -77.0462,
    z: 22
  };
  const FIREWORK_COLORS = [
    [255, 232, 116, 0.95],
    [255, 95, 78, 0.9],
    [102, 194, 255, 0.9],
    [255, 255, 255, 0.92]
  ];

  function radians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function offsetPoint(point, eastMeters, northMeters, upMeters) {
    const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos(radians(point.latitude));
    return {
      latitude: point.latitude + northMeters / METERS_PER_DEGREE_LAT,
      longitude: point.longitude + eastMeters / metersPerDegreeLon,
      z: point.z + upMeters
    };
  }

  function makePoint(Point, position) {
    return new Point({
      latitude: position.latitude,
      longitude: position.longitude,
      z: position.z,
      spatialReference: { wkid: 4326 }
    });
  }

  function makeSparkGraphic(Graphic, Polyline, center, end, color, size) {
    return new Graphic({
      geometry: new Polyline({
        paths: [[
          [center.longitude, center.latitude, center.z],
          [end.longitude, end.latitude, end.z]
        ]],
        hasZ: true,
        spatialReference: { wkid: 4326 }
      }),
      attributes: { name: "Illustrative fireworks spark" },
      symbol: {
        type: "line-3d",
        symbolLayers: [{
          type: "line",
          material: { color },
          size
        }]
      }
    });
  }

  function makeGlowGraphic(Graphic, Point, center, color, size) {
    return new Graphic({
      geometry: makePoint(Point, center),
      attributes: { name: "Illustrative fireworks glow" },
      symbol: {
        type: "point-3d",
        symbolLayers: [{
          type: "object",
          resource: { primitive: "sphere" },
          material: { color },
          width: size,
          height: size,
          depth: size,
          castShadows: false
        }]
      }
    });
  }

  function makeBurst(Graphic, Point, Polyline, center, radius, colorOffset) {
    const graphics = [];
    const rayCount = 22;

    graphics.push(makeGlowGraphic(Graphic, Point, center, [255, 242, 175, 0.72], radius * 0.2));

    for (let i = 0; i < rayCount; i += 1) {
      const azimuth = (360 / rayCount) * i + (colorOffset * 11);
      const elevation = -26 + ((i * 47 + colorOffset * 13) % 84);
      const length = radius * (0.62 + (((i * 19 + colorOffset) % 31) / 100));
      const horizontal = Math.cos(radians(elevation)) * length;
      const end = offsetPoint(
        center,
        Math.sin(radians(azimuth)) * horizontal,
        Math.cos(radians(azimuth)) * horizontal,
        Math.sin(radians(elevation)) * length
      );
      graphics.push(makeSparkGraphic(
        Graphic,
        Polyline,
        center,
        end,
        FIREWORK_COLORS[(i + colorOffset) % FIREWORK_COLORS.length],
        i % 4 === 0 ? 2.8 : 1.9
      ));
    }

    return graphics;
  }

  function makeLaunchLabel(Graphic, Point, launch) {
    return new Graphic({
      geometry: makePoint(Point, offsetPoint(launch, 0, 0, 42)),
      attributes: { name: "Fireworks launch direction label" },
      symbol: {
        type: "label-3d",
        symbolLayers: [{
          type: "text",
          text: "fireworks behind the monument",
          material: { color: [255, 255, 255, 1] },
          halo: { color: [7, 17, 26, 0.9], size: 2 },
          size: 12,
          font: { family: "Aptos, Segoe UI, Arial", weight: "bold" }
        }],
        verticalOffset: {
          screenLength: 60,
          maxWorldLength: 520,
          minWorldLength: 20
        },
        callout: {
          type: "line",
          color: [255, 255, 255, 0.75],
          size: 1
        }
      }
    });
  }

  window.createFireworksPhotoGraphics = function createFireworksPhotoGraphics(options) {
    const Graphic = options.Graphic;
    const Point = options.Point;
    const Polyline = options.Polyline;
    const launch = options.launch || DEFAULT_LAUNCH;
    const graphics = [];
    const burstCenters = [
      offsetPoint(launch, -75, 18, 142),
      offsetPoint(launch, 90, -28, 185),
      offsetPoint(launch, 235, 46, 128),
      offsetPoint(launch, -245, -36, 162),
      offsetPoint(launch, 10, 0, 228)
    ];

    burstCenters.forEach((center, index) => {
      graphics.push(...makeBurst(Graphic, Point, Polyline, center, 64 + index * 7, index));
    });
    graphics.push(makeLaunchLabel(Graphic, Point, launch));

    return graphics;
  };
}());
