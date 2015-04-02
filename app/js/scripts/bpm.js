BpmCache = function () {
    this.initialize.apply(this, arguments);
};
_.extend(BpmCache.prototype, {
    initialize: function (options) {
        this.echonest = options.echonest;
        this._schedule = [];
    },

    add: function (id, tracks) {
        tracks = _.compact(_.uniq(tracks));

        if (tracks.length > 0) {
            this.schedule(id, tracks);
        }
    },

    query: function (id) {
        var key = "bpm." + id;
        return JSON.parse(localStorage.getItem(key)) || {};
    },

    schedule: function (id, tracks) {
        this._schedule.push({
            id: id,
            tracks: tracks
        });
        this.run();
    },

    run: function () {
        if (this._running) {
            return;
        }

        var active = this._schedule.shift();
        if (!active) {
            return;
        }

        var _profile;
        var _ticket;

        this._running = true;
        async.series([
            _.bind(function (callback) {
                var key = "bpm." + active.id;
                var items = JSON.parse(localStorage.getItem(key));
                if (items) {
                    active.tracks = _.filter(active.tracks, function (track) {
                        return !items.hasOwnProperty(track);
                    });
                }

                callback(active.tracks.length == 0 ? "empty set" : null);
            }, this),
            _.bind(function (callback) {
                var timestamp = (new Date().getTime()).toString();
                this.echonest.TasteProfile.create("bpmcache-" + active.id + "-" + timestamp, EchoNest.TasteProfile.SONG, function (err, profile) {
                    _profile = profile;
                    callback(err);
                })
            }, this),
            _.bind(function (callback) {
                var updates = _.map(active.tracks, function (track) {
                    return {
                        item: {
                            "item_id": track,
                            "track_id": "spotify:track:" + track
                        }
                    }
                });
                this.echonest.TasteProfile.update(_profile.id, updates, function (err, ticket) {
                    _ticket = ticket;
                    callback(err);
                });
            }, this),
            _.bind(function (callback) {
                var _status = "pending";
                var _first = true;
                async.until(function () {
                    return _status != "pending";
                }, _.bind(function (callback) {
                    setTimeout(_.bind(function () {
                        this.echonest.TasteProfile.status(_ticket, function (err, status) {
                            _status = status;
                            callback(err);
                        });
                    }, this), _first ? 2000 : 5000);
                    _first = false;
                }, this), function (err) {
                    callback(err || _status != "complete");
                });
            }, this),
            _.bind(function (callback) {
                this.echonest.TasteProfile.read(_profile.id, {
                    buckets: ['audio_summary']
                }, _.bind(function (err, tracks) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var key = "bpm." + active.id;
                    var result = JSON.parse(localStorage.getItem(key)) || {};

                    _.each(tracks, function (track) {
                        result[track.request.item_id] = track.hasOwnProperty("audio_summary") ? Math.round(track.audio_summary.tempo) : 0;
                    });

                    localStorage.setItem(key, JSON.stringify(result));

                    callback(null);
                }, this));
            }, this)
        ], _.bind(function (err) {
            delete this._running;

            if (_profile) {
                this.echonest.TasteProfile.destroy(_profile.id, function (err) {});
            }

            if (!err) {
                this.trigger("update update:" + active.id);
            }

            async.nextTick(_.bind(function () {
                this.run();
            }, this));
        }, this));
    }
}, Backbone.Events);