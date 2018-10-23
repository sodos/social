$(document).ready(function(){
	// Model Js
	$('.modelClick').on('click', function() {
        renderButton();
		var modelId = $(this).data('model');
		$(modelId).addClass('open');
	});
	
	$('.model-remove').on('click', function() {
		$('.customModel').removeClass('open');
	})

	// Content Change Js
	$('.signToggle').on('click', function(){
		var getToggleId = $(this).data('show');
		$('#' + getToggleId).removeClass('hidden').addClass('currentShow');
		$(this).closest('.currentShow').addClass('hidden').removeClass('currentShow');
	});
	$('.removeToggle').on('click', function(){
		var getToggleClass = $(this).closest('.currentShow');
		getToggleClass.addClass('hidden').removeClass('currentShow');
		getToggleClass.prev().removeClass('hidden').addClass('currentShow');
	});    

    // FB.getLoginStatus(function(response) {
    //     statusChangeCallback(response);
    // });
  
});

var faithcanon = angular.module('faithcanon', []);

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


function FcMainController($scope, $http) {
    //$scope.formData = {};
    
    $http.get('/checkSession' +'/'+get_uuid())
    .success(function(data) {
        $scope.rows = data;
        console.log(data);
        if(data.status=="true"){
            location.href = '/user';
        }          
    })
    .error(function(data) {
        console.log('Error: ' + data);
    });

    function get_uuid() {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 24; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }

    // when submitting the add form, send the text to the node API
    $scope.join = function() {
        $http.post('/join', $scope.joinFormData)
            .success(function(data) {         

                //$scope.joinFormData.$setUntouched();
                //$scope.joinFormData.$setPristine();

                console.log(data.status);
                if(data.status == "true"){ 
                    $scope.joinFormData = {};                   
                    $('#join_now').removeClass('currentShow');
                    $('#join_now').addClass('hidden');                    
                    $('.signup_with_social').removeClass('hidden');
                    $('.signup_with_social').addClass('currentShow');
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
                if(data.status=="true"){
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
