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
const sizeOf = require('image-size');

angular.module('UI', ['ngNotie'])
    .filter('filename', function () {
        return function (input) {
            return input.replace(/^.*(\\|\/|\:)/, ' ');
        };
    })
    .controller('UICtrl', ['$scope', 'notie', function ($scope, notie) {
        $scope.points = [];
        $scope.point = {
            title: '',
            coords: {
                latitude: '',
                longitude: ''
            },
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
                if (path.length !== 0) {
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
    }])