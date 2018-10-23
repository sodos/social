var faithcanon = angular.module('faithcanon', ['ngFileUpload','ngCookies']);

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

faithcanon.directive('dynamicUrl', function () {
    return {
        restrict: 'A',
        link: function postLink(scope, element, attr) {
            element.attr('src', attr.dynamicUrlSrc);
        }
    };
});

function FcMainController($scope,$cookies, $http, Upload, $timeout, first_name, phone_no, _id) {
    
    var socket = io();
    $scope.userData = {first_name: first_name, phone_no:phone_no};
    console.log(first_name, phone_no);
    $scope.userNav = {};
    
    $http.get('/checkSession'+'/'+get_uuid())
    .success(function(data) {
        //$scope.rows = data;
        console.log(data);
        if($.isEmptyObject(data) == true) {
            //location.href = '/';
        }else {
            check_fr_frr();
            if($("#user-activities").html() != undefined){
                $http.post('/api/view-activity', {user_id:data.data.user_id}).success(function(list) {
                    $scope.rows = list.data;
                    $("#user-activities").show();
                    console.log(list);                        
                }).error(function(err) {
                    console.log('Error: ' + err);
                }); 
            }
            if($("#user-dp-update").html() != undefined){
                $scope.userNav.profile = true;
                $("#user-dp-update").show();
                $("#userPasswordForm").show();
            }

            fc_notification = 0;
            // bottom: 60px;
            socket.on(('new_like_'+_id), function(msg){
                //console.log(msg);
                get_new_notification();
                if($(".fc-notification").length != undefined)
                    fc_notification = $(".fc-notification").length;

                $("#content .box-row").append('<a md-ink-ripple="" id="fc_notification_'+fc_notification+'" style="bottom:'+(20+(fc_notification*40))+'px" class="md-btn md-fab md-fab-bottom-right pos-fix blue waves-effect fc-notification"><i class="fa fa-2x fa-thumbs-up"></i> '+msg.msg+'</a>')
                setTimeout(function(){ $("#fc_notification_"+fc_notification).fadeOut( 900, function() {$(this).remove();}); }, 10000);
            });

            // bottom: 60px;
            socket.on(('new_comment_'+_id), function(msg){
                //console.log(msg);
                get_new_notification();
                if($(".fc-notification").length != undefined)
                    fc_notification = $(".fc-notification").length;

                $("#content  .box-row").append('<a md-ink-ripple="" id="fc_notification_'+fc_notification+'" style="bottom:'+(20+(fc_notification*40))+'px" class="md-btn md-fab md-fab-bottom-right pos-fix green waves-effect fc-notification"><i class="fa fa-2x fa-comments"></i> '+msg.msg+'</a>')                
                 setTimeout(function(){ $("#fc_notification_"+fc_notification).fadeOut( 900, function() {$(this).remove();}); }, 10000);
            });

            $(document).on('click', '.fc-notification', function( event )  {
              $( this ).fadeOut( 600, function() {
                $(this).remove();
              });
            }); 
        }
    }).error(function(data) {
        console.log('Error: ' + data);
    }); 

    $scope.logout = function(_id) {
        $http.get('/logout/'+_id + '/'+get_uuid())
        .success(function(data) {
            //$scope.rows = data;
            console.log(data);
            //location.href = '/';
            if(data.status == "true") {                
                location.href = '/';
            }
        }).error(function(data) {
            console.log('Error: ' + data);
        }); 
    }

    function get_uuid() {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 24; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }
    // when submitting the add form, send the text to the node API
    $scope.update = function() {

        $("#profile_data").show();
    	var formdata = $("#userForm").serializeArray();
		var data = {};
		$(formdata).each(function(index, obj){
		    data[obj.name] = obj.value;
		});
		
        $http.post('/user-update', data)
            .success(function(data) {
                $scope.userFormData = {}; // clear the form so our user is ready to enter another               
                if(data.status=="true"){                    
                    
                    $("#profile_data .dvProgress").show();
                    $("#profile_data .dvProgress").css("width", '100%');
                    

                    $timeout( function(){
                        $("#profile_data").hide();
                        $("#profile_data .dvProgress").hide();
                        $("#profile_data .dvProgress").css("width", '0%');
                    }, 2500 );                   
                    //location.href = '/user-profile';
                }else{
                    alert(data.response);
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

     // when submitting the add form, send the text to the node API
    $scope.updatePassword = function() {
        $("#profile_password").show();
        var formdata = $("#userPasswordForm").serializeArray();
        var data = {};
        $(formdata).each(function(index, obj){
            data[obj.name] = obj.value;
        });
        
        $http.post('/user-update-password', data)
            .success(function(data) {
                $scope.upData = {}; // clear the form so our user is ready to enter another               
                if(data.status=="true"){
                    
                    $("#profile_password .dvProgress").show();
                    $("#profile_password .dvProgress").css("width", '100%');                    

                    $timeout( function(){
                        $("#profile_password").hide();
                        $("#profile_password .dvProgress").hide();
                        $("#profile_password .dvProgress").css("width", '0%');
                    }, 2500 );
                    //location.href = '/user-profile';
                }else{
                    alert(data.response);
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.uploadFiles = function(files, errFiles) {
        $("#profile_progress_bar").show();
        $scope.files = files;
        $scope.errFiles = errFiles;
        angular.forEach(files, function(file) {
            file.upload = Upload.upload({
                url: '/upload-image',
                data: {file: file}
            });

            file.upload.then(function (response) {
                $timeout(function () {
                    //file.result = response.data;
                    $("#user_profile_img").attr("src",response.data.response);
                    $("#user_profile_img_wrapper").attr("style","background:url('" + response.data.response + "') center center;background-size:cover;");                    
                    console.log(response.data.response);
                    $("#profile_progress_bar").hide();
                });
            }, function (response) {

                // if (response.status > 0)
                //     $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {
                $scope.Progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                $('#dvProgress').css("width", ($scope.Progress + '%'));
                $('#dvProgress').html($scope.Progress + '%');
                console.log(Math.min(100, parseInt(100.0 * 
                                         evt.loaded / evt.total)));
            });
        });
    }


    $scope.add_friend  = function($event) {
        console.log($($event.currentTarget).data("id"));
        element = $($event.currentTarget); 

        req = {"user_id":$($event.currentTarget).data("id")};
        $(element).prop("disabled", true);         
        $http.post('/add-friend', req)
        .success(function(res) {            
            if(res.status=="true"){
                //location.href = '/user-profile';
                console.log($(element).closest('div.card'));
                tmp_element = $(element).closest('div.card');
                // <p style="margin: 0 auto;padding-top: 44%;font-size: larger;">Request Sent</p>
                $(tmp_element).html('<div class="item" style="height:256.5px;text-align:center;"><p style="margin: 0 auto;padding-top: 44%;font-size: larger;">'+res.response+'</p></div>');
                console.log($(tmp_element).parent());
                $(tmp_element).parent().fadeOut(1600, function() {
                    $(tmp_element).parent().hide();
                });
                //alert(res.response);
            }else{
                alert(res.response);
            }
        })
        .error(function(res) {
            console.log('Error: ' + res);
        });
    }; 

    $scope.accept_request  = function($event) {
        console.log($($event.currentTarget).data("id"));
        element = $($event.currentTarget); 
        req = {"user_id":$($event.currentTarget).data("id")};

        $http.post('/accept-request', req)
        .success(function(res) {            
            if(res.status=="true"){                
                console.log(res.response);
                check_fr_frr();
            }else{
                alert(res.response);
            }            
        })
        .error(function(res) {
            console.log('Error: ' + res);
        });
    };

    $scope.delete_request  = function($event) {
        console.log($($event.currentTarget).data("id"));
        element = $($event.currentTarget); 
        req = {"user_id":$($event.currentTarget).data("id")};
        $(element).prop("disabled", true);         
        $http.post('/delete-request', req)
        .success(function(res) {            
            if(res.status=="true"){                
                console.log(res.response);
                check_fr_frr();
            }else{
                alert(res.response);
            }            
        })
        .error(function(res) {
            console.log('Error: ' + res);
        });
    };

    $scope.remove_friend  = function($event) {
        console.log($($event.currentTarget).data("id"));
        element = $($event.currentTarget); 
        req = {"user_id":$($event.currentTarget).data("id")};
        $(element).prop("disabled", true);         
        $http.post('/delete-friend', req)
        .success(function(res) {            
            if(res.status=="true"){                
                console.log(res.response);
                console.log($(element).closest('div.card'));
                tmp_element = $(element).closest('div.card');
                // <p style="margin: 0 auto;padding-top: 44%;font-size: larger;">Request Sent</p>
                $(tmp_element).html('<div class="item" style="height:256.5px;text-align:center;"><p style="margin: 0 auto;padding-top: 44%;font-size: larger;">'+res.response+'</p></div>');
                console.log($(tmp_element).parent());
                $(tmp_element).parent().fadeOut(1600, function() {
                    $(tmp_element).parent().hide();
                });
                //location.href = '/view-friends';
            }else{
                alert(res.response);
            }            
        })
        .error(function(res) {
            console.log('Error: ' + res);
        });
    }; 


    $scope.show_profile  = function($event) {
        console.log($($event.currentTarget).data("id"));
        element = $($event.currentTarget); 

        location.href = '/public/profile/' + $($event.currentTarget).data("id"); 
    };

    $scope.video = '';
    $scope.image = '';
    $scope.add_image = function(image, errFiles) {
        $scope.image = image[0];
        $("#add_image").show();
        $("#add_video").hide();
        console.log(image[0]);
        $(".image_file").html(image[0].name +" <i style='color: red;font-size: large;cursor: pointer;' class='mdi-action-highlight-remove remove_image'>");
    };
    
    $scope.add_video = function(video, errFiles) {
        console.log(video);
        $scope.video = video[0];
        $("#add_video").show();
        $("#add_image").hide();  
        $(".video_file").html(video[0].name +" <i style='color: red;font-size: large;cursor: pointer;' class='mdi-action-highlight-remove remove_video'>");        
    };
    
    $('body').on('click', 'i.remove_image',function( event ) {  
        event.preventDefault(); 
        $scope.image = '';  
        $(".image_file").html('');  
        $("#add_image").show();
        $("#add_video").show();
    });

    $('body').on('click', 'i.remove_video',function( event ) {  
        event.preventDefault();   
        $scope.video = '';
        $(".video_file").html('');  
        $("#add_image").show();
        $("#add_video").show();
    });

    $scope.user_post = function(){
        
        file = "";

        if($scope.video != ""){
            file = $scope.video;
        }else if($scope.image != ""){
            file = $scope.image;
        }
        
        if($scope.video != ""){
            $("#post_progress_bar").show();
            $scope.video = "";
            file.upload = Upload.upload({
                url: '/add-post',
                data: {video:file,text:$("#userPostText").val()}
            });
            file.upload.then(function (response) {
                $timeout(function () {
                    //file.result = response.data;
                    $(".image_file").html('');
                    $(".video_file").html('');
                    $("#userPostText").val('');
                    $("#add_image").show();
                    $("#add_video").show();
                    console.log(response.data.response);
                    //@ udpate results
                    $("#post_progress_bar").hide(); 
                    check_fr_frr();
                });
            }, function (response) {

                // if (response.status > 0)
                //     $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {

                $scope.Progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                $('#dvProgress').css("width", ($scope.Progress + '%'));
                $('#dvProgress').html($scope.Progress + '%');
                console.log(Math.min(100, parseInt(100.0 * 
                                         evt.loaded / evt.total)));
            });
        }else if($scope.image != ""){ 
            $("#post_progress_bar").show();
            $scope.image = "";
            file.upload = Upload.upload({
                url: '/add-post',
                data: {image:file,text:$("#userPostText").val()}
            });
            file.upload.then(function (response) {
            $timeout(function () {
                //file.result = response.data;
                $(".image_file").html('');
                $(".video_file").html('');
                $("#userPostText").val('');
                $("#add_image").show();
                $("#add_video").show();
                console.log(response.data.response);
                //@ udpate results 
                $("#post_progress_bar").hide();
                check_fr_frr();
            });
            }, function (response) {

                // if (response.status > 0)
                //     $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {
                $scope.Progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                $('#dvProgress').css("width", ($scope.Progress + '%'));
                $('#dvProgress').html($scope.Progress + '%');
                console.log(Math.min(100, parseInt(100.0 * 
                                         evt.loaded / evt.total)));
            });
        }else {
            $("#post_progress_bar").show();
            file.upload = Upload.upload({
                url: '/add-post',
                data: {text:$("#userPostText").val()}
            }).success(function(data, status, headers, config) {
                console.log(data);
                $("#userPostText").val('');
                $("#post_progress_bar").hide();
                check_fr_frr();
            });
        }        
    };

    $scope.delete_post = function($event){
        $http.get('/delete-post/'+$($event.currentTarget).data("id"))
        .success(function(data) {
            //$scope.rows = data;
            console.log(data);
            if($.isEmptyObject(data) == true) {
                // do nothing
                //location.href = '/';
            }else {
                check_fr_frr();                
            }
        }).error(function(data) {
            console.log('Error: ' + data);
        }); 
    };

    //$scope.rows_notifications = {};
    function get_new_notification() {        
        $http.post('/post-view-notifications').success(function(list) {
            $scope.rows_notifications = list.data;                       

            $scope.rows_notifications.forEach(function (post) {
                //console.log(post.post_content)
                var now = new Date();
                var added_on = new Date(post.notification_log_time);
                var diffMs = (now - added_on); 
                var diffDays = Math.floor(diffMs / 86400000); // days
                var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                if(diffDays == 0 && diffHrs == 0) post.added_on = diffMins + " min ";
                else if(diffDays == 0 && diffHrs > 0) post.added_on = diffHrs + " hrs ";
                else if(diffDays > 0) post.added_on = diffDays + " days ";                 
            });

            //@ update notification counts           
        }).error(function(err) {
            console.log('Error: ' + err);
        });
    } 

    function check_fr_frr() {
        $http.get('/view-received-request').success(function(list) {
            $scope.rows_profiles = list.data;
            $scope.rows_frr = list.frr;

             $scope.rows_profiles.forEach(function (rows_profile) {
                $scope.rows_frr.forEach(function (frr) {
                    if(rows_profile._id == frr.user_id){
                        var now = new Date();
                        var received_on = new Date(frr.received_on);
                        var diffMs = (now - received_on); 
                        var diffDays = Math.floor(diffMs / 86400000); // days
                        var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                        var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                        if(diffDays == 0 && diffHrs == 0) rows_profile.received_on = diffMins + " min ";
                        else if(diffDays == 0 && diffHrs > 0) rows_profile.received_on = diffHrs + " hrs ";
                        else if(diffDays > 0) rows_profile.received_on = diffDays + " days ";                                
                    }
                });                        
            });

            $("#frr_list").show();

            $("#user_frr_icon b.label").html("");
            if($scope.rows_profiles.length > 0){
                $("#user_frr_icon b.label").html($scope.rows_profiles.length);
            }
            
            console.log(list);                        
        }).error(function(err) {
            console.log('Error: ' + err);
        });

        $http.get('/view-friends-list').success(function(list) {
            $scope.rows_fr_profiles = list.data;
            $scope.rows_fr = list.fr;

             $scope.rows_fr_profiles.forEach(function (rows_profile) {
                $scope.rows_fr.forEach(function (fr) {
                    if(rows_profile._id == fr.user_id){
                        var now = new Date();
                        var added_on = new Date(fr.added_on);
                        var diffMs = (now - added_on); 
                        var diffDays = Math.floor(diffMs / 86400000); // days
                        var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                        var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                        if(diffDays == 0 && diffHrs == 0) rows_profile.added_on = diffMins + " min ";
                        else if(diffDays == 0 && diffHrs > 0) rows_profile.added_on = diffHrs + " hrs ";
                        else if(diffDays > 0) rows_profile.added_on = diffDays + " days ";                                
                    }
                });                        
            });

            $("#fr_list").show();
            console.log(list);                        
        }).error(function(err) {
            console.log('Error: ' + err);
        });        
    }     
}

$(document).ready(function(){

    
    function initAutocomplete() {
        if($("#user-dp-update").html() != undefined){        
            var input_city = document.getElementById('city');        
            autocomplete_city = new google.maps.places.Autocomplete(input_city, {types: ['geocode']});     

            var componentForm = {
                locality: 'long_name',
                administrative_area_level_1: 'short_name',
                country: 'long_name',
                postal_code: 'short_name'
              };

            autocomplete_city.addListener('place_changed', function(){
                var place = autocomplete_city.getPlace();
                
                for (var component in componentForm) {
                  document.getElementById(component).value = '';                  
                }

                for (var i = 0; i < place.address_components.length; i++) {
                  var addressType = place.address_components[i].types[0];
                  if (componentForm[addressType]) {
                    var val = place.address_components[i][componentForm[addressType]];
                    document.getElementById(addressType).value = val;
                  }
                }
            });
        }
    }

    initAutocomplete();

    $('#user_search').keydown(function (e){
        console.log($('#user_search').val(), e.keyCode);
        if(e.keyCode == 13){
            location.href = '/user-find-friends/' + $('#user_search').val(); 
        }
    });
});


