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
}])