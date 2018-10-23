var faithcanon = angular.module('faithcanon', ['ngCookies']);

function FcMainController($scope,$cookies, $http) {
    // when submitting the add form, send the text to the node API
    $scope.logout = function() {
        // var dd = $cookies._id;
        // var arr = dd.split('"');   
        // console.log(arr[1]);
        location.href = '/logout/' +$cookies._id;        
    };     

}