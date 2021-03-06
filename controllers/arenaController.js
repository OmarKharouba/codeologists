var serviceProviderController = require('./serviceProviderController');
var bookingController = require('./bookingController');

var ServiceProvider = require('../models/ServiceProvider');
var Arena = require('../models/Arena');
var Booking = require('../models/Booking');
var bookingController = require('./bookingController');
/*
arenaController.bookHours
a function that creates the booking object then passes it on to the handle booking function, then calls back the createBooking function with the 'updated' day schedule and error if any
@params day, month,start and end indicies,arena name,time of booking request,the ID of the player who intiated the booking request, and callback function to call when it has finished its computation
@return void
*/
function bookHours(month, day, startIndex, endIndex, timestamp, arenaName, playerID, callback) {
    //create Booking
    var indices2 = serviceProviderController.getScheduleIndices(month, day);
    var indices={dayIndex : parseInt(indices2.dayIndex,10) , weekIndex : parseInt(indices2.weekIndex,10)}
    startIndex = parseInt(startIndex , 10);
    endIndex = parseInt(endIndex, 10);
    Arena.findOne({ name: arenaName }, function (err, foundArena) {

        if (!err && foundArena) {
            if (indices.dayIndex >= 0 && indices.weekIndex >= 0 && indices.dayIndex <= 6 && indices.weekIndex <= 3 && startIndex <= endIndex) {
                if (checkAvailable(parseInt(endIndex, 10), foundArena.schedule[indices.weekIndex][indices.dayIndex], parseInt(startIndex, 10))) {
                    ServiceProvider.findById(foundArena.service_provider, function (spErr, arenaCreator) {
                        if (!spErr && arenaCreator) {
                            var newBooking = new Booking({
                                player: playerID,
                                arena: arenaName,
                                time_stamp: timestamp,
                                bookDay: day,
                                bookMonth: month,
                                start_index: startIndex,
                                end_index: endIndex,
                                accepted: arenaCreator.mode
                            }).save(function (errSave, bookingObj) {
                                if (errSave) {
                                    callback(errSave, null);
                                }
                                else {
                                    bookingController.handleBooking(bookingObj._id,function(err,schedule){
                                    return  callback(err,schedule);
                                    });
                                    
                                }
                            })
                        }
                        else {
                            if (spErr) {
                                return callback(spErr, null);
                            }
                            else {
                                return callback("The Creater of the arena is no longer existant or has been removed ", null);
                            }
                        }
                    });
                }
                else {
                    return callback("Time Unavailable", null);
                }
            } else {
                if (err)
                    return callback(err, null);
                else if (!(indices.dayIndex >= 0 && indices.weekIndex >= 0 && indices.dayIndex <= 6 && indices.weekIndex <= 3))
                    return callback("Day and month ot of bound", null);
                else
                    return callback("no such booking", null);
            }
        }else{
          callback("Error occured!", null);
        }

    })

}
//checks to see if the slots between start index and end index in the schedule of  certain DAY is free if so it return true otherwise false
//the function takes as input the start index, end index and schedule of a day (1d array)

function checkAvailable(endIndex, schedule, startIndex) {
  for (var counter = startIndex; counter <= endIndex; counter++) {
    if (schedule[counter] != 0)
    return false;
  }
  return true;
}

/*
arenaController.getComments: 
a get request function retrieves the comments of arena from the database based on its ID.
@param: takes the ID of the arena 
@return: returns a list of comments in the response
*/

function getComments(req, res) {
  Arena.findOne({ _id: req.params.id }, function (err, arena) {
    if(err){
      res.status(400).json({ error: err.message });
      return;
    }
    return res.json({comments: arena.comments});
  });
}


/*
arenaController.commentOnArena:
a post request function that takes a comment and adds it to the list of comments of the arena with the ID. 
@param: takes the comment content and ID of arena
@return: updates the database with a new comment object.
*/

function commentOnArena(req, res) {
  if (!req.body.comment)
  return res.status(400).json({ error: "bad request, add a comment" });
  if (req.user.type == 'Player') {
    Arena.findOne({ _id: req.params.id }, function (err, arena) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      var content = req.body.comment;
      var comment = { Content: content, time_stamp: new Date(), player: req.user.username};
      arena.comments.push(comment);
      arena.save(function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
      });
      res.json(arena.comments);
    });
  }
  else {
    res.status(400).json({ error: "not allowed to comment" });
  }
};
function viewarena(req, res) {
  Arena.findOne({ _id: req.params.arenaid }, function (err, arena) {
    res.json({ arena: arena, err: err });
  });
};
/*
Function: arenaController.editarena

functionality: this function returns the arena to be edited.

@param arena_id: the id of the arena to be edited.

@returns JSON object of the arena.
*/
function editarena(req, res) {
  var arenaid = req.params.arenaid;
  Arena.findOne({ _id: arenaid }, function (err, arena) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!arena) {
      return res.status(400).json({ error: 'the arena is not found' });
    }
    if (req.user && arena.service_provider == req.user._id) {
      return res.json(arena);
    } else {
      return res.status(400).json({ error: 'the arena is not found' });
    }
  });
};

const getArenas = function (req, res) {
    if (req.user.type == 'ServiceProvider') {
        Arena.find({ service_provider: req.user._id }, 'name', function (dbErr, arenaArr) {
            if (dbErr)
                res.status(500).json({ error: "Sorry We have Encountered an internal server error" });
            else {
                res.json(arenaArr);
            }
        })
    }
    else {
        res.status(403).json({ error: "Please Log In as a Service Provider /Arena owner to view the list of pending booking requests" });
    }
}

/*
Function: arenaController.editarenainfo

functionality: this function edits the arena info 

@param (rules_and_regulations,address,location,size,type,price): arena info/details 

@returns the arena after editing it 
*/
function editarenainfo(req, res) {
  var arenaid = req.params.arenaid;
  Arena.findOne({ _id: arenaid }, function (err, arena) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!arena) {
      return res.status(400).json({ error: 'the arena is not found' });
    }
    if (req.user && arena.service_provider == req.user._id) {

      
      req.checkBody('address', 'Address is required.').notEmpty();
      req.checkBody('location', 'Location is required.').notEmpty();
      req.checkBody('size', 'The arena size is required.').notEmpty();
      req.checkBody('type', 'The arena type is required.').notEmpty();
      req.checkBody('price', 'The price are required.').notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        return res.status(400).json(errors);
      }

      arena.rules_and_regulations = req.body.rules_and_regulations;
      arena.address = req.body.address;
      arena.location = req.body.location;
      arena.size = req.body.size;
      arena.type = req.body.type;
      arena.price = req.body.price;
      arena.save(function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        return res.json(arena);
      });
    } else {
      return res.status(400).json({ error: 'you are not autherized to view this page' });
    }
  });
};

/*
Function: arenaController.editdefaultschedule

functionality: this function edits the default schedule of an arena

@param: arena_id: the arena id whose default schedule to be edited
        schedule: the default schedule 

@returns the arena whose default schedule was edited.
*/
function editdefaultschedule(req, res, nxt) {
    var arenaid = req.params.arenaid;
    Arena.findOne({ _id: arenaid }, function (err, arena) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!arena) {
            return res.status(400).json({ error: 'the arena is not found' });
        }
        if (req.user && arena.service_provider == req.user._id) {
            var new_sch = new Array(7);
            for (var i = 0; i < 7; i++)
                new_sch[i] = new Array(48).fill(0);
            if (req.body.schedule) {
                var ds = req.body.schedule;
                for (var i = 0; i < ds.length; i++) {
                    var sa = ds[i].split(",");
                    var x = parseInt(sa[0]);
                    var y = parseInt(sa[1]);
                    new_sch[x][y] = -1;
                }
            }
            arena.default_weekly_schedule = new_sch;
            arena.save(function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
            });
            return res.json(arena);
        } else {
            return res.status(400).json({ error: 'you are not autherized to view this page' });;
        }
    });
}

/*
Function: arenaController.addimage

functionality: this function adds an image to an arena

@param: arena_id: is the id of the arena to be edited 

@returns the arena after adding an image to it.
*/
function addimage(req, res, nxt) {
  var newimage = { data: req.files[0].buffer };
  var arenaid = req.params.arenaid;
  Arena.findOne({ _id: arenaid }, function (err, arena) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!arena) {
      return res.status(400).json({ error: 'the arena is not found' });
    }
    if (req.user && arena.service_provider == req.user._id) {
      arena.photos.push(newimage);
      arena.save(function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
      });
      return res.json(arena);
    } else {
      return res.status(400).json({ error: 'you are not autherized to view this page' });
    }
  });
}

/*
arenaController.setUnavailable  

This function sets the chosen slots in the schedule to be unavailable by setting their value to -1 in the schedule of the arena whose name is present in the params.  

@param startIndex : start index of the slots to be unavailable.   
     endIndex   : end index of the slots to be unavailable. 
     (month,day): date of the selected day.
     arenaName  : the arena whose schedule is to be edited.

@return -

*/

function setUnavailable(req, res) {
    if (req.user && (req.user.type == "ServiceProvider")) {
        ServiceProvider.findOne({ username: req.user.username }, function (err, sp) {
            Arena.findOne({ name: req.params.arenaName }, function (err2, arena) {
                if(!sp)
                    res.status(400).json({error:"error"});
                else{
                //checking if this arena belongs to that user(service provider)
                if (arena && arena.service_provider.equals(sp._id)) {

                    var startIndex = req.body.startIndex;
                    var endIndex = req.body.endIndex;
                    var day = req.body.day;
                    var month = req.body.month;

                    //checking if all required fields are delivered
                    if (month && day && endIndex && startIndex) {

                        var Indices = serviceProviderController.getScheduleIndices(month, day);
                        var weekIndex = Indices.weekIndex;
                        var dayIndex = Indices.dayIndex;
                        var flag = 0;

                        Arena.findOne({name:req.params.arenaName}, function (err, arena) {
                            if (arena) {

                                //saving the day which will be modifed to restore it to the schedule later if there's an error
                                var before_edit = [];
                                for (var i = 0; i < 48; i++) {
                                    before_edit[i] = arena.schedule[weekIndex][dayIndex][i];
                                };

                                var start = parseInt(startIndex,10);
                                var end = parseInt(endIndex,10);
                                //setting only available slots to be unavailable. if a booked slot encountered an error statement will be sent to the user (service provider).
                                for (var i = start; i <= end; i++) {
                                    if (arena.schedule[weekIndex][dayIndex][i] == 0 || arena.schedule[weekIndex][dayIndex][i] == -1)
                                    {
                                        (arena.schedule)[weekIndex][dayIndex][i] = -1;}

                                    else 
                                    {
                                        flag = 1;
                                        break;
                                    }

                                };
                                //checking if the user(servvice provider) tries to set a booked slot to be unavailable.
                                if (flag) {
                                    for (var i = 0; i < 48; i++) {
                                        arena.schedule[weekIndex][dayIndex][i] = before_edit[i];
                                    };
                                    res.json({ error: "You can not set booked slots to be unavailable" });
                                }
                                else {
                                    arena.markModified("schedule");
                                    arena.save(function (err, arr) {
                                        if (err) {
                                            res.json({ error: "error in arena DB" });
                                        }
                                    });
                                    res.json({ schedule: arena.schedule });
                                }

                            }
                            else {
                                res.status(404).json({ error: "error, wrong arena id" });
                            };
                        });
                    }
                    else {
                        //if one of the fields in req.body isn't delivered 
                        res.json({ error: "Missing data" });
                    }
                }
                else {
                    //if the arena does not belong to this service provider or there's no such arena 
                    res.status(404).json({ error: "You are not allowed to view this page or there's no such arena" });
                }
            }
            });
        });
    }
    else {
        //if the user(visitor) isn't logged in or he is logged in but he is not a service provider
        res.status(403).json({ error: "You are not allowed to view this page" });

    }

}

/*
arenaController.setAailable

This function sets the chosen slots in the schedule to be available by setting their value to 0 in the schedule of the arena whose name is present in the params

@param startIndex : start index of the slots to be unavailable.   
     endIndex   : end index of the slots to be unavailable. 
     (month,day): date of the selected day.
     arenaName  : the arena whose schedule is to be edited.


@return -

*/

function setAvailable(req, res) {
    if (req.user && (req.user.type == "ServiceProvider")) {
        ServiceProvider.findOne({ username: req.user.username }, function (err, sp) {
            Arena.findOne({ name: req.params.arenaName }, function (err2, arena) {

                //checking if this arena belongs to that user(service provider)
                if (arena && arena.service_provider.equals(sp._id)) {
                    var startIndex = req.body.startIndex;
                    var endIndex = req.body.endIndex;
                    var day = req.body.day;
                    var month = req.body.month;
                    //checking if all required fields are delivered
                    if (month && day && endIndex && startIndex) {

                        var Indices = serviceProviderController.getScheduleIndices(month, day);
                        var weekIndex = Indices.weekIndex;
                        var dayIndex = Indices.dayIndex;

                        Arena.findOne({name : req.params.arenaName}, function (err, arena) {
                            if(arena){
                            var schedule = arena.schedule;
                            var i = startIndex;
                            //making the slots between the startIndex and the endIndex (inclusive) available
                            var start = parseInt(startIndex,10);
                            var end = parseInt(endIndex,10);
                            for ( i = start; i <= end; i++) {
                                schedule[weekIndex][dayIndex][i] = 0;
                            };

                            arena.schedule = schedule;                            
                            arena.markModified("schedule");
                            arena.save(function (err) {
                                if (err) {
                                    res.json({ error: "error in arena DB" });
                                }
                            });
                            res.status(200).json({ schedule: arena.schedule });
                        }});

                    }
                    else {
                        //if one of the fields in req.body isn't delivered 
                        res.json({ error: "Missing data" });
                    }
                }
                else {
                    //if the arena does not belong to this service provider or there's no such arena
                    res.status(404).json({ error: "You are not allowed to view this page or there's no such arena" });
                }
            });
        });
    }
    else {
        //if the user(visitor) isn't logged in or he is logged in but he is not a service provider   
        res.status(403).json({ error: "You are not allowed to view this page" });
    }
}

/*
arenaController.createArena:
This function creates a new arena by setting (name, size, type, location, address, price, regulations and default weekly schedule of the arena).
@param: arena name, size, type, location, address, price, rules_and_regulations, 7 arrays each represents the unavailable slots on a certain day.
@return: The created arena
*/
function createArena(req, res) {
    if(!req.user)
    {
      res.json(400, {error:'Please log in first'});
      return;
    }
    if (req.user && (req.user.type != "ServiceProvider")) {
        res.json(400, {error: "You are not authorized to do this action"});
        return;
    }
 
    // initializing the arena
    var rules = req.body.rules_and_regulations;
    var name = req.body.name;
    var address = req.body.address;
    var location = req.body.location;
    var size = req.body.size;
    var type = req.body.type;
    var price = req.body.price;
    var ratings_count = 0;
    var avg_rating = 0;
 
    if (!name || !address || !location || !size || !type || !price) {
        res.json(400, {error: "missing input"});
        return;
    }
 
    // storing photos
    var photos = [];
    for (var i = 0; req.files && req.files[i]; i++) {
        photos.push(req.files[i].buffer);
    }
    // creating default schedule
    var default_schedule = [];
    var day = req.body.saturday;
    var sat = new Array(48).fill(0);
    for (var i = 0; day && i < day.length; i++) {
        sat[day[i]] = -1;
    }
 
    day = req.body.sunday;
    var sun = new Array(48).fill(0);
    for (var i = 0; day && i < day.length; i++) {
        sun[day[i]] = -1;
    }
 
    day = req.body.monday;
    var mon = new Array(48).fill(0);
    for (var i = 0; day && i < day.length; i++) {
        mon[day[i]] = -1;
    }
 
    day = req.body.tuesday;
    var tues = new Array(48).fill(0);
    for (var i = 0; day && i < day.length; i++) {
        tues[day[i]] = -1;
    }
 
    day = req.body.wednesday;
    var wed = new Array(48).fill(0);
    for (var i = 0; day && i < day.length; i++) {
        wed[day[i]] = -1;
    }
 
    day = req.body.thursday;
    var thurs = new Array(48).fill(0);
    for (var i = 0; day && i < day.length; i++) {
        thurs[day[i]] = -1;
    }
 
    day = req.body.friday;
    var fri = new Array(48).fill(0);
    for (var i = 0; day && i < day.length; i++) {
        fri[day[i]] = -1;
    }
 
    default_schedule.push(sat);
    default_schedule.push(sun);
    default_schedule.push(mon);
    default_schedule.push(tues);
    default_schedule.push(wed);
    default_schedule.push(thurs);
    default_schedule.push(fri);

 
    var normal_schedule = [];
    var weekNo = 4;
    var daysNo = 7;
    var slotsNo = 48;
    for (var i = 0; i < weekNo; i++) {
        var oneWeek = [];
        for (var j = 0; j < daysNo; j++) {
            var oneDay = [];
            for (var k = 0; k < slotsNo; k++) {
                oneDay.push(default_schedule[j][k]);
            }
            oneWeek.push(oneDay);
        }
        normal_schedule.push(oneWeek);
    }
 
    var user = req.user.username;
    var servProv;
    ServiceProvider.findOne({ username: user }, function (err, serv) {
        if (err) {
            res.json(500, {error: err.message});
        }
        else {
 
          servProv = serv._id;
 
          var newArena = new Arena({
              service_provider: servProv,
              rules_and_regulations: rules,
              name: name,
              address: address,
              location: location,
              avg_rating: avg_rating,
              size: size,
              type: type,
              price: price,
              photos: photos,
              ratings_count: ratings_count,
              default_weekly_schedule: default_schedule,
              schedule: normal_schedule
          });
 
            Arena.findOne({name: newArena.name}, function(err, doc){
              if(err)
              {
                res.json(500, {error: err.message});
              }
              else if(doc)
                 res.json(400, {error: "There exist arena with this name. Please choose another name"});
                else {
                  newArena.save(function (err, arena) {
                      if (err)
                           res.json(500, { error: err.message });
                      else
                      {
                           res.json(arena);
                        }
                  });
                }
            })
 
        }
    })
}

function getArenaSchedule(req, res) {
    var arenaName = req.params.arenaName;
    Arena.findOne({ name: arenaName }, 'schedule', function (err, foundArena) {
        if (err ) {
            res.status(500).json({ error: err });
        }
        else if(!foundArena){
            res.status(404).json({error: "not a valid Arena"})
        }
        else {
            res.json(foundArena);
        }
    });
}
function getWeekSchedule(req, res) {
    if (!req.params.dayIndex || !req.params.monthIndex || !req.params.arenaName) 
        {
            
            res.status(400).json({ error: "incomplete path" });
            return;
        }
    
            
        Arena.findOne({name:req.params.arenaName},function(error,foundArena){
            if(error)
            {
                 
                res.status(500).json({error:error});

            }
            else if(! foundArena)
            {
                
                res.status(404).json({error:" arena not found"});
            }
            else
            {
                var index =serviceProviderController.getScheduleIndices(req.params.monthIndex,req.params.dayIndex);
                if(index.dayIndex>=0 && index.dayIndex<=6 && index.weekIndex>=0 && index.weekIndex<=3 )
                {
                    
                    res.json(foundArena.schedule[index.weekIndex][index.dayIndex]);
                }
                else
                {
                    
                    res.status(400).json({error:"day or month out of bound"});
                }
            }
        })


};
function getPrice(req,res){
    Arena.findOne({name:req.params.arenaName},function(err,foundArena){
        if(err)
        {
            res.status(500).json({error:"internal Error"});

        }
        else if(!foundArena)
        {
          res.status(400).json({error:"No such arena"});  
        }
        else
        {
            res.json({price:foundArena.price});
        }
    })
}
let arenaController = {
    getPrice:getPrice,
    getWeekSchedule: getWeekSchedule,
    getArenaSchedule: getArenaSchedule,
    getArenas: getArenas,
    bookHours: bookHours,
    checkAvailable: checkAvailable,
    commentOnArena: commentOnArena,
    viewarena: viewarena,
    editarena: editarena,
    editarenainfo: editarenainfo,
    editdefaultschedule: editdefaultschedule,
    addimage: addimage,
    setUnavailable: setUnavailable,
    setAvailable: setAvailable,
    createArena: createArena,
    getComments : getComments
};


module.exports = arenaController;
