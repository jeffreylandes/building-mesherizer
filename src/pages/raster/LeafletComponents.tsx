import GeoRasterLayer from "georaster-layer-for-leaflet";
import { LatLngBounds } from "leaflet";
import { debounce } from "lodash";
import { useCallback, useEffect } from "react";
import { Polygon, useMap } from "react-leaflet";
import { BuildingPolygon } from "../../fetch/fetchOsm";
import { v4 as uuidv4 } from "uuid";
import parseGeoraster from "georaster";

type ImportProps = { rasterArrayBuffer: ArrayBuffer | null };

type SetBoundsProps = {
  setBounds: React.Dispatch<React.SetStateAction<LatLngBounds | undefined>>;
};

type OsmProps = {
  buildings: BuildingPolygon[];
};

export function SetMapBounds({ setBounds }: SetBoundsProps) {
  const setBoundsDebounced = debounce(setBounds, 100);
  const leafletMap = useMap();
  const onMove = useCallback(() => {
    setBoundsDebounced(leafletMap.getBounds());
  }, [leafletMap, setBoundsDebounced]);

  useEffect(() => {
    leafletMap.on("move", onMove);
  }, [leafletMap, onMove]);
  return <></>;
}

export function RasterImport({ rasterArrayBuffer }: ImportProps) {
  const leafletMap = useMap();

  useEffect(() => {
    if (!rasterArrayBuffer) return;
    parseGeoraster(rasterArrayBuffer).then((georaster: any) => {
      const geoTiff = new GeoRasterLayer({
        georaster: georaster,
        debugLevel: 1,
      });
      leafletMap.addLayer(geoTiff);
      leafletMap.fitBounds(geoTiff.getBounds());
    });
  }, [rasterArrayBuffer]);
  return <></>;
}

export function OsmBuildings({ buildings }: OsmProps) {
  const leafletPolygons = buildings.map((building) => {
    return <Polygon key={uuidv4()} positions={building.coordinates} />;
  });
  return <>{leafletPolygons}</>;
}
