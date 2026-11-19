# Map data (lib/geo)

`lib/geo/sgmap.json` and `lib/geo/stations.json` are bundled so the map needs no tile server.
Built on 2026-11-19 from:

- Coastline and planning areas: github.com/yinshanyang/singapore (`maps/0-country.geojson`, `maps/2-planning-area.geojson`, from URA)
- Roads: every bus route in github.com/cheeaun/sgbusdata (`data/v1/routes.min.geojson`), de-duplicated into a road network
- MRT station locations (for "nearest MRT" fallback pins): github.com/cheeaun/sgraildata (`data/v1/sg-rail.geojson`, from OpenStreetMap)

Steps: round road coordinates to 4 dp and keep unique edges; simplify with mapshaper
(roads 15%, land 15%, areas 4%, rail 20%); pack coordinates as delta-encoded integers
(origin 103.6, 1.15, scale 1e5). See `lib/basemap.ts` for the decoder.
Data © OpenStreetMap contributors, LTA, URA.
