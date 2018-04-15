require('angular');
require('ng-notie');

const swap = function (theArray, indexA, indexB) {
    var temp = theArray[indexA];
    theArray[indexA] = theArray[indexB];
    theArray[indexB] = temp;
}
const showModal = function (html) {
    let modal = window.open('', 'modal')
    modal.document.write('<head><link rel="stylesheet" href="css/bootstrap.min.css"></head><body><div class="container"><h1>Aperçu</h1>' + html + '</div></body>')
}
const { dialog } = require('electron').remote;
const { ipcRenderer } = require('electron');
const sizeOf = require('image-size');
const fs = require('fs');

angular.module('UI', ['ngNotie'])
    .filter('filename', function () {
        return function (input) {
            return input.replace(/^.*(\\|\/|\:)/, ' ');
        };
    })
    .controller('UICtrl', ['$scope', 'notie', function ($scope, notie) {
        $scope.points = [];
        $scope.itinerary = '';
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
                        if (err) return notie.alert(3, 'Echec de la lecture du brouillon');
                        let save = JSON.parse(data);
                        $scope.points = save.points;
                        $scope.itinerary = save.itinerary;
                        $scope.$apply();
                        notie.alert(1, 'Lecture réussite');
                    });
                }
            });
        }
        $scope.exportDraft = function () {
            let save = {
                points: $scope.points,
                itinerary: $scope.itinerary
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
                        if (err) return notie.alert(3, 'Echec de la sauvegarde');
                        notie.alert(1, 'Sauvegarde réussite');
                    });
                }
            });
        }
        $scope.previewMap = function () {
            ipcRenderer.send('open-preview', {
                points: $scope.points,
                itinerary: $scope.itinerary
            });
        }
    }])