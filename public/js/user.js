var faithcanon = angular.module('faithcanon', ['ngFileUpload','ngCookies', 'angular.filter']);

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

faithcanon.directive('imageLoader', function () {
    return function (scope, element, attrs) {

        function setTransform(transform) {
            element.css('-ms-transform', transform);
            element.css('-webkit-transform', transform);
            element.css('-moz-transform', transform);
            element.css('transform', transform);
        }
        //scope.doSomething(element);
        var parent = element.parent();
        element.bind("load" , function(e){ 
            // console.log(element);
            EXIF.getData(element[0], function() {
              var orientation = EXIF.getTag(element[0], 'Orientation');
              var height = element.height();
              var width = element.width();
              if (orientation && orientation !== 1) {
                switch (orientation) {
                  case 2:
                    setTransform('rotateY(180deg)');
                    break;
                  case 3:
                    setTransform('rotate(180deg)');
                    break;
                  case 4:
                    setTransform('rotateX(180deg)');
                    break;
                  case 5:
                    setTransform('rotateZ(90deg) rotateX(180deg)');
                    if (width > height) {
                      parent.css('height', width + 'px');
                      element.css('margin-top', ((width -height) / 2) + 'px');
                    }
                    break;
                  case 6:
                    setTransform('rotate(90deg)');
                    if (width > height) {
                      parent.css('height', width + 'px');
                      element.css('margin-top', ((width -height) / 2) + 'px');
                    }
                    break;
                  case 7:
                    setTransform('rotateZ(90deg) rotateY(180deg)');
                    if (width > height) {
                      parent.css('height', width + 'px');
                      element.css('margin-top', ((width -height) / 2) + 'px');
                    }
                    break;
                  case 8:
                    setTransform('rotate(-90deg)');
                    if (width > height) {
                      parent.css('height', width + 'px');
                      element.css('margin-top', ((width -height) / 2) + 'px');
                    }
                    break;
                }
              }
                element.show();
                element.parent().find('span.loading').hide();
            });            
        }); 

        element.bind("error" , function(e){ 
            // console.log(element);
            //element.show();
            //element.parent().find('span.loading').hide();
            element.parent().find('span.loading').html("<img src='/images/image-not-available.jpg'>");
        });        
    };
});

faithcanon.directive('videoLoader', function () {
    return function (scope, element, attrs) {
        //scope.doSomething(element);
        element.bind("loadstart" , function(e){ 
            // console.log(element);
            element.show();
            element.parent().find('span.loading').hide();
        });

        element.bind("error" , function(e){ 
            // console.log(element);
            //element.parent().find('span.loading').html("Video Loading Error !");
            element.parent().find('span.loading').html("<img src='/images/video-not-available.jpg'>");
        });        
    };
});


// faithcanon.directive('fcScroll', function () {
//     return function (scope, element, attrs) {
//         console.log('loading directive');
//         element.bind('scroll' , function(e){ 
//             console.log(element);
//             alert('google');
//         });                
//     };
// });




function FcMainController($scope, $location, $cookies, $http, Upload, $timeout, $filter, _id) {
    
    var socket = io();
    $scope.userNav = {};

    // $scope.test = function () {
    //     alert("hello!");
    // }    
    $http.get('/checkSession'+'/'+get_uuid())
    .success(function(data) {
        //$scope.rows = data;
        //console.log(data);
        if($.isEmptyObject(data) == true) {
            //location.href = '/';
        }else {

            //console.log(location.pathname);
            check_fr_frr();
            get_new_notification();
            if(location.pathname == '/user'){
                get_new_post();                
                $scope.userNav.user = true;
                $http.post('/view-activity').success(function(list) {
                    $scope.rows = list.data;
                    $("#user-activities").show();
                    //console.log(list);                        
                }).error(function(err) {
                    console.log('Error: ' + err);
                });                 
            }else if(location.pathname == '/user-profile'){
                $scope.userNav.profile = true;
                $("#user-dp-update").show();
                $("#userPasswordForm").show();
            }else if(location.pathname == '/view-friends'){
                $scope.userNav.friends = true;                
            }else if(location.pathname == '/store'){
                $scope.userNav.store = true;                
            }else if (location.pathname.match(/\/public\/profile\/(\d+)/)[1]) {
                get_new_post(location.href.substr(location.href.lastIndexOf('/') + 1));                                
            }

            socket.on('new_post', function(msg){
                if(location.pathname == '/user'){
                    //console.log(msg);
                    get_new_post();
                }
            });

            fc_notification = 0;
            // bottom: 60px;
            socket.on(('new_like_'+_id), function(msg){
                //console.log(msg);
                get_new_notification();
                if($(".fc-notification").length != undefined)
                    fc_notification = $(".fc-notification").length;

                $("#content .box-row").append('<a md-ink-ripple="" data-type="like" data-id="'+msg.post_id+'" id="fc_notification_'+fc_notification+'" style="bottom:'+(20+(fc_notification*40))+'px" class="md-btn md-fab md-fab-bottom-right pos-fix blue waves-effect fc-notification"><i class="fa fa-2x fa-thumbs-up"></i> '+msg.msg+'</a>')
                setTimeout(function(){ $("#fc_notification_"+fc_notification).fadeOut( 900, function() {$(this).remove();}); }, 10000);
            });

            // bottom: 60px;
            socket.on(('new_comment_'+_id), function(msg){
                //console.log(msg);
                get_new_notification();
                if($(".fc-notification").length != undefined)
                    fc_notification = $(".fc-notification").length;

                $("#content  .box-row").append('<a md-ink-ripple="" data-type="comment" data-id="'+msg.post_id+'" id="fc_notification_'+fc_notification+'" style="bottom:'+(20+(fc_notification*40))+'px" class="md-btn md-fab md-fab-bottom-right pos-fix green waves-effect fc-notification"><i class="fa fa-2x fa-comments"></i> '+msg.msg+'</a>')                
                 setTimeout(function(){ $("#fc_notification_"+fc_notification).fadeOut( 900, function() {$(this).remove();}); }, 10000);
            });

            $(document).on('click', '.fc-notification', function( event )  {
              $(this).fadeOut( 800, function() {
                if(location.pathname == '/user'){
                    var element = $("#post_"+$(this).data('id'));
                    var element_wrapper = $("#post_"+$(this).data('id')+" div.card");
                    //console.log(Math.abs($("div.row").offset().top - $("#post_"+$(this).data('id')).offset().top));
                    var type = $(this).data('type');
                    $('div').animate({scrollTop: ( Math.abs($("div.row").offset().top - $(element).offset().top))}, 2000);
                    
                    if(type=="comment"){$(element_wrapper).css({border: '0 solid #4caf50b3'}).animate({borderWidth: 2}, 800);}
                    else if(type=="like"){$(element_wrapper).css({border: '0 solid #2196f3b3'}).animate({borderWidth: 2}, 800);}

                    $(element_wrapper).hover(function(event) {  
                        event.preventDefault();
                        $(element_wrapper).animate({borderWidth: 0}, 500);
                    });
                }                
                $(this).remove();
              });
            });

            socket.on('disconnect', function(){
                console.log('user disconnected');
            });
            socket.on('connection', function(socket){
                console.log('a user connected');                                
            });


        }
    }).error(function(data) {
        console.log('Error: ' + data);
    }); 

    $scope.logout = function(_id) {
        $http.get('/logout/'+_id + '/'+get_uuid())
        .success(function(data) {
            //$scope.rows = data;
            console.log(data.status);
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
    //@ check if the value exist in the object 
    $scope.value_exists = function(arr, val){
        // console.log(arr); 
        // console.log(val);
        return $filter('filter')(arr, val).length > 0;
    }  
    // when submitting the add form, send the text to the node API
    $scope.update = function() {
    	var formdata = $("#userForm").serializeArray();
		var data = {};
		$(formdata).each(function(index, obj){
		    data[obj.name] = obj.value;
		});
		
        $http.post('/user-update', data)
            .success(function(data) {
                $scope.userFormData = {}; // clear the form so our user is ready to enter another               
                if(data.status=="true"){
                    location.href = '/user-profile';
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
        var formdata = $("#userPasswordForm").serializeArray();
        var data = {};
        $(formdata).each(function(index, obj){
            data[obj.name] = obj.value;
        });
        
        $http.post('/user-update-password', data)
            .success(function(data) {
                $scope.upData = {}; // clear the form so our user is ready to enter another               
                if(data.status=="true"){
                    location.href = '/user-profile';
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
                    //console.log(response.data.response);
                    $("#profile_progress_bar").hide();
                });
            }, function (response) {

                // if (response.status > 0)
                //     $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {
                $scope.Progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                $('#dvProgress').css("width", ($scope.Progress + '%'));
                $('#dvProgress').html($scope.Progress + '%');
                //console.log(Math.min(100, parseInt(100.0 * evt.loaded / evt.total)));
            });
        });
    }


    $scope.add_friend  = function($event) {
        //console.log($($event.currentTarget).data("id"));
        element = $($event.currentTarget); 

        req = {"user_id":$($event.currentTarget).data("id")};
        $(element).prop("disabled", true);         
        $http.post('/add-friend', req)
        .success(function(res) {            
            if(res.status=="true"){
                //location.href = '/user-profile';
                //console.log($(element).closest('div.card'));
                tmp_element = $(element).closest('div.card');
                // <p style="margin: 0 auto;padding-top: 44%;font-size: larger;">Request Sent</p>
                $(tmp_element).html('<div class="item" style="height:256.5px;text-align:center;"><p style="margin: 0 auto;padding-top: 44%;font-size: larger;">'+res.response+'</p></div>');
                //console.log($(tmp_element).parent());
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
        
        element = $($event.currentTarget); 
        req = {"user_id":$($event.currentTarget).data("id")};

        $http.post('/accept-request', req)
        .success(function(res) {            
            if(res.status=="true"){
                check_fr_frr();
                //get_new_post();
            }else{
                alert(res.response);
            }            
        })
        .error(function(res) {
            console.log('Error: ' + res);
        });
    };

    $scope.delete_request  = function($event) {        
        element = $($event.currentTarget); 
        req = {"user_id":$($event.currentTarget).data("id")};
        $(element).prop("disabled", true);         
        $http.post('/delete-request', req)
        .success(function(res) {            
            if(res.status=="true"){
                check_fr_frr();
                get_new_post();
            }else{
                alert(res.response);
            }            
        })
        .error(function(res) {
            console.log('Error: ' + res);
        });
    };

    $scope.remove_friend  = function($event) {        
        element = $($event.currentTarget); 
        req = {"user_id":$($event.currentTarget).data("id")};
        $(element).prop("disabled", true);         
        $http.post('/delete-friend', req)
        .success(function(res) {            
            if(res.status=="true"){
                //console.log($(element).closest('div.card'));
                tmp_element = $(element).closest('div.card');
                // <p style="margin: 0 auto;padding-top: 44%;font-size: larger;">Request Sent</p>
                $(tmp_element).html('<div class="item" style="height:256.5px;text-align:center;"><p style="margin: 0 auto;padding-top: 44%;font-size: larger;">'+res.response+'</p></div>');
                //console.log($(tmp_element).parent());
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
        element = $($event.currentTarget); 
        location.href = '/public/profile/' + $($event.currentTarget).data("id"); 
    };

    $scope.video = '';
    $scope.image = '';
    $scope.add_image = function(image, errFiles) {
        $scope.image = image[0];
        $("#add_image").show();
        $("#add_video").hide();
        //console.log(image[0]);
        $(".image_file").html(image[0].name +" <i style='color: red;font-size: large;cursor: pointer;' class='mdi-action-highlight-remove remove_image'>");
    };
    
    $scope.add_video = function(video, errFiles) {
        //console.log(video);
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
                url: '/post-add',
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
                    //console.log(response.data.response);
                    //@ udpate results
                    $("#post_progress_bar").hide(); 
                    check_fr_frr();
                    get_new_post();
                });
            }, function (response) {

                // if (response.status > 0)
                //     $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {

                $scope.Progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                $('#dvProgress').css("width", ($scope.Progress + '%'));
                $('#dvProgress').html($scope.Progress + '%');
                //console.log(Math.min(100, parseInt(100.0 * evt.loaded / evt.total)));
            });
        }else if($scope.image != ""){ 
            $("#post_progress_bar").show();
            $scope.image = "";
            file.upload = Upload.upload({
                url: '/post-add',
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
                //console.log(response.data.response);
                //@ udpate results 
                $("#post_progress_bar").hide();
                check_fr_frr();
                get_new_post();
            });
            }, function (response) {

                // if (response.status > 0)
                //     $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {
                $scope.Progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                $('#dvProgress').css("width", ($scope.Progress + '%'));
                $('#dvProgress').html($scope.Progress + '%');
                //console.log(Math.min(100, parseInt(100.0 * evt.loaded / evt.total)));
            });
        }else {
            $("#post_progress_bar").show();
            file.upload = Upload.upload({
                url: '/post-add',
                data: {text:$("#userPostText").val()}
            }).success(function(data, status, headers, config) {
                //console.log(data);
                $("#userPostText").val('');
                $("#post_progress_bar").hide();
                check_fr_frr();
                get_new_post();
            });
        }        
    };

    $scope.post_delete = function($event){
        $http.get('/post-delete/'+$($event.currentTarget).data("id"))
        .success(function(data) {
            //$scope.rows = data;
            //console.log(data);
            if($.isEmptyObject(data) == true) {
                // do nothing
                //location.href = '/';
            }else {
                check_fr_frr(); 
                get_new_post();               
            }
        }).error(function(data) {
            console.log('Error: ' + data);
        }); 
    };

    $scope.post_like = function($event){
        $http.get('/post-like/'+$($event.currentTarget).data("id"))        
        .success(function(data) {
            //$scope.rows = data;
            console.log(data);
            if($.isEmptyObject(data) == true) {
                // do nothing
                //location.href = '/';                
            }else {
                if($($event.currentTarget).hasClass("fa-thumbs-o-up")){
                    $($event.currentTarget).removeClass("fa-thumbs-o-up");
                    $($event.currentTarget).addClass("fa-thumbs-up");
                }
                else {
                    $($event.currentTarget).removeClass("fa-thumbs-up");
                    $($event.currentTarget).addClass("fa-thumbs-o-up");
                }
                $($event.currentTarget).parent().find('span').html('Like ( '+data.data[0].post_likes.length+' )  ');
            }
        }).error(function(data) {
            console.log('Error: ' + data);
        }); 
    };

    $scope.post_comment = function($event){
        element = $($event.currentTarget);
        element_wrapper = $(element).closest('div.post_comment_wapper');
        $(element_wrapper).find(".progress").show();

        // console.log($(element).parent().parent().find(".post_comment_text").val());
        $http.post('/post-comment',{_id:$(element).data("id"),text:$(element).parent().parent().find(".post_comment_text").val()})
        .success(function(data) {
            //$scope.rows = data;
            console.log(data);
            
            $(element).parent().parent().find(".post_comment_text").val("");
            $(element_wrapper).find(".dvProgress").show();
            $(element_wrapper).find(".dvProgress").css("width", '100%');
            
            $timeout( function(){
                $(element_wrapper).find(".progress").hide();
                $(element_wrapper).find(".dvProgress").hide();
                $(element_wrapper).find(".dvProgress").css("width", '0%');
            }, 1500 );

            if($.isEmptyObject(data) == true) {
                // do nothing
                //location.href = '/';
            }else {

                $scope.rows_post.forEach(function (post) {
                    //console.log(post.post_content)
                    if(data.data[0]._id == post._id){
                        post.post_comments = data.data[0].post_comments;

                        post.post_comments.forEach(function (comment) {
                            //console.log(post.post_content)
                            var now = new Date();
                            var added_on = new Date(comment.commented_on);
                            var diffMs = (now - added_on); 
                            var diffDays = Math.floor(diffMs / 86400000); // days
                            var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                            var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                            if(diffDays == 0 && diffHrs == 0) comment.commented_on = diffMins + " min ";
                            else if(diffDays == 0 && diffHrs > 0) comment.commented_on = diffHrs + " hrs ";
                            else if(diffDays > 0) comment.commented_on = diffDays + " days "; 
                        }); 
                    }                    
                });
                // update the comments                 
                tmp_element = $(element).closest('div.post_comment_wapper').parent().find('a.fc-comments');

                if($(tmp_element).find('i').hasClass("fa-comments-o")){
                    $(tmp_element).find('i').removeClass("fa-comments-o");
                    $(tmp_element).find('i').addClass("fa-comments");
                }
                else {
                    $(tmp_element).find('i').removeClass("fa-comments");
                    $(tmp_element).find('i').addClass("fa-comments-o");
                }
                $(tmp_element).find('span').html('Comment ( '+data.data[0].post_comments.length+' )  ');             
            }
        }).error(function(data) {
            console.log('Error: ' + data);
        }); 
    };

    $scope.comment_delete = function($event) {
        element = $($event.currentTarget);
        $http.post('/post-comment-delete',{_id:$(element).data("id"),comment_id:$(element).data("cid")})
        .success(function(data) {
            //$scope.rows = data;
            console.log(data);           

            if($.isEmptyObject(data) == true) {
                // do nothing
                //location.href = '/';
            }else {
                $scope.rows_post.forEach(function (post) {
                    //console.log(post.post_content)
                    if(data.data[0]._id == post._id){
                        post.post_comments = data.data[0].post_comments;

                        post.post_comments.forEach(function (comment) {
                            //console.log(post.post_content)
                            var now = new Date();
                            var added_on = new Date(comment.commented_on);
                            var diffMs = (now - added_on); 
                            var diffDays = Math.floor(diffMs / 86400000); // days
                            var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                            var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                            if(diffDays == 0 && diffHrs == 0) comment.commented_on = diffMins + " min ";
                            else if(diffDays == 0 && diffHrs > 0) comment.commented_on = diffHrs + " hrs ";
                            else if(diffDays > 0) comment.commented_on = diffDays + " days "; 
                        }); 
                    }                    
                });
                // update the comments                                 
                $(tmp_element).find('span').html('Comment ( '+data.data[0].post_comments.length+' )  ');             
            }
        }).error(function(data) {
            console.log('Error: ' + data);
        });
    }

    $scope.notification_noticed = function($event) {
        elm = $($event.currentTarget).find('a');
        $http.get('/post-notification-noticed/'+$(elm).data("id"))
        .success(function(data) {
            //$scope.rows = data;
            console.log(data);           

            if($.isEmptyObject(data) == true) {
                // do nothing
                //location.href = '/';
            }else {
                // navigate 
                if(location.pathname == '/user'){
                    var element = $("#post_"+$(elm).data('post'));
                    var element_wrapper = $("#post_"+$(elm).data('post')+" div.card");
                    //console.log(Math.abs($("div.row").offset().top - $("#post_"+$(this).data('id')).offset().top));
                    var type = $(elm).data('type');
                    $('div').animate({scrollTop: ( Math.abs($("div.row").offset().top - $(element).offset().top))}, 2000);
                    
                    if(type=="1"){$(element_wrapper).css({border: '0 solid #4caf50b3'}).animate({borderWidth: 2}, 800);}
                    else if(type=="0"){$(element_wrapper).css({border: '0 solid #2196f3b3'}).animate({borderWidth: 2}, 800);}

                    $(element_wrapper).hover(function(event) {  
                        event.preventDefault();
                        $(element_wrapper).animate({borderWidth: 0}, 500);
                    });
                } 
                // update notification 
                get_new_notification();               
            }
        }).error(function(data) {
            console.log('Error: ' + data);
        });
    }

    $scope.view_post = function($event) {
        elm = $($event.currentTarget).find('a');
        if(location.pathname == '/user'){
            var element = $("#post_"+$(elm).data('post'));
            var element_wrapper = $("#post_"+$(elm).data('post')+" div.card");
            //console.log(Math.abs($("div.row").offset().top - $("#post_"+$(this).data('id')).offset().top));
            var type = $(elm).data('type');
            $('div').animate({scrollTop: ( Math.abs($("div.row").offset().top - $(element).offset().top))}, 2000);
            
            if(type=="1"){$(element_wrapper).css({border: '0 solid #4caf50b3'}).animate({borderWidth: 1}, 800);}
            else if(type=="0"){$(element_wrapper).css({border: '0 solid #2196f3b3'}).animate({borderWidth: 1}, 800);}

            $(element_wrapper).hover(function(event) {  
                event.preventDefault();
                $(element_wrapper).animate({borderWidth: 0}, 500);
            });
        } 
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
            
            //console.log(list);                        
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
            //console.log(list);                        
        }).error(function(err) {
            console.log('Error: ' + err);
        });        
    }

    $scope.post_limit = 10;
    $scope.get_new_post = function($event, $user_id="") {
        $($event.currentTarget).hide();
        $($event.currentTarget).parent().find('.loading').show();
        //@ call for the next 
        $scope.post_limit = $scope.post_limit + 10;

        $http.post('/post-view-new', {limit:$scope.post_limit,user_id:$user_id}).success(function(list) {
            $scope.rows_post = list.rows_post;
            $scope._id = list._id;            

            $scope.rows_post.forEach(function (post) {
                //console.log(post.post_content)
                var now = new Date();
                var added_on = new Date(post.created_at);
                var diffMs = (now - added_on); 
                var diffDays = Math.floor(diffMs / 86400000); // days
                var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                if(diffDays == 0 && diffHrs == 0) post.added_on = diffMins + " min ";
                else if(diffDays == 0 && diffHrs > 0) post.added_on = diffHrs + " hrs ";
                else if(diffDays > 0) post.added_on = diffDays + " days ";

                 post.post_comments.forEach(function (comment) {
                    //console.log(post.post_content)
                    var now = new Date();
                    var added_on = new Date(comment.commented_on);
                    var diffMs = (now - added_on); 
                    var diffDays = Math.floor(diffMs / 86400000); // days
                    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                    if(diffDays == 0 && diffHrs == 0) comment.commented_on = diffMins + " min ";
                    else if(diffDays == 0 && diffHrs > 0) comment.commented_on = diffHrs + " hrs ";
                    else if(diffDays > 0) comment.commented_on = diffDays + " days "; 
                }); 
            });

            $($event.currentTarget).parent().find('.loading').hide();
            $($event.currentTarget).show();            
            
        }).error(function(err) {
            console.log('Error: ' + err);
        });
    }

    function get_new_post($user_id="") {        
        $http.post('/post-view-new', {limit:$scope.post_limit,user_id:$user_id}).success(function(list) {
            $scope.rows_post = list.rows_post;
            $scope._id = list._id;

            // if($user_id != ""){
            //     $scope.post_limit = $scope.post_limit + 10;
            // }

            $scope.rows_post.forEach(function (post) {
                //console.log(post.post_content)
                var now = new Date();
                var added_on = new Date(post.created_at);
                var diffMs = (now - added_on); 
                var diffDays = Math.floor(diffMs / 86400000); // days
                var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                if(diffDays == 0 && diffHrs == 0) post.added_on = diffMins + " min ";
                else if(diffDays == 0 && diffHrs > 0) post.added_on = diffHrs + " hrs ";
                else if(diffDays > 0) post.added_on = diffDays + " days ";

                 post.post_comments.forEach(function (comment) {
                    //console.log(post.post_content)
                    var now = new Date();
                    var added_on = new Date(comment.commented_on);
                    var diffMs = (now - added_on); 
                    var diffDays = Math.floor(diffMs / 86400000); // days
                    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                    if(diffDays == 0 && diffHrs == 0) comment.commented_on = diffMins + " min ";
                    else if(diffDays == 0 && diffHrs > 0) comment.commented_on = diffHrs + " hrs ";
                    else if(diffDays > 0) comment.commented_on = diffDays + " days "; 
                }); 
            });

            $(".user_wall_angular").show();
            // //console.log(list);
            // if($("#user-activities").html() != undefined){
                
            // }
        }).error(function(err) {
            console.log('Error: ' + err);
        });
    }

    $scope.rows_notifications = {};
    function get_new_notification() {        
        $http.post('/post-view-notifications').success(function(list) {
            $scope.rows_notifications = list.data;                       

            var count = 0;

            if($scope.rows_notifications.length > 0){
                $scope.rows_notifications.forEach(function (row) {
                    //console.log(row.is_noticed)

                    if(!row.is_noticed) count = count + 1;

                    var now = new Date();
                    var added_on = new Date(row.notification_log_time);
                    var diffMs = (now - added_on); 
                    var diffDays = Math.floor(diffMs / 86400000); // days
                    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
                    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes  

                    if(diffDays == 0 && diffHrs == 0) row.added_on = diffMins + " min ";
                    else if(diffDays == 0 && diffHrs > 0) row.added_on = diffHrs + " hrs ";
                    else if(diffDays > 0) row.added_on = diffDays + " days ";                 
                });
            }

            //console.log(count);
            if(count > 0){
                $("#user_top_nav_notification").find("b.bg-danger").html(count);
            }else{
                $("#user_top_nav_notification").find("b.bg-danger").html('');
            }
            //@ update notification counts           
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
        //console.log($('#user_search').val(), e.keyCode);
        if(e.keyCode == 13){
            location.href = '/user-find-friends/' + $('#user_search').val(); 
        }
    });       
});


