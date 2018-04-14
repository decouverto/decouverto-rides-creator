require('angular');
require('ng-notie');

var swap = function(theArray, indexA, indexB) {
    var temp = theArray[indexA];
    theArray[indexA] = theArray[indexB];
    theArray[indexB] = temp;
};

angular.module('UI', ['ngNotie'])
.controller('UICtrl', ['$scope', 'notie', function ($scope, notie) {
        $scope.points = [];
        $scope.point = {
            title: '',
            coords: {
                latitude: '',
                longitude: ''
            }
        }
        $scope.addPoint = function () {
            $scope.points.push($scope.point)
            $scope.point = {
                title: '',
                coords: {
                    latitude: '',
                    longitude: ''
                }
            }
            console.log($scope.points);
        }
        $scope.switchPosition = function (initialK, finalK) {
            if (finalK >= 0 && finalK < $scope.points.length) {
                swap($scope.points, initialK, finalK);
            } 
        }
        $scope.deletePoint = function (key) {
            notie.confirm('Êtes-vous sûre de vouloir le supprimer ?', 'Supprimer', 'Annuler', function() {
                $scope.editing=false;
                $scope.points.splice(key,1);
                $scope.$apply();
            });
        }
        $scope.startEditingPoint = function (item, key) {
            $scope.editPoint = item;
            $scope.editing=true;
        }
}])