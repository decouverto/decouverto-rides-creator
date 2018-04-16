const { ipcRenderer } = require('electron');
const GPXtoPoints = require('gpx-to-points');

function loadGoogleMapsAPI(key) {
    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&callback=initMap';
    script.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(script);
}

const container = document.getElementById('container');
const mapdiv = document.getElementById('mapdiv');

let map;
let itinerary = [];
let markers = [];
let center;
function initMap() {
    map = new google.maps.Map(mapdiv, {
        center: center,
        zoom: 12
    });
    let path = new google.maps.Polyline({
        path: itinerary,
        geodesic: true,
        strokeColor: '#000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    path.setMap(map);
    markers.forEach(function (el) {
        var infowindow = new google.maps.InfoWindow({
            content: '<h4>' + el.title + '</h4>'
        });
        var marker = new google.maps.Marker({
            position: el.coords,
            map: map
        });
        marker.addListener('click', function () {
            infowindow.open(map, marker);
        });
    });
}

function resizeMap() {
    mapdiv.style.height = (container.offsetHeight) + 'px';
    mapdiv.style.width = (container.offsetWidth - 0.02 * container.offsetWidth) + 'px';
}
window.addEventListener('resize', resizeMap);
resizeMap();

ipcRenderer.send('window-opened')
ipcRenderer.on('data', function (event, arg) {
    if (itinerary.length == 0) {
        const { data, googleMapsKey } = arg;
        GPXtoPoints(data.itinerary, function (err, results) {
            if (err) console.err(err);
            results.forEach(function (el) {
                itinerary.push({ lat: el.latitude, lng: el.longitude });
            });
            data.points.forEach(function (el) {
                markers.push({ coords: { lat: el.coords.latitude, lng: el.coords.longitude }, title: el.title });
            });
            let sumLat = 0;
            let sumLng = 0;
            results.forEach(function (el) {
                sumLat += el.latitude;
                sumLng += el.longitude;
            });
            center = { lat: sumLat / results.length, lng: sumLng / results.length }
            loadGoogleMapsAPI(googleMapsKey)
        });
    }
});
