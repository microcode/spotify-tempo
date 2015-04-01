var en = new EchoNest(config.EchoNest);
var sp = new Spotify(config.Spotify);

var _profile;
var _ticket;

var _playlists;
var _tracks;

async.series([
    function (callback) {
        console.log("CONNECT");
        sp.connect(callback);
    }, function (callback) {
        console.log("PLAYLISTS");
        sp.Playlists.playlists(function (err, playlists) {
            _playlists = playlists;
            callback(err);
        });
    }, function (callback) {
        var playlist = _.sortBy(_playlists, function (playlist) {
            return -playlist.tracks.total;
        })[0];
        console.log("TRACKS", playlist.id);

        sp.Playlists.tracks("items(track(id,uri)),next", playlist.owner.id, playlist.id, function (err, tracks) {
            _tracks = tracks;
            callback(err);
        });
    }, function (callback) {
        console.log("CREATE PROFILE");
        en.TasteProfile.create("testprofile-" + sp.user + '-' + (new Date().getTime()).toString(), EchoNest.TasteProfile.SONG, function (err, profile) {
            _profile = profile;
            callback(err);
        });
    }, function (callback) {
        console.log("UPDATE PROFILE");

        var items = _.map(_.uniq(_tracks, function (track) {
            return track.track.id
        }), function (track) {
            return {
                item: {
                    item_id: track.track.id,
                    track_id: track.track.uri
                }
            };
        });

        en.TasteProfile.update(_profile.id, items, function (err, ticket) {
            _ticket = ticket;
            callback(err);
        })
    }, function (callback) {
        console.log("WAIT TICKET");

        var currentStatus = "pending";
        var first = true;

        async.until(function () {
            return currentStatus == "complete";
        }, function (callback) {
            async.series([
                function (callback) {
                    setTimeout(callback, first ? 2000 : 5000);
                    first = false;
                }, function (callback) {
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
            buckets: ['audio_summary']
        }, function (err, profile) {
            var songs = _.map(profile, function (song) {
                return {
                    tempo: song.hasOwnProperty("audio_summary") ? parseInt(song.audio_summary.tempo).toString() : "",
                    id: song.id,
                    artist: song.artist_name,
                    name: song.song_name
                };
            });

            console.log(_.groupBy(songs, function (song) {
                return song.tempo;
            }));

            console.log("PROFILE", err, profile);
            callback(err);
        });
    }, function (callback) {
        console.log("DELETE PROFILE");
        en.TasteProfile.destroy(_profile.id, callback);
    }
], function (err) {
    console.log("ERR", err);
});
