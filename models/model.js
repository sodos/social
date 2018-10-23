	var mongoose = require('mongoose');
	var random = require('mongoose-simple-random');

	Schema = mongoose.Schema;

	// create a schema
	var UserProfileSchema = new Schema({	  	  
	  email						: String,
	  first_name				: String,
	  last_name					: String,
	  displayName				: { type: String, default: "" },
	  password					: String,
	  gender					: { type: String, default: "" },
	  dob						: { type: String, default: "" },
      phone_no					: { type: String, default: "" },
      city						: { type: String, default: "" },
      state						: { type: String, default: "" },
      country					: { type: String, default: "" },
      postal_code				: { type: String, default: "" },
      bio						: { type: String, default: "" },
      user_privacy				: { type: Number, default:0 }, //public(0)/friends(1)/private(2)
      friends					: [{ 
		  							user_id : { type: String, ref: 'fc_user_profile' },
								    added_on : { type: Date, default: Date.now }
								   }],
      friend_request_sent		: [{ 
		  							user_id : { type: String, ref: 'fc_user_profile' },
								    sent_on : { type: Date, default: Date.now }
								   }],
      friend_request_received	: [{ 
		  							user_id : { type: String, ref: 'fc_user_profile' },
								    received_on : { type: Date, default: Date.now }
								   }],
	  last_login 				: Date,
	  created_at 				: Date,
	  verified_at 				: Date,
	  provider					: String,
	  device_id					: { type: String, default: "" },
	  reset_secret				: { type: String, default: "" },
	  profile_image_url 		: { type: String, default: "" },
	  is_active					: { type: Boolean, default: true }
	});

	// db.fc_user_profiles.update({}, {$set: {"user_privacy":0}}, {upsert:false,multi:true})
	// db.fc_user_profiles.update({}, {$set: {"is_active":true}}, {upsert:false,multi:true})
	// db.fc_user_profiles.update({}, {$set: {"friends":[]}}, {upsert:false,multi:true})
	// db.fc_user_profiles.update({}, {$set: {"friend_request_sent":[]}}, {upsert:false,multi:true})
	// db.fc_user_profiles.update({}, {$set: {"friend_request_received":[]}}, {upsert:false,multi:true})
	// db.fc_user_profiles.update({}, {$set: {"bio":""}}, {upsert:false,multi:true})
	
	mongoose.model('fc_user_profile', UserProfileSchema);

	// create a schema for session
	var fcActivitiesSchema = new Schema({	  
	  user_id				: { type: String, ref: 'fc_user_profile' },
	  user_ip				: String,
	  user_agent			: String,	  
	  activity_log_time		: { type: Date, default: Date.now },
	  activity_descriptor	: String,							
	});

	mongoose.model('fc_activities', fcActivitiesSchema);

	// create a schema for notification
	var fcNotificationsSchema = new Schema({	  
	  user_id				: { type: String, ref: 'fc_user_profile' },
	  user_id_sender		: { type: String, ref: 'fc_user_profile' },
	  post_id				: { type: String, ref: 'fc_posts' },
	  notification_log_time	: { type: Date, default: Date.now },
	  is_noticed			: { type: Boolean, default: false}, // flag:true if user noticed it 
	  notification_type		: { type: Number, default: 0}, //like(0)/comment(1)/friend_request_received(2)/friend_request_accepted(3)
	  notification_text		: String,					   
	});

	mongoose.model('fc_notifications', fcNotificationsSchema);

	// create a schema for session
	var fcSessionSchema = new Schema({
	  user_id		: { type: String, ref: 'fc_user_profile' },	  
	  user_ip		: String,
	  user_agent	: String,	  
	  session_start	: Date,
	  session_end	: { type: Date, default: "" },
	  session_secret: String,
	});

	mongoose.model('fc_sessions', fcSessionSchema);
	

	// create a schema for Post
	var fcPostSchema = new Schema({	  
	  user_id				: { type: String, ref: 'fc_user_profile' },
	  user_ip				: String,
	  user_agent			: String,	  
	  post_content			: [{}],
	  post_comments			: [{ 
	  							comment_id : String,
	  							user_id : { type: String, ref: 'fc_user_profile' },
							    commented_on : { type: Date, default: Date.now },
							    text : String
							   }],
	  post_likes			: [{ 
	  							user_id : { type: String, ref: 'fc_user_profile' },
							    liked_on : { type: Date, default: Date.now }
							   }],	  
	  post_privacy			: { type: Number, default:0 }, //public(0)/friends(1)/private(2)
	  is_deleted			: { type: Number, default:0 }, //published(0)/deleted(1)
	  created_at			: { type: Date, default: Date.now },
	  updated_at			: { type: Date, default: Date.now }
	});

	mongoose.model('fc_posts', fcPostSchema);

	// var CounterSchema = Schema({
	//     _id: {type: String, required: true},
	//     seq: { type: Number, default: 0 }
	// });
	// var fc_userid_counters = mongoose.model('fc_userid_counters', CounterSchema);


	// UserProfileSchema.pre('save', function(next) {
	//     var doc = this;
	//     counter.findByIdAndUpdate({_id: 'user_id'}, {$inc: { seq: 1} }, function(error, counter)   {
	//         if(error)
	//             return next(error);
	//         doc.user_id = counter.seq;
	//         next();
	//     });
	// });
	// db.fc_userid_counters.insert({_id: "user_id",seq: 0});

	