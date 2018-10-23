	
	var mongoose    = require('mongoose');
    var model       = require('../models/model'); 
    var config      = require('../configuration/config')
    var dbUri       = config.dbUri;   
	var crontab     = require('node-crontab');
    var cheerio     = require('cheerio');
    var request     = require('request');
    var socketMVC   = require('socket.mvc');
    var mailer      = require("nodemailer");
    var randomstring= require("randomstring");
    var formidable  = require('formidable');
    var fs          = require('fs');
    var path        = require('path');
    const uuid      = require('uuid/v1');
    var moment      = require('moment');
    var FCM         = require('fcm-push');

    var serverKey = config.fcm_server_key;
    var fcm = new FCM(serverKey);

    const util      = require('util');
    const ObjectId  = require('mongodb').ObjectId;    
    // Use Smtp Protocol to send Email
    var smtpTransport = mailer.createTransport(config.SmtpOptions);

    fc_sessions     = mongoose.model('fc_sessions');    
    fc_user_profile = mongoose.model('fc_user_profile');
    fc_activities   = mongoose.model('fc_activities');
    fc_posts        = mongoose.model('fc_posts');
    fc_notifications= mongoose.model('fc_notifications');
    // exports.respond = function(io){
    //     socketMVC.emit('respond', 'Sending this to the socket that triggered the event');        
    // };

    //// Global Function ----------------------------------------------------------
    global.saveActivity = function(obj){ 
        fc_activities.create({                    
            user_id             : obj.user_id,
            user_ip             : obj.user_ip,
            user_agent          : obj.user_agent,
            activity_descriptor : obj.activity_descriptor
        }, function(err, records) {
            if (err){
                console.log(err);
                return '{status: "false", response: err}';
            }else{
                return '{status: "true", response: "activity saved successfully."}';    
            }                
        });
    };        
    ///// -------------------------------------------------------------------------


    exports.home = function(req, res) {
        res.render('../public/index',{title:config.html.title, baseURL:config.baseURL});
        //res.sendFile();
    };

    exports.privacyPolicy = function(req, res) {
        res.sendFile(config._baseDIR + 'privacy-policy.html');
    };

    exports.terms = function(req, res) {
        res.sendFile(config._baseDIR + 'terms.html');
    };

    exports.user = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {

            if (err)
                res.send(err)
            //res.json(rows);
            //console.log(rows[0].user_id);  
            if(rows[0] != undefined){           
                //res.cookie('_id',rows[0].user_id);
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                    
                    if (err){
                        res.send(err)
                    }
                    else{

                        //console.log(row_user);
                        row_user[0].baseURL = config.baseURL;
                        res.render('../public/user.index.ejs',row_user[0]);                        
                    }
                });                
            }else{
                res.redirect('/');
            }
        });        
    };

    exports.userProfile = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {

            if (err)
                res.send(err)
            //res.json(rows);  
            console.log(__dirname);
            if(rows[0] != undefined){           
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                    
                    if (err){res.send(err);return;}
                    else{
                        row_user[0].baseURL = config.baseURL;
                        row_user[0].moment = moment;
                        res.render('../public/user.profile.ejs',row_user[0]);
                    }
                });
            }else{
                res.redirect('/');
            }
        });        
    };

    exports.userPublicProfile = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {
            if (err){console.log(err);res.send(err);return;}
            
            if(rows[0] != undefined && req.params._id !="" && req.params._id != undefined){           
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                    
                    if (err){res.send(err);return;}
                    else{
                        fc_user_profile.find({_id:req.params._id},function(err, row_profile) {                    
                            if (err){res.send(err);return;}
                            else{
                                row_user[0].baseURL = config.baseURL;
                                row_user[0].moment = moment;
                                row_user[0].row_profile = row_profile;
                                res.render('../public/user.public.profile.ejs',row_user[0]);                                
                            }
                        }).select({"device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
                    }
                }).select({"device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
            }else{
                res.redirect('/');
            }
        });        
    };

    exports.join = function(req, res) {
        if(req.body.first_name != "" && req.body.first_name != null){
        if(req.body.last_name != "" && req.body.last_name != null){
        if(req.body.email != "" && req.body.email != null){
        if((req.body.password != "" && req.body.password != null) || req.body.provider == 'facebook' || req.body.provider == 'twitter' || req.body.provider == 'google') {
            fc_user_profile.find({email:req.body.email},function(err, rows) {

                provider = "web";
                if(req.body.provider != undefined){
                    provider = req.body.provider;
                }

                if (err){
                    res.send(err)
                }
                else if (rows.length) {
                    if(provider == 'facebook' || provider == 'twitter' || provider == 'google' ) {
                        secret = randomstring.generate(36);
                        //@ create session
                        fc_sessions.create({
                            user_id : rows[0]._id,                    
                            user_ip : "",
                            user_agent : "",
                            session_start: new Date(),
                            session_secret: secret
                        }, function(err1, rc1) {
                            if (err1)
                                console.log(err1);

                            //@ udpate last login field 
                            //app.session({ secret: rc1._id, key: 'fb_session'});
                            fc_user_profile.update({
                                _id : rows[0]._id                   
                            },
                            { last_login: new Date() }, function(err2, tmp2) {
                                if (err2)
                                    console.log(err2);

                                //@ log & send the row data  
                                console.log(rows);
                                res.json({status: "true", response: secret});
                            });
                        });
                    }else{
                        if(rows[0].verified_at == ""){ res.json({status: "false", response: "This email id is already registered with us. Please verify your email id !"});} 
                        else {res.json({status: "false", response: "This email id is already registered with us. Please use different email id to register a new account !"}); }
                    }
                    
                }
                else {                    

                    profile_image_url = "";
                    if(req.body.profile_image_url != '' && req.body.profile_image_url != undefined){
                        profile_image_url = req.body.profile_image_url;
                    }

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

                    //@ create session
                    fc_user_profile.create({                    
                        email               : req.body.email,
                        first_name          : req.body.first_name,
                        last_name           : req.body.last_name,
                        password            : password,
                        gender              : gender,
                        last_login          : "",
                        created_at          : new Date(),
                        verified_at         : verified_at,
                        provider            : provider,
                        profile_image_url   : profile_image_url
                    }, function(err1, records) {
                        if (err1)
                            console.log(err1);
                        //send an email for verification                        
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
                            var ret = saveActivity({user_id:records._id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:"Joined"});
                            console.log(ret); 

                            res.json({status: "true", response: "Register successfully. Please check your email inbox to verify your email id."});
                        }else{

                            secret = randomstring.generate(36);
                            //@ create session
                            fc_sessions.create({
                                user_id : records._id,                    
                                user_ip : "",
                                user_agent : "",
                                session_start: new Date(),
                                session_secret: secret
                            }, function(err1, rc1) {
                                if (err1)
                                    console.log(err1);

                                //@ udpate last login field 
                                //app.session({ secret: rc1._id, key: 'fb_session'});
                                fc_user_profile.update({
                                    _id : records._id                   
                                },
                                { last_login: new Date() }, function(err2, tmp2) {
                                    if (err2)
                                        console.log(err2);

                                    //@ create activity  
                                    var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                                
                                    var ret = saveActivity({user_id:records._id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:("Joined via " + provider)});
                                    console.log(ret);
                                    //@ log & send the row data  
                                    console.log(rows);
                                    res.json({status: "true", response: secret});
                                });
                            });
                        }
                    });                
                }
            });
        }else {
            res.json({status: "false", response: "Password missing !"});
        }
        }else {
            res.json({status: "false", response: "Email missing !"});
        }
        }else {
            res.json({status: "false", response: "Last Name is missing !"});
        }
        }else {
            res.json({status: "false", response: "First Name is missing !"});
        }
    };
    
    exports.verify = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        
        fc_user_profile.find({_id:req.params._id},function(err, rows) {
            if(rows[0] != undefined){
                //@ udpate verified_at field 
                fc_user_profile.update({
                    _id : rows[0]._id,
                    email : rows[0].email                    
                },
                { verified_at: new Date() }, function(err2, tmp2) {
                    if (err2)
                        console.log(err2);

                    // //@ create activity  
                    // var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                                
                    // var ret = saveActivity({user_id:rows[0]._id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:"User verified"});
                    // console.log(ret);

                    //console.log(rows);  
                    res.cookie('_id',rows[0]._id);                  
                    res.sendFile(config._baseDIR +'verify.html');

                    //res.json({status: "true", response: "Your account has been successfully verified."});
                });
            }else{
                res.json({status: "false", response: "invalid verification link !"});
            }
            
        });
    };

    exports.checkSession = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {

            if (err)
                res.send(err)

            //console.log(rows);

            if(rows[0] != undefined){           
                res.json({status: "true", response:"valid session", data:rows[0]});
            }else{
                res.json({status: "false", response:"invalid session"});
            }
            
        });
    };

    exports.ssession = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({session_secret:req.params._secret}, function(err, rows) {

            if (err)
                res.send(err)

            console.log(req.params._secret);  
            if(rows[0] != undefined){                           
                fc_sessions.update({
                    _id : rows[0]._id,
                    session_secret:req.params._secret
                },
                { user_agent: req.headers['user-agent'], user_ip:ip }, function(err2, tmp2) {
                    if (err2)
                        console.log(err2);
                    
                    console.log(tmp2);                    
                    fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                        
                        if (err)
                            res.send(err)
                        else
                            res.redirect('/');
                            //res.render('../public/user.index.ejs',row_user[0]);
                    });
                });
                
            }else{
                res.redirect('/');
            }
            
        });
    };
    
    exports.login = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        
        fc_user_profile.find({email:req.body.email, password:req.body.password},function(err, rows) {
            if (err){
                res.send(err)
            }
            
            if(rows[0] != undefined){
                if(rows[0].verified_at != null){
                    //@ create session
                    fc_sessions.create({
                        user_id : rows[0]._id,                    
                        user_ip : ip,
                        user_agent : req.headers['user-agent'],
                        session_start: new Date()                        
                    }, function(err1, records) {
                        if (err1)
                            console.log(err1);

                        //@ udpate last login field 
                        fc_user_profile.update({
                            _id : rows[0]._id,
                            email : rows[0].email                    
                        },
                        { last_login: new Date() }, function(err2, tmp2) {
                            if (err2)
                                console.log(err2);

                            //@ log & send the row data  
                            console.log(rows);
                            res.json({status: "true", response: ("Welcome " + rows[0].first_name)});
                        });
                    });
                } else {
                    res.json({status: "false", response: "Kindly verify your email !"});
                }                
            }else{
                res.json({status: "false", response: "Incorrect login credentials !"});
            }
        });
    };

    exports.logout = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];        
        console.log(req.params._id);

        fc_sessions.find({user_id:req.params._id, user_agent:req.headers['user-agent'], session_end: null},function(err, rows) {
            if (err){res.send(err);return;}
            
            console.log(rows);
            if(rows[0] != undefined){

                //@ udpate last login field 
                fc_sessions.update({
                    _id : rows[0]._id,
                    user_agent : req.headers['user-agent']                    
                },
                { session_end: new Date() }, function(err2, tmp2) {
                    if (err2){res.send(err2);return;}
                    
                    console.log(tmp2);
                    res.json({status: "true", response: "success"});
                    //res.redirect('/');
                });
                                   
            }else{
                res.json({status: "false", response: "Something Went Wrong !"});
                //res.redirect('/');
            }
        });
    };

    exports.forgot = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        
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

                    res.json({status: "true", response: "Please check your email for reset instructions."});                    
                });                 
                
            }else{
                res.json({status: "false", response: "Email Address is not registered with us !"});
            }
        });
    };

    exports.reset = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        
        fc_user_profile.find({reset_secret:req.params._id},function(err, rows) {
            if(rows[0] != undefined){
                
                //@ log & send the row data  
                //console.log(rows[0]._id);
                res.cookie('_id',rows[0]._id);
                res.sendFile(config._baseDIR +'reset.html');
                //res.json({status: "true", response: "Your account has been successfully verified."});
            
            }else{
                res.json({status: "false", response: "invalid reset link !"});
            }
            
        });
    };

    exports.resetDone = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
                
        fc_user_profile.find({_id:req.body._id},function(err, rows) {

            console.log(req.body._id);
            console.log(req.body.password);

            if(rows[0] != undefined){
                
                fc_user_profile.update({
                    _id : rows[0]._id,
                    email : rows[0].email                    
                },
                { password: req.body.password, reset_secret:"" }, function(err2, tmp2) {
                    if (err2)
                        console.log(err2);

                    // //@ create activity 
                    // var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                                
                    // var ret = saveActivity({user_id:rows[0]._id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:"Password updated"});
                    // console.log(ret);

                    console.log(tmp2);                
                    res.json({status: "true", response: "Password updated successfully."});
                });                            
            }else{
                res.json({status: "false", response: "invalid reset link !"});
            }            
        });
    };

    exports.userUpdate = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];        
        if(req.body.first_name != "" && req.body.first_name != null) {                     
            fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {
                if (err)
                    console.log(err);

                fc_user_profile.find({_id:rows[0].user_id},function(err, user_row) {
                
                if(user_row[0] != undefined){           

                    last_name = user_row[0].last_name;
                    if(req.body.last_name != '' && req.body.last_name != undefined){
                        last_name = req.body.last_name;
                    }

                    displayName = user_row[0].displayName;
                    if(req.body.displayName != '' && req.body.displayName != undefined){
                        displayName = req.body.displayName;
                    }

                    gender = user_row[0].gender;
                    if(req.body.gender != '' && req.body.gender != undefined){
                        gender = req.body.gender;
                    }

                    dob = user_row[0].dob;
                    if(req.body.dob != '' && req.body.dob != undefined){
                        dob = req.body.dob;
                    }

                    bio = user_row[0].bio;
                    if(req.body.bio != '' && req.body.bio != undefined){
                        bio = req.body.bio;
                    }

                    phone_no = user_row[0].phone_no;
                    if(req.body.phone_no != '' && req.body.phone_no != undefined){
                        phone_no = req.body.phone_no;
                    }

                    user_privacy = user_row[0].user_privacy;
                    if(req.body.user_privacy != '' && req.body.user_privacy != undefined){
                        user_privacy = req.body.user_privacy;
                    }

                    city = user_row[0].city;
                    if(req.body.city != '' && req.body.city != undefined){
                        city = req.body.city;
                    }

                    state = user_row[0].state;
                    if(req.body.state != '' && req.body.state != undefined){
                        state = req.body.state;
                    }

                    country = user_row[0].country;
                    if(req.body.country != '' && req.body.country != undefined){
                        country = req.body.country;
                    }

                    postal_code = user_row[0].postal_code;
                    if(req.body.postal_code != '' && req.body.postal_code != undefined){
                        postal_code = req.body.postal_code;
                    }


                    fc_user_profile.update({
                        _id : rows[0].user_id                    
                    },
                    { postal_code:postal_code, city:city, state:state, country:country, dob: dob, bio:bio, phone_no: phone_no, user_privacy: user_privacy, first_name: req.body.first_name, last_name: last_name, displayName: displayName, gender:gender }, function(err2, tmp2) {
                        if (err2)
                            console.log(err2);

                        // //@ create activity 
                        // var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                                
                        // var ret = saveActivity({user_id:rows[0].user_id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:"Profile updated"});
                        // console.log(ret);

                        console.log(tmp2);                
                        res.json({status: "true", response: "Profile updated successfully."});
                    }); 
                }else{
                    res.json({status: "false", response: "cheating !"});
                }
            }); // find user details
            });// session 
        }else {
            res.json({status: "false", response: "First Name Can not be Blank !"});
        }        
    };

    exports.userUpdatePassword = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, row) {if (err){console.log(err); return;}

            if(row[0].user_id != undefined && req.body.password != "" && req.body.password != undefined){
                fc_user_profile.find({_id:row[0].user_id},function(err, rows) {
                    if(err){res.send(err);return;}

                    if(rows[0] != undefined){
                        
                        fc_user_profile.update({
                            _id : rows[0]._id,
                            email : rows[0].email                    
                        },
                        { password: req.body.password }, function(err2, tmp2) {
                            if(err2){res.send(err2);return;}

                            console.log(tmp2);                
                            res.json({status: "true", response: "Password updated successfully."});
                            return;
                        });                            
                    }else{
                        res.json({status: "false", response: "invalid session !"});
                    }            
                });
            }else{
                res.json({status: "false", response: "invalid session !"});
            } 
        });
    };

    exports.uploadImage = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];                
        
        req.setTimeout(0);
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {            
            if (err){res.send(err);return;}

            if(rows[0] != undefined){           
                var form = new formidable.IncomingForm();
                var extensions = ['.jpg', '.jpeg', '.png', '.gif'];                

                form.parse(req, function (err, fields, files) {
                    
                    console.log(fields);
                    console.log(files);
                    
                    
                    if(files.file == undefined){
                        res.json({status: "false", response: "failed"});
                        return;
                    }

                    var tmp_uuid = uuid();
                    var file = files.file;
                    //var oldpath = files.file.path;
                    var tempPath = file.path;
                    var targetPath = path.resolve(config._uploadDIR + "user.profile.img/" + file.name);            
                    var extension = path.extname(targetPath).toLowerCase();
                    var profile_img_url =  "upload/user.profile.img/" + tmp_uuid + extension;
                    var finalPath = path.resolve(config._uploadDIR + "user.profile.img/" + tmp_uuid + extension);
                    
                    console.log(finalPath);
                    console.log(extension);

                    if(extensions.indexOf(extension) != -1){
                       fs.rename(tempPath, finalPath, function (err) {
                            if (err){res.send(err);return;}
                            else{

                                fc_user_profile.update({
                                    _id : rows[0].user_id                    
                                },
                                {profile_image_url:profile_img_url}, function(err2, tmp2) {
                                    if (err2){console.log(err2);}
                
                                    //console.log(tmp2);
                                    res.json({status: "true", response: profile_img_url});                
                                }); 
                            }                                                            
                        }); 
                   }else{
                        res.json({'status': "false", 'response':'allowd extension are jpeg, jpg or png'});
                   }
               });
            }else{
                res.json({status: "false", response: "cheating !"});
            }
        });                       
    };
   
    exports.viewActivity = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;}

            if(rows[0] != undefined){
                fc_activities.find({user_id:rows[0].user_id},function(err, rows_acts) {
                    if (err){
                        res.send(err);
                        return;
                    }

                    if(rows_acts[0] != undefined){
                        res.json({status: "true", response: "success", data:rows_acts});
                    }else{
                        res.json({status: "false", response: "User is not registered with us!"});
                    }

                }).select({"user_agent":0,"user_ip":0,"_id": 0, "__v":0}).sort({"activity_log_time":-1});
            }else{
                res.json({status: "false", response: "cheating!"});
            }            
        });    
    };

    //@ search for new friend
    exports.userFindFriends = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){
                res.send(err);
                return;
            }
            
            if(rows[0] != undefined ){
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                    
                    if (err){
                        res.send(err);
                        return;
                    }
                    else{
                        query = "";
                        if(req.params._query != '' && req.params._query != undefined){
                            query = req.params._query;
                        }

                        var friends_pending = row_user[0].friend_request_sent.map(a => a.user_id);
                        var friends_rr = row_user[0].friend_request_received.map(a => a.user_id);
                        var friends = row_user[0].friends.map(a => a.user_id);
                        
                        //filter for friends in the list including requestd & received
                        var friends_ignored = friends_pending.concat(friends_rr, friends);

                        if(query != ""){
                            fc_user_profile.find({_id:{$ne:rows[0].user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, $text:{$search:query}},function(err, fns) {
                                if (err){console.log(err);return;}
                                else {                    
                                    
                                    row_user[0].baseURL = config.baseURL;
                                    row_user[0].friends_rr = friends_rr;
                                    
                                    //@ if didn't find in index then regex search for last_name
                                    if(fns.length > 0){
                                        row_user[0].profiles = fns;
                                        console.log(query, fns);
                                        res.render('../public/user.find.friends.ejs',row_user[0]);                                
                                    }else{
                                        //@ regex search for last_name
                                        fc_user_profile.find({_id:{$ne:rows[0].user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, last_name:new RegExp(query, "i")},function(err, fns) {
                                            if (err){console.log(err);return;}
                                            else{

                                                //@ if didn't find in last_name then regex search for first_name
                                                if(fns.length > 0){
                                                    row_user[0].profiles = fns;
                                                    console.log(query, fns);
                                                    res.render('../public/user.find.friends.ejs',row_user[0]);                                
                                                }else{
                                                    //@ regex search for first_name
                                                    fc_user_profile.find({_id:{$ne:rows[0].user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, first_name:new RegExp(query, "i")},function(err, fns) {
                                                        if (err){console.log(err);return;}
                                                        else{
                                                            
                                                            //@ if didn't find in first_name then regex search for displayName
                                                            if(fns.length > 0){
                                                                row_user[0].profiles = fns;
                                                                console.log(query, fns);
                                                                res.render('../public/user.find.friends.ejs',row_user[0]);                                
                                                            }else{
                                                                //@ regex search for displayName
                                                                fc_user_profile.find({_id:{$ne:rows[0].user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true, displayName:new RegExp(query, "i")},function(err, fns) {
                                                                    if (err){console.log(err);return;}
                                                                    else{
                                                                        row_user[0].profiles = fns;
                                                                        console.log(query, fns);
                                                                        res.render('../public/user.find.friends.ejs',row_user[0]);

                                                                        
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
                        }else{
                            fc_user_profile.find({_id:{$ne:rows[0].user_id, $nin:friends_ignored}, verified_at:{$ne:null}, is_active:true},function(err, fns) {
                                if (err){
                                    console.log(err);
                                }else {                    
                                    
                                    row_user[0].baseURL = config.baseURL;
                                    row_user[0].profiles = fns;
                                    row_user[0].friends_rr = friends_rr;
                                    //console.log(fns);
                                    res.render('../public/user.find.friends.ejs',row_user[0]);
                                }                                
                            }).select({"friends":0, "device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});
                        }
                    }
                });
            }else{
                res.redirect('/');
            }
        });
    };

    //@ send friend request
    exports.sendFriendRequest = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){
                res.send(err);
                return;
            }
            
            //frs = friend_request_sent
            //frr = friend_request_received
            fc_user_profile.find({_id:rows[0].user_id},function(err, row_frs) {                    
                if (err){
                    res.send(err); return;
                }else{

                    //console.log(req.body.user_id);
                    console.log(row_frs[0].friend_request_sent);
                    var frs_user_ids = row_frs[0].friend_request_sent.map(a => a.user_id);

                    console.log(row_frs[0].friend_request_received);
                    var frr_user_ids = row_frs[0].friend_request_received.map(a => a.user_id);

                    console.log(row_frs[0].friends);
                    var fr_user_ids = row_frs[0].friends.map(a => a.user_id);
                    //@ check if user is already in any of the list 
                    if (fr_user_ids.indexOf(req.body.user_id) > -1 || frs_user_ids.indexOf(req.body.user_id) > -1 || frr_user_ids.indexOf(req.body.user_id) > -1) {
                        res.json({status: "false", response: "already in the list !"});
                    } else {                        
                        
                        //@ update the friend_request_set for the recipient
                        friends_rs = row_frs[0].friend_request_sent;
                        friends_rs.push({user_id:req.body.user_id, sent_on:new Date()});                         
                        fc_user_profile.update({
                            _id : rows[0].user_id                    
                        },
                        {friend_request_sent:friends_rs}, function(err_frs, frs) {
                            if (err_frs){console.log(err_frs);return;}
                            
                            console.log(frs);

                            fc_user_profile.find({_id:req.body.user_id},function(err, row_frr) { 
                                if (err){console.log(err);return;}
                                
                                //@ update the friend_request_received for the recipient                                
                                friends_rr = row_frr[0].friend_request_received;
                                friends_rr.push({user_id:rows[0].user_id, received_on:new Date()}); 
                                fc_user_profile.update({
                                    _id : req.body.user_id                    
                                },
                                {friend_request_received:friends_rr}, function(err_frr, frr) {
                                    if (err){console.log(err_frr);return;}

                                    console.log(frr);
                                    res.json({status: "true", response: "Request Sent."});
                                });
                            
                            });                                                        
                        }); 
                    }                      
                }
            });
        });
    };

    exports.viewReceivedRequest = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){
                res.send(err);
                return;
            }

            fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {
                if (err){res.send(err);return;}

                if(row_user[0] != undefined){
                    
                    //@ find details of the User sent the Request 
                    var frr_user_ids = row_user[0].friend_request_received.map(a => a.user_id);
                    fc_user_profile.find({_id:{ $in: frr_user_ids }},function(err, row_users) {
                        if (err){res.send(err);return;}


                        res.json({"frr":row_user[0].friend_request_received, "data":row_users});

                    }).select({"friend_request_received":0, "friend_request_sent":0, "friends":0, "device_id":0,"provider":0,"last_login":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});                    
                }else{
                    res.json({status: "false", response: "User is not registered with us!"});
                }

            });
        });    
    };

    exports.acceptFriendRequest = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;}
            
            //frs = friend_request_sent
            //frr = friend_request_received
            fc_user_profile.find({_id:rows[0].user_id},function(err, row_frr) {                    
                if (err){res.send(err); return;}
                else{

                    //console.log(req.body.user_id);
                    console.log(row_frr[0].friend_request_received);
                    var friends_user_id = row_frr[0].friend_request_received.map(a => a.user_id);

                    if (friends_user_id.indexOf(req.body.user_id) > -1) {
                        
                        //@ remove value from friend_request_received & update friends array 
                        var index = friends_user_id.indexOf(req.body.user_id);
                        
                        var friends_rr = row_frr[0].friend_request_received;
                        friends_rr.splice(index, 1); 

                        var frnds = row_frr[0].friends;                        
                        frnds.push({user_id:req.body.user_id, added_on:new Date()}); 

                        fc_user_profile.update({
                            _id : rows[0].user_id                    
                        },
                        {friend_request_received:friends_rr, friends:frnds}, function(err_frr, frr) {
                            if (err_frr){console.log(err_frr);return;}
                            
                            fc_user_profile.find({_id:req.body.user_id },function(err, row_frs) {                    
                                if (err){res.send(err); return;}
                                else{
                                    
                                    var friends_user_id = row_frs[0].friend_request_sent.map(a => a.user_id);
                                    //@ remove value from friend_request_sent & update friends array
                                    var index = friends_user_id.indexOf(rows[0].user_id);

                                    var friends_rs = row_frs[0].friend_request_sent;
                                    friends_rs.splice(index, 1); 
                                    
                                    var frnds = row_frs[0].friends;
                                    frnds.push({user_id:rows[0].user_id, added_on:new Date()}); 

                                    fc_user_profile.update({
                                        _id : req.body.user_id                    
                                    },
                                    {friend_request_sent:friends_rs, friends:frnds}, function(err_frs, frs) {
                                        if (err_frr){console.log(err_frr);return;}

                                        // //@ create activity 
                                        var ret = saveActivity({user_id:rows[0].user_id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:("you are now friend with " + row_frs[0].last_name +" "+ row_frs[0].first_name)});
                                        console.log("you are now friend with " + row_frs[0].last_name +" "+ row_frs[0].first_name);

                                        // //@ create activity 
                                        var ret = saveActivity({user_id:req.body.user_id,user_ip:"",user_agent:"",activity_descriptor:("friend request accepted by " + row_frr[0].last_name +" "+ row_frr[0].first_name)});
                                        console.log("friend request accepted by " + row_frr[0].last_name +" "+ row_frr[0].first_name);

                                        res.json({status: "true", response: "friend request accepted successfully."});
                                    });
                                }
                            });
                        });

                    } else {
                        res.json({status: "false", response: "not in the list !"});
                    }                                         
                }
            });
        });
    };

    exports.deleteFriendRequest = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;}
            
            //frs = friend_request_sent
            //frr = friend_request_received
            fc_user_profile.find({_id:rows[0].user_id},function(err, row_frr) {                    
                if (err){res.send(err); return;}
                else{

                    //console.log(req.body.user_id);
                    console.log(row_frr[0].friend_request_received);
                    var friends_user_id = row_frr[0].friend_request_received.map(a => a.user_id);

                    if (friends_user_id.indexOf(req.body.user_id) > -1) {
                        
                        //@ remove value from friend_request_received
                        var index = friends_user_id.indexOf(req.body.user_id);
                        var friends_rr = row_frr[0].friend_request_received;
                        friends_rr.splice(index, 1); 

                        fc_user_profile.update({
                            _id : rows[0].user_id                    
                        },
                        {friend_request_received:friends_rr}, function(err_frr, frr) {
                            if (err_frr){console.log(err_frr);return;}
                            
                            fc_user_profile.find({_id:req.body.user_id },function(err, row_frs) {                    
                                if (err){res.send(err); return;}
                                else{
                                    
                                    var friends_user_id = row_frs[0].friend_request_sent.map(a => a.user_id);
                                    //@ remove value from friend_request_sent & update friends array
                                    var index = friends_user_id.indexOf(rows[0].user_id);
                                    var friends_rs = row_frs[0].friend_request_sent;
                                    friends_rs.splice(index, 1); 
                                    
                                    fc_user_profile.update({
                                        _id : req.body.user_id                    
                                    },
                                    {friend_request_sent:friends_rs}, function(err_frs, frs) {
                                        if (err_frr){console.log(err_frr);return;}

                                        res.json({status: "true", response: "friend request deleted successfully."});
                                    });
                                }
                            });
                        });

                    } else {
                        res.json({status: "false", response: "not in the list !"});
                    }                                         
                }
            });
        });
    };
    
    exports.deleteFriend = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;}
            
            //fs = friend_sent
            //fr = friend_received
            fc_user_profile.find({_id:rows[0].user_id},function(err, row_fr) {                    
                if (err){res.send(err); return;}
                else{

                    //console.log(req.body.user_id);
                    console.log(row_fr[0].friends);
                    var friends_user_id = row_fr[0].friends.map(a => a.user_id);

                    if (friends_user_id.indexOf(req.body.user_id) > -1) {
                        
                        //@ remove value from friend_request_received
                        var index = friends_user_id.indexOf(req.body.user_id);
                        var friends_updated= row_fr[0].friends;
                        friends_updated.splice(index, 1); 

                        fc_user_profile.update({
                            _id : rows[0].user_id                    
                        },
                        {friends:friends_updated}, function(err_fr, fr) {
                            if (err_fr){console.log(err_fr);return;}
                            
                            fc_user_profile.find({_id:req.body.user_id },function(err, row_fs) {                    
                                if (err){res.send(err); return;}
                                else{
                                    
                                    var friends_user_id = row_fs[0].friends.map(a => a.user_id);
                                    //@ remove value from friend_request_sent & update friends array
                                    var index = friends_user_id.indexOf(rows[0].user_id);
                                    var friends_updated = row_fs[0].friends;
                                    friends_updated.splice(index, 1); 
                                    
                                    fc_user_profile.update({
                                        _id : req.body.user_id                    
                                    },
                                    {friends:friends_updated}, function(err_fs, fs) {
                                        if (err_fs){console.log(err_fs);return;}

                                        // //@ create activity 
                                        var ret = saveActivity({user_id:rows[0].user_id,user_ip:ip,user_agent:req.headers['user-agent'],activity_descriptor:("you have unfriended " + row_fs[0].last_name +" "+ row_fs[0].first_name)});
                                        console.log("you have unfriend " + row_fs[0].last_name +" "+ row_fs[0].first_name);

                                        // //@ create activity 
                                        var ret = saveActivity({user_id:req.body.user_id,user_ip:"",user_agent:"",activity_descriptor:(row_fr[0].last_name +" "+ row_fr[0].first_name + " unfriended you")});
                                        console.log(row_fr[0].last_name +" "+ row_fr[0].first_name + " unfriended you");

                                        res.json({status: "true", response: "friend deleted successfully."});
                                    });
                                }
                            });
                        });

                    } else {
                        res.json({status: "false", response: "not in the list !"});
                    }                                         
                }
            });
        });
    };
    
    //@ return json data for front-end Call 
    exports.viewFriendsList = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;}

            fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {
                if (err){res.send(err);return;}

                if(row_user[0] != undefined){                    
                    //@ find details of the User sent the Request 
                    var fr_user_ids = row_user[0].friends.map(a => a.user_id);
                    fc_user_profile.find({_id:{ $in: fr_user_ids }},function(err, row_users) {
                        if (err){res.send(err);return;}


                        res.json({"fr":row_user[0].friends, "data":row_users});

                    }).select({"friend_request_received":0, "friend_request_sent":0, "friends":0, "device_id":0,"provider":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});                    
                }else{
                    res.json({status: "false", response: "User is not registered with us!"});
                }

            });
        });    
    };

    //@ render a view friends 
    exports.showFriendsList = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;}

            //@ here is a error unhandled
            user_id = rows[0].user_id;
            if(req.params._id !="" && req.params._id != undefined){
                user_id = req.params._id;
            }

            fc_user_profile.find({_id:user_id},function(err, row_user) {
                if (err){res.send(err);return;}

                if(row_user[0] != undefined){                    
                    //@ find details of the User sent the Request 
                    var fr_user_ids = row_user[0].friends.map(a => a.user_id);
                    fc_user_profile.find({_id:{ $in: fr_user_ids }},function(err, row_users) {
                        if (err){res.send(err);return;}

                        row_user[0].baseURL = config.baseURL;
                        row_user[0].profiles = row_users;
                        row_user[0].my_id = rows[0].user_id;
                        res.render('../public/user.friends.ejs',row_user[0]);                        

                    }).select({"friend_request_received":0, "friend_request_sent":0, "device_id":0,"provider":0,"reset_secret":0,"is_active":0, "__v":0, "created_at":0,"verified_at":0, "password":0});                    
                }else{
                    res.json({status: "false", response: "User is not registered with us!"});
                }

            });
        });    
    };

    //@ Add New Post
    exports.addPost = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        req.setTimeout(0);
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;} 

            fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {
                if (err){res.send(err);return;}

                var form = new formidable.IncomingForm();
                var extensions_image = ['.jpg', '.jpeg', '.png', '.gif'];                
                var extensions_video = ['.flv', '.avi', '.mp4','.mpeg','.m4v','.ogg'];

                form.parse(req, function (err, fields, files) {
                                        
                    console.log(fields.text,files.image,files.video);
                    console.log(util.inspect(fields, false, null));

                    if(fields.text == undefined && files.image == undefined && files.video == undefined){
                        res.json({status: "false", response: "failed"});
                        return;
                    }

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
                                            user_id             : rows[0].user_id,
                                            user_ip             : ip,
                                            user_agent          : req.headers['user-agent'],
                                            post_content        : [{text:fields.text,video:video_url}]
                                        }, function(err, records) {
                                            if (err){res.send(err);return;}
                                            else{
                                                req.io.emit('new_post');
                                                res.json({status: "true", response: "success"});    
                                            }
                                        });
                                    }else{
                                        //@ create the post
                                        fc_posts.create({
                                            user_id             : rows[0].user_id,
                                            user_ip             : ip,
                                            user_agent          : req.headers['user-agent'],
                                            post_content        : [{video:video_url}]
                                        }, function(err, records) {
                                            if (err){res.send(err);return;}
                                            else{
                                                req.io.emit('new_post');
                                                res.json({status: "true", response: "success"});    
                                            }
                                        });
                                    }
                                }                                
                            }); 
                        } else {
                            res.json({status: "false", response: "File Type Not Allowed.", data:{msg:"Allowed extensions are .flv, .avi, .wmv, .mp4,.mpeg,.m4v,.3gp"}});
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
                                            user_id             : rows[0].user_id,
                                            user_ip             : ip,
                                            user_agent          : req.headers['user-agent'],
                                            post_content        : [{text:fields.text,image:image_url}]
                                        }, function(err, records) {
                                            if (err){res.send(err);return;}
                                            else{
                                                req.io.emit('new_post');
                                                res.json({status: "true", response: "success"});    
                                            }
                                        });
                                    }else{
                                        //@ create the post
                                        fc_posts.create({
                                            user_id             : rows[0].user_id,
                                            user_ip             : ip,
                                            user_agent          : req.headers['user-agent'],
                                            post_content        : [{image:image_url}]
                                        }, function(err, records) {
                                            if (err){res.send(err);return;}
                                            else{
                                                req.io.emit('new_post');
                                                res.json({status: "true", response: "success"});    
                                            }
                                        });
                                    }                                    
                                }                                
                            }); 
                        } else {
                            res.json({status: "false", response: "File Type Not Allowed.", data:{msg:"Allowed extensions are .jpg, .jpeg, .png, .gif"}});
                        }
                    } else if(row_user[0] != undefined && fields.text != "") {
                        //@ create the post
                        fc_posts.create({
                            user_id             : rows[0].user_id,
                            user_ip             : ip,
                            user_agent          : req.headers['user-agent'],
                            post_content        : [{text:fields.text}]
                        }, function(err, records) {
                            if (err){res.send(err);return;}
                            else{
                                //var msg = rows[0].user_id + " added a new post";
                                req.io.emit('new_post');
                                res.json({status: "true", response: "success"});    
                            }
                        });
                    } else {
                        //@ nothing with the query
                        res.json({status: "false",response:"cheating!"});
                    }
                }); //form parser
            }); // check for the valid profile            
        });// check for the valid session values 
    };

    exports.viewNewPost = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {
            if (err){res.send(err);return;}

            //res.json(rows);  
            if(rows[0] != undefined){           
                //res.cookie('_id',rows[0].user_id);
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                    
                    if (err){res.send(err); return;}
                    else{                        

                        $limit = 10;
                        if(req.body.limit != undefined && req.body.limit != "") {
                            $limit = req.body.limit;
                        }

                        $user_id = "";
                        if(req.body.user_id != undefined && req.body.user_id != "") {
                            $user_id = req.body.user_id;
                        }

                        if($user_id != ""){
                            fc_user_profile.find({_id:$user_id},function(err, user) {
                                if (err){res.send(err); return;}

                                if(user[0]!=undefined){
                                    if(user[0].user_privacy == 0){ // if user privacy is public
                                        fc_posts.find({is_deleted:0, user_id:$user_id},function(err, rows_post) {
                                            if (err){console.log(err);return;}

                                            //console.log(rows_post);
                                            //console.log(util.inspect(rows_post, false, null));
                                            res.json({"_id":rows[0].user_id, "rows_post":rows_post});
                                            return;
                                            
                                        }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit);
                                    }else if(user[0].user_privacy == 1){ // if user privacy is friends

                                        // find & check friends 
                                        var friends = user[0].friends.map(a => a.user_id);
                                        if(friends.indexOf(rows[0].user_id) > -1){
                                            fc_posts.find({is_deleted:0, user_id:$user_id},function(err, rows_post) {
                                                if (err){console.log(err);return;}

                                                //console.log(rows_post);
                                                //console.log(util.inspect(rows_post, false, null));
                                                res.json({"_id":rows[0].user_id, "rows_post":rows_post});
                                                return;
                                                
                                            }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit);
                                        }else{
                                            res.json({"_id":rows[0].user_id, "rows_post":{}});
                                                return;
                                        }                                        
                                    }else if(user[0].user_privacy == 2){ // if user privacy is private

                                        if(rows[0].user_id == $user_id){
                                            fc_posts.find({is_deleted:0, user_id:$user_id},function(err, rows_post) {
                                                if (err){console.log(err);return;}

                                                //console.log(rows_post);
                                                //console.log(util.inspect(rows_post, false, null));
                                                res.json({"_id":rows[0].user_id, "rows_post":rows_post});
                                                return;
                                                
                                            }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit);
                                        }else{
                                            res.json({"_id":rows[0].user_id, "rows_post":{}});
                                                return;
                                        }                                        
                                    }
                                }else{
                                    //@ nothing with the query
                                    res.json({status: "false",response:"user dose not exist!"});
                                }
                            });
                        }else{
                            fc_user_profile.aggregate(
                                { $project : {_id:1, user_privacy:"$user_privacy" }},                                
                                { $group : { _id : {user_privacy:"$user_privacy"} , user_ids: { $addToSet :"$_id"}} },
                            function(err, profiles) {
                                if (err){res.send(err); return;}
                                                                                              
                                //$nin:user_ids_private                                    
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
                                    
                                    //var _id = new ObjectId(rows[0].user_id);
                                    
                                    var user_ids_private = [];
                                    user_ids_private_tmp.forEach(function(value){
                                      if(value !=  rows[0].user_id){user_ids_private.push(value);}                                                                  
                                    });                 

                                    var user_ids_friends = [];
                                    user_ids_friends_tmp.forEach(function(value){
                                      //console.log(friends, friends.indexOf(String(value)), String(value));
                                      if(value != rows[0].user_id && friends.indexOf(String(value)) < 0 ){user_ids_friends.push(value);}                                                                  
                                    });                 
                                    
                                    //console.log(user_ids_private); 
                                    //console.log(user_ids_friends); 
                                    
                                    var ignored_ids = user_ids_private.concat(user_ids_friends);
                                    fc_posts.find({is_deleted:0,user_id:{$nin:ignored_ids}},function(err, rows_post) {
                                        if (err){console.log(err);return;}

                                        //console.log(rows_post);
                                        //console.log(util.inspect(rows_post, false, null));
                                        res.json({"_id":rows[0].user_id, "rows_post":rows_post});return;                                            
                                    }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit); 
                                }else{
                                    
                                    fc_posts.find({is_deleted:0},function(err, rows_post) {
                                        if (err){console.log(err);return;}

                                        res.json({"_id":rows[0].user_id, "rows_post":rows_post});return;                                            
                                    }).populate("user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0}).sort({"created_at":-1}).limit($limit); 
                                }
                            });
                        }                       
                    }
                });                
            }else{
                //@ nothing with the query
                res.json({status: "false",response:"cheating!"});
            }
        });        
    };

    exports.deletePost = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {
            if (err){res.send(err);return;}

            if(req.params._id == "" || req.params._id == undefined){
                res.json({status: "false",response:"cheating!"});
                return;
            }
            //res.json(rows);  
            if(rows[0] != undefined){           
                //res.cookie('_id',rows[0].user_id);
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                    
                    if (err){
                        res.send(err)
                    }
                    else{                        

                        fc_posts.update({_id:req.params._id,user_id:rows[0].user_id}, {is_deleted:1},function(err, row_post) {
                            if (err){console.log(err);return;}

                            //console.log(row_post);
                            req.io.emit('new_post');
                            res.json({status: "true",response:"success"});
                            
                        });
                    }
                });                
            }else{
                //@ nothing with the query
                res.json({status: "false",response:"cheating!"});
            }
        });        
    };

    exports.likePost = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {
            if (err){res.send(err);return;}

            if(req.params._id == "" || req.params._id == undefined){
                res.json({status: "false",response:"cheating!"});
                return;
            }

            //res.json(rows);  
            if(rows[0] != undefined){           
                //res.cookie('_id',rows[0].user_id);
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {
                    if (err){res.send(err);return;}
                    
                    if(row_user[0] != undefined){                        

                        fc_posts.find({_id:req.params._id, is_deleted:0}, function(err, row_post){
                            if (err){res.send(err);return;}

                            if(row_post[0] != undefined){

                                console.log(row_post[0].post_likes);                                
                                var user_ids = row_post[0].post_likes.map(a => a.user_id);
                                //@ check if user is already in like list 
                                if (user_ids.indexOf(rows[0].user_id) > -1) {

                                    //@ remove liked from the array
                                    var index = user_ids.indexOf(rows[0].user_id);
                                    var post_likes_arr = row_post[0].post_likes;
                                    post_likes_arr.splice(index, 1); 

                                    fc_posts.update({_id:req.params._id}, {post_likes:post_likes_arr},function(err, row_post_tmp) {
                                        if (err){console.log(err);return;}
                                        //console.log(row_post);
                                        fc_posts.find({_id:req.params._id},function(err, post) {
                                            if (err){console.log(err);return;}
                                            //console.log(rows_post);
                                            res.json({status: "true",response:"success", data:post});                                        
                                        }).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                                    });

                                } else {

                                    //@ add in the like list 
                                    var post_likes_arr = row_post[0].post_likes;
                                    post_likes_arr.push({user_id:rows[0].user_id, liked_on:new Date()});
                                    fc_posts.update({_id:req.params._id}, {post_likes:post_likes_arr},function(err, row_post_tmp) {
                                        if (err){console.log(err);return;}
                                        //console.log(row_post);
                                        fc_posts.find({_id:req.params._id},function(err, post) {
                                            if (err){console.log(err);return;}

                                            fc_user_profile.find({_id:post[0].user_id},function(err, post_user) {
                                                if (err){console.log(err);return;}
                                                //console.log(rows_post);
                                                if(post[0].user_id != rows[0].user_id){

                                                    var msg_notice = ' likes your post';

                                                    fc_notifications.create({                    
                                                        user_id             : post[0].user_id,
                                                        user_id_sender      : rows[0].user_id,
                                                        post_id             : post[0]._id,
                                                        notification_type   : 0, // 0 for like 
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
                                                                        console.log("FCM:Something has gone wrong with !", err);
                                                                    } else {
                                                                        console.log("FCM: Successfully sent with response: ", response);
                                                                    }
                                                                    res.json({status: "true",response:"success", data:post});
                                                                });
                                                            }else{
                                                                res.json({status: "true",response:"success", data:post});
                                                            }    
                                                        }                
                                                    }); // create notification row in documents
                                                }else{
                                                    res.json({status: "true",response:"success", data:post});    
                                                }                                                
                                            });                                        
                                        }).populate("post_likes.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                                    });
                                }
                            }else{
                                //@ post deleted or any other reason 
                                res.json({status: "false",response:"post dose not exist anymore !"});
                            }
                        });
                        
                    }else{
                        //@ nothing with the query
                        res.json({status: "false",response:"invalid session"});
                    }
                });                
            }else{
                //@ nothing with the query
                res.json({status: "false",response:"cheating!"});
            }
        });        
    };

    exports.commentOnPost = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {
            if (err){res.send(err);return;}

            if(req.body._id == "" || req.body._id == undefined || req.body.text == "" || req.body.text == undefined ){
                res.json({status: "false",response:"cheating!"});
                return;
            }

            //res.json(rows);  
            if(rows[0] != undefined){           
                //res.cookie('_id',rows[0].user_id);
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {
                    if (err){res.send(err);return;}
                    
                    if(row_user[0] != undefined){                        

                        fc_posts.find({_id:req.body._id, is_deleted:0}, function(err, row_post){
                            if (err){res.send(err);return;}

                            if(row_post[0] != undefined){

                                console.log(row_post[0].post_comments);
                                var tmp_uuid = uuid();
                                //@ add in the comment list 
                                var post_comments_arr = row_post[0].post_comments;
                                post_comments_arr.push({comment_id:tmp_uuid, user_id:rows[0].user_id, commented_on:new Date(), text:req.body.text});
                                fc_posts.update({_id:req.body._id}, {post_comments:post_comments_arr},function(err, row_post_tmp) {
                                    if (err){console.log(err);return;}
                                    //console.log(row_post);

                                    fc_posts.find({_id:req.body._id},function(err, post) {
                                        if (err){console.log(err);return;}
                                        //console.log(rows_post);
                                        fc_user_profile.find({_id:post[0].user_id},function(err, post_user) {
                                            if (err){console.log(err);return;}

                                            if(post[0].user_id != rows[0].user_id){

                                                var msg_notice = ' commented on your post';

                                                fc_notifications.create({                    
                                                    user_id             : post[0].user_id,
                                                    user_id_sender      : rows[0].user_id,
                                                    post_id             : post[0]._id,
                                                    notification_type   : 1, // 1 for comment 
                                                    notification_text   : msg_notice
                                                }, function(err, row_fcn) {
                                                    if (err){
                                                        res.send(err);
                                                        return;
                                                    }else{
                                                        req.io.emit('new_comment_'+post[0].user_id, ({msg:(row_user[0].last_name +' '+row_user[0].first_name + msg_notice),date_time:new Date(),post_id:post[0]._id}));
                                                        req.io.emit('new_post');

                                                        if(post_user[0].device_id != undefined && post_user[0].device_id != "" ){
                                                            var message = {
                                                                to: post_user[0].device_id, // required fill with device token or topics                                            
                                                                data: {
                                                                    post_id: post[0]._id
                                                                },
                                                                notification: {
                                                                    title: "New comment",
                                                                    body: (row_user[0].last_name +' '+row_user[0].first_name + msg_notice)
                                                                }
                                                            };

                                                            fcm.send(message, function(err, response){
                                                                if (err) {
                                                                    console.log("FCM:Something has gone wrong!", err);
                                                                } else {
                                                                    console.log("FCM:Successfully sent with response: ", response);
                                                                }
                                                                res.json({status: "true",response:"success", data:{post_likes:post[0].post_likes,is_like:true}});
                                                            });
                                                        }else{
                                                            res.json({status: "true",response:"success", data:{post_likes:post[0].post_likes,is_like:true}});
                                                        }
                                                    }
                                                });// create notification row in documents
                                            }else{
                                                res.json({status: "true",response:"success", data:post});
                                            }                                            
                                        });
                                    }).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                                });
                                
                            }else{
                                //@ post deleted or any other reason 
                                res.json({status: "false",response:"post dose not exist anymore !"});
                            }
                        });
                        
                    }else{
                        //@ nothing with the query
                        res.json({status: "false",response:"invalid session"});
                    }
                });                
            }else{
                //@ nothing with the query
                res.json({status: "false",response:"cheating!"});
            }
        });        
    };

    exports.deleteCommentOnPost = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {
            if (err){res.send(err);return;}

            if(req.body._id == "" || req.body._id == undefined || req.body.comment_id == "" || req.body.comment_id == undefined ){
                res.json({status: "false",response:"cheating!"});
                return;
            }

            //res.json(rows);  
            if(rows[0] != undefined){           
                //res.cookie('_id',rows[0].user_id);
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {
                    if (err){res.send(err);return;}
                    
                    if(row_user[0] != undefined){                        

                        fc_posts.find({_id:req.body._id, is_deleted:0}, function(err, row_post){
                            if (err){res.send(err);return;}

                            if(row_post[0] != undefined){

                                console.log(row_post[0].post_comments);
                                comment_id = req.body.comment_id;

                                var comment_ids = row_post[0].post_comments.map(a => a.comment_id);
                                //@ add in the comment list 
                                var post_comments_arr = row_post[0].post_comments;
                                var index = comment_ids.indexOf(comment_id);
                                post_comments_arr.splice(index, 1);

                                fc_posts.update({_id:req.body._id}, {post_comments:post_comments_arr},function(err, row_post_tmp) {
                                    if (err){console.log(err);return;}
                                    //console.log(row_post);

                                    fc_posts.find({_id:req.body._id},function(err, post) {
                                        if (err){console.log(err);return;}
                                        //console.log(rows_post);
                                        res.json({status: "true",response:"success", data:post});                                        
                                    }).populate("post_comments.user_id",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"user_agent":0,"user_ip":0, "__v":0, "is_deleted":0});
                                });
                                
                            }else{
                                //@ post deleted or any other reason 
                                res.json({status: "false",response:"post dose not exist anymore !"});
                            }
                        });
                        
                    }else{
                        //@ nothing with the query
                        res.json({status: "false",response:"invalid session"});
                    }
                });                
            }else{
                //@ nothing with the query
                res.json({status: "false",response:"cheating!"});
            }
        });        
    };
    
    exports.viewNotifications = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];
        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {        
            if (err){res.send(err);return;}

            if(rows[0] != undefined){
                fc_notifications.find({user_id:rows[0].user_id},function(err, rows_notify) {
                    if (err){res.send(err);return;}

                    if(rows_notify[0] != undefined){
                        res.json({status: "true", response: "success", data:rows_notify});
                    }else{
                        res.json({status: "false", response: "nothing to show!",data:{}});
                    }
                }).populate("user_id_sender",{ _id:1, displayName:1, first_name:1, last_name:1, profile_image_url:1}).select({"__v":0}).limit(10).sort({"notification_log_time":-1});
            }else{
                res.json({status: "false", response: "cheating!"});
            }            
        });    
    };

    exports.noticedNotification = function(req, res) {
        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];        
        //console.log(req.params._id);

        if(req.params._id == "" || req.params._id == undefined ){
            res.json({status: "false",response:"notificatio id required!"});
            return;
        }

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end: null},function(err, rows) {
            if (err){res.send(err);return;}
            
            console.log(rows);
            if(rows[0] != undefined){

                //@ udpate last login field 
                fc_notifications.update({
                    _id : req.params._id,
                    user_id : rows[0].user_id
                },
                { is_noticed: true }, function(err2, tmp2) {
                    if (err2){res.send(err2);return;}
                    
                    console.log(tmp2);
                    res.json({status: "true", response: "success"});                    
                });
                                   
            }else{
                res.json({status: "false", response: "cheating !"});                
            }
        });
    };

    //@ render the view for store 
    exports.store = function(req, res) {

        var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[0];

        fc_sessions.find({user_ip:ip, user_agent:req.headers['user-agent'], session_end:null}, function(err, rows) {

            if (err)
                res.send(err)
            //res.json(rows);
            //console.log(rows[0].user_id);  
            if(rows[0] != undefined){           
                //res.cookie('_id',rows[0].user_id);
                fc_user_profile.find({_id:rows[0].user_id},function(err, row_user) {                    
                    if (err){
                        res.send(err)
                    }
                    else{

                        //console.log(row_user);
                        row_user[0].baseURL = config.baseURL;
                        res.render('../public/user.store.ejs',row_user[0]);                        
                    }
                });                
            }else{
                res.redirect('/');
            }
        });        
    };