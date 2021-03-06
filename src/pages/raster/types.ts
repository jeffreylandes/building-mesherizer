import { Feature, GeoJsonProperties, LineString, Polygon } from "geojson";

export type Point = [number, number];

export type Coordinates = Point[];

export type RoadGeometry = Feature<LineString, GeoJsonProperties>;
export type PolygonGeometry = Feature<Polygon, GeoJsonProperties>;
