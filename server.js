// server.js

    // set up ========================
    // var express     = require('express');
    // var app         = express(); 
    var express         =     require('express')
    , passport          =     require('passport')
    , util              =     require('util')    
    , TwitterStrategy   =     require('passport-twitter').Strategy    
    , session           =     require('express-session')  
    , cookieParser      =     require('cookie-parser')
    , randomstring      =     require("randomstring")
    , bodyParser        =     require('body-parser')
    , mailer            =     require("nodemailer")
    , moment            =     require('moment')
    , config            =     require('./configuration/config')    
    , app               =     express();

    var server      = require('http').createServer(app); 
    var io          = require('socket.io');
    var socketMVC   = require('socket.mvc');

    var mongoose    = require('mongoose');                     // mongoose for mongodb      
    var model       = require('./models/model');   
    var morgan      = require('morgan');                         // log requests to the console (express4)
    var bodyParser  = require('body-parser');                // pull information from HTML POST (express4)
    var methodOverride = require('method-override');        // simulate DELETE and PUT (express4)
    var route       = require('./routes/route');
    

     // Use Smtp Protocol to send Email
    var smtpTransport = mailer.createTransport(config.SmtpOptions);

    fc_sessions     = mongoose.model('fc_sessions');    
    fc_user_profile = mongoose.model('fc_user_profile');

    var sess = { secret: randomstring.generate(36), key: 'lobo'};

    app.set('view engine', 'ejs');
    app.use(session(sess));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(cookieParser());

    app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(methodOverride());


    mongoose.connect('mongodb://localhost/social');
     
    
    // Passport session setup.
    passport.serializeUser(function(user, done) {
      done(null, user);       
    });

    passport.deserializeUser(function(obj, done) {
      done(null, obj);      
    });
    
    var successfully_url = '/ssession/'+sess.secret;    

    app.get('/auth/twitter',  
      passport.authenticate('twitter')
    );
     
    // handle the callback after twitter has authenticated the user
    app.get('/auth/twitter/callback',
      passport.authenticate('twitter', {
        successRedirect : successfully_url,
        failureRedirect : '/'
      })
    );

    passport.use('twitter', new TwitterStrategy({
        consumerKey     : config.apiKey,
        consumerSecret  : config.apiSecret,
        userProfileURL  : "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
        callbackURL     : config.twitterCallbackUrl
      },
      function(token, tokenSecret, profile, done) {
        // make the code asynchronous
        // User.findOne won't fire until we have all our data back from Twitter
            process.nextTick(function() {           
                console.log(profile);
                fc_user_profile.find({email:profile.emails[0].value},function(err, rows) {
                    if (err){
                        res.send(err)
                    }
                    else if (rows.length) {  
                        //@ update profile data
                        //@ create session

                        fc_sessions.create({
                            user_id : rows[0]._id,                    
                            user_ip : "",
                            user_agent : "",
                            session_start: new Date(),                            
                            session_secret: sess.secret
                        }, function(err1, records) {
                            if (err1)
                                console.log(err1);                    
                            //app.set('fb_session', records._id);
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
                                return done(null, profile);                        
                            });
                        });
                    }
                    else {
                        //@ create profile
                        fc_user_profile.create({                    
                            email         : profile.emails[0].value,
                            first_name    : "",
                            last_name     : "",
                            displayName   : profile.displayName,
                            password      : "",
                            last_login    : new Date(),
                            created_at    : new Date(),
                            verified_at   : new Date(),
                            provider      : "twitter"
                        }, function(err1, records) {
                            if (err1)
                                console.log(err1);
                            //send an email 
                            //@ 
                            console.log(records._id);
                            plainText = 'You have successfully registered .'
                            htmlText = '<b>You have successfully registered .</b>'
                            var mailOptions = {
                                from: '"SocialMedia" <noreply@example.com>', // sender address
                                to: profile.emails[0].value, // list of receivers
                                subject: 'Welcome to SocialMedia !', // Subject line
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

                            //@ create session
                            fc_sessions.create({
                                user_id : records._id,                    
                                user_ip : "",
                                user_agent : "",
                                session_start: new Date(),                                
                                session_secret: sess.secret
                            }, function(err1, rc1) {
                                if (err1)
                                    console.log(err1);

                                //@ udpate last login field 
                                //app.session({ secret: rc1._id, key: 'fb_session'});
                                fc_user_profile.update({
                                    _id : rows[0]._id,
                                    email : rows[0].email                    
                                },
                                { last_login: new Date() }, function(err2, tmp2) {
                                    if (err2)
                                        console.log(err2);

                                    //@ log & send the row data  
                                    console.log(rows);
                                    return done(null, profile);                        
                                });
                            }); 
                            //res.json({status: "true", response: "You have successfully registered."});
                        });                
                    }
                    
                });         
         
            });
        })
    );

    
    
    
    // // application -------------------------------------------------------------
    /* setup socket.io */
    io = io(server);
    app.use(function(req, res, next) {
      req.io = io;
      next();
    });
    io.on('connection', function(socket) {
      //log.info('socket.io connection made');
      console.log('socket.io connection made');
    });

    app.use('/', route);
    
    server.listen(8080);
    console.log("App listening on port 8080");
