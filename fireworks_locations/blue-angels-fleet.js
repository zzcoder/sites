(function () {
  const BLUE = [0, 76, 151, 1];
  const GOLD = [255, 211, 67, 1];
  const WHITE_SMOKE = [235, 247, 255, 0.58];
  const METERS_PER_DEGREE_LAT = 111320;

  function radians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function interpolate(a, b, t) {
    return a + (b - a) * t;
  }

  function offsetPoint(point, eastMeters, northMeters, upMeters) {
    const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos(radians(point.latitude));
    return {
      latitude: point.latitude + northMeters / METERS_PER_DEGREE_LAT,
      longitude: point.longitude + eastMeters / metersPerDegreeLon,
      z: point.z + upMeters
    };
  }

  function offsetFormationPoint(center, heading, forwardMeters, rightMeters, upMeters) {
    const angle = radians(heading);
    const alongEast = Math.sin(angle);
    const alongNorth = Math.cos(angle);
    const rightEast = Math.cos(angle);
    const rightNorth = -Math.sin(angle);
    return offsetPoint(
      center,
      alongEast * forwardMeters + rightEast * rightMeters,
      alongNorth * forwardMeters + rightNorth * rightMeters,
      upMeters
    );
  }

  function makePoint(Point, position) {
    return new Point({
      latitude: position.latitude,
      longitude: position.longitude,
      z: position.z,
      spatialReference: { wkid: 4326 }
    });
  }

  function makeJetGraphic(Graphic, Point, position, heading, size, roll) {
    return new Graphic({
      geometry: makePoint(Point, position),
      attributes: { name: "Blue Angels formation jet" },
      symbol: {
        type: "point-3d",
        symbolLayers: [
          {
            type: "object",
            resource: { primitive: "cone" },
            material: { color: BLUE },
            width: size * 0.62,
            height: size * 1.85,
            depth: size * 0.62,
            heading,
            tilt: 90,
            roll,
            castShadows: false
          },
          {
            type: "object",
            resource: { primitive: "sphere" },
            material: { color: GOLD },
            width: size * 0.22,
            height: size * 0.22,
            depth: size * 0.22,
            castShadows: false
          }
        ]
      }
    });
  }

  function makeSmokeGraphic(Graphic, Polyline, from, to) {
    return new Graphic({
      geometry: new Polyline({
        paths: [[
          [from.longitude, from.latitude, from.z],
          [to.longitude, to.latitude, to.z]
        ]],
        hasZ: true,
        spatialReference: { wkid: 4326 }
      }),
      attributes: { name: "Blue Angels smoke trail" },
      symbol: {
        type: "line-3d",
        symbolLayers: [{
          type: "line",
          material: { color: WHITE_SMOKE },
          size: 2.2
        }]
      }
    });
  }

  window.createBlueAngelsFleetGraphics = function createBlueAngelsFleetGraphics(options) {
    const Graphic = options.Graphic;
    const Point = options.Point;
    const Polyline = options.Polyline;
    const camera = options.camera;
    const monument = options.monument;
    const heading = Number(camera.heading || 0);
    const formationCenter = {
      latitude: interpolate(camera.position.latitude, monument.latitude, 0.58),
      longitude: interpolate(camera.position.longitude, monument.longitude, 0.58),
      z: interpolate(camera.position.z, monument.top_m, 0.58) + 95
    };
    const formation = [
      { forward: 115, right: 0, up: 22, size: 34, roll: 0 },
      { forward: 28, right: -78, up: 8, size: 31, roll: -7 },
      { forward: 28, right: 78, up: 8, size: 31, roll: 7 },
      { forward: -72, right: -154, up: -8, size: 29, roll: -10 },
      { forward: -72, right: 154, up: -8, size: 29, roll: 10 },
      { forward: -170, right: 0, up: -18, size: 30, roll: 0 }
    ];
    const graphics = [];

    formation.forEach((jet) => {
      const position = offsetFormationPoint(formationCenter, heading, jet.forward, jet.right, jet.up);
      const smokeStart = offsetFormationPoint(position, heading, -250, 0, -10);
      graphics.push(makeSmokeGraphic(Graphic, Polyline, smokeStart, position));
      graphics.push(makeJetGraphic(Graphic, Point, position, heading, jet.size, jet.roll));
    });

    graphics.push(new Graphic({
      geometry: makePoint(Point, offsetFormationPoint(formationCenter, heading, -55, 0, 80)),
      attributes: { name: "Blue Angels formation label" },
      symbol: {
        type: "label-3d",
        symbolLayers: [{
          type: "text",
          text: "Blue Angels formation",
          material: { color: [255, 255, 255, 1] },
          halo: { color: [0, 30, 70, 0.9], size: 2 },
          size: 12,
          font: { family: "Aptos, Segoe UI, Arial", weight: "bold" }
        }],
        verticalOffset: {
          screenLength: 38,
          maxWorldLength: 300,
          minWorldLength: 12
        },
        callout: {
          type: "line",
          color: [255, 255, 255, 0.62],
          size: 1
        }
      }
    }));

    return graphics;
  };
}());
