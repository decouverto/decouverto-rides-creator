require('angular');
require('ng-notie');

const swap = function (theArray, indexA, indexB) {
    var temp = theArray[indexA];
    theArray[indexA] = theArray[indexB];
    theArray[indexB] = temp;
}
const showModal = function (html) {
    let modal = window.open('', 'modal');
    modal.document.write('<head><link rel="stylesheet" href="css/bootstrap.min.css"></head><body><div class="container"><h1>Aperçu</h1>' + html + '</div></body>');
}

const { ipcRenderer, remote } = require('electron');
const { dialog, app, shell } = remote;
const sizeOf = require('image-size');
const fs = require('fs-extra');
const pathModule = require('path');
const randomstring = require('randomstring');
const GPXtoPoints = require('gpx-to-points');
const zipFolder = require('zip-folder');
const totalDistance = require('total-distance');
const getRegionDelimitations = require('get-region-delimitations');
const request = require('request');
const progress = require('request-progress');
const unzipper = require('unzipper');
const createGpx = require('gps-to-gpx').default;
const slugify = require('slugify');

const generate = function (data, cb) {
    var globalId = randomstring.generate(7);
    var rootPath = pathModule.join(data.desktop, 'Decouverto', globalId);
    fs.mkdirp(rootPath, function (err) {
        if (err) return cb('Impossible de créer le fichier.');
        const points = [];
        try {
            data.points.forEach(function (point, pointKey) {
                points.push({
                    title: point.title,
                    coords: point.coords,
                    images: []
                });
                point.images.forEach(function (img, imgKey) {
                    let newImage = {
                        width: img.width,
                        height: img.height,
                        path: randomstring.generate(7) + '.' + img.path.split('.').pop()
                    }
                    points[pointKey].images.push(newImage);
                    fs.copySync(img.path, pathModule.join(rootPath, '.tmp', 'images', newImage.path));
                });
                let newName = randomstring.generate(7) + '.' + point.sound.split('.').pop();
                fs.copySync(point.sound, pathModule.join(rootPath, '.tmp', 'sounds', newName));
                points[pointKey].sound = newName;
            });
        } catch (e) {
            return cb('Erreur lors de la copie des fichiers.')
        }
        GPXtoPoints(data.itinerary, function (err, results) {
            if (err) return cb('Le fichier GPX est invalide.');
            let sumLat = 0;
            let sumLng = 0;
            results.forEach(function (el) {
                sumLat += el.latitude;
                sumLng += el.longitude;
            });
            const center = { latitude: sumLat / results.length, longitude: sumLng / results.length };

            const distance = totalDistance(results);

            const borders = getRegionDelimitations(results);

            fs.writeFileSync(pathModule.join(rootPath, 'index.json'), JSON.stringify({ id: globalId, distance, description: data.description, title: data.title, theme: data.theme, zone: data.zone, fromBook: data.fromBook }), 'utf8');
            fs.writeFileSync(pathModule.join(rootPath, '.tmp', 'index.json'), JSON.stringify({ center, itinerary: results, points, title: data.title, borders }), 'utf8');

            zipFolder(pathModule.join(rootPath, '.tmp'), pathModule.join(rootPath, globalId + '.zip'), function (err) {
                if (err) return cb('Erreur lors de la compression des fichiers');
                cb(null, rootPath);
                try {
                    fs.removeSync(pathModule.join(rootPath, '.tmp'));
                } catch (e) {
                    console.error(e);
                }
            });
        });

    });
};

const extractDraft = function (id, data, progress_cb, cb) {
    progress_cb('Création du brouillon')
    let rootPath = pathModule.join(app.getPath('desktop'), 'Decouverto', 'modifications', id);
    let file = require(pathModule.join(rootPath, 'index.json'));

    // Create GPX
    progress_cb('Création du GPX')
    let gpx = createGpx(file.itinerary, {});
    let gpxPath = pathModule.join(rootPath, 'itinerary.gpx');
    fs.writeFile(gpxPath, gpx, function(err) {
        if (err) return cb(err);
        data.itinerary = gpxPath;
        file.points.forEach(function (el) {
            el.sound = pathModule.join(rootPath, 'sounds', el.sound);
            el.images.forEach(function (img) {
                img.path = pathModule.join(rootPath, 'images', img.path);
            });
        });
        progress_cb('Écriture du brouillon')
        for (var attrname in data) { 
            file[attrname] = data[attrname]; 
        }
        fs.writeFile(pathModule.join(app.getPath('desktop'), 'Decouverto', 'modifications', slugify(file.title) + '-brouillon-' + id + '.decouverto'), JSON.stringify(file), function (err) {
            if (err) return cb(err);
            cb(null, file)
        });
    });
}


const downloadId = function (id, progress_cb, cb) {
    let rootPath = pathModule.join(app.getPath('desktop'), 'Decouverto', 'modifications');
    let newId = randomstring.generate(7);
    fs.mkdirp(pathModule.join(rootPath, newId), function (err) {
        if (err) return cb(err);
        progress(request('https://decouverto.fr/walks/' + id + '.zip'), {})
        .on('progress', function (state) {
            progress_cb('Téléchargement ' + (state.percent * 100).toFixed(2) + '%')
        })
        .on('error', cb)
        .on('end', function () {
            progress_cb('Décompression')
        })
        .pipe(fs.createWriteStream(pathModule.join(rootPath, newId + '.zip')))
        .on('error', cb)
        .on('finish', function () {
            fs.createReadStream(pathModule.join(rootPath, newId + '.zip'))
                .pipe(unzipper.Extract({ path: pathModule.join(rootPath, newId) }))
                .on('error', cb)
                .on('close', function () {
                    progress_cb('Fichier décompressé, téléchargement des métadonnées')
                    request('https://decouverto.fr/api/walks/' + id, function (err, response, body) {
                        if (err) return cb(err);
                        extractDraft(newId, JSON.parse(body), progress_cb, cb)
                    });
                })
        })
    });
    
}

angular.module('UI', ['ngNotie'])
    .filter('filename', function () {
        return function (input) {
            return input.replace(/^.*(\\|\/|\:)/, ' ');
        };
    })
    .controller('UICtrl', ['$scope', 'notie', '$http', function ($scope, notie, $http) {
        $scope.showSectors = false;
        $scope.showTheme = false;
        $scope.points = [];
        $scope.itinerary = '';
        $scope.title = '';
        $scope.description = '';
        $scope.theme = '';
        $scope.zone = '';
        $scope.fromBook = false;
        $scope.point = {
            title: '',
            coords: {
                latitude: '',
                longitude: ''
            },
            sound: '',
            images: []
        }
        $scope.addPoint = function () {
            $scope.points.push($scope.point)
            $scope.point = {
                title: '',
                coords: {
                    latitude: '',
                    longitude: ''
                },
                sound: '',
                images: []
            }
        }
        $scope.switchPosition = function (initialK, finalK) {
            if (finalK >= 0 && finalK < $scope.points.length) {
                swap($scope.points, initialK, finalK);
            }
        }
        $scope.deletePoint = function (key) {
            notie.confirm('Êtes-vous sûre de vouloir le supprimer ?', 'Supprimer', 'Annuler', function () {
                $scope.editing = false;
                $scope.points.splice(key, 1);
                $scope.$apply();
            });
        }
        $scope.startEditingPoint = function (item, key) {
            $scope.editPoint = item;
            $scope.editing = true;
        }
        $scope.addImage = function (point) {
            dialog.showOpenDialog({
                properties: ['openFile'],
                title: 'Sélectionner des illustrations',
                buttonLabel: 'Sélectionner',
                filters: [
                    { name: 'Images', extensions: ['jpg', 'png'] }
                ]
            }, function (path) {
                if (path !== undefined) {
                    sizeOf(path[0], function (err, dimensions) {
                        if (err) {
                            notie.alert(3, 'Erreur lors de la sélection.')
                        } else {
                            point.images.push({
                                path: path[0],
                                width: dimensions.width,
                                height: dimensions.height
                            });
                            $scope.$apply();
                        }
                    });
                }
            });
        }
        $scope.showImage = function (path) {
            showModal(`<img src="${path}">`);
        }
        $scope.removeImage = function (point, key) {
            point.images.splice(key, 1);
        }
        $scope.addSound = function (point) {
            dialog.showOpenDialog({
                properties: ['openFile'],
                title: 'Sélectionner un fichier audio',
                buttonLabel: 'Sélectionner',
                filters: [
                    { name: 'Fichier audio', extensions: ['mp3'] }
                ]
            }, function (path) {
                if (path !== undefined) {
                    fs.stat(path[0], function (err, stats) {
                        if (err) {
                            notie.alert(3, 'Erreur lors de la sélection.');
                        } else {
                            if (Math.floor(stats.size / 1000000) > 5) {
                                notie.alert(3, 'Fichier trop lourd veuillez le compresser.');
                            } else {
                                point.sound = path[0];
                                $scope.$apply();
                            }
                        }
                    });
                }
            });
        }
        $scope.choseGPSFile = function () {
            dialog.showOpenDialog({
                properties: ['openFile'],
                title: 'Sélectionner un fichier GPS',
                buttonLabel: 'Sélectionner',
                filters: [
                    { name: 'Fichier GPS', extensions: ['gpx'] }
                ]
            }, function (path) {
                if (path !== undefined) {
                    $scope.itinerary = path[0]
                    $scope.$apply();
                }
            });
        }
        $scope.openDraft = function () {
            dialog.showOpenDialog({
                properties: ['openFile'],
                title: 'Sélectionner un brouillon',
                buttonLabel: 'Sélectionner',
                filters: [
                    { name: 'Fichier Découverto', extensions: ['decouverto'] }
                ]
            }, function (path) {
                if (path !== undefined) {
                    fs.readFile(path[0], 'utf8', function (err, data) {
                        if (err) return notie.alert(3, 'Echec de la lecture du brouillon.');
                        let save = JSON.parse(data);
                        $scope.points = save.points;
                        $scope.itinerary = save.itinerary;
                        $scope.title = save.title;
                        $scope.description = save.description;
                        $scope.theme = save.theme;
                        $scope.zone = save.zone;
                        $scope.fromBook = save.fromBook || false;
                        $scope.$apply();
                        notie.alert(1, 'Lecture réussite.');
                    });
                }
            });
        }
        $scope.exportDraft = function () {
            let save = {
                points: $scope.points,
                itinerary: $scope.itinerary,
                title: $scope.title,
                theme: $scope.theme,
                zone: $scope.zone,
                fromBook: $scope.fromBook || false,
                description: $scope.description
            };
            dialog.showSaveDialog({
                title: 'Sélectionner un dossier',
                buttonLabel: 'Sélectionner',
                filters: [
                    { name: 'Fichier Découverto', extensions: ['decouverto'] }
                ]
            }, function (path) {
                if (path !== undefined) {
                    fs.writeFile(path, JSON.stringify(save), function (err) {
                        if (err) return notie.alert(3, 'Echec de la sauvegarde.');
                        notie.alert(1, 'Sauvegarde réussite.');
                    });
                }
            });
        }
        $scope.previewMap = function () {
            if ($scope.itinerary != '') {
                ipcRenderer.send('open-preview', {
                    points: $scope.points,
                    itinerary: $scope.itinerary
                });
            } else {
                notie.alert(3, 'Vous devez ajouter un fichier GPX !');
            }

        }
        $scope.export = function () {
            if ($scope.points.length == 0 || $scope.title == '' || $scope.description == '' || $scope.itinerary == '' || $scope.theme == '' || $scope.zone == '') {
                notie.alert(3, 'Veuillez remplir toutes les informations.');
            } else {
                generate({
                    desktop: app.getPath('desktop'),
                    points: $scope.points,
                    itinerary: $scope.itinerary,
                    title: $scope.title,
                    description: $scope.description,
                    zone: $scope.zone,
                    fromBook: $scope.fromBook || false,
                    theme: $scope.theme
                }, function (err, path) {
                    if (err) {
                        notie.alert(3, err);
                    } else {
                        notie.alert(1, 'Exportation réussite.');
                        shell.showItemInFolder(path);
                    }
                });
            }
        }
        $scope.downloadId = function () {
            $scope.progressing = true;
            $scope.progress = '';
            downloadId($scope.toDownloadId, function (str) {
                $scope.progress = str;
                $scope.$apply()
            }, function (err, draft) {
                if (err) {
                    console.error(err);
                    $scope.progressing = false;
                    $scope.$apply();
                    return notie.alert(3, 'Une erreur est survenue');
                }
                $scope.progressing = false;
                $scope.points = draft.points;
                $scope.itinerary = draft.itinerary;
                $scope.title = draft.title;
                $scope.description = draft.description;
                $scope.theme = draft.theme;
                $scope.zone = draft.zone;
                $scope.fromBook = draft.fromBook || false;
                $scope.$apply();
                notie.alert(1, 'Téléchargement réussie.');
            })
        }
        $scope.getFirstPoint = function () {
            let p = $scope.itinerary;
            if (p != '' && p != null) {
                GPXtoPoints(p, function (err, results) {
                    if (err) return notie.alert(3, 'Le fichier GPX est invalide.');
                    $scope.point.coords.latitude = Number(results[0].latitude.toFixed(5));
                    $scope.point.coords.longitude = Number(results[0].longitude.toFixed(5));
                    $scope.point.title = 'Départ';
                    $scope.$apply()
                    notie.alert(1, 'Les coordonnées ont été reportés.');
                });
            } else {
                notie.alert(3, 'Veuillez importer un GPX.');
            }
        }
        $scope.openResizeImg = function () {
            ipcRenderer.send('open-resize-image');
        }
        $http({
            method: 'GET',
            url: 'https://decouverto.fr/api/walks/categories'
        }).then(function (res) {
            $scope.existsTheme = true;
            $scope.existsZone = true;
            $scope.categories = res.data;
            $scope.checkTheme = function (theme) {
                var e = false;
                for (var k in res.data.themes) {
                    if (theme == res.data.themes[k]) {
                        e = true;
                        break;
                    }
                }
                $scope.existsTheme = e;
            }
            $scope.checkZone = function (zone) {
                var e = false;
                for (var k in res.data.sectors) {
                    if (zone == res.data.sectors[k]) {
                        e = true;
                        break;
                    }
                }
                $scope.existsZone = e;
            }
        }, function () {
            notie.alert(3, 'Une erreur a eu lieu dans la synchronisation avec le site internet.');
        })
    }])