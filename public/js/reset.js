$(document).ready(function(){
	// Model Js
    $("#inquiryModel").addClass('open');	
	
	// $('.model-remove').on('click', function() {
	// 	$('.customModel').removeClass('open');
	// })	
});

var faithcanon = angular.module('faithcanon', ['ngCookies']);

faithcanon.directive('validPasswordC', function() {
  return {
    require: 'ngModel',
    scope: {

      reference: '=validPasswordC'

    },
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$parsers.unshift(function(viewValue, $scope) {

        var noMatch = viewValue != scope.reference
        ctrl.$setValidity('noMatch', !noMatch);
        return (noMatch)?noMatch:!noMatch;
      });

      scope.$watch("reference", function(value) {;
        ctrl.$setValidity('noMatch', value === ctrl.$viewValue);

      });
    }
  }
});


function FcMainController($scope,$cookies, $http) {
    
    //$scope.resetFormData._id = console.log();
    var dd = $cookies._id;
    var arr = dd.split('"');   
    console.log(arr[1]);
    //$("#_id").val(arr[1]);
    $scope.resetFormData = {_id:arr[1]};
    // when submitting the add form, send the text to the node API
    $scope.reset = function() {
        $http.post('/reset-done', $scope.resetFormData)
            .success(function(data) {
                $scope.resetFormData = {}; // clear the form so our user is ready to enter another               
                if(data.status){
                    //$('.customModel').removeClass('open');
                    alert(data.response);
                    location.href = '/';
                }else{
                    alert(data.response);
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }; 
}
