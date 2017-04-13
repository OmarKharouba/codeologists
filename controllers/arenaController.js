var serviceProviderController = require('./serviceProviderController');
var ServiceProvider = require('../models/ServiceProvider');
var Arena = require('../models/Arena');
var Booking = require('../models/Booking');

//reserves a set of FREE hours to certain user in a certain Arena
var bookHours = function (month, day, startIndex, endIndex, timestamp, arenaName, playerID, callback) {
    //create Booking
    var indices = serviceProviderController.getScheduleIndices(month, day);

    Arena.findById(arenaID, function (err, foundArena) {

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
                                    callback(errSave);
                                }
                                else {
                                    serviceProviderController.handleBooking(bookingObj._id);
                                    return callback(null);
                                }
                            })
                        }
                        else {
                            if (spErr) {
                                return callback(spErr);
                            }
                            else {
                                return callback("The Creater of the arena is no longer existant or has been removed ");
                            }
                        }
                    });
                }
                else {
                    return callback("Time Unavailable");
                }
            } else {
                if (err)
                    return callback(err);
                else if (!(indices.dayIndex >= 0 && indices.weekIndex >= 0 && indices.dayIndex <= 6 && indices.weekIndex <= 3))
                    return callback("Day and month ot of bound");
                else
                    return callback("no such booking");
            }
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

function commentOnArena(req, res) {

    if (req.body.type == 'Player') {
        Arena.findOne({ _id: req.params.id }, function (err, arena) {
            if (err) {
                res.send(err);
                return;
            }
            var content = req.body.comment;
            arena.comments.push({ Content: content, time_stamp: new Date(), player: req.body.username });
            arena.save(function (err) {
                if (err) {
                    res.send(err);
                    return;
                }
                res.send("Your comment was posted");
            });

        });
    }
    else {
        res.send("not allowed to comment");
    }
};
function viewarena(req, res) {
    Arena.findOne({ _id: req.params.arenaid }, function (err, arena) {
        res.json({ arena: arena, err: err });
    });
};
function editarena(req, res) {
    var arenaid = req.params.arenaid;
    Arena.findOne({ _id: arenaid }, function (err, arena) {
        if (err) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (!arena) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (req.user && arena.service_provider == req.user._id) {
            return res.render('editarena', { arena: arena });
        } else {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
    });
};
function editarenainfo(req, res, nxt) {
    var arenaid = req.params.arenaid;
    Arena.findOne({ _id: arenaid }, function (err, arena) {
        if (err) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (!arena) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (req.user && arena.service_provider == req.user._id) {
            arena.rules_and_regulations = req.body.rules_and_regulations;
            arena.address = req.body.address;
            arena.location = req.body.location;
            arena.size = req.body.size;
            arena.type = req.body.type;
            arena.price = req.body.price;
            arena.save(function (err) {
                if (err) {
                    console.log(err);
                    return nxt(err);
                }
                req.flash('info', 'your arena info is updated successfully');
                return res.redirect('/viewarena/' + arenaid);
            });
        } else {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
    });
};
function editdefaultschedule(req, res, nxt) {
    var arenaid = req.params.arenaid;
    Arena.findOne({ _id: arenaid }, function (err, arena) {
        if (err) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (!arena) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (req.user && arena.service_provider == req.user._id) {
            var new_sch = new Array(7).fill(new Array(48).fill(0));
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
                    console.log(err);
                    return nxt(err);
                }
            });
            req.flash('info', 'your default schedule is updated successfully');
            return res.redirect('/viewarena/' + arenaid);
        } else {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
    });
}
function addimage(req, res, nxt) {
    var newimage = { data: req.files[0].buffer };
    var arenaid = req.params.arenaid;
    Arena.findOne({ _id: arenaid }, function (err, arena) {
        if (err) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (!arena) {
            req.flash('error', 'this page is not available');
            return res.redirect('/');
        }
        if (req.user && arena.service_provider == req.user._id) {
            arena.photos.push(newimage);
            arena.save(function (err) {
                if (err) {
                    console.log(err);
                    return nxt(err);
                }
            });
            req.flash('info', 'your new arena image is uploaded successfully');
            return res.redirect('/viewarena/' + arenaid);
        } else {
            req.flash('error', 'this page is not available');
            res.redirect('/');
        }
    });
}
 function setUnavailable (req, res, next) {
    if (req.user && (req.user.type == "ServiceProvider")) {
        ServiceProvider.findOne({ username: req.user.username }, function (err, sp) {
            Arena.findOne({ _id: req.params.arena_id }, function (err2, arena) {

                //checking if this arena belongs to that user(service provider)
                if (arena && arena.service_provider.equals(sp._id)) {

                    var startIndex = req.body.startIndex;
                    var endIndex = req.body.endIndex;
                    var day = req.body.day;
                    var month = req.body.month;

                    //checking if all required fields are delivered
                    if (month && day && endIndex && startIndex) {

                        var Indices = getScheduleIndices(month, day);
                        var weekIndex = Indices.weekIndex;
                        var dayIndex = Indices.dayIndex;
                        var flag = 0;

                        Arena.findById(req.params.arena_id, function (err, arena) {
                            if (arena) {

                                //saving the day which will be modifed to restore it to the schedule later if there's an error 
                                var before_edit = [];
                                for (var i = 0; i < 48; i++) {
                                    before_edit[i] = arena.schedule[weekIndex][dayIndex][i];
                                };

                                //setting only available slots to be unavailable. if a booked slot encountered an error statement will be sent to the user (service provider). 
                                for (var i = startIndex; i <= endIndex; i++) {
                                    if (arena.schedule[weekIndex][dayIndex][i] == 0 || arena.schedule[weekIndex][dayIndex][i] == -1)
                                        (arena.schedule)[weekIndex][dayIndex][i] = -1;

                                    else {
                                        flag = 1;
                                        break;
                                    }

                                };
                                //checking if the user(servvice provider) tries to set a booked slot to be unavailable.
                                if (flag) {
                                    for (var i = 0; i < 48; i++) {
                                        arena.schedule[weekIndex][dayIndex][i] = before_edit[i];
                                    };
                                    res.send("error, You can not set booked slots to be unavailable");
                                }
                                else {
                                    arena.markModified("schedule");
                                    arena.save(function (err, arr) {
                                        if (err) {
                                            res.send("error in arena DB");
                                        }
                                    });
                                    res.send(arena.schedule);
                                }

                            }
                            else { res.send("error, wrong arena id") };
                        });
                    }
                    else {
                        //if one of the fields in req.body isn't delivered 
                        res.send("incorrect data");
                    }
                }
                else {
                    //if the arena does not belong to this service provider or there's no such arena 
                    res.send("You are not allowed to view this page or there's no such arena");
                }
            });
        });
    }
    else {
        //if the user(visitor) isn't logged in or he is logged in but he is not a service provider
        res.send("You are not allowed to view this page");
    }

}

         function setAvailable (req, res) {
            if (req.user && (req.user.type == "ServiceProvider")) {
                ServiceProvider.findOne({ username: req.user.username }, function (err, sp) {
                    Arena.findOne({ _id: req.params.arena_id }, function (err2, arena) {

                        //checking if this arena belongs to that user(service provider)
                        if (arena && arena.service_provider.equals(sp._id)) {

                            var startIndex = req.body.startIndex;
                            var endIndex = req.body.endIndex;
                            var day = req.body.day;
                            var month = req.body.month;

                            //checking if all required fields are delivered
                            if (month && day && endIndex && startIndex) {

                                var Indices = getScheduleIndices(month, day);
                                var weekIndex = Indices.weekIndex;
                                var dayIndex = Indices.dayIndex;

                                Arena.findById(req.params.arena_id, function (err, arena) {
                                    var schedule = arena.schedule;

                                    //making the slots between the startIndex and the endIndex (inclusive) available 
                                    for (var i = startIndex; i <= endIndex; i++) {
                                        schedule[weekIndex][dayIndex][i] = 0;
                                    };

                                    arena.schedule = schedule;
                                    arena.markModified("schedule");
                                    arena.save(function (err) {
                                        if (err) {
                                            res.send("error in arena DB");
                                        }
                                    });
                                    res.redirect("/sp/arena/" + req.params.arena_id);
                                });

                            }
                            else {
                                //if one of the fields in req.body isn't delivered 
                                res.send("incorrect data");
                            }
                        }
                        else {
                            //if the arena does not belong to this service provider or there's no such arena
                            res.send("You are not allowed to view this page or there's no such arena");
                        }
                    });
                });
            }
            else {
                //if the user(visitor) isn't logged in or he is logged in but he is not a service provider   
                res.send("You are not allowed to view this page");
            }
        }
 function createArena (req, res) {
            if (req.user && (req.user.type != "ServiceProvider")) {
                res.send("Not authenticated");
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
                res.send("missing input");
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
            ServiceProvider.findOne({ username: user }, function (err, doc) {
                if (err) {
                    res.send(err);
                }
                else {
                    servProv = doc._id;

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


                    newArena.save(function (err) {
                        if (err)
                            res.send(err);
                        return;
                    });
                    res.redirect('/'); // to be changed 
                }
            })
        }
let arenaController = {
    bookHours: bookHours,
    checkAvailable: checkAvailable,
    commentOnArena: commentOnArena,
    viewarena: viewarena,
    editarena: editarena,
    editarenainfo,
    editdefaultschedule: editdefaultschedule,
    addimage: addimage,
    setUnavailable:setUnavailable,
    setAvailable:setAvailable,
    createArena:createArena,
}
module.exports = arenaController;