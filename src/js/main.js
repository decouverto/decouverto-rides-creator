require('angular')
angular.module('UI', [])
.controller('UICtrl', ['$scope', function ($scope) {
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