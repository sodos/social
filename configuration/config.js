
module.exports= {
    "baseURL"              : "http://qa.example.com:8080",
    "_baseDIR"             : "/home/ubuntu/dev/public/",
    "_uploadDIR"           : "./public/upload/",
	"appID"                : "facebook app id",
	"appSecret"            : "facebook app secret",
	"fbCallbackUrl"        : "http://qa.example.com:8080/auth/facebook/callback",
    "apiKey"               : "twitter api key",
    "apiSecret"            : "twitter api secret",
    "twitterCallbackUrl"   : "http://qa.example.com:8080/auth/twitter/callback",
    "clientID"             : "google client id",
    "clientSecret"         : "google client secret",
    "googleCallbackUrl"    : "http://qa.example.com:8080/auth/google/callback",
    "googlePlaceAPIKey"    : "google place api key", 
    "fcm_server_key"       : "fcm key will be here",
    	"dbUri"            : "mongodb://localhost/social",
    	"SmtpOptions"      : {
        host: 'smtp.mail.us-east-1.awsapps.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: 'noreply@example.com', // generated ethereal user
            pass: 'password'  // generated ethereal password
        }
    },
    "html":{
        "title":"Example.com"
    }
}