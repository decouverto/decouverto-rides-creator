const { ipcRenderer } = require('electron');
const GPXtoPoints = require('gpx-to-points');

function loadGoogleMapsAPI (key) {
    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&callback=initMap';
    script.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(script);
}

const container = document.getElementById('container');
const mapdiv = document.getElementById('mapdiv');

let map;
let itinerary;
let center;
function initMap () {
    map = new google.maps.Map(mapdiv, {
      center: center,
      zoom: 12
    });
}

function resizeMap () {
    mapdiv.style.height = (container.offsetHeight) + 'px';
    mapdiv.style.width = (container.offsetWidth - 0.02 * container.offsetWidth) + 'px';
}
window.addEventListener('resize', resizeMap);
resizeMap();

ipcRenderer.send('window-opened')
ipcRenderer.on('data', (event, arg) => {
    const { data, googleMapsKey } = arg;
    console.log(data,googleMapsKey);
    GPXtoPoints(data.itinerary, function (err, results) {
        if (err) console.err(err);
        console.log(results)
        let sumLat = 0;
        let sumLng = 0;
        results.forEach(function (el) {
            sumLat += el.latitude;
            sumLng += el.longitude;
        });
        center = {lat: sumLat/results.length, lng: sumLng/results.length}
        loadGoogleMapsAPI(googleMapsKey)
    });
});
