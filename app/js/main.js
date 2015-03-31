var en = new EchoNest({
    api_key: config.api_key
});

var _profile;
var _ticket;

async.series([
    function (callback) {
        en.TasteProfile.list(function (err, profiles) {
            if (err) {
                console.log("LIST ERROR", err);
                callback(err);
                return;
            }

            console.log("LIST", profiles);

            async.eachSeries(profiles, function (profile, callback) {
                console.log("DELETE PROFILE", profile);
                en.TasteProfile.destroy(profile.id, callback);
            }, callback);
        });
    }, function (callback) {
        console.log("CREATE PROFILE");
        en.TasteProfile.create("testprofile", EchoNest.TasteProfile.GENERAL, function (err, profile) {
            if (err) {
                callback(err);
                return;
            }

            _profile = profile;
            callback(null);
        });
    }, function (callback) {
        console.log("UPDATE PROFILE");
        en.TasteProfile.update(_profile.id, [
            {
                "item": {
                    "track_id": "spotify:track:6DrBnEWZ5kxvBiBaDaGQnc"
                }
            }
        ], function (err, ticket) {
            _ticket = ticket;
            console.log("PROFILE UPDATED", err);
            callback(err);
        })
    }, function (callback) {
        console.log("WAIT TICKET");

        var currentStatus = "pending";
        var first = true;

        async.until(function () {
            console.log("ST", currentStatus, currentStatus == "pending");
            return currentStatus == "complete";
        }, function (callback) {
            console.log("UNTIL");
            async.series([
                function (callback) {
                    console.log("TIMEOUT");
                    setTimeout(callback, first ? 1000 : 5000);
                    first = false;
                }, function (callback) {
                    console.log("REQUEST");
                    en.TasteProfile.status(_ticket, function (err, status) {
                        currentStatus = status;
                        callback(err);
                    });
                }
            ], callback)
        }, function (err) {
            if (err) {
                callback(err);
                return;
            }

            callback(currentStatus == "complete" ? null : "Error while checking status: " + status);
        });
    }, function (callback) {
        en.TasteProfile.read(_profile.id, {
            buckets: ['id:spotify','tracks','audio_summary']
        }, function (err, profile) {

        });
    }
], function (err) {
    console.log("ERR", err);
});
