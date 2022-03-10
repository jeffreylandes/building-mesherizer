import { useEffect, useMemo } from "react";
import { useRecoilValue } from "recoil";
import * as THREE from "three";
import { BoundsState, DrawPolygonsSelector } from "../../raster/state";
import { cleanupMeshesFromScene, three } from "../MeshPage";
import { getMercatorMapReferencePoint } from "../utils";

export const BUILDING_MATERIAL = new THREE.MeshLambertMaterial({
  color: "#ffffff",
});

export function DrawnBuildings() {
  const mapBounds = useRecoilValue(BoundsState);

  const drawnPolygons = useRecoilValue(DrawPolygonsSelector);

  const referencePoint = getMercatorMapReferencePoint(mapBounds);

  const pointLight = useMemo(() => {
    return new THREE.PointLight(0xffffff, 1, 100);
  }, []);

  useEffect(() => {
    if (
      referencePoint === undefined ||
      drawnPolygons === undefined ||
      drawnPolygons.length === 0
    ) {
      return;
    }

    drawnPolygons.forEach((polygonWithHeight) => {
      const vectors = polygonWithHeight.polygon.geometry.coordinates[0].map(
        (point) =>
          new THREE.Vector2(
            point[1] - referencePoint.referencePointLon,
            point[0] - referencePoint.referencePointLat
          )
      );
      const polygonShape = new THREE.Shape(vectors);
      const extrudedGeometry = new THREE.ExtrudeBufferGeometry(polygonShape, {
        depth: polygonWithHeight.height,
      });
      const buildingMesh = new THREE.Mesh(extrudedGeometry, BUILDING_MATERIAL);
      three.scene.add(buildingMesh);
      if (polygonWithHeight.height > three.camera.position.z) {
        three.camera.position.z = polygonWithHeight.height + 20;
      }
    });
    three.scene.remove(pointLight);
    pointLight.position.set(
      three.camera.position.x,
      three.camera.position.y,
      three.camera.position.z
    );
    three.scene.add(pointLight);
    three.renderer.render(three.scene, three.camera);

    return function cleanupScene() {
      cleanupMeshesFromScene(three.scene);
    };
  }, [drawnPolygons, referencePoint, pointLight]);
  return <></>;
}
