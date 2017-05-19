BpmCache = function () {
    this.initialize.apply(this, arguments);
};
_.extend(BpmCache.prototype, {
    initialize: function (options) {
        this.spotify = options.spotify;
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
        async.waterfall([
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
                var tracks = _.chunk(active.tracks, 100);

                async.mapSeries(tracks, _.bind(function (ids, callback) {
                    this.spotify.Tracks.audioFeatures(ids, function (err, response) {
                        callback(err, response);
                    });
                }, this), function (err, responses) {
                    var response = _.chain(responses).map(function (chunk) {
                        return chunk.audio_features;
                    }).flatten().value();
                    callback(err, response);
                });
            }, this),
            _.bind(function (tracks, callback) {
                var key = "bpm." + active.id;
                var result = JSON.parse(localStorage.getItem(key)) || {};

                _.each(tracks, function (track) {
                    result[track.id] = Math.round(track.tempo);
                });

                localStorage.setItem(key, JSON.stringify(result));

                callback(null);
            }, this)
        ], _.bind(function (err) {
            delete this._running;

            if (!err) {
                this.trigger("update update:" + active.id);
            }

            async.nextTick(_.bind(function () {
                this.run();
            }, this));
        }, this));
    }
}, Backbone.Events);