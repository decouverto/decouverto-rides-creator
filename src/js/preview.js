const { ipcRenderer } = require('electron');
const GPXtoPoints = require('gpx-to-points');

let itinerary = [];
let markers = [];
let center;
var markerSource = new ol.source.Vector();
var lineSource = new ol.source.Vector();
var lineStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#000',
        width: 5
    })
});


function initMap() {



    var points = [];
    itinerary.forEach(function(el) {
        points.push([el.lng, el.lat]);
    });
    points.push([itinerary[0].lng, itinerary[0].lat]);

    var lineString = new ol.geom.LineString(points);
    lineString.transform('EPSG:4326', 'EPSG:3857');
    lineSource.addFeature(new ol.Feature({
        geometry: lineString,
        name: 'Line'
    }));

    function addMarker(lon, lat, title) {

        var iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
        });

        iconFeature.setStyle(new ol.style.Style({
            image: new ol.style.Icon(({
                anchor: [0.5, 35],
                anchorXUnits: 'fraction',
                anchorYUnits: 'pixels',
                opacity: 0.75,
                src: 'https://decouverto.fr/images/marker_icon.png'
            })),
            text: new ol.style.Text({
                offsetY: -40,
                font: '14px Calibri,sans-serif',
                fill: new ol.style.Fill({ color: '#e74c3c' }),
                stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                }),
                text: title
            })
        }));

        markerSource.addFeature(iconFeature);
    }

    markers.forEach(function(el) {
        addMarker(el.coords.lng, el.coords.lat, el.title)
    });
    var map = new ol.Map({
        target: 'mapdiv',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            new ol.layer.Vector({
                source: lineSource,
                style: lineStyle,
            }),
            new ol.layer.Vector({
                source: markerSource
            })
        ],
        view: new ol.View({
            center: [0, 0],
            zoom: 0
        })
    });

    map.getView().setCenter(ol.proj.transform([center.lng, center.lat], 'EPSG:4326', 'EPSG:3857'));
    map.getView().setZoom(15);
}





ipcRenderer.send('window-opened')
ipcRenderer.on('data', function(event, arg) {
    if (itinerary.length == 0) {
        const { data, googleMapsKey } = arg;
        GPXtoPoints(data.itinerary, function(err, results) {
            if (!err) {
                results.forEach(function(el) {
                    itinerary.push({ lat: el.latitude, lng: el.longitude });
                });
                data.points.forEach(function(el) {
                    markers.push({ coords: { lat: el.coords.latitude, lng: el.coords.longitude }, title: el.title });
                });
                let sumLat = 0;
                let sumLng = 0;
                results.forEach(function(el) {
                    sumLat += el.latitude;
                    sumLng += el.longitude;
                });
                center = { lat: sumLat / results.length, lng: sumLng / results.length }
                initMap();
            }
        });
    }
});