
var Player = require('../models/Player');
var arenaController = require('./arenaController');
var serviceProviderController = require('./serviceProviderController');
var Arena = require('../models/Arena');
var serviceProvider = require('../models/ServiceProvider');
var async = require("async");
var Booking = require('../models/Booking');

var createBooking = function (req, res) {
    Player.findOne({ username: req.user.username }, function (err, player) {
        if (req.body.month && req.body.month && req.body.startIndex && req.body.endIndex) {
            if (err) {
                console.log(err);
                res.json({ err: err });
            }
            else if (!player) {
                res.json({ err: "Please log in as a Player first" });
            }
            else {
                (require('./arenaController')).bookHours(req.body.month, req.body.day, req.body.startIndex, req.body.endIndex, new Date(), req.params.arenaName, player._id, function (bookingErr) {
                    if (bookingErr) {
                        res.json({ err: bookingErr });
                    }
                    else {
                        res.json({ err: null });
                    }
                })
            }
        }
        else {
            res.json({ err: "Incomplete input data " });
        }
    })
}

function viewBookings(req, res) {
    Arena.findOne({name:req.params.arenaName}, function (err, foundArena) {
        if (err) {
            res.json({ err: err });
        }
        else if (!foundArena) {

            res.json({ err: "Sorry Broken Link, this arena may have been deleted, removed or is no longer existant" });

        }
        else {
            serviceProvider.findById(foundArena.service_provider, function (errSp, serviceProvider) {
                if (errSp) {
                    res.json({ err: "Internal server Error, Sorry for the inconvenience !" });
                }
                else if (serviceProvider) {

                    if (serviceProvider.username == req.user.username) {
                        //find all pending requests where the request time is greater than today, the arena is the current arena  and have not been accepted
                        Booking.find({ accepted: false, arena: foundArena.name }).$where('(new Date(new Date().getFullYear(),this.bookMonth,this.bookDay))>(new Date())').exec(function (err, bookingArr) {
                            //TODO: render a view (will be done in Sprint 2 ISA)
                            if (err) {
                                res.json({ err: "Error finding pending requests" });
                            }
                            else {
                                res.json({
                                    bookings : bookingArr , 
                                    players : getPlayersForBookings(bookingArr)
                                });
                            }
                        })
                    }
                    else {
                        res.json({ err: "sorry not your arena" });
                    }
                }
                else {
                    res.json({ err: "Internal Server Error sorry :'(" });
                };
            })

        }
    });
}


function getPlayersForBookings(req){
    var bookings = req;
    var acc = [];
    //console.log(bookings);
    console.log('---------------------------------------------------------------------------');
    async.concatSeries(bookings, function(item, callback) {
        Player.findOne({_id : item.player} , function(err , pla)
        {
        console.log('insideeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
            //console.log(pla.name);
            if(!err){
                return [pla.name];
                // acc.push(pla.name);
                // console.log(pla.name);
            }
        });
        callback();
    }, 
    function(err , res) {
        // console.log(err);
        // console.log('minaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        // console.log(acc);
        console.log(res);
        return res;
    });



    /*
    console.log(bookings);

    async.concatSeries(bookings, function(curBooking){
        Player.findOne({_id : curBooking.player} , function(err , pla){
            console.log(pla);
            if(!err)
            {
                return [pla];
            }
        });
    } , function(err , out){
        console.log('outtttttttttttttttttttttt');
        console.log(out);
        return out;
    });

    */
}


var cancelBooking = function (req, res) {
    if (req.user.type != 'Player') {
        res.send("You are not authorized to view this page");
        return;
    }
    var player = req.user._id;
    var arena = req.body.arenaID;
    var bookingID = req.params.bookingID;
    var status;
    var day, week, start, end;
    var id;
    if (!player || !arena || !bookingID) {
        res.send("missing parameters");
        return;
    }
    Booking.findOne({
        _id: bookingID
    }, function (err, book) {
        if (!book || !(book.player.equals(player))) {
            res.send("This Action can not be done.");
            return;
        }
        if (err)
            res.send(err);
        else {
            status = book.accepted;
            var obj = serviceProviderController.getScheduleIndices(book.bookMonth, book.bookDay);
            day = obj.dayIndex;
            week = obj.weekIndex;
            start = book.start_index;
            end = book.end_index;
            id = book._id;

            if (status) {
                Arena.findOne({ _id: arena }, function (err, doc) {
                    for (var i = 0; i < 48; i++) {
                        var currDay = doc.schedule[week][day];
                        if (i >= start && i <= end && currDay[i].equals(id))
                            doc.schedule[week][day][i] = 0;
                    }
                    doc.markModified('schedule');
                    doc.save(function (err) {
                        if (err)
                            res.send(err);
                    });
                });
            }

            Booking.remove({
                _id: bookingID
            }, function (err) {
                if (err) { res.send(err); }
            });
        }
    });


};
function playerRateBooking(req, res) {

          if(!req.body.rating || parseInt(req.body.rating) > 5 || parseInt(req.body.rating) < 1)
          {
            res.status(400).json({error: "bad request, enter a proper rating!"});
            return;
          }

    Booking.findOne({ _id: req.params.id }, function (err, booking) {
        booking.arena_rating = parseInt(req.body.rating);

        //save arena rating at booking
        booking.save(function (err) {
            if (err) {
                res.json({error: err.message});
                return;
            }
        });
        Arena.findOne({ _id: booking.arena }, function (err, arena) {
            var rating = parseInt(req.body.rating);
            if (err) {
                res.json({error: err.message});
                return;
            }
            if (!arena) {
                res.status(404).json({error: "arena not found!"});
                return;
            }

            if (!arena.ratings_count)
                arena.ratings_count = 0;

            if (!arena.avg_rating)
                arena.avg_rating = 0;

            // update rating

            arena.avg_rating = (arena.avg_rating * arena.ratings_count + rating) / (arena.ratings_count + 1);
            arena.ratings_count++;
            // save rating at arena
            arena.save(function (err) {
                if (err) {
                    res.json({error: err.message});
                    return;
                }
            });
            res.json(arena);
        });
    });

}

function acceptBooking(booking) {
    Arena.findOne({ name : booking.arena }, function (err, arenaa) {
        var schedule = arenaa.schedule;
        var indices = serviceProviderController.getScheduleIndices(booking.bookMonth, booking.bookDay);
        var dayIndex = indices.dayIndex;
        var weekIndex = indices.weekIndex;
        var start = booking.start_index;
        var end = booking.end_index;
        var ok = true;
        //use checkAvailable function from arenaController
        for (var i = start; i <= end; i++) {
            if (schedule[weekIndex][dayIndex][i] != 0) {
                ok = false;
                break;
            }
        }
        if (ok) {
            Booking.find({ arena: arenaa._id, bookDay: booking.bookDay, bookMonth: booking.bookMonth }
                , function (err, allBookings) {
                    if (!err) {
                        async.each(allBookings, function (currentBooking, callback) {
                            if (!(currentBooking.accepted) && !(currentBooking._id.equals(booking._id))) {
                                var start1 = currentBooking.start_index;
                                var end1 = currentBooking.end_index;
                                if ((start1 >= start && start1 <= end) || (end1 >= start && end1 <= end)) {
                                    Arena.findOne({ _id: currentBooking.arena }, function (err, arenaa) {
                                        var notification = 'Unfortunately,your booking on day ' + (currentBooking.bookDay) + ' on month ' +
                                            (currentBooking.bookMonth) + ' for ' + (arenaa.name) + ' from '
                                            + serviceProviderController.getTimeFromIndex(start1) + ' to ' + 
                                            serviceProviderController.getTimeFromIndex(end1) + ' has been rejected';
                                        Player.findOne({ _id: currentBooking.player }, function (err, playerr) {
                                            playerr.notifications.push(notification);
                                            playerr.save();
                                            Booking.remove({ _id: currentBooking._id }, function (err, result) {

                                            });

                                        });
                                    });
                                }
                            }
                        }, function (err) {
                        })
                    }
                    for (var i = start; i <= end; i++) {
                        arenaa.schedule[weekIndex][dayIndex][i] = booking._id;
                    }
                    arenaa.accepted = true;
                    arenaa.markModified('schedule');
                    arenaa.save(function (err) {

                    })
                });
        }
    })
}


function acceptBooking2(req, res) {
    if (req.user.type != 'ServiceProvider') {
        res.json(403,{error:'You are not authorized to do this'});
        return;
    }
    Booking.findById(req.params.bookingID, function (err, bookingObj) {
        if (err || !bookingObj)
            res.json(400, {error :"no such booking or bad request"});
        else {
            var booking = bookingObj;
            Arena.findOne({ name : booking.arena }, function (err, arenaa) {
                if (!arenaa.service_provider.equals(req.user._id)) {
                    res.json(403,{error : 'You are not authorized to do this'});
                    return;
                }
                var schedule = arenaa.schedule;
                var indices = serviceProviderController.getScheduleIndices(booking.bookMonth, booking.bookDay);
                var dayIndex = indices.dayIndex;
                var weekIndex = indices.weekIndex;
                var start = booking.start_index;
                var end = booking.end_index;
                var ok = true;
                for (var i = start; i <= end; i++) {
                    if (schedule[weekIndex][dayIndex][i] != 0) {
                        ok = false;
                        break;
                    }
                }
                if (!ok) {
                    res.json(400,{error:'This is not a free time'});
                }
                else {
                    Booking.find({ arena: arenaa.name, bookDay: booking.bookDay, bookMonth: booking.bookMonth }
                        , function (err, allBookings) {
                            if (!err && allBookings) {
                                async.each(allBookings, function (currentBooking, callback) {
                                    if (!(currentBooking.accepted) && !(currentBooking._id.equals(booking._id))) 
                                    {
                                        var start1 = currentBooking.start_index;
                                        var end1 = currentBooking.end_index;
                                        if ((start1 >= start && start1 <= end) || (end1 >= start && end1 <= end)) 
                                        {
                                            Arena.findOne({ name: currentBooking.arena }, function (err, arenaa) 
                                            {
                                                if (!err && arenaa) 
                                                {
                                                    var notification = 'Unfortunately,your booking on day ' + (currentBooking.bookDay) + ' on month ' +
                                                        (currentBooking.bookMonth) + ' for ' + (arenaa.name) + ' from '
                                                        + serviceProviderController.getTimeFromIndex(start1) + ' to ' 
                                                        + serviceProviderController.getTimeFromIndex(end1) + ' has been rejected';
                                                    Player.findOne({ _id: currentBooking.player }, function (err, playerr) 
                                                    {
                                                        if (!err && playerr) 
                                                        {
                                                            playerr.notifications.push(notification);
                                                            playerr.save();
                                                            Booking.remove({ _id: currentBooking._id }, function (err, result) 
                                                            {
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }, function (err) {
                                    res.json(400,{error :'there are conflicting bookings'});
                                })
                            }
                            for (var i = start; i <= end; i++) {
                                arenaa.schedule[weekIndex][dayIndex][i] = booking._id;
                            }

                            bookingObj.accepted = true;
                            bookingObj.save(function (err) {
                                if (err)
                                    res.json(400,{error : 'error while booking'});
                            })

                            arenaa.markModified('schedule');
                            arenaa.save(function (err) {
                                if (err)
                                    res.json(400,{error : 'error while saving'});
                                else
                                    res.json(200,{success:'done'});
                            })
                        });
                }
            })
        }
    })
}
function handleBooking(id) {
    Booking.findOne({ _id: id }, function (err, booking2) {
        Arena.findOne({ name : booking2.arena }, function (err, arena) {
            serviceProvider.findOne({ _id: arena.service_provider }, function (err, serviceProvider) {
                if (serviceProvider.mode == true)
                    acceptBooking(booking2);
                })
        });
    });
}
function rejectBooking(req, res) {
    if (!(req.params.bookingID)){
        res.json (400 ,{error :'Missing field'});
        return;
    }
    if (req.user.type != 'ServiceProvider') {
        res.json(403 ,{error :'You are not authorized to do this'});
        return;
    }
    var bookingID = req.params.bookingID;
    Booking.findOne({ _id: bookingID }, function (err, curBooking) {
        if (err || !curBooking) {
            res.json(400,{error :'Not a valid Booking'});
            return;
        }
        Arena.findOne({ name: curBooking.arena }, function (err, arenaa) {

            var arenaName = arenaa.name;
            if (err || !arenaa) {
                res.json(400 ,{error :'Not a valid Booking'});
            }
            else {
                var indices = serviceProviderController.getScheduleIndices(curBooking.bookMonth, curBooking.bookDay);
                var dayIndex = indices.dayIndex;
                var weekIndex = indices.weekIndex;
                var start = curBooking.start_index;
                var end = curBooking.end_index;
                var notification = 'Unfortunately,your booking on day ' + (curBooking.bookDay) + ' on month ' +
                    (curBooking.bookMonth) + ' for ' + (arenaa.name) + ' from '
                    + serviceProviderController.getTimeFromIndex(start) + ' to ' + 
                    serviceProviderController.getTimeFromIndex(end) + ' has been rejected';

                Player.findOne({ _id: curBooking.player }, function (err, playerr) {
                    playerr.notifications.push(notification);
                    playerr.save();
                    Booking.remove({ _id: curBooking._id }, function (err, result) {
                        if (err)
                            res.json(400 ,{error : "This booking can not be rejected"});
                        else
                            res.json(200 ,{success : "The booking has been rejected successfully"});
                    });
                });
            }
        });
    });
}
 function providerRateBooking (req, res) {
   if(!req.body.rating || parseInt(req.body.rating) > 5 || parseInt(req.body.rating) < 1)
   {
     res.status(400).json({error: "bad request, enter a proper rating!"});
     return;
    }

            Booking.findOne({ _id: req.params.id }, function (err, booking) {
                if (err) {
                    res.json({error: err.message});
                    return;
                }
                if (!booking)
                    res.status(404).json({error: "booking not found"});

                booking.player_rating = parseInt(req.body.rating);
                booking.save(function (err) {
                    if (err) {
                        res.json({error: err.message});
                        return;
                    }
                });
                res.json(booking);
                // find player
                Player.findOne({ _id: booking.player }, function (err, player) {
                    var rating = parseInt(req.body.rating);
                    if (err) {
                        res.json({error: err.message});
                        return;
                    }
                    if (!player) {
                        res.status(404).json({error: "player not found!"});
                        return;
                    }
                    // update rating
                    if (!player.ratings_count)
                        player.ratings_count = 0;

                    if (!player.avg_rating)
                        player.avg_rating = 0;

                    player.avg_rating = ((player.avg_rating * player.ratings_count) + rating) / (player.ratings_count + 1);

                    player.ratings_count++;
                    // save rating at player
                    player.save(function (err) {
                        if (err) {
                            res.json({error: err.message});
                            return;
                        }
                    });
                });

            });
        }

let bookingController = {
    createBooking: createBooking,
    viewBookings: viewBookings,
    cancelBooking: cancelBooking,
    acceptBooking: acceptBooking,
    acceptBooking2: acceptBooking2,
    playerRateBooking: playerRateBooking,
    handleBooking: handleBooking,
    rejectBooking:rejectBooking,
    providerRateBooking :providerRateBooking,
    getPlayersForBookings : getPlayersForBookings
}
module.exports = bookingController;
