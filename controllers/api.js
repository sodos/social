
    var mongoose    = require('mongoose');
    var model       = require('../models/model'); 
    var config      = require('../configuration/config')
    var dbUri       = config.dbUri;   
    const util      = require('util');
    var mailer      = require("nodemailer");
    var randomstring= require("randomstring");
    var formidable  = require('formidable');
    var fs          = require('fs');
    var path        = require('path');
    var FCM         = require('fcm-push');
    const uuid      = require('uuid/v1');
    //var timeout     = express.timeout // express v3 and below
    var timeout     = require('connect-timeout'); //express v4
    const ObjectId  = require('mongodb').ObjectId;    

    

    var serverKey = config.fcm_server_key;
    var fcm = new FCM(serverKey);

    // Use Smtp Protocol to send Email
    var smtpTransport = mailer.createTransport(config.SmtpOptions);

    fc_sessions     = mongoose.model('fc_sessions');    
    fc_user_profile = mongoose.model('fc_user_profile');
    fc_activities   = mongoose.model('fc_activities');
    fc_notifications= mongoose.model('fc_notifications');
    fc_posts        = mongoose.model('fc_posts');

   
    exports.join = function(req, res) {
        if(req.body.device_id != "" && req.body.device_id != null){
        if(req.body.first_name != "" && req.body.first_name != null){
        if(req.body.last_name != "" && req.body.last_name != null){
        if(req.body.email != "" && req.body.email != null){
        if((req.body.password != "" && req.body.password != null) || req.body.provider == 'facebook' || req.body.provider == 'twitter' || req.body.provider == 'google') {
            fc_user_profile.find({email:req.body.email},function(err, rows) {
                
                provider = "mobile";
                if(req.body.provider != undefined){
                    provider = req.body.provider;
                }

                if (err){
                    res.send(err); return;
                }
                else if (rows.length) { 
                    if(provider == 'facebook' || provider == 'twitter' || provider == 'google' ) {
                        res.json({status: "true", response: "Login successfully.", data:rows[0]});                        
                    }else{
                        if(rows[0].verified_at == ""){ res.json({status: "false", response: "This email id is already registered with us. Please verify your email id !", data:{user_id:rows[0]._id}});} 
                        else {res.json({status: "false", response: "This email id is already registered with us. Please use different email id to register a new account !", data:{}}); }
                    }
                }
                else {
                    
                    password = randomstring.generate(8);
                    if(req.body.password != "" && req.body.password != undefined){
                        password = req.body.password;
                    }

                    verified_at = "";
                    if(provider == 'facebook' || provider == 'twitter' || provider == 'google'){
                        verified_at = new Date();
                    }

                    gender = "";
                    if(req.body.gender != '' && req.body.gender != undefined){
                        gender = req.body.gender;
                    }

                    profile_image_url = "";
                    if(req.body.profile_image_url != '' && req.body.profile_image_url != undefined){
                        profile_image_url = req.body.profile_image_url;
                    }

                    //@ create session
                    fc_user_profile.create({                    
                        email               : req.body.email,
                        first_name          : req.body.first_name,
                        last_name           : req.body.last_name,
                        device_id           : req.body.device_id,
                        password            : password,
                        gender              : gender,
                        last_login          : "",
                        created_at          : new Date(),
                        verified_at         : verified_at,
                        profile_image_url   : profile_image_url,
                        provider            : provider
                    }, function(err1, records) {
                        if (err1)
                            console.log(err1);
                        //send an email for verification
                        //@ 
                        if(verified_at == ""){
                            console.log(records._id);
                            plainText = 'You have successfully registered . Kindly click the Link to verify your Account  '+config.baseURL+'/verify/' + records._id
                            htmlText = '<b>You have successfully registered .</b><br/> Kindly click the Link to verify your Account <br/> '+config.baseURL+'/verify/' + records._id
                            var mailOptions = {
                                from: '"FaithCannon" <noreply@example.com>', // sender address
                                to: req.body.email, // list of receivers
                                subject: 'Welcome to FaithCannon !', // Subject line
                                text: plainText, // plain text body
                                html: htmlText
                            };

                            // send mail with defined transport object
                            smtpTransport.sendMail(mailOptions, (error, info) => {
                                if (error) {
                                    return console.log(error);
                                }
                                console.log('Message sent: %s', info.messageId);                            
                                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));                            
                            });

                            //@ create activity
                            var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                            
                            var ret = saveActivity({user_id:records._id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:"Joined From Mobile"});
                            //console.log(ret);

                            res.json({status: "true", response: "Register successfully. Please check your email inbox to verify your email id.", data:{}});
                        }else{

                            //@ create activity
                            var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                            
                            var ret = saveActivity({user_id:records._id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:("Joined From Mobile via "+ provider)});
                            //console.log(ret);

                            res.json({status: "true", response: "Register & Login successfully.", data:{user_id:records._id}});
                        }
                    });                
                }
            }).select({"_id":1,"first_name":1,"last_name":1,"profile_image_url":1,"displayName":1});
        }else {
            res.json({status: "false", response: "Password missing !", data:{}});
        }
        }else {
            res.json({status: "false", response: "Email missing !" , data:{}});
        }
        }else {
            res.json({status: "false", response: "Last Name is missing !" , data:{}});
        }
        }else {
            res.json({status: "false", response: "First Name is missing !" , data:{}});
        }
        }else {
            res.json({status: "false", response: "Device ID is missing !" , data:{}});
        }
    };
    
    exports.checkSession = function(req, res) {
        
        if(req.body.user_id != "" && req.body.user_id != null){
            fc_sessions.find({user_id:req.body.user_id, session_end:null}, function(err, rows) {

                if (err)
                    res.send(err)

                //res.json(rows);  
                if(rows[0] != undefined){           
                    res.json({status: "true", response:"valid session", data:rows[0]});
                }else{
                    res.json({status: "false", response:"invalid session", data:{}});
                }
                
            });
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }
    };

    exports.login = function(req, res) {

        console.log(req.body);
        if(req.body.device_id != "" && req.body.device_id != null){
        
            fc_user_profile.find({email:req.body.email, password:req.body.password},function(err, rows) {
                if (err){
                    res.send(err)
                }
                
                if(rows[0] != undefined){
                    if(rows[0].verified_at != null){
                        //@ create session
                        fc_sessions.create({
                            user_id : rows[0]._id,                    
                            user_ip : "",
                            user_agent : "",
                            device_id  : req.body.device_id,
                            session_start: new Date()
                        }, function(err1, tmp1) {
                            if (err1)
                                console.log(err1);

                            //@ udpate last login field 
                            fc_user_profile.update({
                                _id : rows[0]._id,
                                email : rows[0].email                    
                            },
                            { last_login: new Date(), device_id  : req.body.device_id }, function(err2, tmp2) {
                                if (err2)
                                    console.log(err2);

                                //@ log & send the row data  
                                console.log(rows);
                                fc_user_profile.find({_id : rows[0]._id,email : rows[0].email},function(err, tmp_row) {
                                    if (err){res.send(err);return;}
                                    
                                    if(tmp_row[0] != undefined){
                                        res.json({status: "true", response: "success", data:tmp_row[0]});
                                    }
                                }).select({"_id":1,"first_name":1,"last_name":1,"profile_image_url":1});
                                //res.json({status: "true", response: ("Welcome " + rows[0].first_name) , data:{user_id:rows[0]._id}});
                            });
                        }); 
                    } else {
                        res.json({status: "false", response: "Kindly verify your email !", data:{}});
                    }                
                }else{
                    res.json({status: "false", response: "Incorrect login credentials !", data:{}});
                }
            });
        }else {
            res.json({status: "false", response: "Device ID is missing !", data:{}});
        }
    };

    exports.forgot = function(req, res) {

        if(req.body.email != "" && req.body.email != null){
        
            fc_user_profile.find({email:req.body.email},function(err, rows) {
                if (err){
                    res.send(err)
                }
                else if(rows[0] != undefined){
                    //@ send an email 

                    secret = randomstring.generate(35);

                    fc_user_profile.update({
                        _id : rows[0]._id,
                        email : rows[0].email                    
                    },
                    { reset_secret: secret}, function(err2, tmp2) {
                        if (err2)
                            console.log(err2);
                        plainText = 'Kindly click the Link to reset your Account password  '+config.baseURL+'/reset/' + secret
                        htmlText = '<b> Kindly click the Link to reset your Account password </b> <br/> '+config.baseURL+'/reset/' + secret
                        var mailOptions = {
                            from: '"FaithCannon" <noreply@example.com>', // sender address
                            to: rows[0].email, // list of receivers
                            subject: 'Reset your FaithCannon Password', // Subject line
                            text: plainText, // plain text body
                            html: htmlText
                        };

                        // send mail with defined transport object
                        smtpTransport.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            console.log('Message sent: %s', info.messageId);                            
                            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));                            
                        });

                        res.json({status: "true", response: "Please check your email for reset instructions.", data:{}});
                    });
                }else{
                    res.json({status: "false", response: "Email Address is not registered with us !", data:{}});
                }
            });

        }else {
            res.json({status: "false", response: "Email Address is missing !", data:{}});
        }
    };

    exports.viewProfile = function(req, res) {
        if(req.body.user_id != "" && req.body.user_id != null){         
            fc_user_profile.find({email:req.body.email, _id:req.body.user_id},function(err, rows) {
                if (err){res.send(err); return;}
                
                if(rows[0] != undefined){
                    res.json({status: "true", response: "success", data:rows[0]});
                }else{
                    res.json({status: "false", response: "User is not registered with us!", data:{}});
                }
            }).populate("friend_request_received.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1, city:1, state:1, country:1, postal_code:1, bio:1}).populate("friends.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1, city:1, state:1, country:1, postal_code:1, bio:1}).populate("friend_request_sent.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1, city:1, state:1, country:1, postal_code:1, bio:1}).select({"device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }
    };
 
    exports.viewPublicProfile = function(req, res) {
        if(req.body.user_id != "" && req.body.user_id != null){         
            fc_user_profile.find({_id:req.body.user_id},function(err, rows) {
                if (err){res.send(err);return;}
                
                if(rows[0] != undefined){
                    res.json({status: "true", response: "success", data:rows[0]});
                }else{
                    res.json({status: "false", response: "User is not registered with us!", data:{}});
                }
            }).select({"reset_secret":0,"is_active":0,"_id": 0, "__v":0, "created_at":0,"verified_at":0, "password":0});
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }
    };

    exports.changePassword = function(req, res) {
        if(req.body.user_id != "" && req.body.user_id != null){
            if(req.body.password_new != "" && req.body.password_new != null){                     
                fc_user_profile.find({_id:req.body.user_id},function(err, rows) {
                    if (err){
                        res.send(err)
                    }
                    
                    if(rows[0] != undefined){                    
                        //@ udpate last login field 
                        fc_user_profile.update({
                            _id : rows[0]._id,
                            email : rows[0].email                    
                        },
                        { password: req.body.password_new }, function(err2, tmp2) {
                            if (err2)
                                console.log(err2);

                            //@ create activity
                            var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                            
                            var ret = saveActivity({user_id:rows[0]._id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:"Password updated"});
                            console.log(ret);

                            //@ log & send the row data  
                            console.log(rows);
                            res.json({status: "true", response:"Password udpated successfully.", data:{}});
                        });
                        //res.json(rows[0]);
                    }else{
                        res.json({status: "false", response: "Fail. Please try again !", data:{}});
                    }
                });
            }else {
                res.json({status: "false", response: "Blank Password is not accepted !", data:{}});
            }
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }
    };

    exports.updateProfile = function(req, res) {
        req.setTimeout(0);
        
        var form = new formidable.IncomingForm();
        var extensions = ['.jpg', '.jpeg', '.png', '.gif']; 

        form.parse(req, function (err, fields, files) {
            console.log(err);            
            // res.writeHead(200, {'content-type': 'text/plain'});
            // res.write('received upload:\n\n');
            // res.end(util.inspect({fields: fields, files: files}));
            console.log(fields);

            if(files.file == undefined && fields.user_id == undefined ){
                res.json({status: "false", response: "failed", data:{}});
                return;
            }

            if(fields.user_id != "" && fields.user_id != undefined) {
                if(fields.first_name != "" && fields.first_name != undefined) {                

                    fc_user_profile.find({_id:fields.user_id},function(err, user_row) {
                    last_name = user_row[0].last_name;
                    if(fields.last_name != '' && fields.last_name != undefined){
                        last_name = fields.last_name;
                    }

                    displayName = user_row[0].displayName;
                    if(fields.displayName != '' && fields.displayName != undefined){
                        displayName = fields.displayName;
                    }

                    gender = user_row[0].gender;
                    if(fields.gender != '' && fields.gender != undefined){
                        gender = fields.gender;
                    }

                    dob = user_row[0].dob;
                    if(fields.dob != '' && fields.dob != undefined){
                        dob = fields.dob;
                    }

                    bio = user_row[0].bio;
                    if(fields.bio != '' && fields.bio != undefined){
                        bio = fields.bio;
                    }

                    phone_no = user_row[0].phone_no;
                    if(fields.phone_no != '' && fields.phone_no != undefined){
                        phone_no = fields.phone_no;
                    }

                    user_privacy = user_row[0].user_privacy;
                    if(fields.user_privacy != '' && fields.user_privacy != undefined){
                        user_privacy = fields.user_privacy;
                    }

                    city = user_row[0].city;
                    if(fields.city != '' && fields.city != undefined){
                        city = fields.city;
                    }

                    state = user_row[0].state;
                    if(fields.state != '' && fields.state != undefined){
                        state = fields.state;
                    }

                    country = user_row[0].country;
                    if(fields.country != '' && fields.country != undefined){
                        country = fields.country;
                    }

                    postal_code = user_row[0].postal_code;
                    if(fields.postal_code != '' && fields.postal_code != undefined){
                        postal_code = fields.postal_code;
                    }
                    

                  console.log(files);
                  if(files.file != "" && files.file != undefined) {
                    var file = files.file;
                    //var oldpath = files.file.path;
                    var tempPath = file.path;
                    var targetPath = path.resolve(config._uploadDIR + "user.profile.img/" + file.name);            
                    var extension = path.extname(targetPath).toLowerCase();
                    var profile_image_url =  "upload/user.profile.img/" + fields.user_id + extension;
                    var finalPath = path.resolve(config._uploadDIR + "user.profile.img/" + fields.user_id + extension);
                    
                    console.log(finalPath);
                    console.log(extension);

                    if(extensions.indexOf(extension) != -1){
                       fs.rename(tempPath, finalPath, function (err) {
                            if (err){res.json(err);return;}
                            else{

                                if(fields.user_id != undefined){                    
                                    //@ udpate last login field 
                                    fc_user_profile.update({
                                        _id : fields.user_id                                                           
                                    },
                                    { first_name:fields.first_name,
                                      last_name:last_name,
                                      displayName:displayName,
                                      gender:gender,
                                      dob:dob,
                                      bio:bio,
                                      phone_no:phone_no,
                                      city:city,
                                      state:state,
                                      country:country,
                                      postal_code:postal_code,
                                      user_privacy:user_privacy,
                                      profile_image_url:profile_image_url }, function(err2, tmp2) {
                                        if (err2){res.send(err2);return;}
                                        
                                        //@ log & send the row data  
                                        console.log(tmp2);
                                        res.json({status: "true", response:"Profile udpated successfully." , data:{"profile_image_url":profile_image_url}});
                                    });
                                    //res.json(rows[0]);
                                }else{
                                    res.json({status: "false", response: "Fail. Please try again !" , data:{}});
                                }                                  
                            }                                
                            //res.end();
                        }); 
                   }else{
                        res.json({status: "false", response: "File Type Not Allowed.", data:{}});
                   }
                  }else {
                    if(fields.user_id != undefined){                    
                        //@ udpate last login field 
                        fc_user_profile.update({
                            _id : fields.user_id                                                           
                        },
                        { first_name:fields.first_name,
                          last_name:last_name,
                          displayName:displayName,
                          gender:gender,
                          dob:dob,
                          phone_no:phone_no,
                          city:city,
                          state:state,
                          country:country,
                          postal_code:postal_code,
                          user_privacy:user_privacy}, function(err2, tmp2) {
                            if (err2){res.send(err2);return;}
                            
                            //@ log & send the row data  
                            console.log(tmp2);
                            res.json({status: "true", response:"Profile udpated successfully." , data:{}});
                        });
                        //res.json(rows[0]);
                    }else{
                        res.json({status: "false", response: "Fail. Please try again !" , data:{}});
                    } 
                  }
                }); // fetch user details
                } else {
                    res.json({status: "false", response: "First Name Can not be Blank !" , data:{}});
                }
            } else {
                res.json({status: "false", response: "User ID is missing !", data:{}});
            }
        });        
    };

    exports.uploadImage = function(req, res) {  
        req.setTimeout(0);               
        
        var form = new formidable.IncomingForm();
        var extensions = ['.jpg', '.jpeg', '.png', '.gif'];                

        form.parse(req, function (err, fields, files) {
            
            // res.writeHead(200, {'content-type': 'text/plain'});
            // res.write('received upload:\n\n');
            // res.end(util.inspect({fields: fields, files: files}));
            if(files.file == undefined && fields.user_id == undefined ){
                res.json({status: "false", response: "failed", data:{}});
                return;
            }

            console.log(fields);
            if(fields.user_id != "" && fields.user_id != undefined) {                

                var tmp_uuid = uuid();
                console.log(files);
                var file = files.file;
                //var oldpath = files.file.path;
                var tempPath = file.path;
                var targetPath = path.resolve(config._uploadDIR + "user.profile.img/" + file.name);            
                var extension = path.extname(targetPath).toLowerCase();
                var profile_image_url =  "upload/user.profile.img/" + tmp_uuid + extension;
                var finalPath = path.resolve(config._uploadDIR + "user.profile.img/" + tmp_uuid + extension);
                
                console.log(finalPath);
                console.log(extension);

                if(extensions.indexOf(extension) != -1){
                   fs.rename(tempPath, finalPath, function (err) {
                        if (err) 
                            res.json(err);
                        else{

                            fc_user_profile.update({
                                _id : fields.user_id                    
                            },
                            { profile_image_url: profile_image_url}, function(err2, tmp2) {
                                if (err2)
                                    console.log(err2);

                                console.log(tmp2);                
                               res.json({status: "true", response: "success", data:{"profile_image_url":profile_image_url}});                
                            }); 
                        }                                
                        //res.end();
                    }); 
               }else{
                    res.json({status: "false", response: "File Type Not Allowed.", data:{}});
               }            
            }else {
                res.json({status: "false", response: "User ID is missing !", data:{}});
            }
        });                              
    };
    
    //@ not in scope
    exports.saveActivityAPI = function(req, res) {
        if(req.body.user_id != "" && req.body.user_id != null){         
            if(req.body.activity_descriptor != "" && req.body.activity_descriptor != null){         

                //@ create activity
                var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                
                var ret = saveActivity({user_id:req.body.user_id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:req.body.activity_descriptor});
                res.json(ret);     

            }else {
                res.json({status: "false", response: "No Activity Defined !", data:{}});
            }
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }
    };

    //@ not in scope
    exports.viewActivityAPI = function(req, res) {
        if(req.body.user_id != "" && req.body.user_id != null){         
            fc_activities.find({user_id:req.body.user_id},function(err, rows) {
                if (err){
                    res.send(err);
                }

                if(rows[0] != undefined){
                    res.json({status: "true", response: "success", data:rows});                    
                }else{
                    res.json({status: "false", response: "No Activity Registered Till Now!", data:{}});
                }

            }).select({"user_agent":0,"user_ip":0,"_id": 0, "__v":0}).sort({"activity_log_time":-1});
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }
    };

    exports.searchNewFriend = function(req, res) {
        if(req.body.user_id != "" && req.body.user_id != null){
            
            query = "";
            if(req.body.query != '' && req.body.query != undefined){
                query = req.body.query;
            }

            fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
                if (err){console.log(err); res.send(err); return;}

                var friends_pending = row_user[0].friend_request_sent.map(a => a.user_id);
                var friends_rr = row_user[0].friend_request_received.map(a => a.user_id);
                var friends = row_user[0].friends.map(a => a.user_id);
                
                //filter for friends in the list including requestd & received
                var friends_ignored = friends_pending.concat(friends_rr, friends);

            fc_user_profile.find({_id:{$ne:req.body.user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, $text:{$search:query}},function(err, fns) {
                if (err){console.log(err);}
                else { 

                    if(fns.length >0){                   
                        console.log(fns);                    
                        res.json({status: "true", response: "success", data:fns});
                    }else{
                        //@ Regex for last name - if fails in index 
                        fc_user_profile.find({_id:{$ne:req.body.user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, last_name:new RegExp(query, "i")},function(err, fns) {
                            if (err){console.log(err);}
                            else {                    
                                if(fns.length >0){                   
                                    console.log(fns);                    
                                    res.json({status: "true", response: "success", data:fns});
                                }else{
                                    //@ Regex for first name - if last_name fails 
                                    fc_user_profile.find({_id:{$ne:req.body.user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, first_name:new RegExp(query, "i")},function(err, fns) {
                                        if (err){console.log(err);}
                                        else {                    
                                            if(fns.length >0){                   
                                                console.log(fns);                    
                                                res.json({status: "true", response: "success", data:fns});
                                            }else{
                                                //@ Regex for Display name - if first_name fails 
                                                fc_user_profile.find({_id:{$ne:req.body.user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, displayName:new RegExp(query, "i")},function(err, fns) {
                                                    if (err){console.log(err);}
                                                    else {                    
                                                        console.log(fns);  
                                                        if(fns.length >0){                   
                                                            res.json({status: "true", response: "success", data:fns});
                                                        }else{
                                                            res.json({status: "false", response: "Nothing to Show !", data:{}});
                                                        }
                                                    }                                
                                                }).select({"friend_request_sent":0,"friend_request_received":0, "device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
                                            }
                                        }                                
                                    }).select({"friend_request_sent":0,"friend_request_received":0, "device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
                                }
                            }                                
                        }).select({"friend_request_sent":0,"friend_request_received":0, "device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
                    }
                }                                
            }).select({"friend_request_sent":0,"friend_request_received":0, "device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
        });

        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }
    };

    //@ send friends profile data JSON 
    exports.showFriendsList = function(req, res) {
        
        if(req.body.user_id != "" && req.body.user_id != null){            

            user_id = req.body.user_id;            

            fc_user_profile.find({_id:user_id},function(err, row_user) {
                if (err){res.send(err);return;}

                if(row_user[0] != undefined){                    
                    //@ find details of the User sent the Request                     
                    res.json({status: "true", response: "success", data:{friends:row_user[0].friends}});                    
                }else{
                    res.json({status: "false", response: "User is not registered with us!", data:{}});
                }

            }).populate("friends.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1, city:1, state:1, country:1, postal_code:1, bio:1}).select({"friends":1});
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }    
    };

    //@ send friend request
    exports.sendFriendRequest = function(req, res) {
        
        if(req.body.user_id != "" && req.body.user_id != null){ 
            if(req.body.friend_id != "" && req.body.friend_id != null){            
            
            user_id = req.body.user_id;
            friend_id = req.body.friend_id;
            //frs = friend_request_sent
            //frr = friend_request_received
            fc_user_profile.find({_id:user_id},function(err, row_frs) {                    
                if (err){
                    res.send(err); return;
                }else{

                    //console.log(friend_id);
                    console.log(row_frs[0].friend_request_sent);
                    var frs_user_ids = row_frs[0].friend_request_sent.map(a => a.user_id);

                    console.log(row_frs[0].friend_request_received);
                    var frr_user_ids = row_frs[0].friend_request_received.map(a => a.user_id);

                    console.log(row_frs[0].friends);
                    var fr_user_ids = row_frs[0].friends.map(a => a.user_id);
                    //@ check if user is already in any of the list 
                    if (fr_user_ids.indexOf(friend_id) > -1 || frs_user_ids.indexOf(friend_id) > -1 || frr_user_ids.indexOf(friend_id) > -1) {
                        res.json({status: "false", response: "already in the list !", data:{}});
                    } else {                        
                        
                        //@ update the friend_request_set for the recipient
                        friends_rs = row_frs[0].friend_request_sent;
                        friends_rs.push({user_id:friend_id, sent_on:new Date()});                         
                        fc_user_profile.update({
                            _id : user_id                    
                        },
                        {friend_request_sent:friends_rs}, function(err_frs, frs) {
                            if (err_frs){console.log(err_frs);return;}
                            
                            console.log(frs);

                            fc_user_profile.find({_id:friend_id},function(err, row_frr) { 
                                if (err){console.log(err);return;}
                                
                                //@ update the friend_request_received for the recipient                                
                                friends_rr = row_frr[0].friend_request_received;
                                friends_rr.push({user_id:user_id, received_on:new Date()}); 
                                fc_user_profile.update({
                                    _id : friend_id                    
                                },
                                {friend_request_received:friends_rr}, function(err_frr, frr) {
                                    if (err){console.log(err_frr);return;}

                                    console.log(frr);
                                    res.json({status: "true", response: "Request Sent.", data:{}});
                                });
                            
                            });                                                        
                        }); 
                    }                      
                }
            });            
          }else {
            res.json({status: "false", response: "friends user ID is missing !", data:{}});
          } 
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }    
    };

    //@ view friend request
    exports.viewFriendRequest = function(req, res) {
        
        if(req.body.user_id != "" && req.body.user_id != null){ 
                
            //frs = friend_request_sent
            //frr = friend_request_received
            fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
                if (err){res.send(err);return;}

                if(row_user[0] != undefined){
                    
                    //@ find details of the User sent the Request 
                    res.json({status: "true", response: "success", data:{friend_request_received:row_user[0].friend_request_received}});
                    
                }else{
                    res.json({status: "false", response: "User is not registered with us!", data:{}});
                }
            }).populate("friend_request_received.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1, city:1, state:1, country:1, postal_code:1, bio:1}).select({"friend_request_received":1});
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }    
    };

    //@ accept friend request
    exports.acceptFriendRequest = function(req, res) {
        
        if(req.body.user_id != "" && req.body.user_id != null){ 
          if(req.body.friend_id != "" && req.body.friend_id != null){ 
                
            //frs = friend_request_sent
            //frr = friend_request_received
            var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

            fc_user_profile.find({_id:req.body.user_id},function(err, row_frr) {                    
                if (err){res.send(err); return;}
                else{

                    //console.log(req.body.user_id);
                    console.log(row_frr[0].friend_request_received);
                    var friends_user_id = row_frr[0].friend_request_received.map(a => a.user_id);

                    if (friends_user_id.indexOf(req.body.friend_id) > -1) {
                        
                        //@ remove value from friend_request_received & update friends array 
                        var index = friends_user_id.indexOf(req.body.friend_id);
                        
                        var friends_rr = row_frr[0].friend_request_received;
                        friends_rr.splice(index, 1); 

                        var frnds = row_frr[0].friends;                        
                        frnds.push({user_id:req.body.friend_id, added_on:new Date()}); 

                        fc_user_profile.update({
                            _id : req.body.user_id                    
                        },
                        {friend_request_received:friends_rr, friends:frnds}, function(err_frr, frr) {
                            if (err_frr){console.log(err_frr);return;}
                            
                            fc_user_profile.find({_id:req.body.friend_id },function(err, row_frs) {                    
                                if (err){res.send(err); return;}
                                else{
                                    
                                    var friends_user_id = row_frs[0].friend_request_sent.map(a => a.user_id);
                                    //@ remove value from friend_request_sent & update friends array
                                    var index = friends_user_id.indexOf(req.body.user_id);

                                    var friends_rs = row_frs[0].friend_request_sent;
                                    friends_rs.splice(index, 1); 
                                    
                                    var frnds = row_frs[0].friends;
                                    frnds.push({user_id:req.body.user_id, added_on:new Date()}); 

                                    fc_user_profile.update({
                                        _id : req.body.friend_id                    
                                    },
                                    {friend_request_sent:friends_rs, friends:frnds}, function(err_frs, frs) {
                                        if (err_frr){console.log(err_frr);return;}

                                        // //@ create activity 
                                        var ret = saveActivity({user_id:req.body.user_id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:("you are now friend with " + row_frs[0].last_name +" "+ row_frs[0].first_name)});
                                        console.log("you are now friend with " + row_frs[0].last_name +" "+ row_frs[0].first_name);

                                        // //@ create activity 
                                        var ret = saveActivity({user_id:req.body.friend_id,user_ip:"",user_agent:"",activity_descriptor:("friend request accepted by " + row_frr[0].last_name +" "+ row_frr[0].first_name)});
                                        console.log("friend request accepted by " + row_frr[0].last_name +" "+ row_frr[0].first_name);

                                        res.json({status: "true", response: "success", data:{}});
                                    });
                                }
                            });
                        });

                    } else {
                        res.json({status: "false", response: "not in the list !", data:{}});
                    }                                         
                }
            });                     
          }else {
            res.json({status: "false", response: "friends User ID is missing !", data:{}});
          }
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }    
    };

    //@ delete friend request
    exports.deleteFriendRequest = function(req, res) {
        
        if(req.body.user_id != "" && req.body.user_id != null){ 
          if(req.body.friend_id != "" && req.body.friend_id != null){ 
                
            //frs = friend_request_sent
            //frr = friend_request_received
            fc_user_profile.find({_id:req.body.user_id},function(err, row_frr) {                    
                if (err){res.send(err); return;}
                else{

                    //console.log(req.body.user_id);
                    console.log(row_frr[0].friend_request_received);
                    var friends_user_id = row_frr[0].friend_request_received.map(a => a.user_id);

                    if (friends_user_id.indexOf(req.body.friend_id) > -1) {
                        
                        //@ remove value from friend_request_received 
                        var index = friends_user_id.indexOf(req.body.friend_id);
                        
                        var friends_rr = row_frr[0].friend_request_received;
                        friends_rr.splice(index, 1); 

                        
                        fc_user_profile.update({
                            _id : req.body.user_id                    
                        },
                        {friend_request_received:friends_rr}, function(err_frr, frr) {
                            if (err_frr){console.log(err_frr);return;}
                            
                            fc_user_profile.find({_id:req.body.friend_id },function(err, row_frs) {                    
                                if (err){res.send(err); return;}
                                else{
                                    
                                    var friends_user_id = row_frs[0].friend_request_sent.map(a => a.user_id);
                                    //@ remove value from friend_request_sent
                                    var index = friends_user_id.indexOf(req.body.user_id);

                                    var friends_rs = row_frs[0].friend_request_sent;
                                    friends_rs.splice(index, 1); 
                                    
                                   
                                    fc_user_profile.update({
                                        _id : req.body.friend_id                    
                                    },
                                    {friend_request_sent:friends_rs}, function(err_frs, frs) {
                                        if (err_frr){console.log(err_frr);return;}
                                       
                                        res.json({status: "true", response: "success", data:{}});
                                    });
                                }
                            });
                        });

                    } else {
                        res.json({status: "false", response: "not in the list !", data:{}});
                    }                                         
                }
            });                     
          }else {
            res.json({status: "false", response: "friends User ID is missing !", data:{}});
          }
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        }    
    };

    //@ delete an existing friend
    exports.deleteFriend = function(req, res) {
        if(req.body.user_id != "" && req.body.user_id != null){ 
          if(req.body.friend_id != "" && req.body.friend_id != null){ 
            
            //fs = friend_sent
            //fr = friend_received
            fc_user_profile.find({_id:req.body.user_id},function(err, row_fr) {                    
                if (err){res.send(err); return;}
                else{

                    //console.log(req.body.friend_id);
                    console.log(row_fr[0].friends);
                    var friends_user_id = row_fr[0].friends.map(a => a.user_id);

                    if (friends_user_id.indexOf(req.body.friend_id) > -1) {
                        
                        //@ remove value from friend_request_received
                        var index = friends_user_id.indexOf(req.body.friend_id);
                        var friends_updated= row_fr[0].friends;
                        friends_updated.splice(index, 1); 

                        fc_user_profile.update({
                            _id : req.body.user_id                    
                        },
                        {friends:friends_updated}, function(err_fr, fr) {
                            if (err_fr){console.log(err_fr);return;}
                            
                            fc_user_profile.find({_id:req.body.friend_id },function(err, row_fs) {                    
                                if (err){res.send(err); return;}
                                else{
                                    
                                    var friends_user_id = row_fs[0].friends.map(a => a.user_id);
                                    //@ remove value from friend_request_sent & update friends array
                                    var index = friends_user_id.indexOf(req.body.user_id);
                                    var friends_updated = row_fs[0].friends;
                                    friends_updated.splice(index, 1); 
                                    
                                    fc_user_profile.update({
                                        _id : req.body.friend_id                    
                                    },
                                    {friends:friends_updated}, function(err_fs, fs) {
                                        if (err_fs){console.log(err_fs);return;}

                                        // //@ create activity 
                                        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
                                        var ret = saveActivity({user_id:req.body.user_id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:("you have unfriended " + row_fs[0].last_name +" "+ row_fs[0].first_name)});
                                        console.log("you have unfriend " + row_fs[0].last_name +" "+ row_fs[0].first_name);

                                        // //@ create activity 
                                        var ret = saveActivity({user_id:req.body.friend_id,user_ip:"",user_agent:"",activity_descriptor:(row_fr[0].last_name +" "+ row_fr[0].first_name + " unfriended you")});
                                        console.log(row_fr[0].last_name +" "+ row_fr[0].first_name + " unfriended you");

                                        res.json({status: "true", response: "success", data: {}});
                                    });
                                }
                            });
                        });

                    } else {
                        res.json({status: "false", response: "not in the list !", data: {}});
                    }                                         
                }
            });
        }else {
            res.json({status: "false", response: "friends User ID is missing !", data:{}});
          }
        }else {
            res.json({status: "false", response: "User ID is missing !", data:{}});
        } 
    };

    //@ Add New Post
    exports.addPost = function(req, res) {
        req.setTimeout(0);        
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        
        var form = new formidable.IncomingForm();
        var extensions_image = ['.jpg', '.jpeg', '.png', '.gif'];                
        var extensions_video = ['.flv', '.avi', '.mp4','.mpeg','.m4v','.ogg'];

        form.parse(req, function (err, fields, files) {
                                
            console.log(fields.text,files.image,files.video);
            console.log(util.inspect(fields, false, null));

            if(fields.user_id == undefined && fields.text == undefined && files.image == undefined && files.video == undefined){
                res.json({status: "false", response: "failed", data:{}});
                return;
            }

            if(fields.user_id == undefined || fields.user_id == "" ){
                res.json({status: "false", response: "User ID is missing !", data:{}});
                return;
            }

            fc_user_profile.find({_id:fields.user_id},function(err, row_user) {
                if (err){res.send(err);return;}

                if(row_user[0] != undefined && files.video != "" && files.video != undefined) {
                    var file = files.video;
                    //var oldpath = files.file.path;
                    var tmp_uuid = uuid();
                    var tempPath = file.path;
                    var targetPath = path.resolve(config._uploadDIR + "user.post.video/" + file.name);            
                    var extension = path.extname(targetPath).toLowerCase();
                    var video_url =  "upload/user.post.video/" + tmp_uuid + extension;
                    var finalPath = path.resolve(config._uploadDIR + "user.post.video/" + tmp_uuid + extension);
                    if(extensions_video.indexOf(extension) != -1){
                       fs.rename(tempPath, finalPath, function (err) {
                            if (err){res.json(err);return;}
                            else{                                    
                                //@ check if post have text with the HTTP body
                                if(fields.text != "") {
                                    //@ create the post
                                    fc_posts.create({
                                        user_id             : fields.user_id,
                                        user_ip             : ip,
                                        user_agent          : req.headers['user-agent'],
                                        post_content        : [{text:fields.text,video:video_url}]
                                    }, function(err, records) {
                                        if (err){res.send(err);return;}
                                        else{
                                            req.io.emit('new_post');
                                            res.json({status: "true", response: "success", data:{}});    
                                        }
                                    });
                                }else{
                                    //@ create the post
                                    fc_posts.create({
                                        user_id             : fields.user_id,
                                        user_ip             : ip,
                                        user_agent          : req.headers['user-agent'],
                                        post_content        : [{video:video_url}]
                                    }, function(err, records) {
                                        if (err){res.send(err);return;}
                                        else{
                                            req.io.emit('new_post');
                                            res.json({status: "true", response: "success", data:{}});    
                                        }
                                    });
                                }
                            }                                
                        }); 
                    } else {
                        res.json({status: "false", response: "File Type Not Allowed.", data:{msg:"Allowed extensions are flv, avi, mp4, mpeg, m4v, ogg"}});
                    }
                }else if(row_user[0] != undefined && files.image != "" && files.image != undefined) {
                    var file = files.image;
                    //var oldpath = files.file.path;
                    var tmp_uuid = uuid();
                    var tempPath = file.path;
                    var targetPath = path.resolve(config._uploadDIR + "user.post.image/" + file.name);            
                    var extension = path.extname(targetPath).toLowerCase();
                    var image_url =  "upload/user.post.image/" + tmp_uuid + extension;
                    var finalPath = path.resolve(config._uploadDIR + "user.post.image/" + tmp_uuid + extension);
                    if(extensions_image.indexOf(extension) != -1){
                       fs.rename(tempPath, finalPath, function (err) {
                            if (err){res.json(err);return;}
                            else{                                    
                                //@ check if post have text with the HTTP body
                                if(fields.text != "") {
                                    //@ create the post
                                    fc_posts.create({
                                        user_id             : fields.user_id,
                                        user_ip             : ip,
                                        user_agent          : req.headers['user-agent'],
                                        post_content        : [{text:fields.text,image:image_url}]
                                    }, function(err, records) {
                                        if (err){res.send(err);return;}
                                        else{
                                            req.io.emit('new_post');
                                            res.json({status: "true", response: "success", data:{}});    
                                        }
                                    });
                                }else{
                                    //@ create the post
                                    fc_posts.create({
                                        user_id             : fields.user_id,
                                        user_ip             : ip,
                                        user_agent          : req.headers['user-agent'],
                                        post_content        : [{image:image_url}]
                                    }, function(err, records) {
                                        if (err){res.send(err);return;}
                                        else{
                                            req.io.emit('new_post');
                                            res.json({status: "true", response: "success", data:{}});    
                                        }
                                    });
                                }                                    
                            }                                
                        }); 
                    } else {
                        res.json({status: "false", response: "File Type Not Allowed.", data:{msg:"Allowed extensions are .jpg, .jpeg, .png"}});
                    }
                } else if(row_user[0] != undefined && fields.text != "") {
                    //@ create the post
                    fc_posts.create({
                        user_id             : fields.user_id,
                        user_ip             : ip,
                        user_agent          : req.headers['user-agent'],
                        post_content        : [{text:fields.text}]
                    }, function(err, records) {
                        if (err){res.send(err);return;}
                        else{
                            req.io.emit('new_post');
                            res.json({status: "true", response: "success", data:{}});    
                        }
                    });
                } else {
                    //@ nothing with the query
                    res.json({status: "false",response:"cheating!", data:{}});
                }
            });
        }); //form parser        
    };

    //@ View New Post
    exports.viewNewPost = function(req, res) {
        req.setTimeout(0);

        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){         
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }
        
        $limit = 10;
        if(req.body.limit != undefined && req.body.limit != "") {
            $limit = parseInt(req.body.limit);
        }

        $skip = 0;
        if(req.body.skip != undefined && req.body.skip != "") {
            $skip = parseInt(req.body.skip);
        }   
        fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
            if(err){ res.send(err); return; }

            if(row_user[0] != undefined){

                fc_user_profile.aggregate(
                    { $project : {_id:1, user_privacy:"$user_privacy" }},                                
                    { $group : { _id : {user_privacy:"$user_privacy"} , user_ids: { $addToSet :"$_id"}} },
                function(err, profiles) {
                    if (err){res.send(err); return;}
                                                                                  
                    //$nin:ignored_ids                                    
                    if(profiles[0] != undefined){

                        //console.log(profiles); 

                        //@ ignore the private profiles 
                        //@ check for the self profile 
                        //@ keep the freinds only in the friends array 

                        var user_ids_private_tmp = [];
                        var user_ids_friends_tmp = [];
                        var friends = row_user[0].friends.map(a => a.user_id);
                        //@ get the array of ids from private & freinds
                        profiles.forEach(function(value){                                      
                          if(value._id.user_privacy == 2){user_ids_private_tmp = value.user_ids;}
                          if(value._id.user_privacy == 1){user_ids_friends_tmp = value.user_ids;}                                                                  
                        });
                        
                        //var _id = new ObjectId(req.body.user_id);
                        
                        var user_ids_private = [];
                        user_ids_private_tmp.forEach(function(value){
                          if(value !=  req.body.user_id){user_ids_private.push(value);}                                                                  
                        });                 

                        var user_ids_friends = [];
                        user_ids_friends_tmp.forEach(function(value){
                          //console.log(friends, friends.indexOf(String(value)), String(value));
                          if(value != req.body.user_id && friends.indexOf(String(value)) < 0 ){user_ids_friends.push(value);}                                                                  
                        });                 
                        
                        //console.log(user_ids_private); 
                        //console.log(user_ids_friends); 
                                                

                        var ignored_ids = user_ids_private.concat(user_ids_friends);
                        console.log(ignored_ids);

                        fc_posts.find({is_deleted:0,user_id:{$nin:ignored_ids}},function(err, rows_post_ids) {
                            if (err){console.log(err);return;}
                        fc_posts.find({is_deleted:0,user_id:{$nin:ignored_ids}},function(err, rows_post_find) {
                            if (err){console.log(err);return;}

                            // //console.log(rows_post);
                            // //console.log(util.inspect(rows_post, false, null));
                            // res.json({"_id":rows[0].user_id, "rows_post":rows_post});return;
                            var user_ids = rows_post_ids.map(a => a.user_id);
                            //console.log(user_ids);
                            fc_posts.aggregate(
                                { $match : {is_deleted:0, user_id:{$in:user_ids}}},
                                { $project:{
                                    post_content:'$post_content', 
                                    created_at:'$created_at', 
                                    user_id:'$user_id', 
                                    is_like:{"$size": { 
                                        "$ifNull":[
                                        {"$filter": {input:"$post_likes", as: "post_like", cond: { $eq: [ "$$post_like.user_id", req.body.user_id ]}}}
                                        , []]}},
                                    post_comments:{"$size": { "$ifNull": [ "$post_comments", [] ] }}, 
                                    post_likes:{"$size": { "$ifNull": [ "$post_likes", [] ] }}}},                            
                                { $sort: { created_at: -1 }},
                                { $limit: $skip + $limit },
                                { $skip: $skip },function(err, rows_post) {
                                if (err){console.log(err);return;}

                                //console.log(rows_post);
                                //console.log(util.inspect(rows_post, false, null));
                                for (var i = 0, len = rows_post.length; i < len; i++) {                                    
                                    rows_post[i].user_id = rows_post_find[i].user_id;
                                }

                                res.json({status: "true", response: "success", data:{rows_post}});return;                                            
                            });                                           
                        }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit).skip($skip); 
                        }).sort({"created_at":-1}).limit($limit).skip($skip); 
                         
                    }else{
                        
                        fc_posts.find({is_deleted:0},function(err, rows_post_find) {
                            if (err){console.log(err);return;}

                            fc_posts.aggregate(
                                {$match : {is_deleted:0}},
                                {$project:{
                                    post_content:'$post_content', 
                                    created_at:'$created_at', 
                                    user_id:'$user_id', 
                                    is_like:{"$size": { 
                                        "$ifNull":[
                                        {"$filter": {input:"$post_likes", as: "post_like", cond: { $eq: [ "$$post_like.user_id", req.body.user_id ]}}}
                                        , []]}},
                                    post_comments:{"$size": { "$ifNull": [ "$post_comments", [] ] }}, 
                                    post_likes:{"$size": { "$ifNull": [ "$post_likes", [] ] }}}},                            
                                { $sort: { created_at: -1 }},
                                { $limit: $skip + $limit },
                                { $skip: $skip },function(err, rows_post) {
                                if (err){console.log(err);return;}

                                //console.log(rows_post);
                                //console.log(util.inspect(rows_post, false, null));
                                for (var i = 0, len = rows_post.length; i < len; i++) {
                                    if(rows_post[i]._id.toString() == rows_post_find[i]._id.toString())
                                        rows_post[i].user_id = rows_post_find[i].user_id;
                                }

                                res.json({status: "true", response: "success", data:{rows_post}});return;                                            
                            });                                           
                        }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit).skip($skip);                          
                    }
                });                
            }
        });                
    };

    //@ Delete Post
    exports.deletePost = function(req, res) {

            if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){         
                res.json({status: "false", response: "User ID is missing !", data:{}});
                return;
            }

            if(req.body.post_id == "" || req.body.post_id == null || req.body.post_id == undefined){         
                res.json({status: "false", response: "Post ID is missing !", data:{}});
                return;
            }
            //res.json(rows);  
            if(req.body.user_id != undefined){                          
                fc_posts.update({_id:req.body.post_id,user_id:req.body.user_id}, {is_deleted:1},function(err, row_post) {
                    if (err){console.log(err);return;}

                    //console.log(row_post);
                    req.io.emit('new_post');
                    res.json({status: "true",response:"success", data:{}});                    
                });
            }                  
    };

    //@ like / undo like on any post 
    exports.likePost = function(req, res) {
        
        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }

        if(req.body.post_id == "" || req.body.post_id == null || req.body.post_id == undefined){
            res.json({status: "false", response: "Post ID is missing !", data:{}});
            return;
        }

        //res.cookie('_id',rows[0].user_id);
        fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
            if (err){res.send(err);return;}
            
            if(row_user[0] != undefined){                        

                fc_posts.find({_id:req.body.post_id, is_deleted:0}, function(err, row_post){
                    if (err){res.send(err);return;}

                    if(row_post[0] != undefined){

                        console.log(row_post[0].post_likes);                                
                        var user_ids = row_post[0].post_likes.map(a => a.user_id);
                        //@ check if user is already in like list 
                        if (user_ids.indexOf(req.body.user_id) > -1) {

                            //@ remove liked from the array
                            var index = user_ids.indexOf(req.body.user_id);
                            var post_likes_arr = row_post[0].post_likes;
                            post_likes_arr.splice(index, 1); 

                            fc_posts.update({_id:req.body.post_id}, {post_likes:post_likes_arr},function(err, row_post_tmp) {
                                if (err){console.log(err);return;}
                                //console.log(row_post);
                                fc_posts.find({_id:req.body.post_id},function(err, post) {
                                    if (err){console.log(err);return;}
                                    //console.log(rows_post);

                                    res.json({status: "true",response:"success", data:{post_likes:post[0].post_likes,is_like:false}});                                        
                                }).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                            });

                        } else {

                            //@ add in the like list 
                            var post_likes_arr = row_post[0].post_likes;
                            post_likes_arr.push({user_id:req.body.user_id, liked_on:new Date()});
                            fc_posts.update({_id:req.body.post_id}, {post_likes:post_likes_arr},function(err, row_post_tmp) {
                                if (err){console.log(err);return;}
                                //console.log(row_post);
                                fc_posts.find({_id:req.body.post_id},function(err, post) {
                                    if (err){console.log(err);return;}

                                    fc_user_profile.find({_id:post[0].user_id},function(err, post_user) {
                                        if (err){console.log(err);return;}
                                        //console.log(rows_post);
                                        if(post[0].user_id != row_user[0]._id){

                                            var msg_notice = ' likes your post';
                                            fc_notifications.create({                    
                                                user_id             : post[0].user_id,
                                                user_id_sender      : row_user[0]._id,
                                                post_id             : post[0]._id,
                                                notification_type   : 0, // 1 for like 
                                                notification_text   : msg_notice
                                            }, function(err, row_fcn) {
                                                if (err){
                                                    res.send(err);
                                                    return;
                                                }else{
                                                    req.io.emit('new_like_'+post[0].user_id, ({msg:(row_user[0].last_name +' '+row_user[0].first_name + msg_notice),date_time:new Date(),post_id:post[0]._id}));
                                                    req.io.emit('new_post');

                                                    //@ get device_id of the owner of the post
                                                    if(post_user[0].device_id != undefined && post_user[0].device_id != "" ){
                                                        var message = {
                                                            to: post_user[0].device_id, // required fill with device token or topics                                            
                                                            data: {
                                                                post_id: post[0]._id
                                                            },
                                                            notification: {
                                                                title: "New like",
                                                                body: (row_user[0].last_name +' '+row_user[0].first_name + msg_notice)
                                                            }
                                                        };

                                                        fcm.send(message, function(err, response){
                                                            if (err) {
                                                                console.log("FCM:Something has gone wrong!",err);
                                                            } else {
                                                                console.log("FCM:Successfully sent with response: ", response);
                                                            }
                                                            res.json({status: "true",response:"success", data:{post_likes:post[0].post_likes,is_like:true}});
                                                        });
                                                    }else{
                                                        res.json({status: "true",response:"success", data:{post_likes:post[0].post_likes,is_like:true}});
                                                    }
                                                }
                                            });
                                        }else{
                                            res.json({status: "true",response:"success", data:{post_likes:post[0].post_likes,is_like:true}});
                                        }
                                });                                    
                                }).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                            });
                        }
                    }else{
                        //@ post deleted or any other reason 
                        res.json({status: "false",response:"post dose not exist anymore !",data:{}});
                    }
                });
                
            }else{
                //@ nothing with the query
                res.json({status: "false", response: "Invalid User ID !", data:{}});
                return;
            }
        });                
    };

    //@ put comment on any post
    exports.commentOnPost = function(req, res) {

        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }

        if(req.body.post_id == "" || req.body.post_id == null || req.body.post_id == undefined){
            res.json({status: "false", response: "Post ID is missing !", data:{}});
            return;
        }

        if(req.body.text == "" || req.body.text == null || req.body.text == undefined ){
            res.json({status: "false",response:"text can not be Blank!", data:{}});
            return;
        }
           
        //res.cookie('_id',rows[0].user_id);
        fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
            if (err){res.send(err);return;}
            
            if(row_user[0] != undefined){                        

                fc_posts.find({_id:req.body.post_id, is_deleted:0}, function(err, row_post){
                    if (err){res.send(err);return;}

                    if(row_post[0] != undefined){

                        console.log(row_post[0].post_comments);
                        var tmp_uuid = uuid();
                        //@ add in the comment list 
                        var post_comments_arr = row_post[0].post_comments;
                        post_comments_arr.push({comment_id:tmp_uuid, user_id:req.body.user_id, commented_on:new Date(), text:req.body.text});
                        fc_posts.update({_id:req.body.post_id}, {post_comments:post_comments_arr},function(err, row_post_tmp) {
                            if (err){console.log(err);return;}
                            //console.log(row_post);

                            fc_posts.find({_id:req.body.post_id},function(err, post) {
                                if (err){console.log(err);return;}

                                fc_user_profile.find({_id:post[0].user_id},function(err, post_user) {
                                    if (err){console.log(err);return;}
                                    //console.log(rows_post);
                                    if(post[0].user_id != row_user[0]._id){

                                        var msg_notice = ' commented on your post';
                                        fc_notifications.create({                    
                                            user_id             : post[0].user_id,
                                            user_id_sender      : row_user[0]._id,
                                            post_id             : post[0]._id,
                                            notification_type   : 1, // 1 for comment 
                                            notification_text   : msg_notice
                                        }, function(err, row_fcn) {
                                            if (err){
                                                res.send(err);
                                                return;
                                            }else{
                                                req.io.emit('new_comment_'+post[0].user_id, ({msg:(row_user[0].last_name +' '+row_user[0].first_name +msg_notice),date_time:new Date(),post_id:post[0]._id}));
                                                req.io.emit('new_post');

                                                //@ get device_id of the owner if it's from mobile
                                                if(post_user[0].device_id != undefined && post_user[0].device_id != "" ){
                                                    var message = {
                                                        to: post_user[0].device_id, // required fill with device token or topics                                            
                                                        data: {
                                                            post_id: post[0]._id
                                                        },
                                                        notification: {
                                                            title: "New comment",
                                                            body: (row_user[0].last_name +' '+row_user[0].first_name +msg_notice)
                                                        }
                                                    };

                                                    fcm.send(message, function(err, response){
                                                        if (err) {
                                                            console.log("FCM:Something has gone wrong!", err);
                                                        } else {
                                                            console.log("FCM:Successfully sent with response: ", response);
                                                        }
                                                        res.json({status: "true",response:"success", data:post[0].post_comments});
                                                    });
                                                }else{
                                                    res.json({status: "true",response:"success", data:post[0].post_comments});
                                                }
                                            }
                                        });
                                    }else{
                                        res.json({status: "true",response:"success", data:post[0].post_comments});
                                    }                                    
                                });
                            }).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                        });
                        
                    }else{
                        //@ post deleted or any other reason 
                        res.json({status: "false",response:"post dose not exist anymore !", data:{}});
                    }
                });
                
            }else{
                //@ nothing with the query
                res.json({status: "false", response: "Invalid User ID !", data:{}});
                return;
            }
        });                
    };

    //@ get comment on any post
    exports.getCommentsOnPost = function(req, res) {

        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }

        if(req.body.post_id == "" || req.body.post_id == null || req.body.post_id == undefined){
            res.json({status: "false", response: "Post ID is missing !", data:{}});
            return;
        }
                   
        //res.cookie('_id',rows[0].user_id);
        fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
            if (err){res.send(err);return;}
            
            if(row_user[0] != undefined){                        

                fc_posts.find({_id:req.body.post_id},function(err, post) {
                    if (err){console.log(err);return;}
                    //console.log(rows_post);
                    if(post[0].post_comments[0] != undefined){
                        res.json({status: "true",response:"success", data:post[0].post_comments});                                        
                    }else{
                        res.json({status: "false",response:"nothing to show!", data:{}});
                    }
                }).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                
            }else{
                //@ nothing with the query
                res.json({status: "false", response: "Invalid User ID !", data:{}});
                return;
            }
        });                
    };

    //@ delete comment
    exports.deleteCommentOnPost = function(req, res) {
    
        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }

        if(req.body.post_id == "" || req.body.post_id == null || req.body.post_id == undefined){
            res.json({status: "false", response: "Post ID is missing !", data:{}});
            return;
        }

        if(req.body.comment_id == "" || req.body.comment_id == null || req.body.comment_id == undefined){
            res.json({status: "false", response: "UUID missing !", data:{}});
            return;
        }

        //res.cookie('_id',rows[0].user_id);
        fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
            if (err){res.send(err);return;}
            
            if(row_user[0] != undefined){                        

                fc_posts.find({_id:req.body.post_id,is_deleted:0}, function(err, row_post){
                    if (err){res.send(err);return;}

                    if(row_post[0] != undefined){

                        console.log(row_post[0].post_comments);
                        comment_id = req.body.comment_id;

                        var comment_ids = row_post[0].post_comments.map(a => a.comment_id);
                        //@ add in the comment list 
                        var post_comments_arr = row_post[0].post_comments;
                        var index = comment_ids.indexOf(comment_id);
                        post_comments_arr.splice(index, 1);

                        fc_posts.update({_id:req.body.post_id}, {post_comments:post_comments_arr},function(err, row_post_tmp) {
                            if (err){console.log(err);return;}
                            //console.log(row_post);

                            fc_posts.find({_id:req.body.post_id},function(err, post) {
                                if (err){console.log(err);return;}
                                //console.log(rows_post);
                                res.json({status: "true",response:"success", data:post[0].post_comments});                                        
                            }).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                        });
                        
                    }else{
                        //@ post deleted or any other reason 
                        res.json({status: "false",response:"post dose not exist anymore !", data:{}});
                    }
                });
                
            }else{
                //@ nothing with the query
                res.json({status: "false", response: "Invalid User ID !", data:{}});
                return;
            }
        });                
    };

    //@ view notifications
    exports.viewNotifications = function(req, res) {

        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }

        $limit = 25;
        if(req.body.limit != undefined && req.body.limit != "") {
            $limit = parseInt(req.body.limit);
        }

        fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
            if (err){res.send(err);return;}

            if(row_user[0] != undefined){
                fc_notifications.find({user_id:req.body.user_id},function(err, rows_notify) {
                    if (err){res.send(err);return;}

                    if(rows_notify[0] != undefined){
                        res.json({status: "true", response: "success", data:rows_notify});
                    }else{
                        res.json({status: "false", response: "nothing to show!", data:{}});
                    }
                }).populate("user_id_sender",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"__v":0}).limit($limit).sort({"notification_log_time":-1});
            }else{
                res.json({status: "false", response: "cheating!", data:{}});
            }            
        });    
    };

    //@ notificatio noticed
    exports.noticedNotification = function(req, res) {
        
        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }

        if(req.body.notificatio_id == "" || req.body.notificatio_id == null || req.body.notificatio_id == undefined){
            res.json({status: "false", response: "Notificatio ID is missing !", data:{}});
            return;
        }

        fc_user_profile.find({_id:req.body.user_id},function(err, rows) {
            if (err){res.send(err);return;}
            
            //console.log(rows);
            if(rows[0] != undefined){

                //@ udpate last login field 
                fc_notifications.update({
                    _id : req.body.notificatio_id,
                    user_id : rows[0]._id
                },
                { is_noticed: true }, function(err2, tmp2) {
                    if (err2){res.send(err2);return;}
                    
                    console.log(tmp2);
                    res.json({status: "true", response: "success", data:{}});                    
                });
                                   
            }else{
                res.json({status: "false", response: "cheating !", data:{}});                
            }
        });
    };

    //@ View One Post
    exports.viewPost = function(req, res) {
        req.setTimeout(0);

        if(req.body.user_id == "" || req.body.user_id == null || req.body.user_id == undefined){         
            res.json({status: "false", response: "User ID is missing !", data:{}});
            return;
        }

        if(req.body.post_id == "" || req.body.post_id == null || req.body.post_id == undefined){         
            res.json({status: "false", response: "Post ID is missing !", data:{}});
            return;
        }
        
        //@ default setting 
        $limit = 1;
        $skip = 0;
        

        fc_user_profile.find({_id:req.body.user_id},function(err, row_user) {
            if(err){ res.send(err); return; }

            if(row_user[0] != undefined){

                fc_user_profile.aggregate(
                    { $project : {_id:1, user_privacy:"$user_privacy" }},                                
                    { $group : { _id : {user_privacy:"$user_privacy"} , user_ids: { $addToSet :"$_id"}} },
                function(err, profiles) {
                    if (err){res.send(err); return;}
                                                                                  
                    //$nin:ignored_ids                                    
                    if(profiles[0] != undefined){

                        //console.log(profiles); 

                        //@ ignore the private profiles 
                        //@ check for the self profile 
                        //@ keep the freinds only in the friends array 

                        var user_ids_private_tmp = [];
                        var user_ids_friends_tmp = [];
                        var friends = row_user[0].friends.map(a => a.user_id);
                        //@ get the array of ids from private & freinds
                        profiles.forEach(function(value){                                      
                          if(value._id.user_privacy == 2){user_ids_private_tmp = value.user_ids;}
                          if(value._id.user_privacy == 1){user_ids_friends_tmp = value.user_ids;}                                                                  
                        });
                        
                        //var _id = new ObjectId(req.body.user_id);
                        
                        var user_ids_private = [];
                        user_ids_private_tmp.forEach(function(value){
                          if(value !=  req.body.user_id){user_ids_private.push(value);}                                                                  
                        });                 

                        var user_ids_friends = [];
                        user_ids_friends_tmp.forEach(function(value){
                          //console.log(friends, friends.indexOf(String(value)), String(value));
                          if(value != req.body.user_id && friends.indexOf(String(value)) < 0 ){user_ids_friends.push(value);}                                                                  
                        });                 
                        
                        //console.log(user_ids_private); 
                        //console.log(user_ids_friends); 
                                                

                        var ignored_ids = user_ids_private.concat(user_ids_friends);
                        //console.log(ignored_ids);

                        fc_posts.find({is_deleted:0, _id:req.body.post_id},function(err, rows_post_ids) {
                            if (err){console.log(err);return;}
                        fc_posts.find({is_deleted:0, _id:req.body.post_id},function(err, rows_post_find) {
                            if (err){console.log(err);return;}

                            // //console.log(rows_post);
                            // //console.log(util.inspect(rows_post, false, null));
                            // res.json({"_id":rows[0].user_id, "rows_post":rows_post});return;
                            var user_ids = rows_post_ids.map(a => a.user_id);
                            console.log(user_ids);
                            fc_posts.aggregate(
                                { $match : {"_id":mongoose.Types.ObjectId(req.body.post_id)}},
                                { $project:{
                                    post_content:'$post_content', 
                                    created_at:'$created_at', 
                                    user_id:'$user_id', 
                                    is_like:{"$size": { 
                                        "$ifNull":[
                                        {"$filter": {input:"$post_likes", as: "post_like", cond: { $eq: [ "$$post_like.user_id", req.body.user_id ]}}}
                                        , []]}},
                                    post_comments:{"$size": { "$ifNull": [ "$post_comments", [] ] }}, 
                                    post_likes:{"$size": { "$ifNull": [ "$post_likes", [] ] }}}},                            
                                { $sort: { created_at: -1 }},
                                { $limit: $skip + $limit },
                                { $skip: $skip },function(err, rows_post) {
                                if (err){console.log(err);return;}

                                //console.log(rows_post);
                                //console.log(util.inspect(rows_post, false, null));
                                for (var i = 0, len = rows_post.length; i < len; i++) {                                    
                                    rows_post[i].user_id = rows_post_find[i].user_id;
                                }

                                res.json({status: "true", response: "success", data:{rows_post}});return;                                            
                            });                                           
                        }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit).skip($skip); 
                        }).sort({"created_at":-1}).limit($limit).skip($skip); 
                         
                    }else{
                        
                        fc_posts.find({is_deleted:0,_id:req.body.post_id},function(err, rows_post_find) {
                            if (err){console.log(err);return;}

                            fc_posts.aggregate(
                                {$match : {is_deleted:0,_id:mongoose.Types.ObjectId(req.body.post_id)}},
                                {$project:{
                                    post_content:'$post_content', 
                                    created_at:'$created_at', 
                                    user_id:'$user_id', 
                                    is_like:{"$size": { 
                                        "$ifNull":[
                                        {"$filter": {input:"$post_likes", as: "post_like", cond: { $eq: [ "$$post_like.user_id", req.body.user_id ]}}}
                                        , []]}},
                                    post_comments:{"$size": { "$ifNull": [ "$post_comments", [] ] }}, 
                                    post_likes:{"$size": { "$ifNull": [ "$post_likes", [] ] }}}},                            
                                { $sort: { created_at: -1 }},
                                { $limit: $skip + $limit },
                                { $skip: $skip },function(err, rows_post) {
                                if (err){console.log(err);return;}

                                //console.log(rows_post);
                                //console.log(util.inspect(rows_post, false, null));
                                for (var i = 0, len = rows_post.length; i < len; i++) {
                                    if(rows_post[i]._id.toString() == rows_post_find[i]._id.toString())
                                        rows_post[i].user_id = rows_post_find[i].user_id;
                                }

                                res.json({status: "true", response: "success", data:{rows_post}});return;                                            
                            });                                           
                        }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit).skip($skip);                          
                    }
                });                
            }
        });                
    };