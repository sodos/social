$(document).ready(function(){
	// Model Js
    $("#inquiryModel").addClass('open');	
	
	// $('.model-remove').on('click', function() {
	// 	$('.customModel').removeClass('open');
	// })	
});

var faithcanon = angular.module('faithcanon', ['ngCookies']);



function FcMainController($scope,$cookies, $http) {
    
    //$scope.resetFormData._id = console.log();
    var dd = $cookies._id;
    var arr = dd.split('"');   
    console.log(arr[1]);
    //$("#_id").val(arr[1]);
    $scope.loginFormData = {_id:arr[1]};
    // when submitting the add form, send the text to the node API
    $scope.login = function() {
        $http.post('/login', $scope.loginFormData)
            .success(function(data) {
                $scope.loginFormData = {}; // clear the form so our user is ready to enter another               
                if(data.status=="true"){
                    location.href = '/user';
                }else{
                    alert(data.response);
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }; 

    $scope.forgot = function() {
        $http.post('/forgot', $scope.forgotFormData)
            .success(function(data) {
                $scope.forgotFormData = {}; // clear the form so our user is ready to enter another               
                if(data.status){
                    $('.customModel').removeClass('open');
                    alert(data.response);
                }else{
                    alert(data.response);
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }; 
 
}
