let Player = require('../models/Player');
var fs = require('fs');
var path = require('path');
var hasher = require('password-hash-and-salt');
var serviceProviderController = require('./serviceProviderController');
var Arena = require('../models/Arena');
var Booking = require('../models/Booking');
var ServiceProvider = require('../models/ServiceProvider');
var async = require('async');

function date_calc(year, month, day) {
  if (month < 10)  //if month is one digit pad it with zero
    month = "0" + month;
  if (day < 10)    //if day is one digit pad it with zero
    day = "0" + day;
  return year + "-" + month + "-" + day;
}
function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}
function compute(req, res, result) {
	if (result.length == 0) {
		res.status(404).json({error:"no Arena matches your value"});
		return;
	} else {
		var tmp = 0;
		if (!req.body.index || req.bor.index == '')  // in case the page diplayed for the first time not as a result of selecting page index; index will not exit in the body
			tmp = 1;                                                                                                     // so we set it to one
		else
			tmp = req.body.index;
		var count = Math.ceil(result.length / 10);
		var start = (tmp - 1) * 10;
		var end = tmp == count ? result.length : tmp * 10;
		var active = tmp;  //to indicate the active page rightnow

		res.json({result,count,start,end,active});
		return;
	}
}

let playerController = {
  edit_profile_page: function (req, res) { // prepar the edit profile page
    //retrieve the players's record from DB to be able to fill the fields to be changed
    Player.findOne({ username: req.user.username }, function (err, result) {
      if (err)
        res.status(500).json({error: err.message});
      else {
        res.json({result, date: date_calc(result.birthdate.getFullYear(), result.birthdate.getMonth() + 1, result.birthdate.getDate()) });

      }
    })
  },
  edit_profile_info: function (req, res) { //accepting new info and update the DB record
    Player.findOne({ username: req.user.username }, function (err, result) {
      if (err)
          res.status(500).json({error: err.message});
      else {
       req.checkBody('name', 'Name is required.').notEmpty();
         req.checkBody('old_password', 'Password is required.').notEmpty();
         req.checkBody('email', 'Email wrong format').isEmail();
         req.checkBody('email', 'Email is required.').notEmpty();
         req.checkBody('location', 'Location is required.').notEmpty();
         req.checkBody('phone_number', 'Phone number is required.').notEmpty();

         var errors = req.validationErrors();

       if(errors)
       return res.status(400).json({errors,result, date: date_calc(result.birthdate.getFullYear(), result.birthdate.getMonth() + 1, result.birthdate.getDate())});

        hasher(req.body.old_password).verifyAgainst(result.password, function (err, verified) {
          if (!verified) {
            res.status(422).json({ errors:[{param : 'old_password',msg:'wrong password !'}], result, date: date_calc(result.birthdate.getFullYear(), result.birthdate.getMonth() + 1, result.birthdate.getDate()) });
            return;
          }
          else {
            result.name = req.body.name;
            if (req.body.new_password) {
              hasher(req.body.new_password).hash(function (err, hash) {
                if (err)
                    res.status(500).json({error: err.message});
                else {
                  result.password = hash;
                  result.email = req.body.email;
                  result.phone_number = req.body.phone_number;
                  if (req.files[0]) {
                    result.profile_pic.data = req.files[0].buffer;
                  }
                  result.location = req.body.location;
                  result.birthdate = req.body.birthdate;
                  result.save(function (err) {
                    if (err) {
                        res.status(500).json({error: err.message});
                      return;
                    } else {
                      res.json({ message: "information updated successfully", result, date: date_calc(result.birthdate.getFullYear(), result.birthdate.getMonth() + 1, result.birthdate.getDate()) });
                      return;
                    }

                  });
                }
              });
            }
            else {
              result.email = req.body.email;
              result.phone_number = req.body.phone_number;
              if (req.files[0]) {
                result.profile_pic.data = req.files[0].buffer;
              }
              result.location = req.body.location;
              result.birthdate = req.body.birthdate;
              result.save(function (err) {
                if (err) {
                    res.status(500).json({error: err.message});
                  return;
                } else {
                  res.json({ message: "information updated successfully", result, date: date_calc(result.birthdate.getFullYear(), result.birthdate.getMonth() + 1, result.birthdate.getDate()) });
                  return;
                }

              });
            }
          }
        });
      }

    });
  },search:function(req,res){
              var search_type = req.body.search_type;
              var search_value = req.body.search_value;
              var result =[];
              req.checkBody('search_value','search_value is empty!...enter a value').notEmpty();
              if(req.validationErrors())
                  return res.status(400).json({error:"search_value is empty!...enter a value."});
              if (search_type == "price") {
                req.checkBody('search_value','price must be a number.').isNumeric();

              var errors = req.validationErrors();

            if(errors)
            return res.status(400).json({error:"price must be a number."});

                      Arena.find({ price: search_value }, function (err, doc) {
                      if (err)
                       res.status(500).json({error: err.message});

                      else {
                        async.each(doc, function (currentArena, callback){
                                  var boolean = true;
                                  ServiceProvider.findById(currentArena.service_provider,function(err,provider){
                                    if(err)
                                    res.status(500).json({error : "internal error happened"});
                                    else{
                                    for (var i = 0; i < provider.blacklist.length; i++) {
                                      if(provider.blacklist[i] == req.user._id)
                                          boolean = false;
                                    }
                                    if(boolean)
                                        result.push(currentArena);
                                    }
                                      callback();
                                  });

                               },function(){
                                 compute(req,res,result);
                               });



                 }
              });
              } else if (search_type == "location") {
                        Arena.find({ location: search_value }, function (err, doc) {
                          if (err)
                           res.status(500).json({error: err.message});
                          else {
                            async.each(doc, function (currentArena, callback){
                                      var boolean = true;
                                      ServiceProvider.findById(currentArena.service_provider,function(err,provider){
                                        if(err)
                                        res.status(500).json({error : "internal error happened"});
                                        else{
                                        for (var i = 0; i < provider.blacklist.length; i++) {
                                          if(provider.blacklist[i] == req.user._id)
                                              boolean = false;
                                        }
                                        if(boolean)
                                            result.push(currentArena);
                                        }
                                          callback();
                                      });

                                   },function(){
                                     compute(req,res,result);
                                   });



                     }
                        });
              } else {
                        Arena.find({ name: search_value }, function (err, doc) {
                          if (err)
                           res.status(500).json({error: err.message});
                          else {
                            async.each(doc, function (currentArena, callback){
                                      var boolean = true;
                                      ServiceProvider.findById(currentArena.service_provider,function(err,provider){
                                        if(err)
                                        res.status(500).json({error : "internal error happened"});
                                        else{
                                        for (var i = 0; i < provider.blacklist.length; i++) {
                                          if(provider.blacklist[i] == req.user._id)
                                              boolean = false;
                                        }
                                        if(boolean)
                                            result.push(currentArena);
                                        }
                                          callback();
                                      });

                                   },function(){
                                     compute(req,res,result);
                                   });



                     }
                        });
              }
  }
}

module.exports = playerController;

