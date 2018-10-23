    var express = require('express');
    var router = express.Router();      

    var web = require('../controllers/web');    
    var api = require('../controllers/api');

    // routes ======================================================================

    /// ---------------------------------------------------------------
    // @ Routing For WebApp
    /// ---------------------------------------------------------------
    //@
    router.get('/', web.home);
    //@
    router.get('/privacy-policy', web.privacyPolicy);
    //@
    router.get('/terms', web.terms);
    // @
    router.get('/checkSession/:_ignore', web.checkSession);
    
    //@ social Media login controller
    router.all('/auth/facebook', web.join);    
    router.all('/auth/google', web.join);

    router.get('/ssession/:_secret', web.ssession);
    // @
    //router.get('/main', web.main);
    // @
    router.get('/user', web.user);
    router.get('/user-profile', web.userProfile);
    router.all('/user-update', web.userUpdate);
    router.all('/user-update-password', web.userUpdatePassword);    

    //@    
    router.post('/join', web.join);    
    //@    
    router.get('/verify/:_id', web.verify);    
    // @
    router.post('/login', web.login);
    //@    
    router.get('/logout/:_id/:_ignore', web.logout);    
    // @
    router.post('/forgot', web.forgot);
    // @
    router.get('/reset/:_id', web.reset);
    // @
    router.post('/reset-done', web.resetDone);
    // //@ 
    router.post('/upload-image',web.uploadImage);
    //@ -----
    router.all('/view-activity', web.viewActivity);
    //@ Action related to friends
    router.get('/user-find-friends', web.userFindFriends);
    router.get('/user-find-friends/:_query', web.userFindFriends);

    router.get('/view-friends', web.showFriendsList);
    router.get('/view-friends/:_id', web.showFriendsList);

    router.get('/public/profile/:_id', web.userPublicProfile);

    router.post('/add-friend', web.sendFriendRequest);
    router.get('/view-received-request', web.viewReceivedRequest);    
    router.post('/accept-request', web.acceptFriendRequest);    
    router.post('/delete-request', web.deleteFriendRequest);    
    router.get('/view-friends-list', web.viewFriendsList);    
    router.all('/delete-friend', web.deleteFriend);
    //@ -----
    // @ Action related to post
    router.post('/post-add', web.addPost);
    router.all('/post-view-new', web.viewNewPost);
    router.all('/post-delete/:_id', web.deletePost);
    router.all('/post-like/:_id', web.likePost);
    router.all('/post-comment', web.commentOnPost);
    router.all('/post-comment-delete', web.deleteCommentOnPost);
    router.all('/post-view-notifications', web.viewNotifications);
    router.all('/post-notification-noticed/:_id', web.noticedNotification);

    //@ 
    router.get('/store', web.store);
    /// ---------------------------------------------------------------
    /// ---------------------------------------------------------------


    /// ---------------------------------------------------------------
    // @ Routing for API 
    /// ---------------------------------------------------------------
    // @
    router.all('/api/check-session', api.checkSession);
    //@
    router.all('/api/join', api.join);    
    // @
    router.all('/api/login', api.login);
    // @
    router.all('/api/forgot', api.forgot);
    // @
    router.all('/api/view-profile', api.viewProfile);
    router.all('/api/public/profile', api.viewPublicProfile);
    // @
    router.all('/api/change-password', api.changePassword);
    //@
    router.all('/api/update-profile', api.updateProfile);
    // @
    router.post('/api/upload-image', api.uploadImage);  //// working 

    // @ not required 
    //router.all('/api/save-activity', api.saveActivityAPI);
    // @
    router.all('/api/view-activity', api.viewActivityAPI);

    // @
    router.all('/api/search/new/friend', api.searchNewFriend);
    router.all('/api/send-friend-request', api.sendFriendRequest);
    router.all('/api/view-friend-request', api.viewFriendRequest);
    router.all('/api/accept-friend-request', api.acceptFriendRequest);
    router.all('/api/delete-friend-request', api.deleteFriendRequest);
    
    router.all('/api/view-friends', api.showFriendsList);
    router.all('/api/delete-friends', api.deleteFriend);    

    // @ Action related to post
    router.post('/api/add-post', api.addPost);
    router.all('/api/view-new-post', api.viewNewPost);    
    router.all('/api/delete-post', api.deletePost);
    router.all('/api/post-like', api.likePost);
    router.all('/api/post-comment', api.commentOnPost);
    router.all('/api/get-post-comment', api.getCommentsOnPost);
    router.all('/api/post-comment-delete', api.deleteCommentOnPost);
    
    router.all('/api/view-notifications', api.viewNotifications);
    router.all('/api/notification-noticed', api.noticedNotification);
    router.all('/api/view-post', api.viewPost);
    /// ---------------------------------------------------------------
    /// ---------------------------------------------------------------
    
    module.exports = router;